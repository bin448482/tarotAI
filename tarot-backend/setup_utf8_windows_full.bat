@echo off
setlocal

echo === 配置 Windows Git Bash / VS Code Bash 的 UTF-8 中文环境 ===

:: -------------------------------------------------
:: Step 1. 设置 Git Bash 的 .bashrc
:: -------------------------------------------------
set "BASHRC=%USERPROFILE%\.bashrc"
if not exist "%BASHRC%" (
  type nul > "%BASHRC%"
)

findstr /C:"zh_CN.UTF-8" "%BASHRC%" >nul 2>nul
if errorlevel 1 (
  echo.>> "%BASHRC%"
  echo # >>> UTF-8 中文环境设置 >>>>> "%BASHRC%"
  echo export LANG=zh_CN.UTF-8>> "%BASHRC%"
  echo export LC_ALL=zh_CN.UTF-8>> "%BASHRC%"
  echo export LANGUAGE=zh_CN.UTF-8>> "%BASHRC%"
  echo # <<< UTF-8 中文环境设置 <<<>> "%BASHRC%"
  echo ✅ 已将 UTF-8 设置写入 %BASHRC%
) else (
  echo ℹ️ %BASHRC% 已包含 UTF-8 设置
)

:: -------------------------------------------------
:: Step 2. 切换当前命令行为 UTF-8 编码
:: -------------------------------------------------
chcp 65001 >nul
echo ✅ 已切换当前终端代码页为 65001 (UTF-8)

:: -------------------------------------------------
:: Step 3. 修改 VS Code settings.json
:: -------------------------------------------------
set "VSCODE_SETTINGS=%APPDATA%\Code\User\settings.json"
if not exist "%APPDATA%\Code\User" mkdir "%APPDATA%\Code\User"

:: 使用 PowerShell 更新 JSON
powershell -NoProfile -Command ^
  "$f='%VSCODE_SETTINGS%';" ^
  "if(Test-Path $f){$j=Get-Content $f -Raw|ConvertFrom-Json}else{$j=@{}};" ^
  "$j.'terminal.integrated.env.windows'=@{ LANG='zh_CN.UTF-8'; LC_ALL='zh_CN.UTF-8' };" ^
  "$j|ConvertTo-Json -Depth 10 | Set-Content $f -Encoding UTF8"

echo ✅ 已将 VS Code 终端环境设置为 UTF-8

echo.
echo 🎉 所有配置完成！请重新打开 VS Code 终端 / Git Bash
pause
