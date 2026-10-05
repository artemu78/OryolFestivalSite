import unittest
from unittest.mock import Mock, patch
import index

class PolicyTests(unittest.TestCase):
    def session(self, admin=False):
        session = Mock()
        session.prepare.side_effect = lambda sql: sql
        tx = session.transaction.return_value
        tx.execute.return_value = [Mock(rows=[Mock(admin=admin)])]
        return session, tx

    def test_non_admin_cannot_manage(self):
        for action in ['list','saveParticipant','deleteParticipant','saveEvent','deleteEvent','attendance','host']:
            session, tx = self.session()
            with self.assertRaises(index.ApiError) as caught:
                index.operation(session,123,action,{},'new')
            self.assertEqual(caught.exception.status,403)
            self.assertEqual(tx.execute.call_count,1)
            tx.rollback.assert_called_once()
            tx.commit.assert_not_called()

    def test_self_removal_and_demotion_rejected(self):
        for action, body in [('deleteParticipant',{'vkontakte_id':'123'}),('saveParticipant',{'vkontakte_id':'123','admin':False})]:
            session, tx = self.session(True)
            with self.assertRaises(index.ApiError):
                index.operation(session,123,action,body,'new')
            self.assertEqual(tx.execute.call_count,1)
            tx.commit.assert_not_called()

    def test_int64_preserves_large_ids(self):
        self.assertEqual(index.int64('9223372036854775807'),9223372036854775807)
        for value in ['9223372036854775808',0,True,'0','-1','١٢٣','1.2']:
            with self.assertRaises(index.ApiError): index.int64(value)

    def test_vk_token_uses_application_header(self):
        import io
        import os
        with patch.dict(os.environ, {'VK_APP_ID':'54800266'}), patch.object(index.request, 'urlopen') as urlopen:
            urlopen.return_value.__enter__.return_value = io.BytesIO(b'{"user":{"user_id":"10487183"}}')
            self.assertEqual(index.vk_identity({'x-vk-token':'Bearer test-token'}),10487183)
            self.assertIn(b'access_token=test-token', urlopen.call_args.args[0].data)

    def test_missing_bearer_rejected(self):
        with self.assertRaises(index.ApiError) as caught:
            index.vk_identity({})
        self.assertEqual(caught.exception.status,401)

    def test_missing_link_target_rolls_back(self):
        session, tx = self.session(True)
        tx.execute.side_effect = [[Mock(rows=[Mock(admin=True)])], [Mock(rows=[]),Mock(rows=[{'id':'event'}])]]
        with self.assertRaises(index.ApiError) as caught:
            index.operation(session,123,'host',{'vkontakte_id':'456','event_id':'event','enabled':True},'new')
        self.assertEqual(caught.exception.status,404)
        tx.commit.assert_not_called()

if __name__ == '__main__': unittest.main()
