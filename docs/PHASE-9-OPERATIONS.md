# Phase 9 operations deployment

The optional runtime module adds three flows:

- An EventBridge rule matches the existing `OrderConfirmed` event, routes an operations message to SNS, and invokes a Lambda that sends a test confirmation through SES. The configured inbox receives both messages.
- EventBridge Scheduler invokes the low-stock Lambda at 9 AM Asia/Kolkata when enabled. The Lambda reads private PostgreSQL, writes a private report under `reports/low-stock/` in the existing product bucket, and sends a signed link through SES. Scheduler delivery failures go to a dedicated SQS queue.
- CloudWatch displays order DLQ depth and ALB target 5xx responses. Alarms publish to the operations SNS topic.

## Prepare a reviewed plan

In the repository PowerShell window with AWS and Cloudflare credentials loaded, build the Lambda ZIP using the locked npm dependencies:

```powershell
& .\scripts\build-operations-lambdas.ps1
$env:TF_VAR_operations_email = Read-Host "Verified test inbox"
cd infrastructure\terraform\runtime
terraform init
terraform plan "-var=enable_operations=true" "-var=service_desired_count=0" "-out=operations-start.tfplan"
```

Keep saved plans private. They can contain the email address and sensitive Terraform values. The first plan keeps ECS at zero and the schedule disabled. Review the cost and teardown window before applying. The SES identity and SNS subscription send verification and confirmation messages to the configured inbox.

## Verify and tear down

1. Confirm the SES identity and SNS subscription. Run the database migration before starting ECS. Keep `enable_operations=true` in subsequent runtime plans so Terraform retains the module while testing.
2. Start the application and create one disposable order. Verify fulfillment, the SNS operations message and the SES order confirmation. Event delivery can repeat, so the confirmation exercise can produce duplicate emails.
3. Invoke the report Lambda with a unique test reporting date and check its S3 object and SES link. Then test Scheduler with a separately reviewed one-time schedule or a bounded change to the existing schedule. The Scheduler DLQ covers failures delivering the invocation.
4. Verify the dashboard and trigger a controlled alarm state change. Confirm its SNS message in the inbox.
5. Disable CloudFront if enabled and review the runtime destroy plan. Verify removal of the runtime, alarm actions, schedule, endpoints, and temporary DNS record. Account for any report object retained in the private bucket and record its cost and review date in the cost ledger.

The report Lambda adds two billable interface endpoints while deployed. The runtime also adds CloudWatch alarm and dashboard charges and usage-based Lambda, messaging, email, logging, and S3 charges. Review current rates and the planned lifetime before the live exercise. Report objects use the retained bucket so they can be reviewed separately from runtime deletion.
