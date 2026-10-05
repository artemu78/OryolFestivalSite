import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('migration', Path(__file__).with_name('migrate-identities.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class MigrationTests(unittest.TestCase):
    def setUp(self):
        self.source = {'Participants': [{'vkontakte_id': 123, 'admin': True, 'note': 'private note'}],
                       'Events': [{'id': 'keep-event', 'title': 'title', 'description': ''}],
                       'Attendance': [{'vkontakte_id': 123, 'event_id': 'keep-event'}], 'Hosts': []}
        self.expert = {'name': 'Expert', 'photo': 'girls/pavlushina.jpg', 'profile': 'https://vk.ru/example', 'role': 'Title', 'text': 'Bio'}

    def test_preserves_note_roles_event_and_unlinked_expert(self):
        result = m.plan(self.source, [self.expert], {})
        self.assertEqual(result['Users'][0]['note'], 'private note')
        self.assertEqual({r['role'] for r in result['UserRoles']}, {'attendee', 'admin'})
        self.assertIsNone(result['Users'][1]['vkontakte_id'])
        self.assertEqual(result['AttendanceV2'][0]['event_id'], 'keep-event')
        self.assertEqual(result['Users'][0]['id'], m.legacy_user_id(123))
        self.assertFalse(result['Users'][0]['id'].startswith('legacy-vk-'))
        self.assertEqual(m.legacy_user_id(123), m.legacy_user_id('123'))

    def test_host_needs_explicit_mapping(self):
        self.source['Hosts'] = [{'vkontakte_id': 123, 'event_id': 'keep-event'}]
        with self.assertRaisesRegex(ValueError, 'Unresolved'):
            m.plan(self.source, [self.expert], {})
        result = m.plan(self.source, [self.expert], {'pavlushina': '123'})
        self.assertEqual(len(result['Users']), 1)
        self.assertEqual(result['HostsV2'][0]['user_id'], m.legacy_user_id(123))

    def test_exclusion_and_unknown_mapping(self):
        excluded = dict(self.expert, name='Татьяна Хотеева')
        self.assertEqual(m.plan(self.source, [excluded], {})['ExpertProfiles'], [])
        with self.assertRaises(ValueError):
            m.plan(self.source, [excluded], {'pavlushina': 123})

    def test_duplicates_orphans_and_no_admin_block(self):
        self.source['Participants'].append(dict(self.source['Participants'][0]))
        with self.assertRaises(ValueError):
            m.plan(self.source, [], {})
        self.source['Participants'].pop()
        self.source['Attendance'][0]['event_id'] = 'missing'
        with self.assertRaises(ValueError):
            m.plan(self.source, [], {})
        self.source['Attendance'] = []
        self.source['Participants'][0]['admin'] = False
        with self.assertRaises(ValueError):
            m.plan(self.source, [], {})

    def test_repeat_and_divergence(self):
        result = m.plan(self.source, [self.expert], {})
        self.assertTrue(all(not rows for rows in m.missing_rows(result, result).values()))
        empty = {k: [] for k in result}
        self.assertEqual(m.missing_rows(result, empty), result)
        import copy
        edited = copy.deepcopy(result)
        edited['Users'][0]['note'] = 'new operator edit'
        with self.assertRaisesRegex(ValueError, 'Divergent'):
            m.missing_rows(result, edited)

    def test_duplicate_expert_mapping_and_large_vk(self):
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            m.plan(self.source, [self.expert, dict(self.expert, photo='girls/kordychko.jpg')],
                   {'pavlushina': 123, 'kordychko': 123})
        self.assertEqual(m.vk_id('9223372036854775807'), 9223372036854775807)
        with self.assertRaises(ValueError):
            m.vk_id('9223372036854775808')

    def test_integrity_verification_accepts_later_edits(self):
        result = m.plan(self.source, [self.expert], {})
        result['Users'][0]['note'] = 'later edit'
        m.verify_target(result, self.source['Events'])
        result['VkIdentities'][0]['user_id'] = 'missing'
        with self.assertRaisesRegex(ValueError, 'bijective'):
            m.verify_target(result, self.source['Events'])


if __name__ == '__main__':
    unittest.main()
