resource "yandex_ydb_table" "participants" {
  path              = "Participants"
  connection_string = yandex_ydb_database_serverless.hello.ydb_full_endpoint
  primary_key       = ["vkontakte_id"]
  column {
    name     = "vkontakte_id"
    type     = "Int64"
    not_null = true
  }
  column {
    name     = "admin"
    type     = "Bool"
    not_null = true
  }
  column {
    name     = "note"
    type     = "Utf8"
    not_null = true
  }
  lifecycle {
    prevent_destroy = true
  }
}

resource "yandex_ydb_table" "events" {
  path              = "Events"
  connection_string = yandex_ydb_database_serverless.hello.ydb_full_endpoint
  primary_key       = ["id"]
  column {
    name     = "id"
    type     = "Utf8"
    not_null = true
  }
  column {
    name     = "title"
    type     = "Utf8"
    not_null = true
  }
  column {
    name     = "description"
    type     = "Utf8"
    not_null = true
  }
  # Nullable additions allow in-place migration and existing admin event creation.
  column {
    name     = "time_start"
    type     = "Timestamp"
    not_null = false
  }
  column {
    name     = "time_end"
    type     = "Timestamp"
    not_null = false
  }
  column {
    name     = "category"
    type     = "Utf8"
    not_null = false
  }
  column {
    name     = "tag"
    type     = "Utf8"
    not_null = false
  }
  column {
    name     = "location"
    type     = "Utf8"
    not_null = false
  }
  column {
    name     = "access"
    type     = "Utf8"
    not_null = false
  }
  column {
    name     = "background"
    type     = "Utf8"
    not_null = false
  }
  column {
    name     = "program_id"
    type     = "Int64"
    not_null = false
  }
  column {
    name     = "sort_order"
    type     = "Int64"
    not_null = false
  }
  lifecycle {
    prevent_destroy = true
  }
}

resource "yandex_ydb_table" "attendance" {
  path              = "Attendance"
  connection_string = yandex_ydb_database_serverless.hello.ydb_full_endpoint
  primary_key       = ["vkontakte_id", "event_id"]
  column {
    name     = "vkontakte_id"
    type     = "Int64"
    not_null = true
  }
  column {
    name     = "event_id"
    type     = "Utf8"
    not_null = true
  }
  lifecycle {
    prevent_destroy = true
  }
}

resource "yandex_ydb_table" "hosts" {
  path              = "Hosts"
  connection_string = yandex_ydb_database_serverless.hello.ydb_full_endpoint
  primary_key       = ["vkontakte_id", "event_id"]
  column {
    name     = "vkontakte_id"
    type     = "Int64"
    not_null = true
  }
  column {
    name     = "event_id"
    type     = "Utf8"
    not_null = true
  }
  lifecycle {
    prevent_destroy = true
  }
}

data "archive_file" "admin" {
  type        = "zip"
  source_dir  = "${path.module}/admin"
  excludes    = ["__pycache__", "test_admin.py"]
  output_path = "${path.module}/.build/admin.zip"
}
resource "yandex_function" "admin" {
  folder_id          = var.folder_id
  name               = "festival-admin"
  runtime            = "python312"
  entrypoint         = "index.handler"
  memory             = 256
  execution_timeout  = "30"
  concurrency        = 8
  service_account_id = yandex_iam_service_account.hello.id
  user_hash          = data.archive_file.admin.output_base64sha256
  environment = {
    YDB_ENDPOINT          = "grpcs://${yandex_ydb_database_serverless.hello.ydb_api_endpoint}"
    YDB_DATABASE          = yandex_ydb_database_serverless.hello.database_path
    ADMIN_WRITES_DISABLED = tostring(var.admin_writes_disabled)
    VK_APP_ID             = "54800266"
    ALLOWED_ORIGINS       = join(",", concat([for domain in values(var.domains) : "https://${domain}"], ["https://artemu78.github.io"]))
  }
  content { zip_filename = data.archive_file.admin.output_path }
  depends_on = [yandex_ydb_table.participants, yandex_ydb_table.events, yandex_ydb_table.attendance, yandex_ydb_table.hosts, yandex_ydb_database_iam_member.hello, yandex_ydb_table.users, yandex_ydb_table.vk_identities, yandex_ydb_table.user_roles, yandex_ydb_table.expert_profiles, yandex_ydb_table.attendance_v2, yandex_ydb_table.hosts_v2, yandex_ydb_table.sponsors]
}
resource "yandex_function_iam_member" "admin_public" {
  function_id = yandex_function.admin.id
  role        = "serverless.functions.invoker"
  member      = "system:allUsers"
}
output "admin_api_url" {
  value = "https://functions.yandexcloud.net/${yandex_function.admin.id}"
}
