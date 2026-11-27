$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $root
$target = [IO.Path]::GetFullPath((Join-Path $root 'artifacts\desktop-install'))
if (-not $target.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Test installation must remain inside this workspace.' }
$installer = Join-Path $root 'release\FlowSync-Setup-0.1.0-x64.exe'
$upgrade = Join-Path $root 'release\upgrade-test\FlowSync-Setup-0.1.1-x64.exe'
$exe = Join-Path $target 'FlowSync.exe'
$uninstall = Join-Path $target 'Uninstall FlowSync.exe'
$shortcuts = @((Join-Path ([Environment]::GetFolderPath('Desktop')) 'FlowSync.lnk'), (Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs\FlowSync.lnk'))
$registryRoot = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall'
function InstalledFlowSync { @(Get-ChildItem -LiteralPath $registryRoot | Get-ItemProperty | Where-Object { $_.DisplayName -like 'FlowSync*' }) }
if (@(InstalledFlowSync).Count -gt 0 -or (Test-Path -LiteralPath $exe)) { throw 'A FlowSync installation already exists. Installer verification will not modify it.' }
foreach ($shortcut in $shortcuts) { if (Test-Path -LiteralPath $shortcut) { throw "An existing FlowSync shortcut must be preserved: $shortcut" } }
if (-not (Test-Path -LiteralPath $installer) -or -not (Test-Path -LiteralPath $upgrade)) { throw 'Build the 0.1.0 release and the 0.1.1 upgrade-test installer first (see README).' }
$oldExe = $env:FLOWSYNC_DESKTOP_EXE
$oldProfile = $env:FLOWSYNC_TEST_PROFILE
$oldVersion = $env:FLOWSYNC_EXPECTED_VERSION
$changedInstallation = $false
$checks = [Collections.Generic.List[string]]::new()
$profileRoot = Join-Path ([Environment]::GetFolderPath('ApplicationData')) 'FlowSync'
$hadProfile = Test-Path -LiteralPath $profileRoot
$sentinel = Join-Path $profileRoot ('.uninstall-check-' + [guid]::NewGuid().ToString('N'))
$sentinelValue = [guid]::NewGuid().ToString('N')
function Install([string]$file) {
    $process = Start-Process -FilePath $file -ArgumentList "/S /D=$target" -WindowStyle Hidden -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "Installer failed: $($process.ExitCode)" }
    if (-not (Test-Path -LiteralPath $exe)) { throw 'Installed executable is missing.' }
}
function UninstallTest {
    if (Test-Path -LiteralPath $uninstall) {
        $process = Start-Process -FilePath $uninstall -ArgumentList '/S' -WindowStyle Hidden -Wait -PassThru
        if ($process.ExitCode -ne 0) { throw "Uninstaller failed: $($process.ExitCode)" }
        for ($i = 0; $i -lt 100 -and (Test-Path -LiteralPath $exe); $i++) { Start-Sleep -Milliseconds 200 }
    }
    if (Test-Path -LiteralPath $exe) { throw 'Uninstall did not remove program files.' }
}
try {
    New-Item -ItemType Directory -Path $profileRoot -Force | Out-Null
    Set-Content -LiteralPath $sentinel -Value $sentinelValue -NoNewline
    $changedInstallation = $true
    Install $installer
    foreach ($shortcut in $shortcuts) { if (-not (Test-Path -LiteralPath $shortcut)) { throw "Installer did not create shortcut: $shortcut" } }
    if (@(InstalledFlowSync).Count -ne 1) { throw 'Installer registration is missing or duplicated.' }
    $checks.Add('Silent per-user installation and desktop/Start menu shortcuts')
    $env:FLOWSYNC_DESKTOP_EXE = $exe
    Remove-Item Env:\FLOWSYNC_TEST_PROFILE -ErrorAction SilentlyContinue
    node scripts/milestone10.smoke.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Installed application feature tests failed.' }
    $report = Get-Content -LiteralPath artifacts/milestone10-desktop.json -Raw | ConvertFrom-Json
    $env:FLOWSYNC_TEST_PROFILE = $report.profile
    $env:FLOWSYNC_EXPECTED_VERSION = '0.1.0'
    node scripts/desktop-profile.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Initial installed data verification failed.' }
    Install $upgrade
    $env:FLOWSYNC_EXPECTED_VERSION = '0.1.1'
    node scripts/desktop-profile.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Upgrade did not retain all saved data.' }
    $checks.Add('0.1.0 to 0.1.1 installer upgrade retained tasks, writing, preferences, and reminders')
    UninstallTest
    foreach ($shortcut in $shortcuts) { if (Test-Path -LiteralPath $shortcut) { throw "Uninstall left a shortcut: $shortcut" } }
    if (@(InstalledFlowSync).Count -ne 0) { throw 'Uninstall left its registration.' }
    if (-not (Test-Path -LiteralPath (Join-Path $report.profile 'Local Storage\leveldb'))) { throw 'Uninstall removed saved data.' }
    if (-not (Test-Path -LiteralPath $sentinel) -or (Get-Content -LiteralPath $sentinel -Raw) -ne $sentinelValue) { throw 'Uninstall changed the default user data directory.' }
    $checks.Add('Uninstall removed program, shortcuts, and registration while preserving the test profile and default-profile sentinel')
    Install $installer
    $env:FLOWSYNC_EXPECTED_VERSION = '0.1.0'
    node scripts/desktop-profile.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Reinstallation did not recover saved data.' }
    $checks.Add('Reinstallation recovered all retained local data')
    $checks | ConvertTo-Json | Set-Content -LiteralPath artifacts/milestone10-installer.json
    Write-Output $checks
} finally {
    if ($changedInstallation) { UninstallTest }
    if (Test-Path -LiteralPath $sentinel) { Remove-Item -LiteralPath $sentinel }
    if (-not $hadProfile -and (Test-Path -LiteralPath $profileRoot) -and @(Get-ChildItem -LiteralPath $profileRoot -Force).Count -eq 0) { Remove-Item -LiteralPath $profileRoot }
    $env:FLOWSYNC_DESKTOP_EXE = $oldExe
    $env:FLOWSYNC_TEST_PROFILE = $oldProfile
    $env:FLOWSYNC_EXPECTED_VERSION = $oldVersion
}

