# When "Continue with Google" does not work

Written for whoever runs the shop. Start with the check, because it usually
names the problem outright and saves reading the rest.

## Run the check first

**Server (VPS)**

```bash
cd ~/ecom.flexypdf.com
npx tsx scripts/check-auth.ts
```

It prints, for each provider: whether the credentials are set, the exact
redirect URI this server sends (the value that must be registered in the
console, character for character), whether Google is reachable from this
server at all, and whether the client id and secret are still a pair Google
accepts. It signs nobody in and changes nothing.

If a sign-in has already failed, the reason is in the log too:

```bash
pm2 logs weekendcart --lines 50 | grep '\[auth:'
```

Every failed attempt now writes the provider's own reason there —
`invalid_client`, `redirect_uri_mismatch`, `invalid_grant` and so on. Nothing
secret is written.

## The two failures look different, and mean different things

### "Access blocked" — a Google page, before you ever come back

You never reach the shop; Google itself stops you. Google has decided the
request is not one it will serve, so nothing on our side ran.

| What Google says | What it means | Fix |
| --- | --- | --- |
| Access blocked: **This app's request is invalid** / `redirect_uri_mismatch` | The address we asked Google to send you back to is not on Google's list | Register the redirect URI the check prints, exactly |
| Access blocked: **<app> has not completed the Google verification process** | The consent screen is still in **Testing** | Add the address as a test user, or publish the app |
| Access blocked: **Authorisation error** / `invalid_client` | The client id does not exist, or belongs to a deleted project | Re-copy the client id and secret from the console |

**Where to set these** — [console.cloud.google.com](https://console.cloud.google.com)
→ your project → **APIs & Services** → **Credentials** → your OAuth 2.0 Client ID:

```
Authorised JavaScript origins     https://weekendcart.com
Authorised redirect URIs          https://weekendcart.com/api/auth/google/callback
```

No trailing slash. `https`, not `http`. The hostname must match
`NEXT_PUBLIC_SITE_URL` in `.env` exactly — if the shop also answers on
`ecom.flexypdf.com`, that host does **not** get a second entry here; see
"One hostname" below.

**Testing vs published** — APIs & Services → **OAuth consent screen**. While
the publishing status is *Testing*, only the addresses listed under **Test
users** can sign in; everyone else is blocked. For a live shop, press **Publish
app**. With only the `email` and `profile` scopes, Google does not require a
verification review for this.

Changes in the Google console can take a few minutes to take effect.

### "We could not finish that sign-in" — our page, after Google sent you back

Google accepted you and sent you back; the step that failed is the one where
this server talks to Google directly, behind the scenes, to redeem the code.

| Cause | How to tell | Fix |
| --- | --- | --- |
| **This server cannot reach Google** | The check's "Reachable from this server?" lines fail, or the log says `request failed` | A network problem on the VPS — see below |
| Client secret wrong or rotated | The check says the pair was rejected; log says `invalid_client` | Re-copy the secret into `.env`, then `pm2 reload weekendcart` |
| Redirect URI not registered | Log says `redirect_uri_mismatch` | Register it exactly as the check prints it |
| The code was already used | Log says `invalid_grant` | Harmless — it happens if the callback page is refreshed or opened twice. Sign in again |
| `.env` edited but not reloaded | Nothing changed after fixing the console | `pm2 reload weekendcart` — the app reads `.env` at start |

**What the code does about it already.** The token exchange now times out after
8 seconds and retries twice with a short pause, so a connection that drops or
stalls once costs a second and nobody notices. It does *not* retry a request
the provider actually answered with a 4xx — a wrong secret or a used code fails
at once and says so, because asking again would only replay a single-use code.
A retry that succeeds is written to the log, so an intermittent network shows
up there even when no customer ever sees an error.

### What was actually wrong on this server

Measured, not guessed. A plain TCP connection to Google's token endpoint:

```
✗ IPv4 — timed out (after 10008ms)
✓ IPv6 2404:6800:4000:1025::5f — connected in 7ms
```

**This server's IPv4 route out is broken. Its IPv6 route is healthy.** Node was
picking the IPv4 address, waiting, and giving up — so a Google sign-in failed
while every setting in the console was correct. The same fault explains the
build that could not fetch its fonts, and the deploy that could not reach
GitHub (`github.com` publishes no IPv6 address at all, which is why forcing
`-4` made no difference: IPv4 was the only road, and it is shut).

Two changes make the app immune to it:

- It starts with `--dns-result-order=ipv6first`, so the family that works is
  tried first.
- `src/instrumentation.ts` turns on **Happy Eyeballs** — when a name resolves
  to both families, the second is tried half a second after the first instead
  of waiting out a connection that will never open. Whichever family is healthy
  wins the race. If IPv4 is repaired later, or IPv6 breaks instead, this keeps
  working with nothing to change.

> **Do not add an IPv4 precedence line to `/etc/gai.conf` on this box.** It
> would force the broken family on everything — git, npm, curl and the app.
> If one was added, remove it.

The real repair is for the hosting provider: IPv4 outbound should work. Until
it does, GitHub stays unreachable from the server, which is why deploys are
pushed to the box rather than pulled from GitHub — see
[deploy/README.md](../deploy/README.md).

## One hostname

The shop answers on two names — `weekendcart.com` and `ecom.flexypdf.com` — but
a sign-in only works on the one in `NEXT_PUBLIC_SITE_URL`.

The reason is the handshake cookie. Pressing the button sets a short-lived
cookie on whatever hostname you are on, and Google always returns everyone to
the single registered redirect URI. Start on `ecom.flexypdf.com` and you come
back to `weekendcart.com`, where that cookie does not exist — and the attempt
fails with *"that sign-in attempt expired on the way back"*.

So either always use `weekendcart.com`, or make `ecom.flexypdf.com` redirect to
it in nginx rather than serving the site itself.

## After changing anything

**Server (VPS)**

```bash
cd ~/ecom.flexypdf.com
pm2 reload weekendcart
npx tsx scripts/check-auth.ts
```

Then try the sign-in in a private window — a normal window may replay a stale
cookie and confuse the picture.
