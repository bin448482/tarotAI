Param(
    [Parameter(Mandatory=$false)][string]$BaseUrl,
    [Parameter(Mandatory=$false)][string]$ApiKey
)

function Read-Value {
    param(
        [string]$Prompt,
        [switch]$Secret
    )

    if ($Secret) {
        $secure = Read-Host -Prompt $Prompt -AsSecureString
        $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        try {
            return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
        }
        finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
        }
    }

    return Read-Host -Prompt $Prompt
}

if (-not $BaseUrl) {
    $BaseUrl = Read-Value -Prompt "请输入 OPENAI 基础地址 (例如 https://api.openai.com/v1)"
}

if (-not $BaseUrl) {
    Write-Error "必须提供 BaseUrl"; exit 1
}

$BaseUrl = $BaseUrl.Trim()
if ($BaseUrl -notmatch '^[a-zA-Z][a-zA-Z0-9+.-]*://') {
    $BaseUrl = "https://$BaseUrl"
}

try {
    $uri = [Uri]$BaseUrl
} catch {
    Write-Error "URL 无效: $BaseUrl"; exit 1
}

if ($uri.AbsolutePath -eq "/") {
    $BaseUrl = "$($uri.Scheme)://$($uri.Host)/v1"
}

if (-not $ApiKey) {
    $ApiKey = Read-Value -Prompt "请输入 OPENAI_API_KEY (留空则使用当前用户环境变量)" -Secret
    if (-not $ApiKey) {
        $ApiKey = [Environment]::GetEnvironmentVariable("OPENAI_API_KEY", "User")
    }
}

if (-not $ApiKey) {
    Write-Error "未提供 OPENAI_API_KEY"; exit 1
}

$env:OPENAI_API_KEY  = $ApiKey
$env:OPENAI_BASE_URL = $BaseUrl
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY",  $ApiKey,  "User")
[Environment]::SetEnvironmentVariable("OPENAI_BASE_URL", $BaseUrl, "User")

$preview = if ($ApiKey.Length -ge 10) { $ApiKey.Substring(0,7) + "..." + $ApiKey.Substring($ApiKey.Length-4) } else { "(hidden)" }
Write-Host ""
Write-Host "===== Environment variables set (User scope) =====" -ForegroundColor Green
Write-Host "OPENAI_BASE_URL: $BaseUrl"
Write-Host "OPENAI_API_KEY:  $preview"
Write-Host "Note: 新开一个 PowerShell 窗口可读取新的环境变量。" -ForegroundColor Yellow
