/**
 * PM2 process file for the WeekendCart storefront + admin.
 *
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save && pm2 startup     # once, so it survives reboots
 *
 * Port 3040 is deliberately away from the 3000-range other apps on this box
 * tend to use; change PORT here and in deploy/nginx.ecom.conf together.
 */
module.exports = {
  apps: [
    {
      name: "weekendcart",
      cwd: __dirname + "/..",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3040",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "600M",
      env: {
        NODE_ENV: "production",
        PORT: "3040",
      },
      time: true,
      out_file: "logs/out.log",
      error_file: "logs/err.log",
      merge_logs: true,
    },
  ],
};
