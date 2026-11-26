# Sherwood

**Records they charge for. Free.** The orchestration hub for the App Factory "Robin Hood" apps — free, honest decoders for public records that companies resell.

Static site, zero running cost (GitHub Pages / Netlify). No backend, no keys, nothing stored.

## Live tools (v1)
- **Vehicles (`/vehicles.html`)** — free VIN decode: NHTSA vPIC build sheet + safety equipment, recalls, crash ratings, complaints, honest "what a free check can't show" panel, VIN-specific recall deep link. Calls NHTSA's free public APIs **client-side** (CORS-enabled).
- **Boats (`/boats.html`)** — free HIN decode: builder/MIC, build date, model year, format era, validation. **100% on-device** logic, faithfully ported from the HIN It app. Links to the free USCG sources.

## Structure
```
index.html / vehicles.html / boats.html / about.html
assets/sherwood.css   brand/design system (forest + Robin Hood, light/dark)
assets/common.js      shared helpers + JSON-LD injector
assets/vin.js         VIN decode (NHTSA)
assets/hin.js         HIN decode (ported from HIN It)
robots.txt / sitemap.xml
```

## The layers (see Second Brain: "App Factory - Robin Hood Hub (Orchestration Layer)")
- **L0 Data access** — normalized free-source decoding; clean URLs (`?vin=` / `?hin=`) + JSON-LD so agents/search read the answer.
- **L1 Traffic** — SEO page library (next phase: generate long-tail answer pages).
- **L2 Trust** — honest framing, cites gov sources, not affiliated, no paywall.
- **L3 Distribution** — the apps (VIN It / HIN It) as spokes; agent-callable endpoint / MCP next.

## Roadmap
- Salary (BLS/OEWS) and Flood (FEMA NFHL) verticals.
- Static per-VIN/per-HIN SEO pages (generator).
- MCP server / agent endpoint wrapping the decoders.
- Donations (site-only) + email capture.

## Rules
Free; records never paywalled; honest about what's free vs. paid; not affiliated; zero running cost. Only verified MIC→builder mappings — never guess.
