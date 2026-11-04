provider "cloudflare" {}

resource "cloudflare_dns_record" "api_origin" {
  zone_id = "519fbc35cfb537c354db08f3e2323bb3"

  name    = "api-origin.tarunapps.com"
  type    = "CNAME"
  content = aws_lb.api.dns_name
  ttl     = 1
  proxied = false
}
