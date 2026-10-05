import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('times', Path(__file__).with_name('migrate-event-times.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class EventTimeMigrationTests(unittest.TestCase):
    def test_live_time_is_source_and_other_fields_preserved(self):
        row = dict(id='custom', time='13:00–14:00', title='Custom title', other='keep')
        result = m.planned([row])[0]
        self.assertEqual(result, dict(row, **m.program.parse_time(row['time'])))
        self.assertEqual(m.planned([result]), [result])
        self.assertNotIn('time_start', row)

    def test_conflicting_existing_timestamp_rejected(self):
        with self.assertRaisesRegex(ValueError, 'conflicts'):
            m.planned([dict(id='x', time='13:00', time_start=1)])

    def test_final_comparison_omits_only_legacy_time(self):
        rows = m.planned([dict(id='x', time='18:30', title='Keep')])
        result = m.canonical(rows, drop_time=True)[0]
        self.assertNotIn('time', result)
        self.assertEqual(result['title'], 'Keep')
        self.assertIsNone(result['time_end'])


if __name__ == '__main__':
    unittest.main()
