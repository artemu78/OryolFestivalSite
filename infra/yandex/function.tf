data "archive_file" "hello" {
  type = "zip"
  dynamic "source" {
    for_each = toset(["index.py", "requirements.txt"])
    content {
      content  = file("${path.module}/function/${source.value}")
      filename = source.value
    }
  }
  output_path = "${path.module}/.build/hello.zip"
}

resource "yandex_function" "hello" {
  folder_id          = var.folder_id
  name               = "festival-hello"
  description        = "Public Hello World demo with a fixed YDB record."
  runtime            = "python312"
  entrypoint         = "index.handler"
  memory             = 256
  execution_timeout  = "30"
  concurrency        = 1
  service_account_id = yandex_iam_service_account.hello.id
  user_hash          = data.archive_file.hello.output_base64sha256
  environment = {
    YDB_ENDPOINT    = "grpcs://${yandex_ydb_database_serverless.hello.ydb_api_endpoint}"
    YDB_DATABASE    = yandex_ydb_database_serverless.hello.database_path
    ALLOWED_ORIGINS = join(",", [for domain in values(var.domains) : "https://${domain}"])
  }

  content {
    zip_filename = data.archive_file.hello.output_path
  }

  depends_on = [yandex_ydb_table.messages, yandex_ydb_database_iam_member.hello]
}

resource "yandex_function_scaling_policy" "hello" {
  function_id = yandex_function.hello.id
  policy {
    tag                  = "$latest"
    zone_instances_limit = 1
    zone_requests_limit  = 5
  }
}

resource "yandex_function_iam_member" "public" {
  function_id = yandex_function.hello.id
  role        = "serverless.functions.invoker"
  member      = "system:allUsers"

  depends_on = [yandex_function_scaling_policy.hello]
}
