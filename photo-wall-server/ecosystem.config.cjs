module.exports = {
  apps: [
    {
      name: "server_atlas", // 应用名称，在PM2列表中显示
      script: "./app.js", // 启动脚本
      cwd: "/www/custom_server/server_atlas", // 设置应用的工作目录
      env: {
        NODE_ENV: "production", // 设置生产环境变量
      },
    },
  ],
};
