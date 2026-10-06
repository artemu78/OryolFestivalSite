import importlib.util
from pathlib import Path
import unittest
from uuid import UUID

spec = importlib.util.spec_from_file_location('seed_sponsors', Path(__file__).with_name('seed-sponsors.py'))
seed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seed)


class SponsorImportTests(unittest.TestCase):
    def setUp(self):
        self.rows = seed.seed_rows(seed.ROOT / 'public/logos')

    def test_all_folder_images_get_stable_ids_and_empty_editable_fields(self):
        expected = {'logos/' + path.name for path in (seed.ROOT / 'public/logos').iterdir()
                    if path.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp', '.svg'}}
        self.assertEqual({row['image'] for row in self.rows}, expected)
        self.assertEqual(len({row['id'] for row in self.rows}), len(self.rows))
        self.assertEqual(self.rows, seed.seed_rows(seed.ROOT / 'public/logos'))
        for row in self.rows:
            UUID(row['id'])
            self.assertEqual(row['name'], '')
            self.assertEqual(row['link'], '')
            self.assertIs(row['display'], True)

    def test_repeat_import_preserves_names_links_visibility_and_manual_ids(self):
        edited = [dict(row, id='manual-' + str(i), name='Edited', link='https://example.com', display=False)
                  for i, row in enumerate(self.rows)]
        self.assertEqual(seed.missing_rows(self.rows, edited), [])
        self.assertEqual(seed.missing_rows(self.rows, edited[1:]), [self.rows[0]])

    def test_conflicting_ids_and_duplicate_images_abort(self):
        with self.assertRaises(ValueError):
            seed.missing_rows(self.rows, [dict(self.rows[0], image='logos/other.jpg')])
        with self.assertRaises(ValueError):
            seed.missing_rows(self.rows, [self.rows[0], dict(self.rows[0], id='duplicate')])


if __name__ == '__main__':
    unittest.main()
