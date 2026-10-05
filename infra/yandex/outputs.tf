output "site_urls" {
  value = { for key, domain in var.domains : key => "https://${domain}" }
}

output "certificate_dns_records" {
  description = "Publish these records at the authoritative DNS provider and retain them for renewal."
  value = {
    for key, certificate in yandex_cm_certificate.site : var.domains[key] => {
      name  = certificate.challenges[0].dns_name
      type  = certificate.challenges[0].dns_type
      value = certificate.challenges[0].dns_value
      ttl   = 600
    }
  }
}

output "website_dns_records" {
  description = "Root domains require ANAME/ALIAS support; a root CNAME is not suitable."
  value = {
    for key, domain in var.domains : domain => {
      name  = "${domain}."
      type  = "ANAME"
      value = "${domain}.website.yandexcloud.net."
      ttl   = 600
    }
  }
}

output "nameservers" {
  value = var.manage_dns ? ["ns1.yandexcloud.net", "ns2.yandexcloud.net"] : []
}

output "function_url" {
  value = "https://functions.yandexcloud.net/${yandex_function.hello.id}"
}

output "database_id" {
  value = yandex_ydb_database_serverless.hello.id
}

output "table_name" {
  value = yandex_ydb_table.messages.path
}
