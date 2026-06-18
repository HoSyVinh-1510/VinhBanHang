@echo off
title Ruby Promotions Service (Port 5003)
echo =======================================================
echo          Ruby Promotions & VietQR Service
echo =======================================================
echo.

:: 1. Kiểm tra sự tồn tại của ngôn ngữ Ruby
call ruby -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [Loi] Ruby chua duoc cai dat tren he thong cua ban!
    echo Vui long truy cap https://rubyinstaller.org de tai va cai dat Ruby.
    echo Sau khi cai dat, hay chay lai file nay.
    echo.
    pause
    exit /b
)

echo [OK] Da phat hien Ruby phien ban:
call ruby -v
echo.

:: 2. Cai dat Bundler va dependencies
echo [Step 1/2] Dang kiem tra va cai dat dependencies...
call gem install bundler --no-document
call bundle install
if %errorlevel% neq 0 (
    echo [Loi] Gap su co khi chay bundle install!
    echo Vui long kiem tra lai ket noi mang va thu lai.
    echo.
    pause
    exit /b
)
echo [OK] Da cai dat xong cac thu vien Sinatra, Webrick, JSON.
echo.

:: 3. Khoi chay dich vu
echo [Step 2/2] Dang khoi chay Sinatra Server o cong 5003...
echo.
call ruby app.rb
pause
