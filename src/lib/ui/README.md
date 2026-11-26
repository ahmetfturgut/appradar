# Development UI demo

Stop the current development server, then run from the project root:

```sh
APPRADAR_DEMO_MODE=true npm run dev
```

Open http://127.0.0.1:3000. Dashboard, Explorer and App Details use 120 synthetic apps across both stores and eight categories, including history, charts and ranking changes. All pages have a development demo banner. US supports `en` and `es`; TR supports `tr` and `en`. Other contexts are intentionally empty. App IDs are stable; dates move with the clock. No Supabase configuration, migration or data import is required. Setting the flag in `.env.local` is enough for `npm run dev`; production never selects these fixtures.

To disable, stop the server and restart explicitly:

```sh
APPRADAR_DEMO_MODE=false npm run dev
```

Only the exact string `true` with `NODE_ENV=development` enables this mode. Production always uses the real read services, even if the flag is set. There is no client flag, URL switch or error-triggered fallback. The server-only gateway selects the source before making a read. The demo module imports DTOs as types only and makes no network requests or database writes.

Descriptions and reviews are authored synthetic text; their demo DTOs allow these fixtures independently of real store-content flags. Icons, screenshots and external store links are absent. Existing real-data media, description and review flags remain unchanged. Unknown values remain null; iOS install counts are unsupported. Ranking and proxy scores are synthetic UI examples, not market or search-volume estimates.
