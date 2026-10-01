module.exports = {
  apps: [
    {
      name: "hanphone-chat-server",
      cwd: __dirname,
      script: "./dist/server.js",
      node_args: "--import=dotenv/config",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
      },
      out_file: "./logs/pm2.out.log",
      error_file: "./logs/pm2.err.log",
      merge_logs: true,
      time: true,
    },
  ],
};
