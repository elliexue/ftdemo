@echo off
cd /d "%~dp0"
if not exist "node_modules\" (
  echo 第一次请先在本文件夹打开命令行，执行: npm install
  pause
  exit /b 1
)
echo 正在启动预览...
call npm run dev
pause
