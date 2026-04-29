module.exports = {
  apps: [
    {
      name: "fxguard-kaya",
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
      max_restarts: 15,
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
      error_file: "./error.log",
      out_file: "./combined.log",
      log_date_format: "YYYY-MM-DD HH:mm Z",
      kill_timeout: 5000,
      listen_timeout: 10000
    }
  ]
};
