resource "aws_cloudwatch_event_bus" "orders" {
  name = "order-platform-phase7"

  lifecycle {
    prevent_destroy = true
  }
}

output "order_event_bus_name" {
  description = "Event bus used by the outbox publisher"
  value       = aws_cloudwatch_event_bus.orders.name
}

output "order_event_bus_arn" {
  description = "Event bus ARN for publisher permissions"
  value       = aws_cloudwatch_event_bus.orders.arn
}