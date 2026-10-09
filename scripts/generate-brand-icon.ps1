Add-Type -AssemblyName System.Drawing

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$target = Join-Path $projectRoot 'assets/icon-512.png'
$bitmap = [System.Drawing.Bitmap]::new(512, 512)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#e9defb'))

$white = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#fffaf0'))
$purple = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#7655b9'))
$peach = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#ec9b7d'))
$yellow = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#f4cb69'))
$graphics.FillEllipse($white, 57, 57, 398, 398)
$points = [System.Drawing.Point[]]@(
    [System.Drawing.Point]::new(256, 119),
    [System.Drawing.Point]::new(291, 219),
    [System.Drawing.Point]::new(392, 256),
    [System.Drawing.Point]::new(291, 293),
    [System.Drawing.Point]::new(256, 393),
    [System.Drawing.Point]::new(221, 293),
    [System.Drawing.Point]::new(120, 256),
    [System.Drawing.Point]::new(221, 219)
)
$graphics.FillPolygon($purple, $points)
$graphics.FillEllipse($peach, 351, 112, 54, 54)
$graphics.FillEllipse($yellow, 105, 352, 38, 38)
$bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)

$white.Dispose()
$purple.Dispose()
$peach.Dispose()
$yellow.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
Write-Output 'Ícone Mente & Movimento atualizado.'
