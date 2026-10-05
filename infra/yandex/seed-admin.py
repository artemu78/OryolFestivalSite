"""One-time import with operator credentials. Existing rows are never overwritten."""
import argparse
import json
import os
import uuid
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
            uid = str(uuid.uuid5(uuid.UUID('18b1514f-3c43-5e27-a32f-8daf02039c36'), f'vk:{args.admin_id}'))
            rows = run('DECLARE $vk AS Int64; SELECT user_id FROM VkIdentities WHERE vkontakte_id=$vk;', {'$vk':args.admin_id})[0].rows
            if rows:
                uid = rows[0].user_id
                user = run('DECLARE $id AS Utf8; SELECT vkontakte_id FROM Users WHERE id=$id;', {'$id':uid})[0].rows
                if not user or user[0].vkontakte_id != args.admin_id:
                    raise ValueError('Inconsistent identity map')
            else:
                existing = run('DECLARE $id AS Utf8; SELECT id FROM Users WHERE id=$id;', {'$id':uid})[0].rows
                duplicates = run('DECLARE $vk AS Int64; SELECT id FROM Users WHERE vkontakte_id=$vk;', {'$vk':args.admin_id})[0].rows
                if existing or duplicates:
                    raise ValueError('Identity collision; refusing overwrite')
                run('DECLARE $id AS Utf8; DECLARE $vk AS Int64; DECLARE $name AS Utf8; INSERT INTO Users (id,vkontakte_id,name,note) VALUES ($id,$vk,$name,"");', {'$id':uid,'$vk':args.admin_id,'$name':f'Участник VK {args.admin_id}'})
                run('DECLARE $id AS Utf8; DECLARE $vk AS Int64; INSERT INTO VkIdentities (vkontakte_id,user_id) VALUES ($vk,$id);', {'$id':uid,'$vk':args.admin_id})
            run('DECLARE $id AS Utf8; UPSERT INTO UserRoles (user_id,role) VALUES ($id,"admin");', {'$id':uid})
        tx.commit()
    pool.retry_operation_sync(seed)
print('Event seed imported; existing events preserved.')
