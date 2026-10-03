<div align="center">

# 🎮 hanphone-play

**寒枫的有趣网页合集**

*一个充满创意与温度的静态网页小项目合集——互动贺卡、情书、简易钢琴、音频可视化……*

## 📦 项目列表

<!-- PROJECTS_TABLE_START -->

| 图标 | 项目                            | 目录         |   分类   |
| :--: | ------------------------------- | ------------ | :------: |
|  🎉  | [Hanphone&#39;s Congratulation](./congratulation/) | `congratulation` |  `节日`  |
|  💌  | [来自寒枫的信](./letter/web/envelope.html)         | `letter`           |  `爱情`  |
|  📖  | [博客阅读器](./read/replicant/)                     | `read`             |  `工具`  |
|  📄  | [寒枫 - 个人简历](./resume/)                       | `resume`           |  `工具`  |
|  🎹  | [简易钢琴键盘](./simple-piano/)                     | `simple-piano`     |  `创意`  |
|  🎵  | [音频可视化播放器](./visual-player/)                | `visual-player`    |  `创意`  |

<!-- PROJECTS_TABLE_END -->

## 🚀 本地运行

项目收录在博客仓库的 `web/public/play/` 下，开发时由 Next.js 直接以静态资源方式提供，无需单独启动服务：

```bash
pnpm install
pnpm --filter web dev
# 打开 http://localhost:3000/play/
```

> ⚠️ `letter/`（来自寒枫的信）附带一个 PHP 后端（`letter/server/`，含 `db_connect.php`），完整功能需要 PHP + MySQL 环境；其余项目为纯静态页面，直接打开 `index.html` 即可。

## ➕ 添加新项目

1. 在本目录新建文件夹（例如 `my-cool-project/`）
2. 放入 `index.html`，确保包含 `<title>项目名称</title>`
3. 手动更新上方的项目列表表格
4. 到「项目展示」后台新增一条记录（`/play` 页面从接口读取项目数据，新项目需入库后才会出现在前台卡片中）