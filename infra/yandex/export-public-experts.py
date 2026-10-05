"""Credentialed operator export; builds consume only its checked-in public JSON."""
import argparse
import importlib.util
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('public_validation', ROOT / 'scripts/validate-public-content.py')
validation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validation)


def public_rows(users, profiles):
    """Explicit projection: private identity fields are never copied to output."""
    people = {user['id']: user for user in users}
    if len(people) != len(users):
        raise ValueError('Duplicate user ID')
    if len({p['user_id'] for p in profiles}) != len(profiles):
        raise ValueError('Duplicate expert profile')
    rows = []
    for profile in sorted(profiles, key=lambda p: (p['sort_order'], p['user_id'])):
        user = people.get(profile['user_id'])
        if user is None:
            raise ValueError('Orphan expert profile')
        rows.append(dict(id=user['id'], name=user['name'], photo=profile['photo'],
                         profile=profile['profile_url'], role=profile['professional_title'],
                         text=profile['bio']))
    return rows


def bootstrap_rows():
    # The immutable approved seed is the same input used by the migration.
    seed = json.loads((ROOT / 'infra/yandex/experts-seed.json').read_text())
    return [dict(expert, id='expert-' + Path(expert['photo']).stem) for expert in seed]


def result_rows(sets):
    if len(sets) != 2 or any(result.truncated for result in sets):
        raise ValueError('Incomplete expert export; refusing publication')
    return public_rows([dict(row) for row in sets[0].rows],
                       [dict(row) for row in sets[1].rows])


def read_live():
    import ydb
    import ydb.iam
    credentials = ydb.iam.ServiceAccountCredentials.from_file(os.environ['YC_SERVICE_ACCOUNT_KEY_FILE'])
    with ydb.Driver(endpoint=os.environ['YDB_ENDPOINT'], database=os.environ['YDB_DATABASE'],
                    credentials=credentials) as driver:
        driver.wait(timeout=30, fail_fast=True)
        with ydb.SessionPool(driver, size=1) as pool:
            def read(session):
                with session.transaction(ydb.SerializableReadWrite()) as tx:
                    sets = tx.execute(session.prepare(
                        'SELECT id, name FROM `Users`; '
                        'SELECT user_id, photo, profile_url, professional_title, bio, sort_order FROM `ExpertProfiles`;'))
                    rows = result_rows(sets)
                    tx.commit()
                    return rows
            return pool.retry_operation_sync(read)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bootstrap', action='store_true', help='Pre-cutover seed only; never use after migration')
    parser.add_argument('--output', type=Path, default=ROOT / 'src/experts.json')
    args = parser.parse_args()
    rows = bootstrap_rows() if args.bootstrap else read_live()
    validation.validate(rows, json.loads((ROOT / 'src/program.json').read_text()))
    # Validate before replacement: a missing programme host leaves the previous file intact.
    temporary = args.output.with_suffix(args.output.suffix + '.tmp')
    temporary.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(args.output)
    print(f'Exported {len(rows)} public expert profiles ({"bootstrap" if args.bootstrap else "YDB"})')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        message = str(error) if isinstance(error, ValueError) else f'Public export failed ({type(error).__name__})'
        raise SystemExit(message) from None
