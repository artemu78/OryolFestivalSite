import importlib.util
import json
import unittest
from types import SimpleNamespace
from pathlib import Path

spec = importlib.util.spec_from_file_location('exporter', Path(__file__).with_name('export-public-experts.py'))
e = importlib.util.module_from_spec(spec)
spec.loader.exec_module(e)


class PublicExportTests(unittest.TestCase):
    def setUp(self):
        self.users = [{'id': 'expert-pavlushina', 'name': 'Public name',
                       'vkontakte_id': 123, 'note': 'PRIVATE SENTINEL', 'roles': ['admin']}]
        self.profiles = [{'user_id': 'expert-pavlushina', 'photo': 'girls/pavlushina.jpg',
                          'profile_url': 'https://vk.ru/example', 'professional_title': 'Public title',
                          'bio': 'Public bio', 'sort_order': 0, 'private_extra': 'PRIVATE SENTINEL'}]

    def test_explicit_projection_ignores_private_columns(self):
        rows = e.public_rows(self.users, self.profiles)
        self.assertEqual(set(rows[0]), e.validation.PUBLIC_FIELDS)
        self.assertNotIn('PRIVATE SENTINEL', json.dumps(rows))
        e.validation.validate(rows, [{'people': ['expert-pavlushina']}])

    def test_rename_keeps_programme_identity(self):
        self.users[0]['name'] = 'Renamed public name'
        rows = e.public_rows(self.users, self.profiles)
        e.validation.validate(rows, [{'people': ['expert-pavlushina']}])

    def test_orphan_and_duplicate_profile_block(self):
        with self.assertRaisesRegex(ValueError, 'Orphan'):
            e.public_rows([], self.profiles)
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            e.public_rows(self.users, self.profiles * 2)

    def test_incomplete_truncated_or_missing_columns_block(self):
        users = SimpleNamespace(rows=self.users, truncated=False)
        profiles = SimpleNamespace(rows=self.profiles, truncated=False)
        with self.assertRaisesRegex(ValueError, 'Incomplete'):
            e.result_rows([users])
        with self.assertRaisesRegex(ValueError, 'Incomplete'):
            e.result_rows([users, SimpleNamespace(rows=self.profiles, truncated=True)])
        with self.assertRaises(KeyError):
            e.public_rows(self.users, [{'user_id': 'expert-pavlushina', 'sort_order': 0}])

    def test_stable_sort_tie(self):
        users = self.users + [dict(self.users[0], id='a')]
        profiles = self.profiles + [dict(self.profiles[0], user_id='a')]
        self.assertEqual([r['id'] for r in e.public_rows(users, profiles)], ['a', 'expert-pavlushina'])

    def test_missing_photo_reference_private_field_and_excluded_expert(self):
        rows = e.public_rows(self.users, self.profiles)
        for changes in ({'photo': '../secret'}, {'photo': 'girls/nonexistent.jpg'},
                        {'note': 'private'}, {'name': 'Татьяна Хотеева'},
                        {'name': 'Участник VK 123'}, {'id': 'legacy-vk-123'}):
            invalid = [dict(rows[0], **changes)]
            with self.assertRaises(ValueError):
                e.validation.validate(invalid, [])
        with self.assertRaisesRegex(ValueError, 'Unknown'):
            e.validation.validate(rows, [{'people': ['missing']}])

    def test_checked_in_bootstrap_reproducible_and_valid(self):
        rows = e.bootstrap_rows()
        self.assertEqual(rows, e.bootstrap_rows())
        self.assertEqual(len(rows), 13)
        programme = json.loads((e.ROOT / 'src/program.json').read_text())
        e.validation.validate(rows, programme)
        self.assertEqual([s['id'] for s in programme], list(range(1, 16)))


if __name__ == '__main__':
    unittest.main()
