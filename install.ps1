# Virtual Pet Desktop installer (Windows PowerShell)
#   iwr -useb https://raw.githubusercontent.com/Tanachai0In/virtual-pet-desktop/main/install.ps1 | iex
$ErrorActionPreference = 'Stop'

$RepoUrl = 'https://github.com/Tanachai0In/virtual-pet-desktop.git'
$InstallDir = if ($env:VIRTUAL_PET_HOME) { $env:VIRTUAL_PET_HOME } else { Join-Path $HOME '.virtual-pet-desktop' }

function Say($msg) { Write-Host "[virtual-pet] $msg" -ForegroundColor Magenta }

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw 'git not found — install it from https://git-scm.com'
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js not found — install Node 20+ from https://nodejs.org'
}
$nodeMajor = [int](node -p 'process.versions.node.split(".")[0]')
if ($nodeMajor -lt 20) { throw "Node.js >= 20 required (found $(node --version))" }

if (Test-Path (Join-Path $InstallDir '.git')) {
  Say "updating existing install in $InstallDir"
  git -C $InstallDir pull --ff-only
} else {
  Say "cloning into $InstallDir"
  git clone $RepoUrl $InstallDir
}

Set-Location $InstallDir
Say 'installing dependencies (this downloads Electron, may take a minute)...'
npm install --no-audit --no-fund

Say 'done! start your pet with:'
Say "  cd $InstallDir; npm start"
Say "tip: enable 'Launch at startup' from the tray icon menu once it's running."

$ans = Read-Host 'start it now? [Y/n]'
if ($ans -eq '' -or $ans -match '^[Yy]') { npm start }
