ARG GO_JUDGE_IMAGE=criyle/go-judge:latest
FROM ${GO_JUDGE_IMAGE}

# go-judge 官方镜像只带沙箱本身；判题需要宿主语言运行时。
# 生产上如果直接跑二进制，用宿主机的 python3 即可；本地 Docker 用这一层补上。
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-numpy \
 && rm -rf /var/lib/apt/lists/*
