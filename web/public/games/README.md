# 🎮 Hanphone Game Collection

## 简介 | Introduction

**中文:** 一个包含 12 个 HTML5 小游戏的 GitHub 开源项目，无需安装即可在浏览器中畅玩。所有游戏均采用原生 HTML5、CSS3 和 JavaScript 开发，支持 PC 和移动端。

**English:** A GitHub open-source project containing 12 HTML5 mini-games that can be played directly in the browser without installation. All games are built with native HTML5, CSS3, and JavaScript, supporting both PC and mobile devices.

## 游戏列表 | Games

<!-- GAMES-LIST:START -->

| 图标 | 名称         | 链接                                  | 描述                           |
| :--: | ------------ | ------------------------------------- | ------------------------------ |
|  🔢  | 2048         | [在线游玩](./2048/index.html)            | 经典数字拼图游戏               |
|  ⬛  | 黑块挑战     | [在线游玩](./blackblocks/index.html)     | Black Blocks - 反应速度测试    |
|  🧱  | 打砖块       | [在线游玩](./breakout-bricks/index.html) | Breakout Bricks - 经典街机游戏 |
|  🐔  | 过马路大冒险 | [在线游玩](./crossy-road/index.html)     | Crossy Road - 帮助小鸡过马路   |
|  ⚫  | 五子棋       | [在线游玩](./gomoku/index.html)          | Gomoku - 双人对战五子棋        |
|  💣  | 扫雷         | [在线游玩](./minesweeper/index.html)     | Minesweeper - 经典扫雷游戏     |
|  🏓  | 乒乓球       | [在线游玩](./ping-pong/index.html)       | Ping Pong - 乒乓球对战         |
|  🔢  | 数独         | [在线游玩](./shudu/index.html)           | Sudoku - 数独谜题挑战          |
|  🐍  | 贪吃蛇       | [在线游玩](./snake/index.html)           | Snake - 经典贪吃蛇游戏         |
|  🟦  | 俄罗斯方块   | [在线游玩](./tetris/index.html)          | Tetris - 经典方块消除          |
| 🏗️ | 堆塔挑战     | [在线游玩](./tower-blocks/index.html)    | Tower Blocks - 堆叠高塔        |
|  🧸  | 抓娃娃机     | [在线游玩](./toy-claw/index.html)        | Toy Claw - 模拟抓娃娃体验      |

<!-- GAMES-LIST:END -->

## 快速开始 | Quick Start

### 在线游玩

直接访问 GitHub Pages 或打开任意游戏目录下的 `index.html` 文件即可游玩。

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/hanphonejan/hanphone-game.git

# 进入项目目录
cd hanphone-game

# 使用任意本地服务器运行，例如 Python 的 http.server
python -m http.server 8000

# 或使用 Node.js 的 http-server
npx http-server

# 然后在浏览器中打开
# http://localhost:8000
```

## 项目结构 | Project Structure

```
hanphone-game/
├── 2048/               # 2048 数字拼图游戏
├── blackblocks/        # 黑块挑战
├── breakout-bricks/    # 打砖块
├── crossy-road/        # 过马路大冒险
├── gomoku/             # 五子棋
├── minesweeper/        # 扫雷
├── ping-pong/          # 乒乓球
├── shudu/              # 数独
├── snake/              # 贪吃蛇
├── tetris/             # 俄罗斯方块
├── tower-blocks/       # 堆塔挑战
├── toy-claw/           # 抓娃娃机
├── index.html          # 游戏导航主页
└── README.md           # 项目说明文档
```
