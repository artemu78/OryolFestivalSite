resource "yandex_dns_zone" "site" {
  for_each = var.manage_dns ? var.domains : {}

  folder_id   = var.folder_id
  name        = "festival-site-${each.key}"
  zone        = "${each.value}."
  public      = true
  description = "Festival website; domain registration remains at REG.RU."
}

resource "yandex_dns_recordset" "website" {
  for_each = var.manage_dns ? var.domains : {}

  zone_id = yandex_dns_zone.site[each.key].id
  name    = "${each.value}."
  type    = "ANAME"
  ttl     = 600
  data    = ["${each.value}.website.yandexcloud.net."]
}

resource "yandex_dns_recordset" "validation" {
  for_each = var.manage_dns ? var.domains : {}

  zone_id = yandex_dns_zone.site[each.key].id
  name    = yandex_cm_certificate.site[each.key].challenges[0].dns_name
  type    = yandex_cm_certificate.site[each.key].challenges[0].dns_type
  ttl     = 600
  data    = [yandex_cm_certificate.site[each.key].challenges[0].dns_value]
}
