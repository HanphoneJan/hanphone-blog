# judge-server

`docs.hanphone.cn` 的 Python 代码评测服务。**go-judge** 做沙箱，本服务负责题目、提交、队列、比较与 HTTP API。

首期只支持 Python；C/C++/Java 后续加语言配置即可，API/沙箱结构不变。

## 架构

```text
docs 页面
  → https://hanphone.cn/judge-api/v1/...（生产） / http://127.0.0.1:5051（本地）
  → judge-server（Express + PostgreSQL）
  → go-judge（REST，127.0.0.1:5050）
  → python3（cgroup v2 / seccomp / 独立 netns）
```

## 本地启动

```bash
# 1) go-judge + judge 专用 PostgreSQL
#    国内网络拉不到 Docker Hub 时用镜像：
GO_JUDGE_IMAGE=docker.1ms.run/criyle/go-judge:latest \
  docker compose -f docker-compose.dev.yml up -d

# 2) 依赖、建表
pnpm install
cp .env.example .env
pnpm migrate

# 3) 导入题目包
pnpm run import:problems

# 4) 起服务
pnpm dev          # http://127.0.0.1:5051

# 5) 验证
pnpm test
pnpm smoke
```

`pnpm smoke` 会跑 AC / WA / TLE / MLE / RE / CE / 网络 / 文件 / 输出超限，以及两数之和和 HJ80 的函数/stdin 两条路径。

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/v1/health` | 服务、数据库、go-judge、队列 |
| GET | `/v1/problems` | 公开题目清单 |
| GET | `/v1/problems/:id` | 单题元数据 |
| POST | `/v1/submissions` | `{problemId, language, source, clientId?}` → `202 {id}` |
| GET | `/v1/submissions/:id` | 状态、逐测试点结果 |
| POST | `/v1/run` | 可选：不判题的远程运行 |
| GET | `/v1/admin/stats` | 管理端统计（`Authorization: Bearer <ADMIN_TOKEN>`） |

匿名限额在 `.env`：提交 3 次/分钟/IP、30 次/天/IP；队列上限 30；全局并发 1。

## 题目包

```text
data/problems/leetcode-1/
  meta.json
  harness.py            # function/script 模式
  tests/
    0001.json           # {args, expected, flags}
```

`stdin` 模式用 `tests/0001.in` + `0001.out`。`activeTestCount` 是每次提交实际跑的测试点数，`fullTestCount` 是全量。

## 安全

- go-judge 容器必须 `--privileged`（本地）；生产用 root systemd，`-no-fallback` 保证 cgroup 限制真的生效。
- 不挂宿主目录；默认无网络；seccomp、pids、内存、CPU、输出都有上限。
- ML23（k-Means）需要 `python3-numpy`；镜像已装，生产宿主机也要 `apt install python3-numpy`。
- `judge-server` 只监听 `127.0.0.1`；对外经 nginx `/judge-api/`。
- 测试数据只在服务端；文档站构建产物里没有测试内容。

## 数据来源

见 `THIRD_PARTY_NOTICES.md` 和文档站仓库的 `judge-tools/README.md`。LeetCode 题优先用 `newfacade/LeetCodeDataset`，生成物不提交到公开仓库。

```bash
# 文档站仓库
pnpm judge:gen -- --dataset <LeetCodeDataset jsonl.gz> --out <this dir>/data/problems
pnpm judge:gen-docs -- --out <this dir>/data/problems   # 牛客/CodeFun 可见样例
pnpm judge:inventory -- --data <this dir>/data/problems
```

当前本地已生成 338/351 篇题解包（LeetCode 132、牛客 103、CodeFun 88、其他平台全覆盖）；
剩下 13 篇是 SQL/ML/非代码，不是 Python 代码题。
docs-samples 包已补 1200+ 个 fuzz 隐藏测试；链表/类 API 另有专用 harness 与随机用例。

## 部署

见 `DEPLOYMENT.md`。当前生产已部署：

- `https://hanphone.cn/judge-api/v1/health`
- go-judge / judge-server 由 systemd 托管（`127.0.0.1:5050` / `5051`），nginx 反代 `/judge-api/`
- 服务器 `111.230.155.155`，数据在 `/home/hanphone/server_judge/data/problems`（338 包）
