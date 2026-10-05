variable "folder_id" {
  description = "Existing Yandex Cloud folder with billing enabled."
  type        = string
  default     = "b1g5fdg0o0t57rnfm9j4"
}

variable "domains" {
  description = "ASCII domain names. IDNs must be encoded as Punycode."
  type        = map(string)
  default = {
    latin    = "mentalhealthfestival.ru"
    cyrillic = "xn--80aaecegccue9ackpcqbca3bewh1b5qgk8f.xn--p1ai"
  }
  validation {
    condition     = length(var.domains) == 2 && length(distinct(values(var.domains))) == 2 && alltrue([for domain in values(var.domains) : can(regex("^[a-z0-9][a-z0-9.-]+[a-z0-9]$", domain))])
    error_message = "Provide two distinct lowercase ASCII domain names."
  }
}

variable "manage_dns" {
  description = "Create Cloud DNS zones and records. Requires nameserver delegation at REG.RU."
  type        = bool
  default     = false
}

variable "enable_https" {
  description = "Enable after certificate DNS challenges have been published and certificates issued."
  type        = bool
  default     = false
}

variable "https_domain_keys" {
  description = "Domain keys with issued certificates to enable individually before all certificates are ready."
  type        = set(string)
  default     = []
  validation {
    condition     = alltrue([for key in var.https_domain_keys : contains(["latin", "cyrillic"], key)])
    error_message = "HTTPS domain keys must be latin or cyrillic."
  }
}
