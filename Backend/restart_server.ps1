# Find and kill all processes listening on port 8000
$processes = netstat -ano | findstr :8000 | findstr LISTENING
$processes | ForEach-Object {
    $parts = $_ -split '\s+', 5
    $pid = $parts[4]
    Write-Host "Stopping process with PID: $pid"
    try {
        Stop-Process -Id $pid -Force
    } catch {
        Write-Host "Failed to stop process: $_"
    }
}

# Wait a moment for processes to terminate
Start-Sleep -Seconds 2

# Start the server
Write-Host "Starting server..."
python -m uvicorn app.main:app --reload 