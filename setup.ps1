$ErrorActionPreference = "Stop"

Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Push-Location backend
npm install
Pop-Location

Write-Host "Installing user-app dependencies..." -ForegroundColor Cyan
Push-Location user-app
npm install
Pop-Location

Write-Host "Installing admin-app dependencies..." -ForegroundColor Cyan
Push-Location admin-app
npm install
Pop-Location

Write-Host "Setup complete." -ForegroundColor Green
Write-Host "Next: copy backend/.env.example to backend/.env and fill MongoDB/JWT/Admin values."
