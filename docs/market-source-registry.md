# Market Source Registry v0.1

This registry keeps Job Radar from becoming a one-city demo. The first production-style pack is NYC, but the same Socrata connector also verifies public permit datasets in Austin, Chicago, Seattle, and San Francisco.

The rule for v0.1 is simple: prefer official public API/export access, do not buy data, and do not scrape if a Socrata/API path exists.

| Market | Primary public source | Domain | Dataset ID | Connector | Launch grade | Best first use |
| --- | --- | --- | --- | --- | --- | --- |
| New York City, NY | DOB NOW: Build - Approved Permits | data.cityofnewyork.us | rbx6-tga4 | Socrata | A | Construction heat, project search, trade scoring |
| New York City, NY | DOB Permit Issuance | data.cityofnewyork.us | ipu4-2q9a | Socrata | A | Issued permit timing, contractor activity |
| New York City, NY | DOB NOW: Build - Job Application Filings | data.cityofnewyork.us | w9ak-ipjd | Socrata | A | Pre-permit/project filing momentum |
| New York City, NY | PLUTO | data.cityofnewyork.us | 64uk-42ks | Socrata | A | Property age, land use, parcel fit |
| New York City, NY | DOB Complaints Received | data.cityofnewyork.us | eabe-havv | Socrata | A | Code activity, construction friction |
| New York City, NY | DOB Violations | data.cityofnewyork.us | 3h2n-5cm9 | Socrata | A | Enforcement heat, risk signal |
| New York City, NY | ACRIS Real Property Master | data.cityofnewyork.us | bnx9-e6tj | Socrata | A- | Sale/transfer momentum |
| New York City, NY | ACRIS Real Property Legals | data.cityofnewyork.us | 8h5j-fqxa | Socrata | A- | ACRIS-to-BBL property join |
| Austin, TX | Issued Construction Permits | data.austintexas.gov | 3syk-w9eu | Socrata | A | Permit heat, contractor activity, valuation scoring |
| Chicago, IL | Building Permits | data.cityofchicago.org | ydr8-5enu | Socrata | A- | Permit heat, project search, work classification |
| Seattle, WA | Building Permits | data.seattle.gov | 76t5-zqzr | Socrata | A- | Permit heat, cost scoring, roof/remodel classification |
| San Francisco, CA | Building Permits | data.sfgov.org | i98e-djp9 | Socrata | A- | Permit heat, cost scoring, neighborhood signals |

## NYC flagship sources

- DOB NOW: Build - Approved Permits (`rbx6-tga4`) gives current approved permit activity, job descriptions, work types, estimated job costs, BBL/BIN, ZIP, latitude/longitude, and NTA.
- DOB Permit Issuance (`ipu4-2q9a`) gives issued permit timing and permittee fields.
- DOB NOW: Build - Job Application Filings (`w9ak-ipjd`) gives filing momentum, current status, first permit date, initial cost, and work-type flags.
- DOB Job Application Filings (`ic3t-wcy2`) gives legacy filing history for broader baselines.
- DOB Complaints Received (`eabe-havv`) and DOB Violations (`3h2n-5cm9`) provide code/friction signals.
- PLUTO (`64uk-42ks`) provides property, parcel, land-use, age, and assessed-value context.
- ACRIS Real Property Master (`bnx9-e6tj`) and Legals (`8h5j-fqxa`) provide transfer/document context for future market-momentum scoring.

## Connector notes

All five initial markets expose Socrata APIs, so the connector can use:

```text
https://{domain}/api/views/{dataset_id}
https://{domain}/resource/{dataset_id}.json
```

The first NYC pack writes small raw samples locally for audit, then publishes static app data to:

```text
public/data/nyc_construction_heat.json
public/data/nyc_top_areas.json
public/data/nyc_sample_projects.json
public/data/market_availability.json
```

This is not a national data product yet. It is a reusable public-data launch machine with NYC as the first proof.
