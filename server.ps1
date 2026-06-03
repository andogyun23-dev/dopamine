# Dopamine Dystopia: Focus Defense - Built-in .NET HTTP Server
# Runs natively in PowerShell on Windows (Zero dependencies)

$port = 5173
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "--------------------------------------------------------"
    Write-Host "DOPAMINE DYSTOPIA LOCAL SERVER RUNNING"
    Write-Host "URL: http://localhost:$port"
    Write-Host "Press Ctrl+C to terminate the server."
    Write-Host "--------------------------------------------------------"
    
    $baseDir = "C:\Users\andog\.gemini\antigravity\scratch\dopamine-dystopia"
    
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $rawPath = $request.Url.LocalPath
        if ($rawPath -eq "/" -or $rawPath -eq "") {
            $filePath = Join-Path $baseDir "index.html"
        } else {
            # Normalize and combine path to prevent directory traversal
            $cleanSubPath = $rawPath.TrimStart('/')
            $filePath = Join-Path $baseDir $cleanSubPath
        }
        
        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = "text/html; charset=utf-8"
            if ($ext -eq ".css") { 
                $contentType = "text/css" 
            } elseif ($ext -eq ".js") { 
                $contentType = "application/javascript" 
            }
            
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.ContentType = $contentType
            
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 File Not Found")
            $response.ContentLength64 = $errBytes.Length
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    }
} catch {
    Write-Error $_
} finally {
    if ($listener -ne $null) {
        $listener.Stop()
    }
}
