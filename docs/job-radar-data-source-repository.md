# Job Radar Data-Source Repository

Last checked: 2026-06-28

This document is the working data plan for turning Job Radar from a clickable demo into one real weekly money brief.

The product question is not whether the UI can be built. The question is whether one market and one trade can produce a believable weekly recommendation from real data at a cost a contractor price point can absorb.

## Current Decision

Start with an Austin public-data pilot before buying data.

Dallas is still a strong sales-demo market, but the public permit path is weaker than expected. Dallas Open Data marks the general `Building Permits` dataset as historical and says active permit tracking moved to Dallas Accela Citizen Access. That means Dallas likely needs Accela export access, scraping permission, or a commercial permit vendor before it should be the first real data build.

Austin exposes a current `Issued Construction Permits` dataset through Socrata. It includes building, electrical, mechanical, plumbing, and driveway/sidewalk permits, plus issue date, address, status, project link, latitude, and longitude. That makes Austin the cleaner first public-data slice.

## Pilot Slice

Trade: roofing / exterior replacement

Metro: Austin, TX

Goal: produce one real weekly money brief with:

- top 3 neighborhoods or ZIPs
- permit activity summary
- weather/storm trigger summary
- housing age and ability-to-pay proxies
- 50-150 target addresses where legally usable
- route packet and campaign copy
- explicit confidence level and data gaps

Do not build accounts, billing, national data ingestion, or a large backend until this brief can be shown to contractors and they say they would act on it.

## Source Matrix

| Layer | First source | Use in pilot | Cost posture | Notes |
| --- | --- | --- | --- | --- |
| Current permits | Austin `Issued Construction Permits` | Demand, timing, permit clusters, contractor activity, trade classification | Free/public | Main pilot source. Dataset URL: https://data.austintexas.gov/d/3syk-w9eu. API base: https://data.austintexas.gov/resource/3syk-w9eu.json |
| Dallas permits | Dallas `Building Permits` historical dataset | Historical reference only | Free/public, but not enough | Dataset says active tracking moved to Dallas Accela Citizen Access. URL: https://www.dallasopendata.com/d/e7gq-4sah |
| Dallas parcels | Dallas `Tax Parcels` | Property/parcel enrichment if Dallas is used later | Free/public | Useful property layer. URL: https://www.dallasopendata.com/d/mwj9-rjut |
| Dallas ROW permits | Dallas `ROW Permits - Points` | Not core for roofing; may indicate construction disruption | Free/public | Current, but right-of-way permits are not a substitute for building permits. URL: https://www.dallasopendata.com/d/bw6g-a3ur |
| Geocoding | Census Geocoder | Normalize permit/property addresses, attach tract/block where possible | Free/public | Batch geocoding supports up to 10,000 records per batch. URL: https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html |
| Demographics and housing | Census ACS 5-year profile API | Income, home value, owner occupancy, housing age, household density | Free/public | Use latest ACS 5-year profile data available at build time. API docs: https://api.census.gov/data.html |
| Storm and weather | NOAA Storm Events bulk CSV | Hail/wind trigger, recent severe weather confidence | Free/public | Bulk CSV directory includes 2026 files. URL: https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/ |
| Housing momentum | FHFA HPI, Redfin Data Center | ZIP/metro value trend and sale-velocity context | Free/public or low friction | FHFA: https://www.fhfa.gov/data/hpi. Redfin: https://www.redfin.com/news/data-center/ |
| Paid permit normalization | ATTOM, Cotality, BuildZoom, Shovels, Construction Monitor | Multi-market normalization later | Paid, evaluate after customer pull | Ask about display/export rights, refresh lag, geography, trade classification, and derived-score rights before price. |
| Paid property/parcel | Regrid, ATTOM, RentCast, BatchData, Cotality | Parcel-level lead quality later | Paid, avoid national buy now | Only test a bounded market/batch after contractors commit to paid pilot interest. |

## Cost Scenarios

| Scenario | Data approach | Expected data cost posture | When to use |
| --- | --- | --- | --- |
| Public-data pilot | Austin permits + Census + NOAA + FHFA/Redfin | Near-zero data cost, higher manual cleanup | Now |
| Paid spot-check | Public-data pilot plus one paid property/permit sample batch | Small controlled spend | After 3 contractor pilot commitments |
| One-market paid product | Paid permit/property source for one metro/trade | Must fit under 20-30% of ARPA | After proof contractors act on briefs |
| National product | Commercial normalized permits + parcels + geocoding + routing | Expensive; do not buy early | Only after repeatable metro launch process |

