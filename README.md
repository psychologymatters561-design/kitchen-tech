# Kitchen Tech India website

The D2C + B2B website for **Kitchen Tech India** (Bawana, Delhi), built around the launch of **Aanch**, its infrared cooktop.

- **Front end:** plain HTML, CSS and JavaScript modules. No build step. GSAP 3 (ScrollTrigger, SplitText, DrawSVG) and Lenis smooth scroll, all self-hosted in `public/assets/vendor/`. Fonts are self-hosted too: Rozha One and Mukta (both from Indian type foundries) plus IBM Plex Mono.
- **Mid end** (`server/services/`): the business rules. Pricing, order rules, lead rules, payment verification, Meta Conversions API and notifications. The cost engine (`public/assets/js/lib/cost-engine.js`) is shared by the browser and the server, so the calculator a visitor sees and the API give the same answer.
- **Back end** (`server/`): Express 4 + SQLite (Node's built-in `node:sqlite`, no native modules). It covers orders, leads, the Razorpay webhook, an admin API, security headers (CSP), rate limiting and SEO routes.

```
public/                   the website (works on its own as a static site too)
  index.html              Home: "From the flame to the aanch" scroll scene
  aanch.html              Aanch landing page (Meta ad destination): scroll film, bartan checker,
                          honest cost calculator, Aanch vs induction vs gas, India's LPG import story
  catalogue.html          133 models from the brief, filterable, multi-select -> WhatsApp dealer price
  business.html           Dealers, OEM / private label, bulk & gifting, PNG + lead form
  about.html, contact.html, checkout.html, policies.html, admin.html, 404.html
  assets/data/site.json   ALL business facts in one file (null = "to confirm" chip on the site)
  assets/data/catalogue.json
server/
  index.js                app + static hosting + redirects + sitemap/robots
  config.js               loads site.json, applies env overrides (price, tracking ids)
  routes/api.js           thin HTTP layer
  services/               orders, leads, payments (Razorpay), meta (CAPI), notify
  middleware/security.js  CSP, rate limit, admin token auth
  db/index.js             SQLite + append-only migrations
tests/                    node:test suites (API + cost engine)
```

## See it without installing anything

`preview/` has every page as **one self-contained file** (styles, fonts, animations and data inside). Download the folder and double-click `preview/aanch.html` or `preview/index.html`. It works offline and on a phone. Forms in the preview send your details to WhatsApp, because there is no server behind a single file. Rebuild after any change with `npm run preview`.

## Run it

Requires **Node 22.13+**.

```bash
npm install
```

```bash
cp .env.example .env   # then fill in what you have
```

```bash
npm start              # http://localhost:3000
```

```bash
npm test               # 19 tests: orders, leads, admin, webhook signatures, security headers, cost maths
```

Node does not read `.env` by itself. Either set the variables in your host's dashboard, or run `node --env-file=.env --disable-warning=ExperimentalWarning server/index.js`.

## Going live checklist

| Step | Where |
|---|---|
| Set the launch price | `AANCH_PRICE`, `AANCH_MRP` env vars. Until set, every Buy button becomes "Book on WhatsApp" (nothing breaks) |
| Fill the missing facts | `public/assets/data/site.json`: wattage, warranty, BIS licence, model, socket, dimensions, legal name, GSTIN, grievance officer, founding year, hours. Each `null` shows a dashed **to confirm** chip until filled |
| Payments | Razorpay keys + webhook secret. Online pay stays disabled until both keys exist |
| Ads tracking | `META_PIXEL_ID` + `META_CAPI_TOKEN` (browser Pixel and server CAPI share event ids, so Meta de-duplicates) |
| Owner dashboard | `ADMIN_TOKEN`, then open `/admin` |
| Images | Product photos currently load from the old site's URLs. Download them, convert to WebP, put them in `public/assets/img/`, and update `site.json` / `catalogue.json`. If a remote image fails, the site draws a matching line illustration instead of a broken image |
| Policies | `policies.html` is a **draft template**. Have a CA or lawyer review it |
| Hosting | Any Node host (Hostinger VPS / Node plan, Render, Railway). Keep `DB_PATH` on a persistent disk |

## Honesty rules baked into the site

The brief says never invent facts. So:

- Unknown values render as a visible **to confirm** chip, never a made-up number.
- There are no fake reviews. The reviews section asks visitors for a real cooking video on WhatsApp instead.
- The cost calculator tells the truth even when gas is cheaper (with a ₹942 cylinder, Aanch is cheaper only below about ₹6.2 per unit). It wins where it really wins: commercial or black-market cylinders, the 25-day booking gap, any bartan, solar homes.
- National LPG numbers come with dated sources (PPAC, S&P Global, Drewry) in `site.json`.

## API

| Method | Path | What |
|---|---|---|
| GET | `/api/config` | public business + product config |
| GET | `/api/catalogue?cat=&burners=&top=&q=` | catalogue |
| POST | `/api/calc/cost`, `/api/calc/national`, `/api/calc/utensils` | the shared cost engine |
| POST | `/api/orders` | create order (server computes the price) |
| POST | `/api/orders/confirm` | verify Razorpay checkout signature |
| GET | `/api/orders/track?id=&phone=` | customer self-tracking |
| POST | `/api/leads` | dealer / oem / bulk / png / contact / demo |
| POST | `/api/payments/razorpay/webhook` | signed webhook |
| GET/PATCH | `/api/admin/*` | Bearer `ADMIN_TOKEN` |
