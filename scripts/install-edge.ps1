param(
  [ValidateSet('guide', 'dev', 'native', 'pack', 'doctor')]
  [string]$Mode = 'guide',
  [switch]$Remove
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$ManifestPath = Join-Path $Root 'manifest.json'

function Get-EdgeExe {
  $candidates = @()
  foreach ($hive in 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe', 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe') {
    try {
      $v = (Get-ItemProperty -LiteralPath $hive -ErrorAction Stop).'(default)'
      if ($v -and (Test-Path -LiteralPath $v)) { return $v }
    } catch {}
  }
  $candidates += @(
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
  )
  foreach ($c in $candidates) {
    if ($c -and (Test-Path -LiteralPath $c)) { return $c }
  }
  return $null
}

function Test-Manifest {
  if (-not (Test-Path -LiteralPath $ManifestPath)) {
    Write-Host "[FAIL] manifest.json not found at $ManifestPath" -ForegroundColor Red
    return $false
  }
  try { $m = [IO.File]::ReadAllText($ManifestPath) | ConvertFrom-Json } catch {
    Write-Host "[FAIL] manifest.json is not valid JSON: $_" -ForegroundColor Red
    return $false
  }
  $required = @('manifest_version', 'name', 'version', 'background', 'action')
  foreach ($k in $required) {
    if (-not $m.PSObject.Properties[$k]) {
      Write-Host "[FAIL] manifest.json missing required field: $k" -ForegroundColor Red
      return $false
    }
  }
  $refs = @($m.icons.PSObject.Properties.Value) +
    @($m.action.default_icon.PSObject.Properties.Value) +
    @($m.background.service_worker) +
    @($m.action.default_popup) +
    @($m.options_ui.page)
  $bad = @()
  foreach ($r in $refs) {
    if ($r -and -not (Test-Path -LiteralPath (Join-Path $Root $r))) { $bad += $r }
  }
  if ($bad.Count -gt 0) {
    Write-Host "[FAIL] manifest references missing files:" -ForegroundColor Red
    $bad | ForEach-Object { Write-Host "       - $_" -ForegroundColor Red }
    return $false
  }
  Write-Host "[OK] manifest.json valid (name=$($m.name), version=$($m.version))" -ForegroundColor Green
  return $true
}

function Invoke-Guide {
  if (-not (Test-Manifest)) { exit 1 }
  $edge = Get-EdgeExe
  if (-not $edge) {
    Write-Host '[WARN] msedge.exe not found; open edge://extensions manually.' -ForegroundColor Yellow
  }
  Set-Clipboard -Value $Root
  $extId = ''
  try {
    $m = [IO.File]::ReadAllText($ManifestPath) | ConvertFrom-Json
    if ($m.key) { $extId = Get-ExtensionIdFromKey $m.key }
  } catch {}
  Write-Host ''
  Write-Host '============== DSH Whale Widget - Installation Guide ==============' -ForegroundColor Cyan
  Write-Host ''
  Write-Host 'The extension path is already copied to your clipboard:'
  Write-Host "  $Root"
  Write-Host ''
  Write-Host 'Steps:'
  Write-Host '  1. A browser tab will open at  edge://extensions  after you'
  Write-Host '     press any key.'
  Write-Host '  2. Turn ON  "Developer mode"  (toggle, usually bottom-left).'
  Write-Host '  3. Click  "Load unpacked"  and paste the path (Ctrl+V).'
  Write-Host '  4. Done - the whale appears on the bottom-right of every'
  Write-Host '     webpage. Refresh already-open pages to see it.'
  Write-Host ''
  if ($extId) {
    Write-Host "Extension ID (fixed): $extId"
    Write-Host ''
  }
  Write-Host 'Optional: Opencode usage source (local AI usage dashboard)'
  Write-Host '  Run:  .\scripts\install-edge.ps1 -Mode native'
  Write-Host '  Then fully restart Edge and pick "Opencode" in the whale menu.'
  Write-Host '====================================================================' -ForegroundColor Cyan
  Write-Host ''
  Write-Host 'Press any key to open the extensions page...' -ForegroundColor Green
  $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
  if ($edge) {
    Start-Process -FilePath $edge -ArgumentList 'edge://extensions'
    Write-Host '[OK] launched edge://extensions'
  }
}

function Invoke-Doctor {
  $ok = Test-Manifest
  $edge = Get-EdgeExe
  if ($edge) { Write-Host "[OK] Edge found: $edge" -ForegroundColor Green }
  else { Write-Host '[FAIL] Edge not found' -ForegroundColor Red; $ok = $false }
  $winsqlite = Test-Path "$env:SystemRoot\System32\winsqlite3.dll"
  if ($winsqlite) { Write-Host '[OK] winsqlite3.dll present (Opencode source prerequisite)' -ForegroundColor Green }
  else { Write-Host '[WARN] winsqlite3.dll missing (needed by P5 native host)' -ForegroundColor Yellow }
  $psver = $PSVersionTable.PSVersion.ToString()
  Write-Host "[OK] PowerShell $psver"
  $hostName = 'com.dsh_whale.opencode'
  $reg = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$hostName"
  $nativeOk = $false
  try {
    $v = (Get-ItemProperty -LiteralPath $reg -ErrorAction Stop).'(default)'
    if ($v -and (Test-Path -LiteralPath $v)) {
      $hostJson = [IO.File]::ReadAllText($v) | ConvertFrom-Json
      $m = [IO.File]::ReadAllText($ManifestPath) | ConvertFrom-Json
      if ($m.key) {
        $expect = 'chrome-extension://' + (Get-ExtensionIdFromKey $m.key) + '/'
        if ($hostJson.allowed_origins -contains $expect) { $nativeOk = $true }
        else { Write-Host '[WARN] host allowed_origins mismatch (re-run -Mode native)' -ForegroundColor Yellow }
      } else {
        $nativeOk = $true
      }
    }
  } catch {}
  if ($nativeOk) { Write-Host '[OK] native host registered' -ForegroundColor Green }
  else { Write-Host '[WARN] native host not registered (run: install-edge.ps1 -Mode native)' -ForegroundColor Yellow }
  if ($ok) { Write-Host 'Doctor summary: PASS' -ForegroundColor Green } else { Write-Host 'Doctor summary: FAIL' -ForegroundColor Red; exit 1 }
}

function Get-ExtensionIdFromKey($keyB64) {
  $der = [Convert]::FromBase64String($keyB64)
  $sha = [Security.Cryptography.SHA256]::Create()
  $h = $sha.ComputeHash($der)
  $sb = New-Object System.Text.StringBuilder
  for ($i = 0; $i -lt 16; $i++) {
    [void]$sb.Append([char](97 + ($h[$i] -shr 4)))
    [void]$sb.Append([char](97 + ($h[$i] -band 15)))
  }
  return $sb.ToString()
}

function Invoke-Native {
  $hostName = 'com.dsh_whale.opencode'
  $dir = Join-Path $env:LOCALAPPDATA 'dsh-whale\native-hosts'
  $cmdPath = Join-Path $Root 'native-host\run.cmd'
  $tmplPath = Join-Path $Root 'native-host\com.dsh_whale.opencode.json.tmpl'
  $manifestPath = Join-Path $Root 'manifest.json'
  if (-not (Test-Path -LiteralPath $cmdPath)) { Write-Host '[FAIL] native-host\run.cmd not found' -ForegroundColor Red; exit 1 }
  if (-not (Test-Path -LiteralPath $tmplPath)) { Write-Host '[FAIL] host manifest template not found' -ForegroundColor Red; exit 1 }
  if (-not (Test-Path -LiteralPath "$env:SystemRoot\System32\winsqlite3.dll")) { Write-Host '[FAIL] winsqlite3.dll missing' -ForegroundColor Red; exit 1 }
  $m = [IO.File]::ReadAllText($manifestPath) | ConvertFrom-Json
  if (-not $m.key) { Write-Host '[FAIL] manifest.json missing "key" field' -ForegroundColor Red; exit 1 }
  $extId = Get-ExtensionIdFromKey $m.key
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $tmpl = [IO.File]::ReadAllText($tmplPath)
  $json = $tmpl.Replace('__HOST_CMD__', $cmdPath.Replace('\', '\\')).Replace('__EXTENSION_ID__', $extId)
  $jsonPath = Join-Path $dir "$hostName.json"
  [IO.File]::WriteAllText($jsonPath, $json, (New-Object System.Text.UTF8Encoding($false)))
  New-Item -Path "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$hostName" -Force | Out-Null
  Set-ItemProperty -Path "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$hostName" -Name '(default)' -Value $jsonPath
  Write-Host "[OK] extension ID derived from manifest key: $extId" -ForegroundColor Green
  Write-Host "[OK] native host manifest: $jsonPath" -ForegroundColor Green
  Write-Host "[OK] registry: HKCU\Software\Microsoft\Edge\NativeMessagingHosts\$hostName"
  Write-Host '     restart Edge afterwards for the registration to take effect.'
}

function Invoke-NativeRemove {
  $hostName = 'com.dsh_whale.opencode'
  Remove-Item -Path "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$hostName" -Force -ErrorAction SilentlyContinue
  $dir = Join-Path $env:LOCALAPPDATA 'dsh-whale\native-hosts'
  Remove-Item -Path (Join-Path $dir "$hostName.json") -Force -ErrorAction SilentlyContinue
  Write-Host '[OK] native host unregistered' -ForegroundColor Green
}

switch ($Mode) {
  'guide' { Invoke-Guide }
  'doctor' { Invoke-Doctor }
  'dev' {
    Write-Host '[TODO] dev mode lands in P0 follow-up / best-effort smoke test (see PLAN.md section 6).' -ForegroundColor Yellow
    Invoke-Guide
  }
  'native' {
    if ($Remove) { Invoke-NativeRemove }
    else { Invoke-Native }
  }
  'pack' {
    Write-Host '[TODO] pack lands in P6 (see PLAN.md section 6).' -ForegroundColor Yellow
  }
}
