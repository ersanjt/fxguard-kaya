module.exports = {
  apps: [
    {
      name: "kayaCRM",
      script: "server.js",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: 3002
      },
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      error_file: "./error.log",
      out_file: "./combined.log",
      log_date_format: "YYYY-MM-DD HH:mm Z"
    }
  ]
};
