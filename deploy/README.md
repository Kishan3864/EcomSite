# Deploying Mayura to ecom.flexypdf.com

Target: the existing VPS (`flexyuser@srv1545707`, 187.127.141.107) that already hosts
other sites via nginx + PM2. This runbook adds **one** app directory, **one** PM2 process
on port **3040**, **one** nginx vhost and **one** Postgres database. It does not touch
anything else on the box.

DNS: `ecom` → A → `187.127.141.107` (already added, TTL 3600).

## 0. One-time server prerequisites

```bash
node -v            # need 20+. If missing:  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
pm2 -v             # if missing:  sudo npm i -g pm2
psql --version     # Postgres 14+ must be installed and running (it already is if other apps use it)
```

## 1. Database (once)

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE mayura WITH LOGIN PASSWORD 'CHANGE-ME-strong-password';
CREATE DATABASE mayura OWNER mayura;
SQL
```

## 2. Code + environment (once)

```bash
git clone https://github.com/Kishan3864/EcomSite.git ~/ecom.flexypdf.com
cd ~/ecom.flexypdf.com
cp .env.example .env
nano .env
```

Set in `.env`:

```
DATABASE_URL="postgresql://mayura:CHANGE-ME-strong-password@localhost:5432/mayura?schema=public"
AUTH_SECRET="<64 random chars>"        # node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
NEXT_PUBLIC_SITE_URL="https://ecom.flexypdf.com"
ADMIN_SEED_EMAIL="you@yourdomain.in"     # first admin (OWNER) — created only if no admin exists
ADMIN_SEED_PASSWORD="<strong password>"  # change it from Settings → Profile after first login
```

### Social sign-in (optional)

Leave these four out and the sign-in pages simply do not offer the buttons; everything
else works as before. Fill a pair in, restart, and that provider is live.

```
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
FACEBOOK_CLIENT_ID="..."
FACEBOOK_CLIENT_SECRET="..."
```

**Google** — console.cloud.google.com → APIs & Services → Credentials → Create credentials
→ OAuth client ID → Web application. Paste under **Authorised redirect URIs**, exactly:

```
https://ecom.flexypdf.com/api/auth/google/callback
```

Authorised JavaScript origin: `https://ecom.flexypdf.com`. The consent screen needs only
the `email` and `profile` scopes. While it is still in Testing only the accounts listed
there can sign in, so publish it before launch.

**Facebook** — developers.facebook.com → your app → Facebook Login → Settings → **Valid
OAuth Redirect URIs**:

```
https://ecom.flexypdf.com/api/auth/facebook/callback
```

Both callbacks are built from `NEXT_PUBLIC_SITE_URL`: leave it unset and the buttons stay
hidden, set it wrong and the provider rejects the sign-in — keep it in step with the domain.
Run `pm2 reload mayura` after editing `.env`.

Google confirms whether an address is verified, so someone who signed up with a password
and later uses Google lands in the same account. Facebook does not confirm it, so a
Facebook sign-in never attaches itself to an account that already exists; those customers
are sent back to the password form instead.

## 3. Deploy (first time and every update)

```bash
cd ~/ecom.flexypdf.com && bash deploy/deploy.sh
```

The script pulls `main`, installs, runs `prisma migrate deploy`, seeds the catalogue only
if it is empty, builds, and starts/reloads PM2 (`pm2 logs mayura` to watch).

## 4. nginx + TLS (once)

```bash
sudo cp deploy/nginx.ecom.conf /etc/nginx/sites-available/ecom.flexypdf.com
sudo ln -s /etc/nginx/sites-available/ecom.flexypdf.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d ecom.flexypdf.com
```

Then open https://ecom.flexypdf.com and https://ecom.flexypdf.com/admin.

## 5. Keep it running

```bash
pm2 save && pm2 startup        # once — prints a command to run with sudo so PM2 survives reboots
pm2 ls                         # "mayura" should be online
pm2 logs mayura --lines 100
```

## Updating later

Push to `main` on GitHub, then on the server: `cd ~/ecom.flexypdf.com && bash deploy/deploy.sh`.
Schema changes ship as Prisma migrations in `prisma/migrations/` and are applied by the
same command; nothing is ever dropped.

## Backups

```bash
pg_dump -U mayura -h localhost mayura -Fc > ~/backups/mayura-$(date +%F).dump
```

## Rollback

```bash
cd ~/ecom.flexypdf.com && git checkout <previous-sha> && npm ci && npm run build && pm2 reload mayura
```

## Ports and names used

| Thing | Value |
| --- | --- |
| App directory | `~/ecom.flexypdf.com` |
| PM2 process | `mayura` |
| Port | `3040` |
| nginx vhost | `/etc/nginx/sites-available/ecom.flexypdf.com` |
| Database | `mayura` (role `mayura`) |

Change the port in `deploy/ecosystem.config.cjs` and `deploy/nginx.ecom.conf` together if
3040 is taken (`ss -ltn | grep 3040`).
