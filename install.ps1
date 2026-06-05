<#
.SYNOPSIS
    Installs the Homelab Wallpaper Dashboard into your Wallpaper Engine
    wallpapers folder. Safe, no administrator rights required.

.DESCRIPTION
    - Auto-detects Steam + the Wallpaper Engine content folder
      (...\steamapps\workshop\content\431960).
    - Copies this project into a uniquely named subfolder.
    - Tells you how to apply it in Wallpaper Engine.

.NOTES
    Right-click this file -> "Run with PowerShell".
    If Windows blocks it, run this once in a PowerShell window:
        Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
    ...then run the script again.
#>

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
$CHECK = [char]0x2713   # checkmark, encoding-safe

function Info($m) { Write-Host $m -ForegroundColor Cyan }
function Ok($m)   { Write-Host $m -ForegroundColor Green }
function Warn($m) { Write-Host $m -ForegroundColor Yellow }
function Fail($m) { Write-Host $m -ForegroundColor Red }

Write-Host ''
Info '======================================================'
Info '  Homelab Wallpaper Dashboard  -  installer'
Info '======================================================'
Write-Host ''

# Project root = folder this script lives in
$projectRoot = $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
}

# --- 1. Locate Steam ------------------------------------------------------
function Get-SteamPath {
    $keys = @(
        'HKCU:\Software\Valve\Steam',
        'HKLM:\SOFTWARE\WOW6432Node\Valve\Steam',
        'HKLM:\SOFTWARE\Valve\Steam'
    )
    foreach ($key in $keys) {
        try {
            $p = Get-ItemProperty -Path $key -ErrorAction Stop
            foreach ($name in @('SteamPath', 'InstallPath')) {
                $val = $p.$name
                if ($val -and (Test-Path $val)) {
                    return ($val -replace '/', '\')
                }
            }
        } catch { }
    }
    return $null
}

# --- Collect every Steam library root (handles games on other drives) -----
function Get-SteamLibraries($steam) {
    $libs = @()
    if ($steam -and (Test-Path $steam)) { $libs += $steam }
    $vdf = Join-Path $steam 'steamapps\libraryfolders.vdf'
    if (Test-Path $vdf) {
        try {
            $txt = Get-Content $vdf -Raw
            foreach ($m in [regex]::Matches($txt, '"path"\s*"([^"]+)"')) {
                $libs += ($m.Groups[1].Value -replace '\\\\', '\' -replace '/', '\')
            }
        } catch { }
    }
    return ($libs | Select-Object -Unique)
}

$steam = Get-SteamPath
$weDir = $null

if ($steam) {
    Info "Steam found:  $steam"
    foreach ($lib in (Get-SteamLibraries $steam)) {
        $candidate = Join-Path $lib 'steamapps\workshop\content\431960'
        if (Test-Path $candidate) { $weDir = $candidate; break }
    }
    if (-not $weDir) {
        # Workshop folder may not exist yet (nothing subscribed). Create it.
        $candidate = Join-Path $steam 'steamapps\workshop\content\431960'
        try {
            New-Item -ItemType Directory -Force -Path $candidate | Out-Null
            $weDir = $candidate
        } catch { }
    }
}

# --- Manual fallback ------------------------------------------------------
if (-not $weDir) {
    Warn 'Could not auto-detect the Wallpaper Engine content folder.'
    Warn 'It is normally:  <Steam>\steamapps\workshop\content\431960'
    Write-Host ''
    $manual = Read-Host 'Paste the full target path (or press Enter to cancel)'
    if ([string]::IsNullOrWhiteSpace($manual)) { Fail 'Cancelled.'; exit 1 }
    if (-not (Test-Path $manual)) {
        try { New-Item -ItemType Directory -Force -Path $manual | Out-Null }
        catch { Fail "Cannot create that path: $manual"; exit 1 }
    }
    $weDir = $manual
}

Info "Install into: $weDir"
Write-Host ''

# --- 2/3. Copy into a uniquely named folder -------------------------------
$stamp    = Get-Date -Format 'yyyyMMdd-HHmmss'
$destName = "homelab-wallpaper-$stamp"
$dest     = Join-Path $weDir $destName
$exclude  = @('install.ps1', '.git', '.gitignore')

try {
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    Get-ChildItem -Path $projectRoot -Force |
        Where-Object { $exclude -notcontains $_.Name } |
        ForEach-Object { Copy-Item -Path $_.FullName -Destination $dest -Recurse -Force }
} catch {
    Fail "Copy failed: $($_.Exception.Message)"
    exit 1
}

# --- Sanity check ---------------------------------------------------------
if (-not (Test-Path (Join-Path $dest 'project.json'))) {
    Fail 'project.json missing after copy - the install looks incomplete.'
    exit 1
}
if (-not (Test-Path (Join-Path $dest 'index.html'))) {
    Fail 'index.html missing after copy - the install looks incomplete.'
    exit 1
}

Write-Host ''
Ok "$CHECK Installed to $dest"
Write-Host ''
Info 'Next steps:'
Write-Host '   1.  Open Wallpaper Engine -> click "Browse" -> "My Wallpapers"'
Write-Host "   2.  Find 'Homelab Dashboard' and apply it"
Write-Host ''

# --- 5. Is Wallpaper Engine already running? ------------------------------
$we = Get-Process -Name 'wallpaper32', 'wallpaper64' -ErrorAction SilentlyContinue
if ($we) {
    Warn 'Wallpaper Engine is currently running.'
    Warn 'Right-click your wallpaper list in WE and choose "Refresh"'
    Warn '(or restart Wallpaper Engine) so the new wallpaper appears.'
    Write-Host ''
}

Ok 'Done. Enjoy your homelab dashboard!'
