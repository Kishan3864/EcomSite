/**
 * PM2 process file for the WeekendCart storefront + admin.
 *
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save && pm2 startup     # once, so it survives reboots
 *
 * One file, two possible processes. `deploy/deploy.sh` exports APP_NAME,
 * APP_PORT and APP_ENV before calling PM2, so the production checkout starts
 * "weekendcart" on 3040 and the staging checkout starts "weekendcart-staging"
 * on 3041 from the same committed config — no second file to keep in step.
 *
 * Run by hand with nothing exported and you get production's values, which is
 * what an operator typing `pm2 start deploy/ecosystem.config.cjs` on the live
 * box means. Port 3040 is deliberately away from the 3000-range other apps on
 * this box tend to use; change it here and in the matching nginx vhost.
 */
const name = process.env.APP_NAME || "weekendcart";
const port = process.env.APP_PORT || "3040";
const appEnv = process.env.APP_ENV || "production";

module.exports = {
  apps: [
    {
      name,
      cwd: __dirname + "/..",
      script: "node_modules/next/dist/bin/next",
      args: `start -p ${port}`,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "600M",
      env: {
        NODE_ENV: "production",
        PORT: port,
        /**
         * Try IPv6 before IPv4 for every outbound connection this app makes.
         *
         * Measured on this box, not guessed: a plain TCP connect to Google's
         * token endpoint answers over IPv6 in 7ms and times out over IPv4
         * after 10 seconds. Its IPv4 route out is broken; its IPv6 route is
         * healthy. Node's fetch was picking the IPv4 address and giving up
         * rather than trying the other one, which is why a Google sign-in
         * failed while the console settings were perfectly correct.
         *
         * This only changes which family is tried first — an IPv4-only host is
         * still reached, and `register()` in src/instrumentation.ts turns on
         * Happy Eyeballs so a stalled family is abandoned for the other one
         * within half a second either way. Revisit if the provider ever fixes
         * IPv4: `npx tsx scripts/check-auth.ts` prints both families.
         */
        NODE_OPTIONS: "--dns-result-order=ipv6first",
        // Read by src/app/robots.ts and the environment badge: anything other
        // than "production" is closed to crawlers and marked in the corner.
        APP_ENV: appEnv,
      },
      time: true,
      out_file: `logs/${name}-out.log`,
      error_file: `logs/${name}-err.log`,
      merge_logs: true,
    },
  ],
};
