"""Import the complete static programme into existing Events and HostsV2.

Dry-run by default. --execute adds nullable columns and atomically imports data.
Existing Events IDs and unrelated events/host links are preserved.
"""
import argparse
import importlib.util
import json
import os
import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NEW_COLUMNS = {**{key: 'Utf8?' for key in (
    'category', 'tag', 'location', 'access', 'background')},
    'program_id': 'Int64?', 'sort_order': 'Int64?',
    'time_start': 'Timestamp?', 'time_end': 'Timestamp?'}
EVENT_COLUMNS = {'id': 'Utf8', 'title': 'Utf8', 'description': 'Utf8', **NEW_COLUMNS}
REQUIRED = {'id', 'time', 'category', 'tag', 'title', 'text'}
OPTIONAL = {'location', 'access', 'background', 'people'}

spec = importlib.util.spec_from_file_location('identities', Path(__file__).with_name('migrate-identities.py'))
identities = importlib.util.module_from_spec(spec)
spec.loader.exec_module(identities)


def parse_time(value):
    """2026-10-10 Europe/Moscow wall time -> YDB UTC epoch microseconds."""
    if value is None:
        return {'time_start': None, 'time_end': None}
    match = re.fullmatch(r'(\d{2}):(\d{2})(?:\s*[–—-]\s*(\d{2}):(\d{2}))?', value.strip())
    if not match:
        raise ValueError(f'Invalid event time: {value!r}')
    def stamp(hour, minute):
        local = datetime(2026, 10, 10, int(hour), int(minute), tzinfo=ZoneInfo('Europe/Moscow'))
        return (local - datetime(1970, 1, 1, tzinfo=timezone.utc)) // timedelta(microseconds=1)
    start = stamp(match[1], match[2])
    end = stamp(match[3], match[4]) if match[3] is not None else None
    if end is not None and end <= start:
        raise ValueError('Event end must be later than start on festival day')
    return {'time_start': start, 'time_end': end}


def plan(program, seeds, users, profiles, current_events, current_hosts):
    """Validate exact identity matches before any database mutation."""
    if not program:
        raise ValueError('Programme is empty')
    seed_map = {row['id']: row for row in seeds}
    existing = {row['id']: row for row in current_events}
    user_ids = {row['id'] for row in users}
    profile_ids = {row['user_id'] for row in profiles}
    events, hosts, seen = [], [], set()
    for order, item in enumerate(program):
        if REQUIRED - item.keys() or item.keys() - REQUIRED - OPTIONAL:
            raise ValueError('Missing or unsupported programme fields')
        number = item['id']
        if type(number) is not int or number < 1 or number in seen:
            raise ValueError('Invalid or duplicate programme ID')
        seen.add(number)
        eid = f'program-{number:02d}'
        if eid not in seed_map:
            raise ValueError(f'No seeded event mapping for programme ID {number}')
        if eid in existing and existing[eid]['title'] not in (seed_map[eid]['title'], item['title']):
            raise ValueError(f'Event identity/title conflict: {eid}')
        for key in REQUIRED - {'id'}:
            if not isinstance(item[key], str) or not item[key]:
                raise ValueError(f'Invalid programme field: {key}')
        for key in OPTIONAL - {'people'}:
            if key in item and not isinstance(item[key], str):
                raise ValueError(f'Invalid programme field: {key}')
        people = item.get('people', [])
        if not isinstance(people, list) or any(not isinstance(uid, str) for uid in people):
            raise ValueError('people must be an array of Users.id strings')
        if len(people) != len(set(people)):
            raise ValueError(f'Duplicate host: {eid}')
        for uid in people:
            if uid not in user_ids:
                raise ValueError(f'Host missing from Users: {uid}')
            if uid not in profile_ids:
                raise ValueError(f'Host missing expert profile: {uid}')
            hosts.append(dict(event_id=eid, user_id=uid))
        events.append(dict(id=eid, title=item['title'], description=item['text'],
                           program_id=number, sort_order=order, **parse_time(item['time']),
                           **{k: item.get(k) for k in NEW_COLUMNS if k not in ('program_id', 'sort_order', 'time_start', 'time_end')}))
    expected = {(r['event_id'], r['user_id']) for r in hosts}
    event_ids = {r['id'] for r in events}
    if any(r['event_id'] in event_ids and (r['event_id'], r['user_id']) not in expected
           for r in current_hosts):
        raise ValueError('Existing programme host links conflict; refusing to delete them')
    return events, hosts


def snapshot(session, tx):
    result = identities.read_tables(session, tx, ('Events', 'HostsV2'))
    for table, columns in [('Users', 'id'), ('ExpertProfiles', 'user_id')]:
        sets = tx.execute(session.prepare(f'SELECT {columns} FROM `{table}`;'))
        if len(sets) != 1 or sets[0].truncated:
            raise ValueError('Incomplete identity read')
        result[table] = [dict(row) for row in sets[0].rows]
    return result


