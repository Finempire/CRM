/**
 * PM2 Ecosystem Configuration — ThreadFlow OS
 *
 * Usage:
 *   pm2 start ecosystem.config.js          # start
 *   pm2 reload ecosystem.config.js         # zero-downtime reload
 *   pm2 stop threadflow-os                 # stop
 *   pm2 logs threadflow-os                 # tail logs
 *   pm2 startup && pm2 save               # auto-start on reboot
 */

module.exports = {
  apps: [
    {
      name: "threadflow-os",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/threadflow",

      // Number of instances — "max" uses all CPU cores (cluster mode)
      instances: 2,
      exec_mode: "cluster",

      // Restart policy
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 3000,
      min_uptime: "10s",

      // Memory limit: restart if process exceeds 1 GB
      max_memory_restart: "1G",

      // Environment variables (production)
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      // Log configuration
      out_file: "/var/log/pm2/threadflow-out.log",
      error_file: "/var/log/pm2/threadflow-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,

      // Graceful shutdown: wait for in-flight requests to finish
      kill_timeout: 5000,
      listen_timeout: 8000,
    },
  ],
};
