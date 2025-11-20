# Script para hacer commit y push al repositorio
$projectPath = "C:\Users\hp\Documents\Quinto Año\PROGRAMACION IV\kanban-academico"

# Cambiar al directorio del proyecto
Set-Location $projectPath

# Verificar si git está inicializado
if (-not (Test-Path ".git")) {
    Write-Host "Inicializando git..."
    git init
}

# Verificar si el remote existe
$remoteExists = git remote | Select-String "origin"
if (-not $remoteExists) {
    Write-Host "Agregando remote origin..."
    git remote add origin https://github.com/FredyG0903/proyecto-kanban.git
} else {
    Write-Host "Actualizando remote origin..."
    git remote set-url origin https://github.com/FredyG0903/proyecto-kanban.git
}

# Agregar todos los archivos
Write-Host "Agregando archivos..."
git add .

# Hacer commit
Write-Host "Haciendo commit..."
$commitMessage = "Actualización: Mejoras en validación de fechas y UI del modal de tarjetas"
git commit -m $commitMessage

# Hacer push
Write-Host "Haciendo push..."
git push -u origin main

Write-Host "¡Completado!"

