@echo off
rem 一键构建 2048.exe（需已安装 Python 和 pyinstaller）
rem 运行前先 pip install pyinstaller
cd /d "%~dp0.."
python portable\build_portable.py || goto :err
pyinstaller --onefile --noconsole --name 2048 --add-data "portable\2048.html;." portable\launcher.py || goto :err
echo.
echo 构建完成：dist\2048.exe
goto :eof

:err
echo 构建失败，请检查上方报错
exit /b 1
