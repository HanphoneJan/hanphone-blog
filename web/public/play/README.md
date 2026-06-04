<div align="center">

# 🎮 hanphone-play

**寒枫的有趣网页合集**

*一个充满创意与温度的静态网页小项目合集——粒子动效、爱情小游戏、互动贺卡、在线钢琴……*

## 📦 项目列表

<!-- PROJECTS_TABLE_START -->

| 图标 | 项目                                                    | 目录                         |    分类    |
| :--: | ------------------------------------------------------- | ---------------------------- | :--------: |
|  🎆  | [Canvas炫彩粒子系统](./canvas-particle-universe/)          | `canvas-particle-universe` | `canvas` |
|  🎉  | [Hanphone&#39;s Congratulation](./congratulation/)         | `congratulation`           |  `节日`  |
|  💬  | [和AI寒枫聊天](./hanphonechat/browser/)                    | `hanphonechat`             |   `ai`   |
|  🎂  | [生日快乐！](./happy-birthday/)                            | `happy-birthday`           |  `节日`  |
|  💌  | [来自寒枫的信](./letter/browser2/envelope.html)            | `letter`                   |  `爱情`  |
|  🎰  | [Hanphone&#39;s Lottery](./lottery/)                       | `lottery`                  |  `游戏`  |
|  🐾  | [可以成为我的恋人吗?](./love-chiikawa/)                    | `love-chiikawa`            |  `爱情`  |
|  🔐  | [摩斯密码表白器](./love-guess-moss/)                       | `love-guess-moss`          |  `爱情`  |
|  🌸  | [致晴樨](./love-memory/)                                   | `love-memory`              |  `爱情`  |
|  📖  | [博客阅读器](./read/replicant/)                            | `read`                     |  `工具`  |
|  📄  | [寒枫 - 个人简历](./resume/)                               | `resume`                   |  `工具`  |
|  🎹  | [简易钢琴键盘](./simple-piano/)                            | `simple-piano`             |  `创意`  |
|  ✅  | [高级待办应用](./todo/)                                    | `todo`                     |  `工具`  |
|  🌀  | [WebGL 赛博核心展示 Three.js Demo](./torus-knot-geometry/) | `torus-knot-geometry`      |   `3d`   |
|  🎵  | [音频可视化播放器](./visual-player/)                       | `visual-player`            |  `创意`  |

<!-- PROJECTS_TABLE_END -->

> 💡 项目列表由 [`scripts/update-index.js`](scripts/update-index.js) 自动维护，push 到 `main` 后 GitHub Actions 会自动同步首页和本表格。

## 🚀 本地运行

所有项目均为纯静态网页，无需安装依赖，直接浏览器打开 HTML 即可。

## ➕ 添加新项目

1. 在根目录新建文件夹（例如 `my-cool-project/`）
2. 放入 `index.html`，确保包含 `<title>项目名称</title>`
3. （可选）在 [`scripts/update-index.js`](scripts/update-index.js) 的 `PROJECT_PRESETS` 中配置 emoji / 分类 / 颜色
4. 运行 `node scripts/update-index.js`，或直接 push——Actions 会自动执行
