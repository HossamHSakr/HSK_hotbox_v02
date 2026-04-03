$ErrorActionPreference = 'SilentlyContinue'

$projectTag = 'HSK_hotbox_v02'
$packagedExeNames = @(
  'universal-hotbox-os.exe',
  'HSK_hotbox_v02.exe'
)

$targets = Get-CimInstance Win32_Process | Where-Object {
  (
    $_.Name -ieq 'electron.exe' -and
    $_.CommandLine -and
    $_.CommandLine -like "*$projectTag*"
  ) -or (
    $packagedExeNames -contains $_.Name
  )
}

foreach ($proc in $targets) {
  try {
    Stop-Process -Id $proc.ProcessId -Force
  } catch {
    # Ignore processes that exit between lookup and stop.
  }
}
