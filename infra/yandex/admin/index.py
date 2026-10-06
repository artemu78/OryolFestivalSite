"""VK-verified administration. All database authorization occurs inside each transaction."""
import base64
import json
import logging
import os
import re
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
    return ydb.SessionPool(driver, size=10)

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

def valid_sponsor_image(value):
    if not isinstance(value, str) or len(value) > 1000 or not value.strip():
        return False
    value = value.strip()
    if re.match(r'^logos\/[\w.-]+\.(?:png|jpe?g|webp|svg)$', value, re.IGNORECASE):
        return True
    parsed = parse.urlsplit(value)
    return parsed.scheme in ('http', 'https') and bool(parsed.hostname) and not parsed.username and not parsed.password

def valid_sponsor_link(value):
    if not isinstance(value, str) or len(value) > 1000:
        return False
    value = value.strip()
    if not value:
        return True
    parsed = parse.urlsplit(value)
    return parsed.scheme in ('http', 'https') and bool(parsed.hostname) and not parsed.username and not parsed.password

@lru_cache(maxsize=1)
def allowed_photos():
    with open(os.path.join(os.path.dirname(__file__), 'allowed-photos.json'), encoding='utf-8') as source:
        return frozenset(json.load(source))


def operation(session, actor, action, body, new_id):
    tx = session.transaction(ydb.SerializableReadWrite())
    def run(sql, **params):
        types = {'actor':'Int64', 'vk':'Int64', 'linked_vk':'Optional<Int64>',
                 'uid':'Utf8', 'eid':'Utf8', 'name':'Utf8', 'note':'Utf8',
                 'title':'Utf8', 'description':'Utf8', 'role':'Utf8',
                 'photo':'Utf8', 'profile_url':'Utf8', 'professional_title':'Utf8',
                 'bio':'Utf8', 'sort_order':'Int64',
                 'sid':'Utf8', 'image':'Utf8', 'link':'Utf8', 'display':'Bool'}
        declarations = ' '.join(f'DECLARE ${key} AS {types[key]};' for key in params)
        return tx.execute(session.prepare(declarations + sql), {'$'+k:v for k,v in params.items()})
    def rows(sql, **params):
        result_set = run(sql, **params)[0]
        if getattr(result_set, 'truncated', False):
            raise ApiError(503, 'Слишком большой набор данных')
        return [dict(row) for row in result_set.rows]
    def user(uid):
        found = rows('SELECT * FROM Users WHERE id=$uid;', uid=uid)
        if not found:
            raise ApiError(404, 'Пользователь удалён')
        return found[0]
    def roles(uid):
        return {row['role'] for row in rows('SELECT role FROM UserRoles WHERE user_id=$uid;', uid=uid)}
    def require_admin():
        if not actor:
            raise ApiError(401, 'Войдите через VK')
        if 'admin' not in actor_roles:
            raise ApiError(403, 'Доступ только для администратора')
    def protect_admin(uid, current_roles):
        if 'admin' not in current_roles:
            return
        if uid == actor_uid:
            raise ApiError(400, 'Нельзя удалить свою роль администратора')
        admins = rows("SELECT user_id FROM UserRoles WHERE role='admin';")
        if len(admins) <= 1:
            raise ApiError(409, 'Нельзя удалить последнего администратора')
    try:
        identities = rows('SELECT user_id FROM VkIdentities WHERE vkontakte_id=$actor;', actor=actor) if actor is not None else []
        actor_uid = identities[0]['user_id'] if identities else None
        actor_user = None
        if actor_uid:
            found = rows('SELECT * FROM Users WHERE id=$uid;', uid=actor_uid)
            if found and found[0]['vkontakte_id'] == actor:
                actor_user = found[0]
            else:
                actor_uid = None
        actor_roles = roles(actor_uid) if actor_uid else set()
        if action in ('list', 'adminList'):
            if action == 'adminList':
                require_admin()
            result = {}
            for key, table, order in [('users','Users','id'), ('roles','UserRoles','user_id, role'),
                                     ('expert_profiles','ExpertProfiles','sort_order, user_id'),
                                     ('events','Events','id'),
                                     ('hosts','HostsV2','user_id, event_id')]:
                result[key] = rows(f'SELECT * FROM {table} ORDER BY {order};')
            if action == 'adminList':
                result['attendance'] = rows('SELECT user_id, event_id FROM AttendanceV2 ORDER BY user_id, event_id;')
            else:
                result['attendance'] = rows(
                    'SELECT event_id FROM AttendanceV2 WHERE user_id=$uid ORDER BY event_id;',
                    uid=actor_uid,
                ) if actor_uid else []
            if 'admin' in actor_roles:
                result['sponsors'] = rows('SELECT id, name, image, link, display FROM Sponsors ORDER BY image, id;')
            else:
                result['sponsors'] = rows('SELECT id, name, image, link, display FROM Sponsors WHERE display = true ORDER BY image, id;')
            for row in result['users']:
                if row['vkontakte_id'] is not None:
                    row['vkontakte_id'] = str(row['vkontakte_id'])
        elif action == 'me':
            if not actor:
                raise ApiError(401, 'Войдите через VK')
            expert = bool(actor_uid and rows('SELECT user_id FROM ExpertProfiles WHERE user_id=$uid;', uid=actor_uid))
            result = {'user_id':actor_uid, 'vkontakte_id':str(actor),
                      'name':actor_user['name'] if actor_user else None,
                      'attendee':'attendee' in actor_roles, 'admin':'admin' in actor_roles, 'expert':expert}
        else:
            require_admin()
            if os.environ.get('ADMIN_WRITES_DISABLED', 'false').lower() == 'true':
                raise ApiError(503, 'Изменения временно приостановлены')
            if action == 'saveUser':
                uid = text(body.get('id',new_id),100,True)
                existing = user(uid) if 'id' in body else None
                vk = None if body.get('vkontakte_id') is None else int64(body['vkontakte_id'])
                old_vk = existing['vkontakte_id'] if existing else None
                name, note = text(body.get('name'),300,True), text(body.get('note',''),4000)
                if existing and vk is None and 'admin' in roles(uid):
                    raise ApiError(400, 'Сначала снимите роль администратора перед отключением VK')
                if uid == actor_uid and vk != actor:
                    raise ApiError(400, 'Нельзя изменить собственную VK-привязку')
                if vk is not None:
                    owners = rows('SELECT user_id FROM VkIdentities WHERE vkontakte_id=$vk;', vk=vk)
                    if owners and owners[0]['user_id'] != uid:
                        raise ApiError(409, 'VK ID уже связан с другим пользователем')
                if old_vk is not None and old_vk != vk:
                    run('DELETE FROM VkIdentities WHERE vkontakte_id=$vk AND user_id=$uid;', vk=old_vk,uid=uid)
                run('UPSERT INTO Users (id,vkontakte_id,name,note) VALUES ($uid,$linked_vk,$name,$note);', uid=uid,linked_vk=vk,name=name,note=note)
                if vk is not None:
                    run('UPSERT INTO VkIdentities (vkontakte_id,user_id) VALUES ($vk,$uid);',vk=vk,uid=uid)
                result = {'ok':True,'id':uid}
            elif action == 'deleteUser':
                uid = text(body.get('id'),100,True)
                target = user(uid)
                if uid == actor_uid:
                    raise ApiError(400, 'Нельзя удалить собственную учётную запись')
                protect_admin(uid,roles(uid))
                for table in ('UserRoles','ExpertProfiles','AttendanceV2','HostsV2','VkIdentities'):
                    run(f'DELETE FROM {table} WHERE user_id=$uid;',uid=uid)
                run('DELETE FROM Users WHERE id=$uid;',uid=uid)
                result = {'ok':True}
            elif action == 'saveRoles':
                uid = text(body.get('user_id'),100,True)
                target = user(uid)
                requested = body.get('roles')
                if not isinstance(requested,list) or any(not isinstance(r,str) or r not in ('attendee','admin') for r in requested) or len(set(requested)) != len(requested):
                    raise ApiError(400, 'Некорректные роли')
                current = roles(uid)
                if 'admin' in requested:
                    target_vk = target['vkontakte_id']
                    linked = rows('SELECT user_id FROM VkIdentities WHERE vkontakte_id=$vk;',vk=target_vk) if target_vk is not None else []
                    if not linked or linked[0]['user_id'] != uid:
                        raise ApiError(409, 'Для администратора требуется подтверждённая VK-привязка')
                if 'admin' not in requested:
                    protect_admin(uid,current)
                run('DELETE FROM UserRoles WHERE user_id=$uid;',uid=uid)
                for role in requested:
                    run('UPSERT INTO UserRoles (user_id,role) VALUES ($uid,$role);',uid=uid,role=role)
                if 'attendee' not in requested:
                    run('DELETE FROM AttendanceV2 WHERE user_id=$uid;',uid=uid)
                result = {'ok':True}
            elif action == 'saveExpertProfile':
                uid = text(body.get('user_id'),100,True)
                user(uid)
                photo = text(body.get('photo'),500,True)
                url = text(body.get('profile_url'),1000,True)
                parsed = parse.urlsplit(url)
                if photo not in allowed_photos() or parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
                    raise ApiError(400, 'Проверьте фотографию и HTTPS-ссылку')
                order = body.get('sort_order')
                if type(order) is not int or not 0 <= order <= 9223372036854775807:
                    raise ApiError(400, 'Некорректный порядок')
                run('UPSERT INTO ExpertProfiles (user_id,photo,profile_url,professional_title,bio,sort_order) VALUES ($uid,$photo,$profile_url,$professional_title,$bio,$sort_order);',uid=uid,photo=photo,profile_url=url,professional_title=text(body.get('professional_title'),500),bio=text(body.get('bio'),10000),sort_order=order)
                result = {'ok':True}
            elif action == 'deleteExpertProfile':
                uid = text(body.get('user_id'),100,True)
                if not rows('SELECT user_id FROM ExpertProfiles WHERE user_id=$uid;',uid=uid):
                    raise ApiError(404, 'Профиль эксперта удалён')
                if rows('SELECT event_id FROM HostsV2 WHERE user_id=$uid;',uid=uid):
                    raise ApiError(409, 'Сначала удалите связи эксперта с событиями')
                run('DELETE FROM ExpertProfiles WHERE user_id=$uid;',uid=uid)
                result = {'ok':True}
            elif action in ('saveEvent','deleteEvent'):
                eid = text(body.get('id',new_id),100,True)
                if action == 'deleteEvent':
                    if not rows('SELECT id FROM Events WHERE id=$eid;',eid=eid):
                        raise ApiError(404, 'Событие удалено')
                    for table in ('AttendanceV2','HostsV2'):
                        run(f'DELETE FROM {table} WHERE event_id=$eid;',eid=eid)
                    run('DELETE FROM Events WHERE id=$eid;',eid=eid)
                else:
                    run('UPSERT INTO Events (id,title,description) VALUES ($eid,$title,$description);',eid=eid,title=text(body.get('title'),300,True),description=text(body.get('description',''),10000))
                result = {'ok':True,'id':eid}
            elif action in ('attendance','host'):
                uid, eid = text(body.get('user_id'),100,True), text(body.get('event_id'),100,True)
                enabled = body.get('enabled')
                if type(enabled) is not bool:
                    raise ApiError(400, 'Некорректное состояние')
                table = 'AttendanceV2' if action == 'attendance' else 'HostsV2'
                if enabled:
                    user(uid)
                    if not rows('SELECT id FROM Events WHERE id=$eid;',eid=eid):
                        raise ApiError(404, 'Событие удалено')
                    eligible = 'attendee' in roles(uid) if action == 'attendance' else bool(rows('SELECT user_id FROM ExpertProfiles WHERE user_id=$uid;',uid=uid))
                    if not eligible:
                        raise ApiError(409, 'Пользователь не участник' if action == 'attendance' else 'Необходим профиль эксперта')
                    run(f'UPSERT INTO {table} (user_id,event_id) VALUES ($uid,$eid);',uid=uid,eid=eid)
                else:
                    run(f'DELETE FROM {table} WHERE user_id=$uid AND event_id=$eid;',uid=uid,eid=eid)
                result = {'ok':True}
            elif action in ('saveSponsor', 'deleteSponsor'):
                sid = text(body.get('id', new_id), 100, True)
                if action == 'deleteSponsor':
                    if not rows('SELECT id FROM Sponsors WHERE id=$sid;', sid=sid):
                        raise ApiError(404, 'Спонсор удалён')
                    run('DELETE FROM Sponsors WHERE id=$sid;', sid=sid)
                else:
                    name = text(body.get('name', ''), 300)
                    image = text(body.get('image', ''), 1000, True)
                    if not valid_sponsor_image(image):
                        raise ApiError(400, 'Проверьте путь к логотипу (logos/...) или URL изображения')
                    link = text(body.get('link', ''), 1000)
                    if link and not valid_sponsor_link(link):
                        raise ApiError(400, 'Проверьте ссылку спонсора (HTTPS или HTTP)')
                    display = body.get('display')
                    if display is None:
                        display = True
                    elif type(display) is not bool:
                        raise ApiError(400, 'Некорректное поле display')
                    run('UPSERT INTO Sponsors (id, name, image, link, display) VALUES ($sid, $name, $image, $link, $display);',
                        sid=sid, name=name, image=image, link=link, display=display)
                result = {'ok': True, 'id': sid}
            else:
                raise ApiError(400, 'Неизвестное действие')
        tx.commit()
        return result
    except Exception:
        # An aborted YDB transaction can also reject rollback; preserve the original
        # exception so retry_operation_sync can recognize retryable failures.
        try:
            tx.rollback()
        except Exception:
            pass
        raise

