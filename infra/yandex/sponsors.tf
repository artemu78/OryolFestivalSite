resource "yandex_ydb_table" "sponsors" {
  path              = "Sponsors"
  connection_string = yandex_ydb_database_serverless.hello.ydb_full_endpoint
  primary_key       = ["id"]

  column {
    name     = "id"
    type     = "Utf8"
    not_null = true
  }
  column {
    name     = "name"
    type     = "Utf8"
    not_null = true
  }
  column {
    name     = "image"
    type     = "Utf8"
    not_null = true
  }
  column {
    name     = "link"
    type     = "Utf8"
    not_null = true
  }
  column {
    name     = "display"
    type     = "Bool"
    not_null = true
  }

  lifecycle {
    prevent_destroy = true
  }
}
