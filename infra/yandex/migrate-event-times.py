"""Replace Events.time with Timestamp columns using live values, not the JSON.

Run with exclusive operator ownership of schema/time writes. The current admin
API does not write time fields. Data backfill is atomic; column DDL is separate.
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path

spec = importlib.util.spec_from_file_location('program', Path(__file__).with_name('migrate-program.py'))
program = importlib.util.module_from_spec(spec)
spec.loader.exec_module(program)


def planned(rows):
    result = []
    for row in rows:
        times = program.parse_time(row['time'])
        for key, value in times.items():
            if row.get(key) is not None and row[key] != value:
                raise ValueError(f'Existing timestamp conflicts with time: {row["id"]}')
        result.append(dict(row, **times))
    return result


def canonical(rows, drop_time=False):
    return sorted(({k: v for k, v in row.items() if not (drop_time and k == 'time')}
                   for row in rows), key=lambda r: r['id'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--backup', type=Path)
    args = parser.parse_args()
    if args.execute and args.backup is None:
        parser.error('--execute requires a new --backup path outside the repository')
    import ydb
    import ydb.iam
    with ydb.Driver(endpoint=os.environ['YDB_ENDPOINT'], database=os.environ['YDB_DATABASE'],
                    credentials=ydb.iam.ServiceAccountCredentials.from_file(os.environ['YC_SERVICE_ACCOUNT_KEY_FILE'])) as driver:
        driver.wait(timeout=30, fail_fast=True)
        path = os.environ['YDB_DATABASE'] + '/Events'
        with ydb.SessionPool(driver, size=1) as pool:
            def schema(session):
                return {c.name: str(c.type) for c in session.describe_table(path).columns}
            def rows(session, tx):
                return program.identities.read_tables(session, tx, ('Events',))['Events']
            def read(session):
                with session.transaction(ydb.SerializableReadWrite()) as tx:
                    result = rows(session, tx)
                    tx.commit()
                    return result
            columns = pool.retry_operation_sync(schema)
            timestamp_type = ydb.OptionalType(ydb.PrimitiveType.Timestamp)
            for key in ('time_start', 'time_end'):
                if key in columns and columns[key] != str(timestamp_type):
                    raise ValueError(f'Incorrect column type: {key}')
            before = pool.retry_operation_sync(read)
            if 'time' not in columns:
                if not {'time_start', 'time_end'} <= columns.keys():
                    raise ValueError('Missing both legacy time and replacement columns')
                print(json.dumps({'mode': 'already-migrated', 'events': len(before)}))
                return
            expected = planned(before)
            if not args.execute:
                print(json.dumps({'mode': 'dry-run', 'events': len(expected),
                                  'without_end': sum(r['time_end'] is None for r in expected)}))
                return
            program.identities.write_backup(args.backup, {'Events': before})
            def add(session):
                current = schema(session)
                additions = [ydb.Column(k, timestamp_type) for k in ('time_start', 'time_end') if k not in current]
                if additions:
                    session.alter_table(path, add_columns=additions)
            pool.retry_operation_sync(add)
            def fill(session):
                with session.transaction(ydb.SerializableReadWrite()) as tx:
                    current = rows(session, tx)
                    normalized_before = [{'time_start': None, 'time_end': None, **r} for r in before]
                    if canonical(current) not in (canonical(normalized_before), canonical(expected)):
                        raise ValueError('Events changed since backup; aborting')
                    query = session.prepare('DECLARE $id AS Utf8; DECLARE $start AS Timestamp?; '
                                            'DECLARE $end AS Timestamp?; UPDATE `Events` '
                                            'SET time_start=$start, time_end=$end WHERE id=$id;')
                    for row in expected:
                        tx.execute(query, {'$id': row['id'], '$start': row['time_start'], '$end': row['time_end']})
                    if canonical(rows(session, tx)) != canonical(expected):
                        raise ValueError('Backfill read-back mismatch')
                    tx.commit()
            pool.retry_operation_sync(fill)
            if canonical(pool.retry_operation_sync(read)) != canonical(expected):
                raise ValueError('Verification failed; time column retained')
            def drop(session):
                if 'time' in schema(session):
                    session.alter_table(path, drop_columns=['time'])
            pool.retry_operation_sync(drop)
            final_schema = pool.retry_operation_sync(schema)
            if 'time' in final_schema or any(final_schema.get(k) != str(timestamp_type) for k in ('time_start', 'time_end')):
                raise ValueError('Final schema verification failed')
            if canonical(pool.retry_operation_sync(read)) != canonical(expected, drop_time=True):
                raise ValueError('Final event verification failed')
            print(json.dumps({'mode': 'executed', 'events': len(expected),
                              'without_end': sum(r['time_end'] is None for r in expected), 'time_removed': True}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        raise SystemExit(str(error) if isinstance(error, ValueError)
                         else f'Time migration failed ({type(error).__name__})') from None
