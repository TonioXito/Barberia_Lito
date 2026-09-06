param(
  [string]$Logo = "public/icons/Malvinas.jpg",
  [string]$OutDir = "public/icons"
)

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"

$src = Resolve-Path $Logo
$img = [System.Drawing.Image]::FromFile($src)
Write-Output "Logo: $($img.Width) x $($img.Height)"

function New-IconCanvas {
  param(
    [int]$Size,
    [double]$FillPct,
    [string]$OutFile
  )
  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::White)
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  $maxSide = $Size * $FillPct
  $scale = [Math]::Min($maxSide / $img.Width, $maxSide / $img.Height)
  $w = [int][Math]::Round($img.Width * $scale)
  $h = [int][Math]::Round($img.Height * $scale)
  if ($w -lt 1) { $w = 1 }
  if ($h -lt 1) { $h = 1 }
  $x = [int](($Size - $w) / 2)
  $y = [int](($Size - $h) / 2)

  $g.DrawImage($img, $x, $y, $w, $h)
  $outPath = Join-Path $OutDir $OutFile
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output "$OutFile -> logo de ${w}x${h} centrado en ${Size}x${Size}"
  $g.Dispose()
  $bmp.Dispose()
}

New-IconCanvas -Size 192 -FillPct 0.88 -OutFile "icon-192.png"
New-IconCanvas -Size 512 -FillPct 0.88 -OutFile "icon-512.png"
New-IconCanvas -Size 180 -FillPct 0.88 -OutFile "apple-touch-icon.png"
New-IconCanvas -Size 512 -FillPct 0.60 -OutFile "icon-maskable-512.png"

$img.Dispose()
Write-Output "Listo"