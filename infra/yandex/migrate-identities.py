"""Small-festival atomic migration. Backups are private and outside the repository."""
import argparse
import json
import os
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LEGACY = ('Participants', 'Events', 'Attendance', 'Hosts')
COLUMNS = {
    'Users': {'id': 'Utf8', 'vkontakte_id': 'Int64?', 'name': 'Utf8', 'note': 'Utf8'},
    'VkIdentities': {'vkontakte_id': 'Int64', 'user_id': 'Utf8'},
    'UserRoles': {'user_id': 'Utf8', 'role': 'Utf8'},
    'ExpertProfiles': {'user_id': 'Utf8', 'photo': 'Utf8', 'profile_url': 'Utf8',
                       'professional_title': 'Utf8', 'bio': 'Utf8', 'sort_order': 'Int64'},
    'AttendanceV2': {'user_id': 'Utf8', 'event_id': 'Utf8'},
    'HostsV2': {'user_id': 'Utf8', 'event_id': 'Utf8'},
}
KEYS = {'Users': ('id',), 'VkIdentities': ('vkontakte_id',),
        'UserRoles': ('user_id', 'role'), 'ExpertProfiles': ('user_id',),
        'AttendanceV2': ('user_id', 'event_id'), 'HostsV2': ('user_id', 'event_id')}


IDENTITY_NAMESPACE = uuid.UUID('18b1514f-3c43-5e27-a32f-8daf02039c36')


def legacy_user_id(vk):
    return str(uuid.uuid5(IDENTITY_NAMESPACE, f'vk:{vk_id(vk)}'))


def vk_id(value):
    if isinstance(value, bool) or not str(value).isdigit() or not 0 < int(value) < 2**63:
        raise ValueError('Invalid VK identity')
    return int(value)


def plan(source, experts, mapping):
    """Mapping keys are portrait basenames; values are verified legacy VK IDs."""
    out = {table: [] for table in COLUMNS}
    people = {}
    for row in source['Participants']:
        vk = vk_id(row['vkontakte_id'])
        if vk in people or type(row['admin']) is not bool:
            raise ValueError('Duplicate identity or invalid admin flag')
        uid = legacy_user_id(vk)
        people[vk] = uid
        out['Users'].append(dict(id=uid, vkontakte_id=vk, name=f'Участник VK {vk}', note=row['note']))
        out['VkIdentities'].append(dict(vkontakte_id=vk, user_id=uid))
        for role in ('attendee', 'admin') if row['admin'] else ('attendee',):
            out['UserRoles'].append(dict(user_id=uid, role=role))
    approved = [e for e in experts if e['name'] != 'Татьяна Хотеева']
    used_mapping = set()
    for position, expert in enumerate(approved):
        photo = Path(expert['photo'])
        if photo.is_absolute() or '..' in photo.parts or not (ROOT / 'public' / photo).is_file():
            raise ValueError('Invalid or missing portrait')
        key = photo.stem
        if key in mapping:
            vk = vk_id(mapping[key])
            if vk not in people:
                raise ValueError('Expert mapping requires an existing legacy participant')
            uid = people[vk]
            used_mapping.add(key)
            next(u for u in out['Users'] if u['id'] == uid)['name'] = expert['name']
        else:
            uid = f'expert-{key}'
            out['Users'].append(dict(id=uid, vkontakte_id=None, name=expert['name'], note=''))
        out['ExpertProfiles'].append(dict(user_id=uid, photo=str(photo), profile_url=expert['profile'],
            professional_title=expert['role'], bio=expert['text'], sort_order=position))
    if set(mapping) != used_mapping:
        raise ValueError('Mapping contains unknown or excluded experts')
    event_ids = {e['id'] for e in source['Events']}
    if len(event_ids) != len(source['Events']):
        raise ValueError('Duplicate event IDs')
    profile_ids = {p['user_id'] for p in out['ExpertProfiles']}
    for old, new in (('Attendance', 'AttendanceV2'), ('Hosts', 'HostsV2')):
        for row in source[old]:
            uid = people.get(vk_id(row['vkontakte_id']))
            if uid is None or row['event_id'] not in event_ids:
                raise ValueError(f'Orphan relationship in {old}')
            if old == 'Hosts' and uid not in profile_ids:
                raise ValueError('Unresolved legacy host: provide verified portrait-to-VK mapping')
            out[new].append(dict(user_id=uid, event_id=row['event_id']))
    for table, rows in out.items():
        keys = [tuple(r[k] for k in KEYS[table]) for r in rows]
        if len(set(keys)) != len(keys):
            raise ValueError(f'Duplicate key in {table}')
    if not any(r['role'] == 'admin' for r in out['UserRoles']):
        raise ValueError('Migration requires at least one verified legacy administrator')
    return out


def missing_rows(expected, current):
    """Allow exact repeats and partial identical imports; reject all divergence."""
    missing = {}
    for table, rows in expected.items():
        wanted = {tuple(r[k] for k in KEYS[table]): r for r in rows}
        seen = {tuple(r[k] for k in KEYS[table]): r for r in current[table]}
        if any(key not in wanted or wanted[key] != row for key, row in seen.items()):
            raise ValueError(f'Divergent existing rows in {table}; refusing overwrite')
        missing[table] = [row for key, row in wanted.items() if key not in seen]
    return missing