def handler(event, context):
    headers = {k.lower():v for k,v in (event.get('headers') or {}).items()}
    origin = headers.get('origin')
    response_headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Vary': 'Origin',
        'Access-Control-Allow-Origin': origin or '*',
        'Access-Control-Allow-Headers': 'X-VK-Token, Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    }
    def respond(status, body):
        return {'statusCode':status,'headers':response_headers,'body':json.dumps(body,ensure_ascii=False),'isBase64Encoded':False}
    method = event.get('httpMethod', 'GET').upper()
    if method == 'OPTIONS':
        return respond(204,{})
    if method not in ('GET', 'POST'):
        return respond(405,{'error':'Method not allowed'})
    try:
        raw = event.get('body') or '{}'
        if len(raw) > 24000:
            raise ApiError(413,'Слишком большой запрос')
        if event.get('isBase64Encoded'):
            raw = base64.b64decode(raw).decode()
        body = json.loads(raw) if raw.strip() else {}
        if not isinstance(body,dict):
            raise ApiError(400,'Некорректный запрос')
        action = body.get('action') or ('list' if method == 'GET' else 'list')
        actor = None
        if 'x-vk-token' in headers:
            try:
                actor = vk_identity(headers)
            except ApiError:
                if action != 'list':
                    raise
                actor = None
        elif action != 'list':
            actor = vk_identity(headers)
        new_id = str(uuid.uuid4())
        result = pool().retry_operation_sync(lambda session: operation(session,actor,action,body,new_id))
        return respond(200,result)
    except ApiError as exc:
        return respond(exc.status,{'error':exc.message})
    except (ValueError, TypeError, UnicodeError):
        return respond(400,{'error':'Некорректный запрос'})
    except Exception as exc:
        logging.error('Admin API failed: %s',type(exc).__name__)
        return respond(503,{'error':'Сервис временно недоступен'})
