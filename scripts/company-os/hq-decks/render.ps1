param([string]$File, [string]$OutDir)
$pp = New-Object -ComObject PowerPoint.Application
$pres = $pp.Presentations.Open($File, $true, $false, $false)
New-Item -ItemType Directory -Force $OutDir | Out-Null
$i = 1
foreach ($s in $pres.Slides) { $s.Export((Join-Path $OutDir ("s{0:D2}.png" -f $i)), "PNG", 1280, 720); $i++ }
$pres.Close(); $pp.Quit()
