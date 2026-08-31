# -*- coding: utf-8 -*-
"""把 index.html / style.css / game.js 内联成单文件 portable/2048.html。

用法：python portable/build_portable.py
产物：portable/2048.html —— 这一个文件双击就能在浏览器里玩，
     同时也是打包 2048.exe 的嵌入资源。
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(name):
    with open(os.path.join(ROOT, name), 'r', encoding='utf-8') as f:
        return f.read()


def main():
    html = read('index.html')
    css = read('style.css')
    js = read('game.js')

    html = html.replace(
        '<link rel="stylesheet" href="style.css">',
        '<style>\n' + css + '\n</style>')
    html = html.replace(
        '<script src="game.js"></script>',
        '<script>\n' + js + '\n</script>')

    out = os.path.join(ROOT, 'portable', '2048.html')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        f.write(html)
    print('已生成', out, '（%d 字节）' % os.path.getsize(out))


if __name__ == '__main__':
    main()
