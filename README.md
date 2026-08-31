# 2048游戏

一个用原生 **HTML / CSS / JavaScript** 实现的 2048 游戏，零依赖，打开即可玩。

在线试玩：<https://sakurahhbbhh-create.github.io/2048-game/>
离线版下载：<https://github.com/sakurahhbbhh-create/2048-game/releases>（双击 exe 即玩，无需浏览器和网络）

## 🎯 玩法

- 使用 **方向键** 或 **WASD** 移动方块（手机端直接滑动屏幕）
- 相同数字的方块相撞时会合并成它们的和
- 每移动一步，棋盘上会随机出现一个新的 2 或 4
- 合成 **2048** 即获胜！也可以继续挑战更高分

## ✨ 特性

- 平滑的滑动 / 合并 / 弹出动画
- 最高分本地保存（localStorage）
- 撤销功能（最多回退 10 步）
- 响应式设计，支持手机触屏
- 获胜 / 游戏结束提示，获胜后可继续游戏

## 🚀 运行

直接用浏览器打开 `index.html` 即可，无需安装任何东西。

## 📦 离线版

在 [Releases](https://github.com/sakurahhbbhh-create/2048-game/releases) 下载 `2048.exe`（单文件，约 9MB）：双击即玩，以独立窗口运行（Windows 自带的 WebView2 引擎），**无需浏览器和网络**，拷到任何 Windows 10/11 电脑都能运行。

改了游戏代码后重新打包：

```bash
pip install pyinstaller
portable\build.bat   # 产物在 dist\2048.exe
```

## 🧪 测试

核心游戏逻辑是纯函数，可用 Node.js 运行测试：

```bash
node test.js
```

## 📁 文件结构

```
2048-game/
├── index.html          # 页面结构
├── style.css           # 样式与动画
├── game.js             # 游戏逻辑 + 交互
├── test.js             # 核心逻辑测试
├── portable/           # 离线版打包脚本（build.bat 一键构建 exe）
└── .github/workflows/  # GitHub Pages 自动部署
```
