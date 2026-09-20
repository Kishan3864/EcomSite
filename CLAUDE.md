@AGENTS.md

## Deployment (manual — agent has NO server access)

- You have NO access to the production server. Never ask for SSH, never run ssh/scp/rsync, never create deploy keys or tokens, never add CI that deploys.
- Production: https://weekendcart.com — VPS user `flexyuser`, app dir `~/ecom.flexypdf.com`, PM2 app `weekendcart`, port 3040.
- Flow for every change:
  1. Make the change. Run `npm run lint` and `npx tsc --noEmit`; run `npm run build` for anything non-trivial. Fix errors before committing.
  2. If the Prisma schema changed: create the migration locally (`npm run db:migrate`) and commit the migration files. Migrations must be additive only — never reset, drop or rewrite existing data.
  3. Commit with a clear message, then `git push origin main`.
  4. Tell the user to run this on the server as `flexyuser` and paste the output back:
     `cd ~/ecom.flexypdf.com && bash deploy/deploy.sh 2>&1 | tail -60`
  5. Read the pasted output. If it failed or rolled back, diagnose from that output and fix forward.
     Rollback command for the user: `cd ~/ecom.flexypdf.com && bash deploy/rollback.sh`
- Secrets: never commit `.env*`, never print secret values, never put real keys in code, docs or commit messages. For a new env var: add only its NAME to `.env.example` and tell the user to set the value in the server's `.env` himself.
- Dependencies: keep `next` at 16.3.5 or newer (older versions have a known remote-code-execution bug). Don't add packages without saying why. Run `npm audit --omit=dev` after dependency changes.
- The seed script must never overwrite an existing admin's password.