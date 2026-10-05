resource "yandex_ydb_database_serverless" "hello" {
  folder_id           = var.folder_id
  name                = "festival-hello"
  location_id         = "ru-central1"
  deletion_protection = true

  serverless_database {
    enable_throttling_rcu_limit = true
    throttling_rcu_limit        = 10
    provisioned_rcu_limit       = 0
    storage_size_limit          = 1
  }
}

resource "yandex_ydb_table" "messages" {
  path              = "messages"
  connection_string = yandex_ydb_database_serverless.hello.ydb_full_endpoint
  primary_key       = ["id"]

  column {
    name     = "id"
    type     = "Utf8"
    not_null = true
  }
  column {
    name = "message"
    type = "Utf8"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "yandex_iam_service_account" "hello" {
  folder_id   = var.folder_id
  name        = "festival-hello"
  description = "Runtime identity for the public Hello World function."
}

resource "yandex_ydb_database_iam_member" "hello" {
  database_id = yandex_ydb_database_serverless.hello.id
  role        = "ydb.editor"
  member      = "serviceAccount:${yandex_iam_service_account.hello.id}"
}
