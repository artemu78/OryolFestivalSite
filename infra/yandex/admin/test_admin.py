"""Stateful policy tests: execute SQL against an isolated relational store.

This checks application semantics and atomic rollback, not YDB's query dialect
or distributed serializability; those require live YDB integration verification.
"""
import io
import os
import re
import sqlite3
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

try:
    import ydb
    import ydb.iam
except ImportError:
    sys.modules['ydb'] = MagicMock()
    sys.modules['ydb.iam'] = MagicMock()

import index


class Session:
    def __init__(self):
        self.db = sqlite3.connect(':memory:')
        self.db.row_factory = sqlite3.Row
        self.db.executescript('''
        CREATE TABLE Users(id TEXT PRIMARY KEY,vkontakte_id INTEGER,name TEXT,note TEXT);
        CREATE TABLE VkIdentities(vkontakte_id INTEGER PRIMARY KEY,user_id TEXT);
        CREATE TABLE UserRoles(user_id TEXT,role TEXT,PRIMARY KEY(user_id,role));
        CREATE TABLE ExpertProfiles(user_id TEXT PRIMARY KEY,photo TEXT,profile_url TEXT,professional_title TEXT,bio TEXT,sort_order INTEGER);
        CREATE TABLE Events(id TEXT PRIMARY KEY,title TEXT,description TEXT);
        CREATE TABLE AttendanceV2(user_id TEXT,event_id TEXT,PRIMARY KEY(user_id,event_id));
        CREATE TABLE HostsV2(user_id TEXT,event_id TEXT,PRIMARY KEY(user_id,event_id));
        CREATE TABLE Sponsors(id TEXT PRIMARY KEY,name TEXT,image TEXT,link TEXT,display BOOLEAN);
        INSERT INTO Users VALUES('admin',123,'Admin','');
        INSERT INTO VkIdentities VALUES(123,'admin');
        INSERT INTO UserRoles VALUES('admin','admin');
        INSERT INTO Users VALUES('other',456,'Other','');
        INSERT INTO VkIdentities VALUES(456,'other');
        INSERT INTO Events VALUES('event','Event','');
        ''')
        self.tx = None

    def prepare(self, sql):
        return sql

    def transaction(self, mode):
        self.tx = Transaction(self.db)
        return self.tx


class Transaction:
    def __init__(self, db):
        self.db = db
        self.writes = 0
        db.execute('BEGIN')

    def execute(self, sql, params):
        sql = re.sub(r'DECLARE \$\w+ AS [^;]+;', '', sql)
        values = {key[1:]:value for key,value in params.items()}
        results = []
        for statement in sql.split(';'):
            statement = statement.strip()
            if not statement:
                continue
            if statement.startswith('UPSERT INTO'):
                self.writes += 1
                # SQLite REPLACE implements these full-column primary-key upserts.
                statement = statement.replace('UPSERT INTO','INSERT OR REPLACE INTO',1)
            elif statement.startswith('DELETE'):
                self.writes += 1
            cursor = self.db.execute(statement, values)
            results.append(SimpleNamespace(rows=[dict(row) for row in cursor.fetchall()]))
        return results

    def commit(self):
        self.db.commit()

    def rollback(self):
        self.db.rollback()


