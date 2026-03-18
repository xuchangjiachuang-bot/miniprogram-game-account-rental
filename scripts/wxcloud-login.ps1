$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $projectRoot ".wxcloud-cli.local.json"

if (-not (Test-Path $configPath)) {
  throw "未找到项目内微信云托管 CLI 配置文件: $configPath"
}

$config = Get-Content $configPath -Raw | ConvertFrom-Json

if (-not $config.appId -or -not $config.privateKey) {
  throw "项目内微信云托管 CLI 配置缺少 appId 或 privateKey"
}

wxcloud login --appId $config.appId --privateKey $config.privateKey
