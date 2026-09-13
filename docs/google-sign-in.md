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

The app is also started with `--dns-result-order=ipv4first`, so it tries IPv4
before IPv6 for every outbound call. A machine with an IPv6 address and no
working IPv6 route sits on the connect for a minute rather than falling back,
and Node prefers IPv6 by default. The check's "Address families" lines show
whether that is happening here: IPv4 connecting in milliseconds while IPv6
hangs is the signature.

**The network cause is the likely one on this box.** It has already failed to
reach `fonts.googleapis.com` during a build and `github.com` during a deploy,
both timing out on connect while other hosts answered normally. Google's token
endpoint is reached the same way, and if that connection cannot be opened, no
Google sign-in can finish however correct the settings are. The check's
reachability lines settle it in a few seconds. If they fail, it is a matter for
the hosting provider, not for the console.

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
