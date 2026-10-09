Add-Type -AssemblyName System.Drawing

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$resourceRoot = Join-Path $projectRoot 'android/app/src/main/res'
$sourcePath = Join-Path $projectRoot 'assets/icon-512.png'
if (-not (Test-Path -LiteralPath $resourceRoot) -or -not (Test-Path -LiteralPath $sourcePath)) {
    throw 'Gere o projeto Android e o ícone fonte antes de executar este script.'
}

$source = [System.Drawing.Image]::FromFile($sourcePath)
$densities = @(
    @{ Name = 'mdpi'; Icon = 48; Foreground = 108 },
    @{ Name = 'hdpi'; Icon = 72; Foreground = 162 },
    @{ Name = 'xhdpi'; Icon = 96; Foreground = 216 },
    @{ Name = 'xxhdpi'; Icon = 144; Foreground = 324 },
    @{ Name = 'xxxhdpi'; Icon = 192; Foreground = 432 }
)

foreach ($density in $densities) {
    $folder = Join-Path $resourceRoot "mipmap-$($density.Name)"
    foreach ($kind in @('ic_launcher', 'ic_launcher_round')) {
        $size = $density.Icon
        $bitmap = [System.Drawing.Bitmap]::new($size, $size)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.Clear([System.Drawing.Color]::Transparent)
        if ($kind -eq 'ic_launcher_round') {
            $clip = [System.Drawing.Drawing2D.GraphicsPath]::new()
            $clip.AddEllipse(0, 0, $size, $size)
            $graphics.SetClip($clip)
            $clip.Dispose()
        }
        $graphics.DrawImage($source, 0, 0, $size, $size)
        $bitmap.Save((Join-Path $folder "$kind.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        $graphics.Dispose()
        $bitmap.Dispose()
    }

    $size = $density.Foreground
    $bitmap = [System.Drawing.Bitmap]::new($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.ScaleTransform($size / 512.0, $size / 512.0)
    $stem = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#315c41'), 15)
    $stem.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $stem.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $graphics.DrawLine($stem, 256, 305, 256, 402)
    $leaf = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#4d7a57'))
    $graphics.FillEllipse($leaf, 184, 335, 81, 42)
    $graphics.FillEllipse($leaf, 247, 335, 81, 42)
    $petal = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#e99883'))
    for ($index = 0; $index -lt 5; $index++) {
        $graphics.TranslateTransform(256, 256)
        $graphics.RotateTransform($index * 72)
        $graphics.FillEllipse($petal, -43, -145, 86, 128)
        $graphics.ResetTransform()
        $graphics.ScaleTransform($size / 512.0, $size / 512.0)
    }
    $center = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#f4c96e'))
    $graphics.FillEllipse($center, 203, 203, 106, 106)
    $graphics.DrawImage($source, 0, 0, 512, 512)
    $bitmap.Save((Join-Path $folder 'ic_launcher_foreground.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    $stem.Dispose()
    $leaf.Dispose()
    $petal.Dispose()
    $center.Dispose()
}

Get-ChildItem -LiteralPath $resourceRoot -Recurse -Filter 'splash.png' | ForEach-Object {
    $original = [System.Drawing.Image]::FromFile($_.FullName)
    $width = $original.Width
    $height = $original.Height
    $original.Dispose()
    $bitmap = [System.Drawing.Bitmap]::new($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#fbf8f2'))
    $iconSize = [int]([Math]::Min($width, $height) * 0.38)
    $left = [int](($width - $iconSize) / 2)
    $top = [int](($height - $iconSize) / 2)
    $graphics.DrawImage($source, $left, $top, $iconSize, $iconSize)
    $bitmap.Save($_.FullName, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
}

$source.Dispose()
Write-Output 'Ícones e telas de abertura Android atualizados.'
