"""One-time import with operator credentials. Existing rows are never overwritten."""
import argparse
import json
import os
from pathlib import Path
import ydb
import ydb.iam

parser = argparse.ArgumentParser()
parser.add_argument('--admin-id', type=int)
args = parser.parse_args()
if args.admin_id is not None and not 0 < args.admin_id <= 9223372036854775807:
    parser.error('admin-id must be a positive Int64')
with ydb.Driver(endpoint=os.environ['YDB_ENDPOINT'], database=os.environ['YDB_DATABASE'], credentials=ydb.iam.ServiceAccountCredentials.from_file(os.environ['YC_SERVICE_ACCOUNT_KEY_FILE'])) as driver:
    driver.wait(timeout=30, fail_fast=True)
    pool = ydb.SessionPool(driver, size=1)
    def seed(session):
        tx = session.transaction(ydb.SerializableReadWrite())
        def run(sql, params):
            return tx.execute(session.prepare(sql),params)
        for event in json.loads(Path(__file__).with_name('events-seed.json').read_text()):
            params={'$id':event['id'],'$title':event['title'],'$description':event['description']}
            exists=run('DECLARE $id AS Utf8; SELECT id FROM Events WHERE id=$id;',{'$id':event['id']})[0].rows
            if not exists:
                run('DECLARE $id AS Utf8; DECLARE $title AS Utf8; DECLARE $description AS Utf8; INSERT INTO Events (id,title,description) VALUES ($id,$title,$description);',params)
        if args.admin_id:
            exists = run('DECLARE $id AS Int64; SELECT note FROM Participants WHERE vkontakte_id=$id;', {'$id':args.admin_id})[0].rows
            note = exists[0].note if exists else ''
            run('DECLARE $id AS Int64; DECLARE $note AS Utf8; UPSERT INTO Participants (vkontakte_id, admin, note) VALUES ($id, true, $note);',{'$id':args.admin_id,'$note':note})
        tx.commit()
    pool.retry_operation_sync(seed)
print('Event seed imported; existing events preserved.')