class PolicyTests(unittest.TestCase):
    def setUp(self):
        self.session = Session()
        self.addCleanup(self.session.db.close)

    def call(self, action, actor=123, **body):
        return index.operation(self.session,actor,action,body,'generated-id')

    def denied(self, status, action, **body):
        with self.assertRaises(index.ApiError) as caught:
            self.call(action,**body)
        self.assertEqual(caught.exception.status,status)

    def table(self, table):
        return [dict(row) for row in self.session.db.execute('SELECT * FROM '+table)]

    def test_public_list_includes_only_visible_sponsors_and_reflects_edits(self):
        self.session.db.executescript('''
        INSERT INTO Sponsors VALUES('visible','','logos/anicha.jpg','',true);
        INSERT INTO Sponsors VALUES('hidden','Hidden','logos/braf.jpg','https://example.com',false);
        ''')
        result = self.call('list', actor=None)
        self.assertEqual(result['sponsors'], [dict(id='visible', name='', image='logos/anicha.jpg', link='', display=1)])
        self.session.db.execute("UPDATE Sponsors SET name='Sponsor',link='https://example.com' WHERE id='visible'")
        self.session.db.commit()
        self.assertEqual(self.call('list', actor=None)['sponsors'][0]['link'], 'https://example.com')
        self.session.db.execute('UPDATE Sponsors SET display=false')
        self.session.db.commit()
        self.assertEqual(self.call('list', actor=None)['sponsors'], [])

    def test_list_attendance_is_current_user_only_without_user_id(self):
        self.session.db.executescript('''
        INSERT INTO AttendanceV2 VALUES('admin','admin-event');
        INSERT INTO AttendanceV2 VALUES('other','other-event');
        INSERT INTO AttendanceV2 VALUES('other','another-event');
        ''')
        self.assertEqual(self.call('list', actor=123)['attendance'],
                         [{'event_id': 'admin-event'}])
        self.assertEqual(self.call('list', actor=456, user_id='admin')['attendance'],
                         [{'event_id': 'another-event'}, {'event_id': 'other-event'}])
        for actor in (None, 999):
            self.assertEqual(self.call('list', actor=actor)['attendance'], [])
        self.call('saveUser', id='other', vkontakte_id=None, name='Other', note='')
        self.assertEqual(self.call('list', actor=456)['attendance'], [])

    def test_admin_list_returns_all_attendance_and_refreshes_after_changes(self):
        self.call('saveRoles', user_id='admin', roles=['admin', 'attendee'])
        self.call('saveRoles', user_id='other', roles=['attendee'])
        for uid in ('admin', 'other'):
            self.call('attendance', user_id=uid, event_id='event', enabled=True)
        listing = self.call('adminList')
        self.assertEqual(listing['attendance'], [
            {'user_id': 'admin', 'event_id': 'event'},
            {'user_id': 'other', 'event_id': 'event'},
        ])
        public_listing = self.call('list')
        self.assertEqual(public_listing['attendance'], [{'event_id': 'event'}])
        for key in listing.keys() - {'attendance'}:
            self.assertEqual(listing[key], public_listing[key])
        self.call('attendance', user_id='other', event_id='event', enabled=False)
        self.assertEqual(self.call('adminList')['attendance'],
                         [{'user_id': 'admin', 'event_id': 'event'}])

    def test_admin_list_requires_current_admin_role(self):
        for actor, status in ((None, 401), (456, 403), (999, 403)):
            self.denied(status, 'adminList', actor=actor)
            self.assertEqual(self.session.tx.writes, 0)
        self.call('saveRoles', user_id='other', roles=['admin'])
        self.call('adminList', actor=456)
        self.call('saveRoles', user_id='other', roles=[])
        self.denied(403, 'adminList', actor=456)

    def test_admin_list_handler_rejects_missing_or_invalid_token(self):
        with patch.object(index, 'pool') as pool:
            response = index.handler({'httpMethod': 'POST', 'body': '{"action":"adminList"}'}, None)
            self.assertEqual(response['statusCode'], 401)
            with patch.object(index, 'vk_identity', side_effect=index.ApiError(401, 'Invalid token')):
                response = index.handler({
                    'httpMethod': 'POST', 'body': '{"action":"adminList"}',
                    'headers': {'X-VK-Token': 'Bearer invalid'},
                }, None)
            self.assertEqual(response['statusCode'], 401)
            pool.assert_not_called()

    def test_unknown_login_does_not_write(self):
        self.assertEqual(self.call('me',actor=999),dict(user_id=None,vkontakte_id='999',name=None,attendee=False,admin=False,expert=False))
        self.assertEqual(self.session.tx.writes,0)
        self.assertEqual(len(self.table('Users')),2)
        listing = self.call('list',actor=999)
        self.assertEqual(set(listing),{'users','roles','expert_profiles','events','attendance','hosts','sponsors'})

    def test_unauthenticated_user_can_list_but_not_manage(self):
        listing = self.call('list',actor=None)
        self.assertEqual(set(listing),{'users','roles','expert_profiles','events','attendance','hosts','sponsors'})
        self.denied(401,'me',actor=None)
        for action in ('saveUser','deleteUser','saveRoles','saveExpertProfile','deleteExpertProfile','saveEvent','deleteEvent','saveSponsor','deleteSponsor','attendance','host'):
            self.denied(401,action,actor=None)
            self.assertEqual(self.session.tx.writes,0)

    def test_non_admin_cannot_manage(self):
        for action in ('saveUser','deleteUser','saveRoles','saveExpertProfile','deleteExpertProfile','saveEvent','deleteEvent','saveSponsor','deleteSponsor','attendance','host'):
            self.denied(403,action,actor=456)
            self.assertEqual(self.session.tx.writes,0)

    def profile(self, uid='other'):
        self.call('saveExpertProfile',user_id=uid,photo=next(iter(index.allowed_photos())),profile_url='https://vk.com/example',professional_title='Psychologist',bio='Bio',sort_order=0)

    def test_overlapping_roles(self):
        self.call('saveRoles',user_id='other',roles=['admin','attendee'])
        self.profile()
        self.assertEqual(self.call('me',actor=456),dict(user_id='other',vkontakte_id='456',name='Other',attendee=True,admin=True,expert=True))
        listing = self.call('list')
        self.assertEqual(listing['users'][0]['vkontakte_id'],'123')
        self.assertEqual(set(listing),{'users','roles','expert_profiles','events','attendance','hosts','sponsors'})

    def test_identity_conflict_and_relink(self):
        self.denied(409,'saveUser',id='other',vkontakte_id='123',name='Other',note='')
        self.assertEqual(self.table('VkIdentities')[1]['vkontakte_id'],456)
        self.call('saveUser',id='other',vkontakte_id='789',name='Renamed',note='private')
        self.assertFalse(self.call('me',actor=456)['attendee'])
        self.assertIsNone(self.call('me',actor=456)['user_id'])
        self.assertEqual(self.call('me',actor=789)['name'],'Renamed')
        self.call('saveUser',id='other',vkontakte_id=None,name='Renamed',note='')
        self.assertEqual(len(self.table('VkIdentities')),1)

    def test_self_protection(self):
        self.denied(400,'deleteUser',id='admin')
        self.denied(400,'saveRoles',user_id='admin',roles=['attendee'])
        self.denied(400,'saveUser',id='admin',vkontakte_id=None,name='Admin',note='')
        self.denied(400,'saveUser',id='admin',vkontakte_id='789',name='Admin',note='')
        self.assertEqual(self.table('UserRoles'),[dict(user_id='admin',role='admin')])

    def test_last_admin_guard(self):
        # Exercise the range-read guard directly: actor role is observed at auth,
        # then simulate an inconsistent range containing only the target.
        original = Transaction.execute
        def execute(tx,sql,params):
            if "WHERE role='admin'" in sql:
                return [SimpleNamespace(rows=[dict(user_id='other')])]
            return original(tx,sql,params)
        self.call('saveRoles',user_id='other',roles=['admin'])
        with patch.object(Transaction,'execute',execute):
            self.denied(409,'saveRoles',user_id='other',roles=[])
        self.assertEqual(len(self.table('UserRoles')),2)

    def test_admin_requires_usable_identity(self):
        self.call('saveUser',id='other',vkontakte_id=None,name='Other',note='')
        self.denied(409,'saveRoles',user_id='other',roles=['admin'])
        self.call('saveUser',id='other',vkontakte_id='456',name='Other',note='')
        self.call('saveRoles',user_id='other',roles=['admin'])
        self.denied(400,'saveUser',id='other',vkontakte_id=None,name='Other',note='')
        self.assertEqual(self.call('me',actor=456)['admin'],True)

    def test_truncated_results_are_rejected(self):
        original = Transaction.execute
        def execute(tx,sql,params):
            result = original(tx,sql,params)
            result[0].truncated = True
            return result
        with patch.object(Transaction,'execute',execute):
            self.denied(503,'list')

    def test_role_removal_cleans_attendance(self):
        self.denied(409,'attendance',user_id='other',event_id='event',enabled=True)
        self.call('saveRoles',user_id='other',roles=['attendee'])
        self.call('attendance',user_id='other',event_id='event',enabled=True)
        self.call('saveRoles',user_id='other',roles=[])
        self.assertEqual(self.table('AttendanceV2'),[])
        self.denied(400,'saveRoles',user_id='other',roles=['admin','admin'])
        self.denied(400,'saveRoles',user_id='other',roles=['expert'])

    def test_host_and_profile_deletion(self):
        self.denied(409,'host',user_id='other',event_id='event',enabled=True)
        self.profile()
        self.call('host',user_id='other',event_id='event',enabled=True)
        self.denied(409,'deleteExpertProfile',user_id='other')
        self.assertEqual(len(self.table('ExpertProfiles')),1)
        self.call('host',user_id='other',event_id='event',enabled=False)
        self.call('deleteExpertProfile',user_id='other')
        self.denied(404,'deleteExpertProfile',user_id='other')

    def test_stale_links_can_be_disabled(self):
        self.session.db.execute("INSERT INTO HostsV2 VALUES('missing','gone')")
        self.session.db.commit()
        self.call('host',user_id='missing',event_id='gone',enabled=False)
        self.assertEqual(self.table('HostsV2'),[])
        self.denied(404,'host',user_id='missing',event_id='gone',enabled=True)
        self.denied(400,'attendance',user_id='other',event_id='event',enabled=1)

    def test_event_and_user_cascades(self):
        self.profile()
        self.call('saveRoles',user_id='other',roles=['attendee','admin'])
        for action in ('host','attendance'):
            self.call(action,user_id='other',event_id='event',enabled=True)
        self.call('deleteEvent',id='event')
        self.assertEqual(self.table('HostsV2'),[])
        self.assertEqual(self.table('AttendanceV2'),[])
        self.denied(404,'deleteEvent',id='event')
        self.call('deleteUser',id='other')
        for table in ('VkIdentities','UserRoles','ExpertProfiles'):
            self.assertTrue(all(row.get('user_id') != 'other' for row in self.table(table)))
        self.denied(404,'deleteUser',id='other')

    def test_profile_validation(self):
        fields = dict(user_id='other',photo='../secret',profile_url='https://vk.com/example',professional_title='',bio='',sort_order=0)
        self.denied(400,'saveExpertProfile',**fields)
        fields.update(photo=next(iter(index.allowed_photos())),profile_url='http://vk.com/example')
        self.denied(400,'saveExpertProfile',**fields)
        fields.update(profile_url='https://vk.com/example',sort_order=True)
        self.denied(400,'saveExpertProfile',**fields)

    def test_maintenance_all_writes(self):
        with patch.dict(os.environ,{'ADMIN_WRITES_DISABLED':'true'}):
            self.call('me')
            self.call('list')
            self.call('adminList')
            for action in ('saveUser','deleteUser','saveRoles','saveExpertProfile','deleteExpertProfile','saveEvent','deleteEvent','saveSponsor','deleteSponsor','attendance','host'):
                self.denied(503,action)
                self.assertEqual(self.session.tx.writes,0)

    def test_admin_list_includes_all_sponsors_and_manages_them(self):
        self.session.db.executescript('''
        INSERT INTO Sponsors VALUES('s1','Sponsor 1','logos/anicha.jpg','https://example.com',true);
        INSERT INTO Sponsors VALUES('s2','Sponsor 2','logos/braf.jpg','',false);
        ''')
        # Non-admin sees only visible sponsor s1
        public_list = self.call('list', actor=None)
        self.assertEqual(len(public_list['sponsors']), 1)
        self.assertEqual(public_list['sponsors'][0]['id'], 's1')

        # Admin sees both sponsors s1 and s2
        admin_list = self.call('list', actor=123)
        self.assertEqual(len(admin_list['sponsors']), 2)

        # Admin creates new sponsor
        create_res = self.call('saveSponsor', actor=123, name='New Sponsor', image='logos/freedom.jpg', link='https://freedom.ru', display=True)
        self.assertTrue(create_res['ok'])
        new_sid = create_res['id']
        rows = self.table('Sponsors')
        self.assertEqual(len(rows), 3)

        # Admin updates existing sponsor (replace pic, url, display)
        update_res = self.call('saveSponsor', actor=123, id=new_sid, name='Updated Freedom', image='logos/happy.jpg', link='https://happy.ru', display=False)
        self.assertTrue(update_res['ok'])
        updated = [r for r in self.table('Sponsors') if r['id'] == new_sid][0]
        self.assertEqual(updated['name'], 'Updated Freedom')
        self.assertEqual(updated['image'], 'logos/happy.jpg')
        self.assertEqual(updated['link'], 'https://happy.ru')
        self.assertFalse(bool(updated['display']))

        # Admin deletes sponsor
        delete_res = self.call('deleteSponsor', actor=123, id=new_sid)
        self.assertTrue(delete_res['ok'])
        self.assertEqual(len(self.table('Sponsors')), 2)
        self.denied(404, 'deleteSponsor', actor=123, id=new_sid)

    def test_sponsor_validation(self):
        # Invalid image path
        self.denied(400, 'saveSponsor', actor=123, name='Bad', image='../secret.jpg', link='', display=True)
        self.denied(400, 'saveSponsor', actor=123, name='Bad', image='javascript:alert(1)', link='', display=True)
        # Invalid link
        self.denied(400, 'saveSponsor', actor=123, name='Bad', image='logos/anicha.jpg', link='ftp://invalid', display=True)
        # Invalid display
        self.denied(400, 'saveSponsor', actor=123, name='Bad', image='logos/anicha.jpg', link='', display='yes')
        # Valid remote image URL
        res = self.call('saveSponsor', actor=123, name='Remote', image='https://cdn.example.com/logo.png', link='', display=True)
        self.assertTrue(res['ok'])

    def test_rollback_after_partial_write(self):
        original = Transaction.execute
        def fail(tx,sql,params):
            if 'UPSERT INTO VkIdentities' in sql:
                raise RuntimeError('simulated database failure')
            return original(tx,sql,params)
        with patch.object(Transaction,'execute',fail), self.assertRaises(RuntimeError):
            self.call('saveUser',vkontakte_id='777',name='New',note='')
        self.assertEqual(len(self.table('Users')),2)

    def test_retry_preserves_generated_id(self):
        seen=[]
        class RetryPool:
            def retry_operation_sync(inner, callback):
                for attempt in range(2):
                    session = Session()
                    try:
                        result=callback(session)
                        seen.append(result['id'])
                    finally:
                        session.db.close()
                return result
        with patch.object(index,'vk_identity',return_value=123),patch.object(index,'pool',return_value=RetryPool()):
            response=index.handler({'httpMethod':'POST','body':'{"action":"saveUser","name":"New","vkontakte_id":null,"note":""}'},None)
        self.assertEqual(response['statusCode'],200)
        self.assertEqual(seen[0],seen[1])

    def test_int64_and_vk_token(self):
        self.assertEqual(index.int64('9223372036854775807'),9223372036854775807)
        for value in ('9223372036854775808',0,True,'0','-1','١٢٣','1.2'):
            with self.assertRaises(index.ApiError): index.int64(value)
        with patch.dict(os.environ,{'VK_APP_ID':'54800266'}),patch.object(index.request,'urlopen') as urlopen:
            urlopen.return_value.__enter__.return_value=io.BytesIO(b'{"user":{"user_id":"10487183"}}')
            self.assertEqual(index.vk_identity({'x-vk-token':'Bearer token'}),10487183)
        with self.assertRaises(index.ApiError): index.vk_identity({})


if __name__ == '__main__': unittest.main()
