# Deploying WeekendCart

## Every deploy, every time

One command, from your PC. No SSH, no server commands.

**Windows**

```powershell
git push production main
```

That is it. The push lands in a bare repository on the server, whose
`post-receive` hook runs the deploy for you and prints the whole thing back
into your terminal — backup, build, swap, health check. Set it up once with
**[Deploying without GitHub](#deploying-without-github)** below.

The old way still works if you are already logged in to the box:

**Server (VPS)**

```bash
cd ~/ecom.flexypdf.com
bash deploy/deploy.sh
```

Either way it is the same script and the same safety. The script takes the database backup itself, pulls
`main`, installs, migrates, **builds into a directory the live site is not
reading**, and only swaps the finished build in at the end. For the whole of
the build — the slow part — visitors keep getting the old site, complete and
styled. If the build fails, nothing was swapped and the site never changed. If
the new build starts but does not answer, the script puts the previous one back
by itself and reloads.

Do not run `npm run build`, `pm2 restart` or `git pull` by hand on the server.
Building by hand writes straight into the directory the live site is serving
from, which is exactly how the shop ended up as unstyled HTML.

Watch it afterwards:

```bash
pm2 logs weekendcart --lines 40
```

Roll the code back if something is wrong that the health check did not catch:

```bash
cd ~/ecom.flexypdf.com && bash deploy/rollback.sh
```

---

## Deploying without GitHub

This VPS cannot open a connection to `github.com:443`. The cause is now
measured rather than guessed: **its IPv4 route out is broken and its IPv6 route
is healthy** — a TCP connect to Google's token endpoint answers over IPv6 in
7ms and times out over IPv4 after 10 seconds (`npx tsx scripts/check-auth.ts`
prints both). `github.com` publishes no IPv6 address at all, so IPv4 is the
only road to it and that road is shut; forcing `-4` changed nothing for exactly
that reason. `registry.npmjs.org` kept working because it is reachable over
IPv6.

Until the host repairs IPv4, a deploy that pulls from GitHub cannot run here.

> Do **not** add an IPv4 precedence line to `/etc/gai.conf` on this box — it
> would force the broken family on git, npm, curl and the app alike.

So the code goes the other way. Your PC can reach GitHub *and* the server, so it
pushes straight to the server, and the server's network never enters into it.

**Server (VPS)** — once:

```bash
cd ~/ecom.flexypdf.com
bash deploy/setup-push-deploy.sh
```

That creates `~/weekendcart.git` (a bare repository), installs the deploy hook
into it, and adds it to the app directory as a remote called `local`.

**Windows** — once:

```powershell
git remote add production ssh://flexyuser@187.127.141.107/home/flexyuser/weekendcart.git
```

**Windows** — every time after that:

```powershell
git push production main
```

The server output appears in your own terminal as it runs. Push to GitHub as
well, whenever it suits you (`git push origin main`) — that is the backup copy,
not the deploy path.

### Why a deploy now needs almost no network at all

- **The fonts** are in the repository, so the build never calls Google.
- **`npm ci` is skipped** when `package-lock.json` is byte-for-byte what was
  last installed — which is every deploy that only changes code. It runs, and
  needs the network, only when a dependency actually changes.
- **Next's telemetry** is switched off in the deploy.
- **The code** arrives by push.

A code-only deploy therefore talks to nothing outside the box.

One thing still does: product images hosted on Unsplash are fetched by the
server when it optimises them. Real product photographs kept in `public/` — see
[docs/first-catalogue.md](../docs/first-catalogue.md) — need no network either.

---

Primary domain **weekendcart.com**, with **ecom.flexypdf.com** kept live on the
same process as a secondary hostname.

> The Postgres role and database are still named `mayura`, from before the
> rebrand. They stay that way on purpose: renaming a live database is a
> migration with downtime, not a rename, and the name is internal — it appears
> in `DATABASE_URL` and nowhere a customer or reviewer can see.

Target: the existing VPS (`flexyuser@srv1545707`, 187.127.141.107) that already hosts
other sites via nginx + PM2. This runbook adds **one** app directory, **one** PM2 process
on port **3040**, **one** nginx vhost and **one** Postgres database. It does not touch
anything else on the box.

DNS: `ecom` → A → `187.127.141.107` (already added, TTL 3600).

## 0. One-time server prerequisites

**Server (VPS)**

```bash
node -v            # need 20+. If missing:  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
pm2 -v             # if missing:  sudo npm i -g pm2
psql --version     # Postgres 14+ must be installed and running (it already is if other apps use it)
```

## 1. Database (once)

**Server (VPS)**

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE mayura WITH LOGIN PASSWORD 'CHANGE-ME-strong-password';
CREATE DATABASE mayura OWNER mayura;
SQL
```

## 2. Code + environment (once)

**Server (VPS)**

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
NEXT_PUBLIC_SITE_URL="https://weekendcart.com"
ADMIN_SEED_EMAIL="weekendscart@gmail.com"     # first admin (OWNER) — created only if no admin exists
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
https://weekendcart.com/api/auth/google/callback
```

Authorised JavaScript origin: `https://weekendcart.com`. The consent screen needs only
the `email` and `profile` scopes. While it is still in Testing only the accounts listed
there can sign in, so publish it before launch.

Both must match `NEXT_PUBLIC_SITE_URL`, which is `https://weekendcart.com`. These read
`ecom.flexypdf.com` until now, from before the rebrand — a redirect URI registered under
the old hostname is exactly what Google answers with **Access blocked**.

**Facebook** — developers.facebook.com → your app → Facebook Login → Settings → **Valid
OAuth Redirect URIs**:

```
https://weekendcart.com/api/auth/facebook/callback
```

Both callbacks are built from `NEXT_PUBLIC_SITE_URL`: leave it unset and the buttons stay
hidden, set it wrong and the provider rejects the sign-in — keep it in step with the domain.
Run `pm2 reload weekendcart` after editing `.env`.

When a social sign-in fails, `npx tsx scripts/check-auth.ts` on the server says why:
credentials set, the exact redirect URI to register, whether the provider is reachable from
the box, and whether the id/secret pair is still accepted. The causes and their fixes are in
**[docs/google-sign-in.md](../docs/google-sign-in.md)**.

Google confirms whether an address is verified, so someone who signed up with a password
and later uses Google lands in the same account. Facebook does not confirm it, so a
Facebook sign-in never attaches itself to an account that already exists; those customers
are sent back to the password form instead.

## 3. Deploy (first time and every update)

**Server (VPS)**

```bash
cd ~/ecom.flexypdf.com && bash deploy/deploy.sh
```

The script dumps the database, records the commit it is leaving, pulls `main`, installs,
runs `prisma migrate deploy`, seeds **only** the essentials (first admin login and store
settings), builds, and starts/reloads PM2 (`pm2 logs weekendcart` to watch). If the build
fails it stops there, with the running site untouched.

It never loads the demo catalogue. That catalogue is invented — eight departments of
products that do not exist — and it belongs on a development database only:
`npm run db:seed:demo`.

## 4. nginx + TLS (once)

**Server (VPS)**

```bash
sudo cp deploy/nginx.ecom.conf /etc/nginx/sites-available/ecom.flexypdf.com
sudo ln -s /etc/nginx/sites-available/ecom.flexypdf.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d ecom.flexypdf.com
```

Then open https://ecom.flexypdf.com and https://ecom.flexypdf.com/admin.

## 5. Keep it running

**Server (VPS)**

```bash
pm2 save && pm2 startup        # once — prints a command to run with sudo so PM2 survives reboots
pm2 ls                         # "weekendcart" should be online
pm2 logs weekendcart --lines 100
```

---

# The staging site

Now that the shop is live, changes stop going straight at it. There is a second copy of
the same application on the same box — same code, its own database, its own PM2 process,
its own hostname — where every change is rehearsed first. It costs one directory, one
port and one database, and it is the difference between "the checkout is broken" and
"the checkout was broken on staging for ten minutes".

| | Live shop | Staging |
| --- | --- | --- |
| Branch | `main` | `staging` |
| Directory | `~/ecom.flexypdf.com` | `~/staging.weekendcart.com` |
| PM2 process | `weekendcart` | `weekendcart-staging` |
| Port | `3040` | `3041` |
| Database | `mayura` | `mayura_staging` |
| Hostname | weekendcart.com | staging.weekendcart.com |
| Indexed by Google | yes | never — `robots.txt` and `X-Robots-Tag` both say no |
| Deploy command | `bash deploy/deploy.sh` | `bash deploy/deploy.sh staging` |

Staging shows a red **STAGING** marker in the bottom-left corner of every page, storefront
and admin panel alike, so there is never a question about which one you are looking at.
That marker comes from `APP_ENV`, which `deploy/deploy.sh` sets for you.

## Setting it up (once)

DNS first, before anything else: `staging` → A → `187.127.141.107`.

**Server (VPS)** — its own database:

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE mayura_staging WITH LOGIN PASSWORD 'CHANGE-ME-different-password';
CREATE DATABASE mayura_staging OWNER mayura_staging;
SQL
```

**Server (VPS)** — its own checkout and environment:

```bash
git clone https://github.com/Kishan3864/EcomSite.git ~/staging.weekendcart.com
cd ~/staging.weekendcart.com
git checkout -b staging origin/staging 2>/dev/null || git checkout staging
cp .env.example .env
nano .env
```

Set in that `.env` — note every value differs from production:

```
DATABASE_URL="postgresql://mayura_staging:CHANGE-ME-different-password@localhost:5432/mayura_staging?schema=public"
AUTH_SECRET="<a different 64 random chars>"
NEXT_PUBLIC_SITE_URL="https://staging.weekendcart.com"
ADMIN_SEED_EMAIL="<your email>"
ADMIN_SEED_PASSWORD="<a password you do not use on production>"
RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxx"   # test keys only — never the live pair
```

`deploy/deploy.sh staging` refuses to run if `DATABASE_URL` still points at the production
database, so a copy-pasted `.env` cannot quietly write to the live shop.

**Server (VPS)** — first deploy, then nginx and TLS:

```bash
cd ~/staging.weekendcart.com && bash deploy/deploy.sh staging
sudo cp deploy/nginx.staging.conf /etc/nginx/sites-available/staging.weekendcart.com
sudo ln -s /etc/nginx/sites-available/staging.weekendcart.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d staging.weekendcart.com
pm2 save
```

Worth doing straight after: put staging behind a password. Uncomment the two `auth_basic`
lines in the vhost once the file exists.

**Server (VPS)**

```bash
sudo apt install -y apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd-staging weekendcart
sudo nano /etc/nginx/sites-available/staging.weekendcart.com   # uncomment auth_basic + auth_basic_user_file
sudo nginx -t && sudo systemctl reload nginx
```

---

# The release workflow

Three branches, one direction of travel. Nothing reaches `main` that has not run on
staging.

```
feature branch  →  staging  →  main
   (your work)     (rehearsal)  (the live shop)
```

**Windows** — do the work:

```powershell
git checkout main
git pull
git checkout -b change/short-name
# …edit, then:
npm run build          # it must build locally before it goes anywhere
git add -A
git commit -m "What changed, in one line"
```

**Windows** — send it to staging:

```powershell
git checkout staging
git merge change/short-name
git push origin staging
```

**Server (VPS)** — deploy staging and look at it:

```bash
cd ~/staging.weekendcart.com && bash deploy/deploy.sh staging
```

Open https://staging.weekendcart.com and walk the paths that matter: home, a category, a
product, add to cart, checkout as far as payment, `/admin`. Only then:

**Windows** — promote to live:

```powershell
git checkout main
git merge staging
git push origin main
```

**Server (VPS)** — deploy the live shop:

```bash
cd ~/ecom.flexypdf.com && bash deploy/deploy.sh
```

Rules worth keeping:

- **`main` is only ever merged into, never committed to directly.** A commit made straight
  on `main` has never run anywhere.
- **Every deploy takes a database dump first.** It happens automatically; the path is
  printed in the output.
- **Migrations only roll forward.** `prisma migrate deploy` never drops or resets. If a
  migration has to come out, restore the dump from immediately before it.
- **Test keys on staging, live keys on production.** Staging's `.env` should never hold a
  live Razorpay secret; a rehearsal that charges a real card is not a rehearsal.

## Backups

Every deploy takes one. By hand, any time — and always before anything destructive:

**Server (VPS)**

```bash
cd ~/ecom.flexypdf.com && bash deploy/backup-db.sh
ls -lh ~/backups
```

The fourteen most recent dumps per database are kept; older ones are pruned. Restore:

**Server (VPS)**

```bash
pg_restore --clean --if-exists \
  -d "postgresql://mayura:PASSWORD@localhost:5432/mayura" \
  ~/backups/mayura-YYYYMMDD-HHMMSS.dump
pm2 reload weekendcart
```

## Rollback

Code only, and it takes about a minute:

**Server (VPS)**

```bash
cd ~/ecom.flexypdf.com && bash deploy/rollback.sh              # back to the previous release
cd ~/ecom.flexypdf.com && bash deploy/rollback.sh production 77ed828   # or a specific commit
```

The checkout ends up on a detached HEAD, pinned to that commit, until the next
`deploy/deploy.sh` puts it back on `main`. Fix the problem on a branch, take it through
staging, and deploy again.

## Clearing the demo catalogue

The store shipped with an invented catalogue so the pages had something to render. Before
the first real product goes up, it has to go. **Back up first** — this cannot be undone.

**Server (VPS)**

```bash
cd ~/ecom.flexypdf.com
bash deploy/backup-db.sh
npx tsx scripts/reset-store.ts          # dry run: shows exactly what would go
npx tsx scripts/reset-store.ts --yes    # do it
pm2 reload weekendcart
```

It deletes products, categories, brands, banners, offers, reviews, and every customer with
their orders and returns. It keeps admin logins, store settings, newsletter subscribers and
contact messages — nothing a real person has given you.

Afterwards the storefront renders its opening layout: a typographic hero, and a plain note
where the shelves will be. Add a category in `/admin`, then a product, and the homepage
fills itself in — one product is shown as a full spread, a handful as a single grid, and
the full eight-band composition returns on its own at ten. Nothing to switch on.

Putting the first real category and products in is its own runbook, written for the shop
owner rather than a developer: **[docs/first-catalogue.md](../docs/first-catalogue.md)**.
Read the photographs section before you start — the admin panel has no upload button, and
an image address it does not accept renders as an empty card.

## Ports and names used

| Thing | Live shop | Staging |
| --- | --- | --- |
| App directory | `~/ecom.flexypdf.com` | `~/staging.weekendcart.com` |
| PM2 process | `weekendcart` | `weekendcart-staging` |
| Port | `3040` | `3041` |
| nginx vhost | `/etc/nginx/sites-available/ecom.flexypdf.com` | `/etc/nginx/sites-available/staging.weekendcart.com` |
| Database | `mayura` (role `mayura`) | `mayura_staging` (role `mayura_staging`) |

Ports come from `APP_PORT` in `deploy/deploy.sh`. Change one there and in the matching
nginx vhost together if it is taken (`ss -ltn | grep 3040`).
