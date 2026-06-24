# start_all.ps1
# This script starts the backend and twiller frontend.

Write-Host "Starting Twiller Application..." -ForegroundColor Cyan

# Start Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm start" -WindowStyle Normal

# Start Frontend (Twiller)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd twiller; npm run dev" -WindowStyle Normal

Write-Host "All core services started! You should see new PowerShell windows for each service." -ForegroundColor Green

