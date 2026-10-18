<#
.SYNOPSIS
    Builds the release and Chrome Web Store zips for the current manifest version.

.DESCRIPTION
    Writes two files to dist\:
      ITSM-Banner-Toggle-<version>.zip        For GitHub releases and Load unpacked. Includes
                                              the README, CHANGELOG, privacy policy and the
                                              README's screenshots.
      ITSM-Banner-Toggle-<version>-store.zip  For the Chrome Web Store. Only the files the
                                              extension itself needs.
    Then checks both zips contain every file the extension loads.

.EXAMPLE
    pwsh scripts/package.ps1

.NOTES
    Version 1.0
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

$root    = Split-Path $PSScriptRoot -Parent
$version = (Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json).version
$dist    = Join-Path $root 'dist'
New-Item -ItemType Directory -Force $dist | Out-Null

# Everything the extension loads at runtime.
$extension = @(
    'manifest.json', 'background.js', 'content.js', 'sites.js',
    'popup.html', 'popup.css', 'popup.js',
    'options.html', 'options.css', 'options.js',
    'icons/icon16.png', 'icons/icon32.png', 'icons/icon48.png', 'icons/icon128.png'
)
$docs = @('README.md', 'CHANGELOG.md', 'PRIVACY.md') +
    (Get-ChildItem (Join-Path $root 'docs\images') -File | ForEach-Object { "docs/images/$($_.Name)" })

function New-Zip([string]$Path, [string[]]$Files) {
    Remove-Item $Path -ErrorAction SilentlyContinue
    $zip = [IO.Compression.ZipFile]::Open($Path, 'Create')
    try {
        foreach ($f in $Files) {
            $source = Join-Path $root $f
            if (-not (Test-Path $source)) { throw "Missing file: $f" }
            [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $source, $f, 'Optimal')
        }
    }
    finally { $zip.Dispose() }

    # Confirm the extension's own files are all there.
    $zip = [IO.Compression.ZipFile]::OpenRead($Path)
    $names = $zip.Entries.FullName
    $zip.Dispose()
    $missing = $extension | Where-Object { $_ -notin $names }
    if ($missing) { throw "$Path is missing: $($missing -join ', ')" }
    Write-Host ("{0}  ({1} files, {2:N0} KB)" -f (Split-Path $Path -Leaf), $names.Count, ((Get-Item $Path).Length / 1KB))
}

New-Zip (Join-Path $dist "ITSM-Banner-Toggle-$version.zip") ($extension + $docs)
New-Zip (Join-Path $dist "ITSM-Banner-Toggle-$version-store.zip") $extension
