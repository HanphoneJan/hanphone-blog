# Server Dockerfile
FROM node:20-alpine

# 启用 pnpm（Node 20 自带 corepack）
RUN corepack enable

# 设置工作目录
WORKDIR /app

# 复制 pnpm 锁文件并安装所有依赖（含 devDependencies，用于编译）
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 复制应用代码
COPY . .

# 编译 TypeScript
RUN pnpm build

# 清理开发依赖，减小镜像体积
RUN pnpm prune --prod

# 暴露端口
EXPOSE 4010

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4010/health || exit 1

# 启动命令（dotenv/config 由 node 参数自动加载）
CMD ["node", "--import=dotenv/config", "dist/server.js"]
