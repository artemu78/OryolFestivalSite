terraform {
  required_version = ">= 1.5.0"

  required_providers {
    yandex = {
      source  = "yandex-cloud/yandex"
      version = "= 0.235.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
  }
}

# Authentication comes from YC_TOKEN or YC_SERVICE_ACCOUNT_KEY_FILE.
provider "yandex" {
  folder_id = var.folder_id
  zone      = "ru-central1-a"
}
