# Fonts

Two variable woff2 files, latin subset, taken from Google Fonts and committed
so that neither the build nor the browser has to reach Google for them.

They were downloaded with a desktop-Chrome user agent (Google serves woff2 only
to browsers that ask for it) from the `src:` URL in the last `@font-face` block
of each stylesheet — the last block is the `latin` subset:

```bash
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
curl -A "$UA" 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200..800&display=swap'
curl -A "$UA" 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&display=swap'
```

| File | Family | Axes kept |
| --- | --- | --- |
| `plus-jakarta-sans-latin.woff2` | Plus Jakarta Sans | weight 200–800 |
| `fraunces-latin.woff2` | Fraunces | weight 400–700, optical size 9–144 |

Latin only, which is what the site asked Google for before. The rupee sign
(U+20B9) lives in Google's `latin-ext` subset and was never in these files, so
it renders from the system fallback — exactly as it did before.

Refreshing them is replacing the two files; nothing else references the
version, and `src/app/layout.tsx` reads them by filename.