Pricing rule:

At $149/month, data plus platform cost should stay near $30-$45/month per contractor. If the product needs more data spend than that, the business model should lean into campaign execution fees, territory exclusivity, distributor sponsorship, or paid pilot packages instead of cheap self-serve subscriptions.

## Metro Checklist

Use this checklist before declaring a market viable.

| Item | Austin | Dallas |
| --- | --- | --- |
| Current public permit feed | Yes: `Issued Construction Permits` | Unclear: open dataset is historical; active permits moved to Accela |
| Permit address fields | Yes | Historical only until Accela/vendor path solved |
| Permit coordinates | Yes in Austin sample | Historical/varies |
| Work description / type | Yes | Historical/varies |
| Property/parcel layer | Needs Travis/CAD path check | Dallas tax parcels available |
| Weather/storm data | NOAA available | NOAA available |
| ACS tract/ZIP scoring | Available | Available |
| First-pilot recommendation | Build first | Sales demo or second pilot after permit access solved |

## Vendor Questions

Ask every paid data vendor these questions before discussing an annual contract:

1. Can we show permit/property-derived records to contractors inside a product?
2. Can contractors export addresses for direct mail and door routes?
3. Can we store normalized addresses, coordinates, and derived scores?
4. Can we use the data to create trade-specific campaign recommendations?
5. What is the refresh lag by jurisdiction?
6. What fields are available for Dallas, Austin, Nashville, and Charlotte?
7. What percentage of records include contractor name, job value, work description, permit status, and coordinates?
8. Is pricing by metro, county, record, API call, seat, or refresh frequency?
9. Are there restrictions on postcard targeting, advertising audiences, or lead resale?
10. Can they provide a 90-day sample for one metro and one trade before contract?

## Scoring Model V1

Keep the first scoring model explainable. It should produce a neighborhood score, not pretend to predict exact buyer intent.

| Signal | Weight | Free source path | Notes |
| --- | ---: | --- | --- |
| Relevant permit density | 25 | Austin permits | Trade-classify by permit type, work class, and description. |
| Recent permit acceleration | 15 | Austin permits | Compare last 30/60/90 days against prior period. |
| Housing age fit | 20 | ACS housing age, parcel data when available | For roofing, older housing stock is a strong proxy until roof-age data exists. |
| Ability to pay | 15 | ACS income/home value, FHFA/Redfin area trends | Area-level proxy only; do not overclaim household-level ability. |
| Storm trigger | 15 | NOAA Storm Events | Hail/wind within recent window boosts roofing/exterior scoring. |
| Route density | 10 | Permit coordinates, geocoder, parcel/address clustering | Favors tight routes over scattered opportunities. |

Output labels:

- 85-100: high-confidence pilot area
- 70-84: good campaign test
- 50-69: watch list
- below 50: do not lead this week

## First Data Build Sequence

1. Pull 24 months of Austin `Issued Construction Permits`.
2. Filter to residential-like building, roof/exterior, repair, remodel, and related work descriptions.
3. Classify permits into roofing/exterior, HVAC, kitchen/bath, outdoor, general remodel, and ignore.
4. Aggregate by ZIP, tract, and simple map cluster.
5. Join Census ACS area-level housing age, income, owner occupancy, and home value proxies.
6. Pull NOAA hail/wind events for Travis County and nearby counties.
7. Rank neighborhoods with scoring model V1.
8. Generate one weekly money brief and one route/campaign packet.
9. Show it to 15-20 contractors.
10. Record whether they would run the campaign if the data was real.

## Decision Gate

Move to backend/data infrastructure only if at least three contractors say they would pay for a real-market pilot after seeing the Austin public-data brief.

If that does not happen, keep testing positioning and trust objections before buying data.

## Trust Objections To Capture

The prototype signup should capture:

- current lead source
- monthly marketing spend
- whether they would run the recommended campaign
- what data they would need to trust the recommendation

Those answers matter more than whether they like the UI.
