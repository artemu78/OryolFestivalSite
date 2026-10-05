resource "yandex_ydb_table" "users" {
  path              = "Users"
  connection_string = yandex_ydb_database_serverless.hello.ydb_full_endpoint
  primary_key       = ["id"]
  column {
    name     = "id"
    type     = "Utf8"
    not_null = true
  }
  column {
    name     = "vkontakte_id"
    type     = "Int64"
    not_null = false
  }
  column {
    name     = "name"
    type     = "Utf8"
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

resource "yandex_ydb_table" "vk_identities" {
  path              = "VkIdentities"
  connection_string = yandex_ydb_database_serverless.hello.ydb_full_endpoint
  primary_key       = ["vkontakte_id"]
  column {
    name     = "vkontakte_id"
    type     = "Int64"
    not_null = true
  }
  column {
    name     = "user_id"
    type     = "Utf8"
    not_null = true
  }
  lifecycle {
    prevent_destroy = true
  }
}

resource "yandex_ydb_table" "user_roles" {
  path              = "UserRoles"
  connection_string = yandex_ydb_database_serverless.hello.ydb_full_endpoint
  primary_key       = ["user_id", "role"]
  column {
    name     = "user_id"
    type     = "Utf8"
    not_null = true
  }
  column {
    name     = "role"
    type     = "Utf8"
    not_null = true
  }
  lifecycle {
    prevent_destroy = true
  }
}

resource "yandex_ydb_table" "expert_profiles" {
  path              = "ExpertProfiles"
  connection_string = yandex_ydb_database_serverless.hello.ydb_full_endpoint
  primary_key       = ["user_id"]
  column {
    name     = "user_id"
    type     = "Utf8"
    not_null = true
  }
  column {
    name     = "photo"
    type     = "Utf8"
    not_null = true
  }
  column {
    name     = "profile_url"
    type     = "Utf8"
    not_null = true
  }
  column {
    name     = "professional_title"
    type     = "Utf8"
    not_null = true
  }
  column {
    name     = "bio"
    type     = "Utf8"
    not_null = true
  }
  column {
    name     = "sort_order"
    type     = "Int64"
    not_null = true
  }
  lifecycle {
    prevent_destroy = true
  }
}

resource "yandex_ydb_table" "attendance_v2" {
  path              = "AttendanceV2"
  connection_string = yandex_ydb_database_serverless.hello.ydb_full_endpoint
  primary_key       = ["user_id", "event_id"]
  column {
    name     = "user_id"
    type     = "Utf8"
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

resource "yandex_ydb_table" "hosts_v2" {
  path              = "HostsV2"
  connection_string = yandex_ydb_database_serverless.hello.ydb_full_endpoint
  primary_key       = ["user_id", "event_id"]
  column {
    name     = "user_id"
    type     = "Utf8"
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

