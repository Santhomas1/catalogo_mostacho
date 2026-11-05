# Genera los iconos cuadrados desde el logo original sin deformarlo (Windows).
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path $PSScriptRoot -Parent
$source = [Drawing.Image]::FromFile((Join-Path $projectRoot 'public/logo/mostacho.png'))
try {
  foreach ($spec in @(@{Name='icon-192.png';Size=192;Ratio=.86},@{Name='icon-512.png';Size=512;Ratio=.86},@{Name='apple-touch-icon.png';Size=180;Ratio=.86},@{Name='icon-maskable-512.png';Size=512;Ratio=.64})) {
    $bitmap = New-Object Drawing.Bitmap($spec.Size,$spec.Size)
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.Clear([Drawing.Color]::White)
      $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
      $width = [int]($spec.Size * $spec.Ratio)
      $height = [int]($width * $source.Height / $source.Width)
      $graphics.DrawImage($source,[int](($spec.Size-$width)/2),[int](($spec.Size-$height)/2),$width,$height)
      $bitmap.Save((Join-Path $projectRoot ('public/pwa/'+$spec.Name)),[Drawing.Imaging.ImageFormat]::Png)
    } finally { $graphics.Dispose(); $bitmap.Dispose() }
  }
} finally { $source.Dispose() }
# Ruta convencional de iOS, además de la copia histórica dentro de /pwa.
Copy-Item -LiteralPath (Join-Path $projectRoot 'public/pwa/apple-touch-icon.png') -Destination (Join-Path $projectRoot 'public/apple-touch-icon.png') -Force
