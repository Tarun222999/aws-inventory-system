$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$artifacts = Join-Path $repo '.artifacts'
$bundle = Join-Path $artifacts 'phase9-operations'
New-Item -ItemType Directory -Path $bundle -Force | Out-Null

Push-Location $repo
try {
  $esbuild = Join-Path $repo 'node_modules/.bin/esbuild.cmd'
  & $esbuild apps/worker/src/low-stock-report-lambda.ts apps/worker/src/order-confirmation-lambda.ts `
    --bundle --platform=node --target=node22 --format=esm --out-extension:.js=.mjs "--outdir=$bundle" `
    "--banner:js=import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);"
  if ($LASTEXITCODE -ne 0) { throw 'Lambda bundling failed. Run npm ci from the repository root.' }

  $handlers = @(
    (Join-Path $bundle 'low-stock-report-lambda.mjs'),
    (Join-Path $bundle 'order-confirmation-lambda.mjs')
  )
  foreach ($handler in $handlers) {
    node --check $handler
    if ($LASTEXITCODE -ne 0) { throw "Invalid Lambda bundle: $handler" }
  }

  $certificate = Join-Path $bundle 'global-bundle.pem'
  Invoke-WebRequest -Uri 'https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem' -OutFile $certificate
  $files = $handlers + $certificate
  $zip = Join-Path $artifacts 'phase9-operations.zip'
  Compress-Archive -LiteralPath $files -DestinationPath $zip -Force
  Write-Output $zip
} finally {
  Pop-Location
}
