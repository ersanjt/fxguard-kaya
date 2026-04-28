/**
 * PM2 config برای Backend + Gateway
 * اجرا: pm2 start ecosystem.config.js
 * از ریشه پروژه اجرا کنید.
 */
module.exports = {
  apps: [
    {
      name: "crm-gateway",
      script: "src/index.js",
      cwd: "./gateway",
      exec_mode: "fork",
      instances: 1,
      env: { NODE_ENV: "production", PORT: 3001 },
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 3000,
      error_file: "./logs/error.log",
      out_file: "./logs/combined.log",
      log_date_format: "YYYY-MM-DD HH:mm Z"
    },
    {
      name: "crm-backend",
      script: "server.js",
      cwd: "./backend",
      exec_mode: "fork",
      instances: 1,
      env: { NODE_ENV: "production", PORT: 3002, USE_SQLITE: "true" },
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 3000,
      error_file: "./logs/error.log",
      out_file: "./logs/combined.log",
      log_date_format: "YYYY-MM-DD HH:mm Z"
    }
  ]
};