def verify_target(target, events):
    users = {u['id']: u for u in target['Users']}
    identities = {vk_id(i['vkontakte_id']): i['user_id'] for i in target['VkIdentities']}
    roles = {(r['user_id'], r['role']) for r in target['UserRoles']}
    profiles = {p['user_id'] for p in target['ExpertProfiles']}
    event_ids = {e['id'] for e in events}
    for table, rows in target.items():
        keys = [tuple(r[k] for k in KEYS[table]) for r in rows]
        if len(keys) != len(set(keys)):
            raise ValueError(f'Duplicate key in {table}')
    linked = {}
    for uid, user in users.items():
        if user['vkontakte_id'] is not None:
            vk = vk_id(user['vkontakte_id'])
            if vk in linked:
                raise ValueError('Duplicate user VK identity')
            linked[vk] = uid
    if linked != identities:
        raise ValueError('Identity map is not bijective')
    if any(uid not in users or role not in ('attendee', 'admin') for uid, role in roles):
        raise ValueError('Invalid role endpoint or value')
    if not profiles.issubset(users):
        raise ValueError('Orphan expert profile')
    if not any(role == 'admin' and users[uid]['vkontakte_id'] is not None for uid, role in roles):
        raise ValueError('No linked administrator')
    for table in ('AttendanceV2', 'HostsV2'):
        for row in target[table]:
            uid = row['user_id']
            eligible = (uid, 'attendee') in roles if table == 'AttendanceV2' else uid in profiles
            if uid not in users or row['event_id'] not in event_ids or not eligible:
                raise ValueError(f'Invalid relationship in {table}')


def canonical_snapshot(source):
    return {table: sorted(json.dumps(row, sort_keys=True, ensure_ascii=False) for row in rows)
            for table, rows in source.items()}


def read_tables(session, tx, tables):
    out = {}
    for table in tables:
        results = tx.execute(session.prepare(f'SELECT * FROM `{table}`;'))
        if any(r.truncated for r in results):
            raise ValueError('Export exceeds small-festival query limit; refusing incomplete export')
        out[table] = [dict(row) for result in results for row in result.rows]
    return out


def insert_rows(session, tx, table, rows):
    columns = COLUMNS[table]
    declarations = ' '.join(f'DECLARE ${k} AS {v};' for k, v in columns.items())
    query = session.prepare(declarations + f' INSERT INTO `{table}` ({",".join(columns)}) VALUES ({",".join("$"+k for k in columns)});')
    for row in rows:
        tx.execute(query, {'$'+k: row[k] for k in columns})


def write_backup(path, source):
    path = path.resolve()
    if path.is_relative_to(ROOT):
        raise ValueError('Private backup must be outside the repository')
    payload = dict(format_version=1, counts={k: len(v) for k, v in source.items()}, tables=source)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backup', type=Path)
    parser.add_argument('--verify-only', action='store_true')
    parser.add_argument('--mapping', type=Path)
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--writes-frozen', action='store_true')
    args = parser.parse_args()
    if args.verify_only and args.execute:
        parser.error('verify-only cannot execute')
    if not args.verify_only and args.backup is None:
        parser.error('backup is required for migration/export')
    if args.execute and not args.writes_frozen:
        parser.error('Execution requires --writes-frozen after maintenance is enabled')
    import ydb
    import ydb.iam
    experts = json.loads((ROOT / 'infra/yandex/experts-seed.json').read_text())
    mapping = json.loads(args.mapping.read_text()) if args.mapping else {}
    with ydb.Driver(endpoint=os.environ['YDB_ENDPOINT'], database=os.environ['YDB_DATABASE'],
                    credentials=ydb.iam.ServiceAccountCredentials.from_file(os.environ['YC_SERVICE_ACCOUNT_KEY_FILE'])) as driver:
        driver.wait(timeout=30, fail_fast=True)
        with ydb.SessionPool(driver, size=1) as pool:
            def export(session):
                with session.transaction(ydb.SerializableReadWrite()) as tx:
                    source = read_tables(session, tx, LEGACY)
                    tx.commit()
                    return source
            if args.verify_only:
                def verify(session):
                    with session.transaction(ydb.SerializableReadWrite()) as tx:
                        target = read_tables(session, tx, COLUMNS)
                        events = read_tables(session, tx, ('Events',))['Events']
                        verify_target(target, events)
                        tx.commit()
                        return {k: len(v) for k, v in target.items()}
                print(json.dumps({'mode': 'verify-only', 'counts': pool.retry_operation_sync(verify)}, indent=2))
                return
            source = pool.retry_operation_sync(export)
            write_backup(args.backup, source)
            expected = plan(source, experts, mapping)
            if args.execute:
                def apply(session):
                    with session.transaction(ydb.SerializableReadWrite()) as tx:
                        if canonical_snapshot(read_tables(session, tx, LEGACY)) != canonical_snapshot(source):
                            raise ValueError('Legacy snapshot changed; freeze writes and export again')
                        current = read_tables(session, tx, COLUMNS)
                        missing = missing_rows(expected, current)
                        for table, rows in missing.items():
                            insert_rows(session, tx, table, rows)
                        if any(missing_rows(expected, read_tables(session, tx, COLUMNS)).values()):
                            raise ValueError('Import verification found missing rows')
                        verify_target(read_tables(session, tx, COLUMNS), source['Events'])
                        tx.commit()
                pool.retry_operation_sync(apply)
    print(json.dumps({'mode': 'executed' if args.execute else 'dry-run',
                      'source_counts': {k: len(v) for k, v in source.items()},
                      'target_counts': {k: len(v) for k, v in expected.items()}}, indent=2))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # SDK errors can contain sensitive query data; expose only controlled errors.
        if isinstance(error, ValueError):
            raise SystemExit(str(error)) from None
        raise SystemExit(f'Migration failed ({type(error).__name__}); no success claimed') from None