def projected_events(rows):
    return sorted(({k: row.get(k) for k in EVENT_COLUMNS} for row in rows), key=lambda row: row['id'])


def verify(events, hosts, before, after):
    expected_events = {row['id']: row for row in before['Events']}
    expected_events.update({row['id']: row for row in events})
    if projected_events(after['Events']) != projected_events(expected_events.values()):
        raise ValueError('Event read-back mismatch')
    links = lambda rows: {(r['event_id'], r['user_id']) for r in rows}
    if links(after['HostsV2']) != links(before['HostsV2']) | links(hosts):
        raise ValueError('Host read-back mismatch')


def upsert(session, tx, table, columns, rows):
    declarations = ' '.join(f'DECLARE ${key} AS {kind};' for key, kind in columns.items())
    names = ','.join(f'`{key}`' for key in columns)
    values = ','.join('$' + key for key in columns)
    query = session.prepare(f'{declarations} UPSERT INTO `{table}` ({names}) VALUES ({values});')
    for row in rows:
        tx.execute(query, {'$' + key: row[key] for key in columns})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--backup', type=Path, help='Required for execution; new private file outside repository')
    args = parser.parse_args()
    if args.execute and not args.backup:
        parser.error('--execute requires --backup')
    program = json.loads((ROOT / 'src/program.json').read_text())
    seeds = json.loads((ROOT / 'infra/yandex/events-seed.json').read_text())
    import ydb
    import ydb.iam
    with ydb.Driver(endpoint=os.environ['YDB_ENDPOINT'], database=os.environ['YDB_DATABASE'],
                    credentials=ydb.iam.ServiceAccountCredentials.from_file(os.environ['YC_SERVICE_ACCOUNT_KEY_FILE'])) as driver:
        driver.wait(timeout=30, fail_fast=True)
        with ydb.SessionPool(driver, size=1) as pool:
            def read(session):
                with session.transaction(ydb.SerializableReadWrite()) as tx:
                    result = snapshot(session, tx)
                    tx.commit()
                    return result
            before = pool.retry_operation_sync(read)
            def make_plan(data):
                return plan(program, seeds, data['Users'], data['ExpertProfiles'], data['Events'], data['HostsV2'])
            events, hosts = make_plan(before)
            if args.execute:
                identities.write_backup(args.backup, {k: before[k] for k in ('Events', 'HostsV2')})
                def add_columns(session):
                    current = {c.name: str(c.type) for c in session.describe_table(os.environ['YDB_DATABASE'] + '/Events').columns}
                    additions = []
                    for key, kind in NEW_COLUMNS.items():
                        primitive = getattr(ydb.PrimitiveType, kind.rstrip('?'))
                        column_type = ydb.OptionalType(primitive)
                        if key in current:
                            if current[key] != str(column_type):
                                raise ValueError(f'Unexpected Events column type: {key}')
                        else:
                            additions.append(ydb.Column(key, column_type))
                    if additions:
                        session.alter_table(os.environ['YDB_DATABASE'] + '/Events', add_columns=additions)
                pool.retry_operation_sync(add_columns)
                def apply(session):
                    with session.transaction(ydb.SerializableReadWrite()) as tx:
                        current = snapshot(session, tx)
                        planned_events, planned_hosts = make_plan(current)
                        # Successful retry after an uncertain commit is a no-op.
                        try:
                            verify(planned_events, planned_hosts, before, current)
                        except ValueError:
                            if (projected_events(current['Events']) != projected_events(before['Events'])
                                    or sorted(current['HostsV2'], key=lambda r: (r['event_id'], r['user_id']))
                                    != sorted(before['HostsV2'], key=lambda r: (r['event_id'], r['user_id']))):
                                raise ValueError('Events/hosts changed since backup; rerun with a fresh backup')
                            upsert(session, tx, 'Events', EVENT_COLUMNS, planned_events)
                            upsert(session, tx, 'HostsV2', {'event_id': 'Utf8', 'user_id': 'Utf8'}, planned_hosts)
                            verify(planned_events, planned_hosts, before, snapshot(session, tx))
                        tx.commit()
                pool.retry_operation_sync(apply)
                verify(events, hosts, before, pool.retry_operation_sync(read))
    print(json.dumps({'mode': 'executed' if args.execute else 'dry-run',
                      'events': len(events), 'host_links': len(hosts),
                      'distinct_hosts': len({r['user_id'] for r in hosts})}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        message = str(error) if isinstance(error, ValueError) else f'Programme migration failed ({type(error).__name__})'
        raise SystemExit(message) from None
