Param(
    [Parameter(Mandatory=$true)][string]$BaseUrl,
    [Parameter(Mandatory=$false)][string]$AuthToken
)

function Normalize-BaseUrl {
    param([string]$url)
    if ([string]::IsNullOrWhiteSpace($url)) { return $null }
    $trimmed = $url.TrimEnd('/')
    if ($trimmed -notmatch '^[a-zA-Z][a-zA-Z0-9+.-]*://') {
        $trimmed = "https://$trimmed"
    }
    return $trimmed
}

function Read-Secret {
    param([string]$Prompt)
    $secure = Read-Host -Prompt $Prompt -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

$normalized = Normalize-BaseUrl -url $BaseUrl
if (-not $normalized) {
    Write-Error "Invalid base URL."; exit 1
}

if (-not $AuthToken) {
    $AuthToken = Read-Secret -Prompt "请输入 ANTHROPIC_AUTH_TOKEN (留空使用当前用户环境变量)"
    if (-not $AuthToken) {
        $AuthToken = [Environment]::GetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", "User")
    }
}

if (-not $AuthToken) {
    Write-Error "未提供 ANTHROPIC_AUTH_TOKEN"; exit 1
}

$env:ANTHROPIC_BASE_URL  = $normalized
$env:ANTHROPIC_AUTH_TOKEN = $AuthToken
[Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL",  $normalized, "User")
[Environment]::SetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", $AuthToken,  "User")

function Mask-Token {
    param([string]$value)
    if (-not $value) { return "(empty)" }
    if ($value.Length -le 10) { return ("*" * $value.Length) }
    return $value.Substring(0,6) + "..." + $value.Substring($value.Length-4)
}

Write-Host ""
Write-Host "===== Environment variables set (User scope) =====" -ForegroundColor Green
Write-Host ("ANTHROPIC_BASE_URL  = {0}" -f $normalized)
Write-Host ("ANTHROPIC_AUTH_TOKEN = {0}" -f (Mask-Token $AuthToken))
Write-Host "Note: Open a new PowerShell/VS Code window to load updated variables." -ForegroundColor Yellow
