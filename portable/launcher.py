# -*- coding: utf-8 -*-
"""2048 离线版启动器（由 PyInstaller 打包成单文件 exe）。

运行逻辑：
1. 把内置的 2048.html 释放到 %LOCALAPPDATA%\\Game2048（固定路径，
   保证 file:// 源一致，最高分可以持久保存）
2. 优先用 Edge 的 --app 模式打开（无地址栏/标签栏，像原生小游戏）
3. 找不到 Edge 时退回默认浏览器打开
"""
import os
import shutil
import subprocess
import sys

HTML_NAME = '2048.html'
APP_DIR = os.path.join(
    os.environ.get('LOCALAPPDATA') or os.path.expanduser('~'), 'Game2048')


def resource_path(name):
    """兼容 PyInstaller 单文件模式：打包资源从 _MEIPASS 读取。"""
    base = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, name)


def find_edge():
    """从注册表 App Paths 和常见安装目录查找 Edge。"""
    try:
        import winreg
        for hive in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
            try:
                key = winreg.OpenKey(
                    hive,
                    r'SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe')
                path, _ = winreg.QueryValueEx(key, None)
                winreg.CloseKey(key)
                if path and os.path.isfile(path):
                    return path
            except OSError:
                continue
    except ImportError:
        pass

    pf = os.environ.get('ProgramFiles', r'C:\Program Files')
    pfx = os.environ.get('ProgramFiles(x86)', r'C:\Program Files (x86)')
    for p in (
        os.path.join(pfx, r'Microsoft\Edge\Application\msedge.exe'),
        os.path.join(pf, r'Microsoft\Edge\Application\msedge.exe'),
        os.path.join(
            os.environ.get('LOCALAPPDATA', ''),
            r'Microsoft\Edge\Application\msedge.exe'),
    ):
        if p and os.path.isfile(p):
            return p
    return None


def main():
    os.makedirs(APP_DIR, exist_ok=True)
    dst = os.path.join(APP_DIR, HTML_NAME)
    src = resource_path(HTML_NAME)
    try:
        # 每次启动都同步一份最新内置版本
        shutil.copyfile(src, dst)
    except OSError:
        # 释放失败时尽量用旧文件继续
        if not os.path.isfile(dst):
            return

    url = 'file:///' + dst.replace('\\', '/')
    edge = find_edge()
    if edge:
        subprocess.Popen(
            [edge, '--app=' + url, '--window-size=560,840'],
            creationflags=getattr(subprocess, 'DETACHED_PROCESS', 0),
        )
    else:
        os.startfile(dst)  # 退回默认浏览器


if __name__ == '__main__':
    main()
