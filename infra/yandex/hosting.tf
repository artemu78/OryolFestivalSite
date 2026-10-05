locals {
  site_dir = abspath("${path.module}/../../dist")
  site_files = toset([
    for file in fileset(local.site_dir, "**") : file
    if alltrue([for part in split("/", file) : !startswith(part, ".")])
  ])
  site_objects = {
    for pair in setproduct(keys(var.domains), local.site_files) : "${pair[0]}/${pair[1]}" => {
      domain_key = pair[0]
      file       = pair[1]
    }
  }
  mime_types = {
    html  = "text/html; charset=utf-8"
    js    = "text/javascript; charset=utf-8"
    css   = "text/css; charset=utf-8"
    json  = "application/json; charset=utf-8"
    png   = "image/png"
    jpg   = "image/jpeg"
    jpeg  = "image/jpeg"
    webp  = "image/webp"
    svg   = "image/svg+xml"
    ico   = "image/x-icon"
    mp4   = "video/mp4"
    woff  = "font/woff"
    woff2 = "font/woff2"
    txt   = "text/plain; charset=utf-8"
  }
}

resource "yandex_cm_certificate" "site" {
  for_each = var.domains

  folder_id           = var.folder_id
  name                = "festival-site-${each.key}"
  domains             = [each.value]
  deletion_protection = true

  managed {
    challenge_type  = "DNS_CNAME"
    challenge_count = 1
  }
}

# The initial apply requests certificates without waiting on external DNS.
# The second apply waits for issuance and attaches them to the buckets.
data "yandex_cm_certificate" "issued" {
  for_each = { for key, domain in var.domains : key => domain if var.enable_https || contains(var.https_domain_keys, key) }

  certificate_id  = yandex_cm_certificate.site[each.key].id
  wait_validation = true
  depends_on      = [yandex_dns_recordset.validation]
}

resource "yandex_storage_bucket" "site" {
  for_each = var.domains

  folder_id     = var.folder_id
  bucket        = each.value
  max_size      = 1073741824
  force_destroy = false

  anonymous_access_flags {
    read        = true
    list        = false
    config_read = false
  }

  website {
    index_document = "index.html"
  }

  dynamic "https" {
    for_each = var.enable_https || contains(var.https_domain_keys, each.key) ? [1] : []
    content {
      certificate_id = data.yandex_cm_certificate.issued[each.key].id
    }
  }

  lifecycle {
    prevent_destroy = true
    precondition {
      condition     = contains(local.site_files, "index.html")
      error_message = "Build the festival site at the root URL before planning: PAGES_BASE_PATH=/ npm run build."
    }
  }
}

resource "yandex_storage_object" "site" {
  for_each = local.site_objects

  bucket       = yandex_storage_bucket.site[each.value.domain_key].bucket
  key          = each.value.file
  source       = "${local.site_dir}/${each.value.file}"
  source_hash  = filemd5("${local.site_dir}/${each.value.file}")
  content_type = lookup(local.mime_types, lower(element(reverse(split(".", each.value.file)), 0)), "application/octet-stream")
}
