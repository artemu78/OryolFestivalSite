import copy
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('program_migration', Path(__file__).with_name('migrate-program.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class ProgrammeMigrationTests(unittest.TestCase):
    def setUp(self):
        self.program = json.loads((m.ROOT / 'src/program.json').read_text())
        self.seeds = json.loads((m.ROOT / 'infra/yandex/events-seed.json').read_text())
        self.users = [{'id': p['id']} for p in json.loads((m.ROOT / 'src/experts.json').read_text())]
        self.profiles = [{'user_id': p['id']} for p in self.users]

    def plan(self, events=None, hosts=None):
        return m.plan(self.program, self.seeds, self.users, self.profiles,
                      events or [], hosts or [])

    def test_complete_import_into_empty_tables(self):
        events, hosts = self.plan()
        self.assertEqual(len(events), 15)
        self.assertEqual(len(hosts), sum(len(p.get('people', [])) for p in self.program))
        for order, (source, event) in enumerate(zip(self.program, events)):
            self.assertEqual(event['id'], f"program-{source['id']:02d}")
            self.assertEqual(event['program_id'], source['id'])
            self.assertEqual(event['sort_order'], order)
            self.assertEqual(event['description'], source['text'])
            self.assertEqual({k: event[k] for k in ('time_start', 'time_end')}, m.parse_time(source['time']))
            for field in ['title', 'category', 'tag', 'location', 'access', 'background']:
                self.assertEqual(event[field], source.get(field))
            self.assertEqual({r['user_id'] for r in hosts if r['event_id'] == event['id']},
                             set(source.get('people', [])))

    def test_timestamps_and_timezone(self):
        from datetime import datetime, timezone
        times = m.parse_time('11:30–11:50')
        self.assertEqual(datetime.fromtimestamp(times['time_start'] / 1_000_000, timezone.utc).isoformat(),
                         '2026-10-10T08:30:00+00:00')
        self.assertEqual(times['time_end'] - times['time_start'], 20 * 60 * 1_000_000)
        self.assertIsNone(m.parse_time('18:30')['time_end'])
        self.assertEqual(m.parse_time(None), dict(time_start=None, time_end=None))
        for invalid in ('18:30–11:30', '11:30–11:30', '25:00', '', 'tomorrow'):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                m.parse_time(invalid)

    def test_preserves_existing_ids_and_is_repeatable(self):
        events, hosts = self.plan(self.seeds)
        self.assertEqual((events, hosts), self.plan(events, hosts))
        self.program.reverse()
        reordered, _ = self.plan(events, hosts)
        self.assertEqual(reordered[0]['id'], 'program-15')
        self.assertEqual(reordered[0]['sort_order'], 0)

    def test_missing_user_and_profile_rejected(self):
        self.users = []
        with self.assertRaisesRegex(ValueError, 'missing from Users'):
            self.plan()
        self.setUp()
        self.profiles = []
        with self.assertRaisesRegex(ValueError, 'missing expert profile'):
            self.plan()

    def test_duplicate_ids_hosts_and_unknown_fields_rejected(self):
        self.program.append(copy.deepcopy(self.program[0]))
        with self.assertRaisesRegex(ValueError, 'duplicate programme ID'):
            self.plan()
        self.setUp()
        self.program[1]['people'] *= 2
        with self.assertRaisesRegex(ValueError, 'Duplicate host'):
            self.plan()
        self.setUp()
        self.program[0]['unmapped'] = 'must not silently drop'
        with self.assertRaisesRegex(ValueError, 'unsupported'):
            self.plan()

    def test_existing_host_conflict_rejected(self):
        with self.assertRaisesRegex(ValueError, 'conflict'):
            self.plan(hosts=[dict(event_id='program-01', user_id='expert-anicha')])

    def test_verification_preserves_unrelated_rows(self):
        events, hosts = self.plan()
        before = dict(Events=[dict(id='custom', title='Custom', description='Keep')],
                      HostsV2=[dict(event_id='custom', user_id='expert-anicha')])
        after = dict(Events=before['Events'] + events, HostsV2=before['HostsV2'] + hosts)
        m.verify(events, hosts, before, after)
        after['HostsV2'] = hosts
        with self.assertRaisesRegex(ValueError, 'Host read-back'):
            m.verify(events, hosts, before, after)


if __name__ == '__main__':
    unittest.main()
