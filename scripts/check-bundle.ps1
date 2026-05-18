$ErrorActionPreference = "Stop"
$bundle = Join-Path $PSScriptRoot "..\main.js"
if (-not (Test-Path $bundle)) {
  throw "未找到 main.js，请先运行 npm run build。"
}
$patterns = @(
  'sourceMappingURL',
  'eval\(',
  'new Function',
  '\bBuffer\b',
  'require\("path"\)',
  'require\("stream"\)'
)
$hits = Select-String -Path $bundle -Pattern $patterns -CaseSensitive
if ($hits) {
  $hits | ForEach-Object { Write-Host $_.Line }
  throw "main.js 中发现审核风险片段。"
}
Write-Host "main.js 审核风险片段检查通过。"
