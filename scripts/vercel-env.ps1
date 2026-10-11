# .env.local 의 값을 Vercel 운영(production) 환경 변수로 올린다. 값은 화면에 출력하지 않는다.
# 사용: powershell -ExecutionPolicy Bypass -File scripts/vercel-env.ps1
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
Get-Content .env.local | ForEach-Object {
  $pair = $_ -split '=', 2
  $name = $pair[0].Trim()
  if ($name -like 'NEXT_PUBLIC_SUPABASE_*' -and $pair[1]) {
    $pair[1].Trim() | npx --yes vercel@latest env add $name production --force | Out-Null
    if ($LASTEXITCODE -eq 0) { "$name : 등록됨" } else { "$name : 실패" }
  }
}
