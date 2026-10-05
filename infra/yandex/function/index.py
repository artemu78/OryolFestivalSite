"""Public Hello World demo. GET reads; POST writes and reads one fixed row."""

import json
import logging
import os
from functools import lru_cache

import ydb
import ydb.iam


@lru_cache(maxsize=1)
def get_pool():
    driver = ydb.Driver(
        endpoint=os.environ["YDB_ENDPOINT"],
        database=os.environ["YDB_DATABASE"],
        credentials=ydb.iam.MetadataUrlCredentials(),
    )
    try:
        driver.wait(fail_fast=True, timeout=5)
    except Exception:
        driver.stop()
        raise
    return ydb.SessionPool(driver, size=1)


def query_message(session, write):
    query = """
        DECLARE $id AS Utf8;
        SELECT message FROM messages WHERE id = $id;
    """
    params = {"$id": "hello"}
    if write:
        query = """
            DECLARE $id AS Utf8;
            DECLARE $message AS Utf8;
            UPSERT INTO messages (id, message) VALUES ($id, $message);
            SELECT message FROM messages WHERE id = $id;
        """
        params["$message"] = "Hello world"
    prepared = session.prepare(query)
    return session.transaction(ydb.SerializableReadWrite()).execute(
        prepared,
        params,
        commit_tx=True,
        settings=ydb.BaseRequestSettings().with_timeout(5).with_operation_timeout(3),
    )


def handler(event, context):
    method = event.get("httpMethod", "GET").upper()
    headers = {key.lower(): value for key, value in (event.get("headers") or {}).items()}
    response_headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Vary": "Origin",
    }
    allowed_origins = os.environ.get("ALLOWED_ORIGINS", "").split(",")
    origin = headers.get("origin")
    if origin and origin in allowed_origins:
        response_headers["Access-Control-Allow-Origin"] = origin
        response_headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response_headers["Access-Control-Allow-Headers"] = "Content-Type"

    def respond(status, body):
        return {
            "statusCode": status,
            "headers": response_headers,
            "isBase64Encoded": False,
            "body": json.dumps(body, ensure_ascii=False) if body is not None else "",
        }

    if method == "OPTIONS":
        return respond(204, None)
    if method not in {"GET", "POST"}:
        response_headers["Allow"] = "GET, POST, OPTIONS"
        return respond(405, {"error": "Method not allowed"})

    try:
        results = get_pool().retry_operation_sync(
            lambda session: query_message(session, write=method == "POST")
        )
        rows = results[-1].rows
        return respond(200, {
            "message": "Hello world",
            "stored_message": rows[0].message if rows else None,
            "written": method == "POST",
        })
    except Exception as error:
        logging.error("Hello World database operation failed: %s", type(error).__name__)
        return respond(503, {"error": "Database temporarily unavailable"})
