# 使用多阶段构建优化镜像大小
# 第一阶段：构建阶段
FROM maven:3.9.6-eclipse-temurin-17 AS builder

# 设置工作目录
WORKDIR /app

# 复制 pom.xml 并下载依赖（利用 Docker 缓存）
COPY pom.xml .
RUN mvn dependency:go-offline -B

# 复制源代码
COPY src ./src

# 构建应用
RUN mvn clean package -DskipTests

# 第二阶段：运行阶段
FROM eclipse-temurin:17-jre-jammy

# 安装必要的工具
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# 设置时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 创建应用目录和日志目录
RUN mkdir -p /app/logs

# 设置工作目录
WORKDIR /app

# 从构建阶段复制 jar 包
COPY --from=builder /app/target/blog*.jar /app/blog.jar

# 复制默认配置文件（可选）
COPY src/main/resources/application.properties /app/

# 创建非 root 用户
RUN useradd -r -s /bin/false blogapp && \
    chown -R blogapp:blogapp /app

# 切换到非 root 用户
USER blogapp

# 暴露端口
EXPOSE 8090

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8090/actuator/health || exit 1

# JVM 参数优化
# -Xms2048m: 初始堆内存 2GB，避免动态扩容开销
# -Xmx2048m: 最大堆内存 2GB，提供更大缓冲区
# -XX:MetaspaceSize=256m: 元空间初始大小
# -XX:MaxMetaspaceSize=256m: 元空间最大大小
# -XX:+UseG1GC: 使用 G1 垃圾收集器，适合大堆内存
# -XX:MaxGCPauseMillis=200: 最大 GC 停顿时间 200ms
# -XX:+HeapDumpOnOutOfMemoryError: OOM 时生成堆转储文件
# -XX:HeapDumpPath=/logs/heapdump.hprof: 堆转储文件路径
# -XX:+ExitOnOutOfMemoryError: OOM 时退出 JVM，让容器重启
ENV JAVA_OPTS="-Xms2048m -Xmx2048m -XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=256m -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/logs/heapdump.hprof -XX:+ExitOnOutOfMemoryError"

# 启动应用
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -Djava.security.egd=file:/dev/./urandom -jar /app/blog.jar"]
