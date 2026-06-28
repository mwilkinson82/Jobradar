# NYC Construction Intelligence

A local Vite/React prototype for a public-record construction intelligence product. The current customer-facing experience is NYC-first: users can see hot construction areas, inspect public project/permit previews, identify visible companies and properties, and request deeper intelligence reports.

- NYC construction heat map preview
- hot areas ranked by public DOB activity, growth, value, and source coverage
- visible sample project / permit records
- clickable area, project, and company intelligence modals
- company and property preview sections
- free-preview-to-report unlock flow

The original Job Radar contractor campaign concept still exists as a possible downstream lens, but the current public demo is not a postcard, route, or roofing dashboard. Data collection belongs on the operator side as a signal engine: public APIs, exports, commercial data, planning documents, and scraping fallbacks are normalized, scored, and published into the product.

The data-source plan for turning the prototype into one real metro/trade pilot lives in [`docs/job-radar-data-source-repository.md`](docs/job-radar-data-source-repository.md). The first public-data foundation lives in [`docs/market-source-registry.md`](docs/market-source-registry.md) and can be regenerated with:

```bash
npm run data:nyc
```

That command uses official public Socrata APIs to publish static demo files under `public/data/`. Raw audit pulls are saved locally under `data/raw/` and are intentionally ignored by Git.

Design references are saved in `design/`.
