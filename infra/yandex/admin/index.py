"""VK-verified administration. All database authorization occurs inside each transaction."""
import base64
import json
import logging
import os
import uuid
from functools import lru_cache
from urllib import request, parse, error
import ydb
import ydb.iam

class ApiError(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message

@lru_cache(maxsize=1)
def pool():
    driver = ydb.Driver(endpoint=os.environ['YDB_ENDPOINT'], database=os.environ['YDB_DATABASE'], credentials=ydb.iam.MetadataUrlCredentials())
    driver.wait(timeout=5, fail_fast=True)
    return ydb.SessionPool(driver, size=1)

def vk_identity(headers):
    auth = headers.get('x-vk-token', '')
    if not auth.startswith('Bearer ') or len(auth) > 8192:
        raise ApiError(401, 'Войдите через VK')
    data = parse.urlencode({'client_id': os.environ['VK_APP_ID'], 'access_token': auth[7:]}).encode()
    try:
        with request.urlopen(request.Request('https://id.vk.ru/oauth2/user_info', data=data), timeout=5) as response:
            info = json.load(response)
    except error.HTTPError as exc:
        if exc.code in (400, 401, 403):
            raise ApiError(401, 'Войдите через VK повторно') from None
        raise
    if info.get('error') or not info.get('user', {}).get('user_id'):
        raise ApiError(401, 'Войдите через VK повторно')
    return int64(str(info['user']['user_id']))

def int64(value):
    if not isinstance(value, str) or not value.isascii() or not value.isdigit() or not 0 < int(value) <= 9223372036854775807:
        raise ApiError(400, 'VK ID должен быть положительным Int64')
    return int(value)

def text(value, limit, required=False):
    if not isinstance(value, str) or len(value) > limit or (required and not value.strip()):
        raise ApiError(400, 'Проверьте текстовые поля')
    return value.strip()

def operation(session, actor, action, body, new_id):
    tx = session.transaction(ydb.SerializableReadWrite())
    def run(sql, **params):
        types = {'actor':'Int64', 'pid':'Int64', 'eid':'Utf8', 'title':'Utf8', 'description':'Utf8', 'note':'Utf8', 'admin':'Bool'}
        declarations = ' '.join(f'DECLARE ${key} AS {types[key]};' for key in params)
        return tx.execute(session.prepare(declarations + sql), {'$'+k:v for k,v in params.items()})
    try:
        rows = run('SELECT admin FROM Participants WHERE vkontakte_id=$actor;', actor=actor)[0].rows
        admin = bool(rows and rows[0].admin)
        if action == 'me':
            result = {'vkontakte_id': str(actor), 'admin': admin, 'registered': bool(rows)}
        else:
            if not admin:
                raise ApiError(403, 'Доступ только для администратора')
            if action == 'list':
                results = run('SELECT * FROM Participants ORDER BY vkontakte_id; SELECT * FROM Events ORDER BY id; SELECT * FROM Attendance; SELECT * FROM Hosts;')
                result = {key: [dict(row) for row in rs.rows] for key, rs in zip(['participants','events','attendance','hosts'], results)}
                for key in ('participants','attendance','hosts'):
                    for row in result[key]:
                        row['vkontakte_id'] = str(row['vkontakte_id'])
            elif action in ('saveParticipant', 'deleteParticipant'):
                pid = int64(body.get('vkontakte_id'))
                if action == 'deleteParticipant':
                    if pid == actor:
                        raise ApiError(400, 'Нельзя удалить собственную учётную запись')
                    run('DELETE FROM Attendance WHERE vkontakte_id=$pid; DELETE FROM Hosts WHERE vkontakte_id=$pid; DELETE FROM Participants WHERE vkontakte_id=$pid;', pid=pid)
                else:
                    role = body.get('admin', False)
                    if type(role) is not bool or (pid == actor and not role):
                        raise ApiError(400, 'Нельзя снять свою роль администратора')
                    run('UPSERT INTO Participants (vkontakte_id, admin, note) VALUES ($pid,$admin,$note);', pid=pid, admin=role, note=text(body.get('note',''), 4000))
                result = {'ok': True}
            elif action in ('saveEvent','deleteEvent'):
                eid = text(body.get('id', new_id), 100, True)
                if action == 'deleteEvent':
                    run('DELETE FROM Attendance WHERE event_id=$eid; DELETE FROM Hosts WHERE event_id=$eid; DELETE FROM Events WHERE id=$eid;', eid=eid)
                else:
                    run('UPSERT INTO Events (id,title,description) VALUES ($eid,$title,$description);', eid=eid, title=text(body.get('title'),300,True), description=text(body.get('description',''),10000))
                result = {'ok': True}
            elif action in ('attendance','host'):
                pid, eid = int64(body.get('vkontakte_id')), text(body.get('event_id'),100,True)
                enabled = body.get('enabled')
                if type(enabled) is not bool:
                    raise ApiError(400, 'Некорректное состояние')
                checks = run('SELECT vkontakte_id FROM Participants WHERE vkontakte_id=$pid; SELECT id FROM Events WHERE id=$eid;', pid=pid,eid=eid)
                if not all(rs.rows for rs in checks):
                    raise ApiError(404, 'Участник или событие удалены')
                table = 'Attendance' if action == 'attendance' else 'Hosts'
                sql = f'UPSERT INTO {table} (vkontakte_id,event_id) VALUES ($pid,$eid);' if enabled else f'DELETE FROM {table} WHERE vkontakte_id=$pid AND event_id=$eid;'
                run(sql,pid=pid,eid=eid)
                result = {'ok':True}
            else:
                raise ApiError(400, 'Неизвестное действие')
        tx.commit()
        return result
    except Exception:
        tx.rollback()
        raise

def handler(event, context):
    headers = {k.lower():v for k,v in (event.get('headers') or {}).items()}
    origin = headers.get('origin')
    allowed = os.environ.get('ALLOWED_ORIGINS','').split(',')
    response_headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'}
    if origin in allowed:
        response_headers.update({'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'X-VK-Token, Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'})
    def respond(status, body):
        return {'statusCode':status,'headers':response_headers,'body':json.dumps(body,ensure_ascii=False),'isBase64Encoded':False}
    if event.get('httpMethod') == 'OPTIONS':
        return respond(204,{})
    if event.get('httpMethod') != 'POST':
        return respond(405,{'error':'Method not allowed'})
    try:
        actor = vk_identity(headers)
        raw = event.get('body') or '{}'
        if len(raw) > 24000:
            raise ApiError(413,'Слишком большой запрос')
        if event.get('isBase64Encoded'):
            raw = base64.b64decode(raw).decode()
        body = json.loads(raw)
        if not isinstance(body,dict):
            raise ApiError(400,'Некорректный запрос')
        new_id = str(uuid.uuid4())
        result = pool().retry_operation_sync(lambda session: operation(session,actor,body.get('action'),body,new_id))
        return respond(200,result)
    except ApiError as exc:
        return respond(exc.status,{'error':exc.message})
    except (ValueError, TypeError, UnicodeError):
        return respond(400,{'error':'Некорректный запрос'})
    except Exception as exc:
        logging.error('Admin API failed: %s',type(exc).__name__)
        return respond(503,{'error':'Сервис временно недоступен'})
