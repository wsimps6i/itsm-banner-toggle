<#
.SYNOPSIS
    Renders the Chrome Web Store images from showcase.html.

.DESCRIPTION
    Uses headless Chrome with a throwaway profile to render three 1280x800 screenshots,
    the 440x280 small promo tile and the 1400x560 marquee tile, then re-saves each one as a
    24-bit PNG (no alpha channel), which is what the Chrome Web Store accepts.

    The screenshots are built from docs/images, so run docs/capture-screenshots.mjs
    first if the extension's UI has changed.

.EXAMPLE
    pwsh docs/store/make-store-images.ps1

.NOTES
    Version 1.1
#>
[CmdletBinding()]
param(
    [string]$Chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$here    = $PSScriptRoot
$out     = Join-Path $here 'images'
$profile = Join-Path ([IO.Path]::GetTempPath()) 'itsm-banner-toggle-store-images'
$page    = ([Uri](Join-Path $here 'showcase.html')).AbsoluteUri
New-Item -ItemType Directory -Force $out | Out-Null

$images = @(
    @{ Shot = 'popup';   Width = 1280; Height = 800; File = '1-popup.png' }
    @{ Shot = 'turnon';  Width = 1280; Height = 800; File = '2-turn-on.png' }
    @{ Shot = 'options'; Width = 1280; Height = 800; File = '3-options.png' }
    @{ Shot = 'tile';    Width = 440;  Height = 280; File = 'promo-tile-440x280.png' }
    @{ Shot = 'marquee'; Width = 1400; Height = 560; File = 'marquee-1400x560.png' }
)

foreach ($img in $images) {
    $raw = Join-Path $out "raw-$($img.File)"
    & $Chrome --headless=new "--user-data-dir=$profile" --hide-scrollbars --force-device-scale-factor=1 `
        --allow-file-access-from-files "--window-size=$($img.Width),$($img.Height)" `
        "--screenshot=$raw" "$page`?shot=$($img.Shot)" 2>$null | Out-Null

    # Re-save without an alpha channel, at exactly the size the store asks for.
    $src = [Drawing.Image]::FromFile($raw)
    try {
        $bmp = New-Object Drawing.Bitmap $img.Width, $img.Height, ([Drawing.Imaging.PixelFormat]::Format24bppRgb)
        $g = [Drawing.Graphics]::FromImage($bmp)
        $g.DrawImage($src, 0, 0, $img.Width, $img.Height)
        $g.Dispose()
        $bmp.Save((Join-Path $out $img.File), [Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
    }
    finally {
        $src.Dispose()
        Remove-Item $raw
    }
    Write-Host "Saved $($img.File) ($($img.Width)x$($img.Height))"
}

Remove-Item -Recurse -Force $profile -ErrorAction SilentlyContinue
