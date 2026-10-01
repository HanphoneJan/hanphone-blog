# Client Dockerfile
FROM node:20-alpine AS builder

# 启用 pnpm（Node 20 自带 corepack）
RUN corepack enable

# Vite 构建期内联的环境变量（在 docker-compose / build 时注入）
ARG VITE_API_BASE_URL=/chat-api
ARG VITE_AUTH_BASE_URL=
ARG VITE_SOCKET_URL=

# 设置工作目录
WORKDIR /app

# 复制 pnpm 锁文件并安装依赖
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 复制应用代码
COPY . .

# 构建应用（将 ARG 注入环境供 Vite 内联）
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_AUTH_BASE_URL=$VITE_AUTH_BASE_URL \
    VITE_SOCKET_URL=$VITE_SOCKET_URL
RUN pnpm build

# 生产环境使用 Nginx
FROM nginx:alpine

# 复制构建产物到 Nginx 目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制自定义 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
