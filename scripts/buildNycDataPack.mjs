import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  columnsFromMetadata,
  exportRawCsv,
  exportRawJson,
  fetchMetadata,
  fetchSampleRows,
  paginateRecords,
} from "./socrataConnector.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nycSourcesPath = path.join(rootDir, "data-sources", "nyc_sources.json");
const marketRegistryPath = path.join(rootDir, "data-sources", "market-source-registry.json");
const publicDataDir = path.join(rootDir, "public", "data");
const rawNycDir = path.join(rootDir, "data", "raw", "nyc");
const rawMarketsDir = path.join(rootDir, "data", "raw", "markets");

const RECENT_DAYS = 180;
const PREVIOUS_DAYS = 180;
const MAX_RECORDS_PER_SOURCE = 1500;

const BOROUGH_CODES = new Map([
  ["1", "Manhattan"],
  ["2", "Bronx"],
  ["3", "Brooklyn"],
  ["4", "Queens"],
  ["5", "Staten Island"],
  ["MN", "Manhattan"],
  ["BX", "Bronx"],
  ["BK", "Brooklyn"],
  ["QN", "Queens"],
  ["SI", "Staten Island"],
]);

const COLOR_BY_RANK = ["orange", "green", "blue", "gray", "gray", "gray", "gray", "gray"];

async function main() {
  const generatedAt = new Date().toISOString();
  const recentStart = daysAgo(RECENT_DAYS);
  const previousStart = daysAgo(RECENT_DAYS + PREVIOUS_DAYS);
  const nycSources = await readJson(nycSourcesPath);
  const marketRegistry = await readJson(marketRegistryPath);

  await mkdir(publicDataDir, { recursive: true });
  await mkdir(rawNycDir, { recursive: true });
  await mkdir(rawMarketsDir, { recursive: true });

  const marketAvailability = await buildMarketAvailability(marketRegistry, generatedAt);
  const nycSamples = await sampleNycSources(nycSources.sources);
  const sourceById = new Map(nycSources.sources.map((source) => [source.id, source]));

  const approvedPermits = sourceById.get("nyc_dob_now_approved_permits");
  const issuedPermits = sourceById.get("nyc_dob_permit_issuance");
  const nowJobFilings = sourceById.get("nyc_dob_now_job_application_filings");
  const legacyJobFilings = sourceById.get("nyc_dob_job_application_filings");
  const complaintsSource = sourceById.get("nyc_dob_complaints_received");
  const violationsSource = sourceById.get("nyc_dob_violations");

  const [
    recentApproved,
    previousApproved,
    recentIssued,
    recentNowFilings,
    previousNowFilings,
    recentLegacyFilings,
    recentComplaints,
    recentViolations,
  ] = await Promise.all([
    fetchWindow(approvedPermits, "issued_date", recentStart, undefined, MAX_RECORDS_PER_SOURCE),
    fetchWindow(approvedPermits, "issued_date", previousStart, recentStart, MAX_RECORDS_PER_SOURCE),
    fetchWindow(issuedPermits, "issuance_date", recentStart, undefined, MAX_RECORDS_PER_SOURCE),
    fetchWindow(nowJobFilings, "filing_date", recentStart, undefined, MAX_RECORDS_PER_SOURCE),
    fetchWindow(nowJobFilings, "filing_date", previousStart, recentStart, MAX_RECORDS_PER_SOURCE),
    fetchWindow(legacyJobFilings, "latest_action_date", recentStart, undefined, MAX_RECORDS_PER_SOURCE),
    fetchWindow(complaintsSource, "date_entered", recentStart, undefined, MAX_RECORDS_PER_SOURCE),
    fetchWindow(violationsSource, "issue_date", recentStart, undefined, MAX_RECORDS_PER_SOURCE),
  ]);

  await exportRawJson(path.join(rawNycDir, "recent-approved-permits.json"), recentApproved);
  await exportRawJson(path.join(rawNycDir, "recent-issued-permits.json"), recentIssued);
  await exportRawJson(path.join(rawNycDir, "recent-job-filings.json"), recentNowFilings);
  await exportRawJson(path.join(rawNycDir, "recent-complaints.json"), recentComplaints);
  await exportRawJson(path.join(rawNycDir, "recent-violations.json"), recentViolations);

  const recentActivities = [
    ...recentApproved.map((row) => normalizeActivity(row, approvedPermits)),
    ...recentIssued.map((row) => normalizeActivity(row, issuedPermits)),
    ...recentNowFilings.map((row) => normalizeActivity(row, nowJobFilings)),
    ...recentLegacyFilings.map((row) => normalizeActivity(row, legacyJobFilings)),
  ].filter(Boolean);

  const previousActivities = [
    ...previousApproved.map((row) => normalizeActivity(row, approvedPermits)),
    ...previousNowFilings.map((row) => normalizeActivity(row, nowJobFilings)),
  ].filter(Boolean);

  const complaints = recentComplaints.map((row) => normalizeComplaint(row, complaintsSource)).filter(Boolean);
  const violations = recentViolations.map((row) => normalizeViolation(row, violationsSource)).filter(Boolean);
  const heatAreas = scoreAreas({
    activities: recentActivities,
    complaints,
    generatedAt,
    previousActivities,
    recentStart,
    previousStart,
    violations,
  });

  const topAreas = buildTopAreas(heatAreas, recentActivities, generatedAt);
  const sampleProjects = buildSampleProjects(recentActivities, topAreas, generatedAt);

  await writeJson(path.join(publicDataDir, "nyc_construction_heat.json"), {
    version: "0.1",
    market: "New York City, NY",
    badge: "NYC public-data beta",
    source_badge: "sources: DOB / NYC Open Data / PLUTO",
    generated_at: generatedAt,
    scoring_window: {
      recent_days: RECENT_DAYS,
      previous_days: PREVIOUS_DAYS,
      recent_start: recentStart,
      previous_start: previousStart,
    },
    sources: nycSources.sources.map((source) => ({
      id: source.id,
      source_name: source.source_name,
      agency: source.agency,
      dataset_id: source.dataset_id,
      api_endpoint: source.api_endpoint,
      update_frequency: source.update_frequency,
      confidence_score: source.confidence_score,
    })),
    sample_status: nycSamples,
    areas: heatAreas,
  });

  await writeJson(path.join(publicDataDir, "nyc_top_areas.json"), {
    version: "0.1",
    market: "New York City, NY",
    badge: "NYC public-data beta",
    source_badge: "sources: DOB / NYC Open Data / PLUTO",
    cta: "Request NYC Construction Intelligence beta",
    generated_at: generatedAt,
    areas: topAreas,
  });

  await writeJson(path.join(publicDataDir, "nyc_sample_projects.json"), sampleProjects);
  await writeJson(path.join(publicDataDir, "market_availability.json"), marketAvailability);

  console.log(`NYC data pack generated with ${heatAreas.length} scored areas and ${sampleProjects.projects.length} sample projects.`);
}

async function buildMarketAvailability(marketRegistry, generatedAt) {
  const markets = [];

  for (const market of marketRegistry.markets) {
    const sampledSources = [];
    for (const source of market.sources) {
      if (source.connector_type !== "socrata" || !source.api_available) {
        sampledSources.push({
          dataset_id: source.dataset_id,
          dataset_name: source.dataset_name,
          status: "skipped",
          reason: "No Socrata/API connector configured",
        });
        continue;
      }

      const sourceForConnector = {
        socrata_domain: source.socrata_domain,
        dataset_id: source.dataset_id,
      };

      try {
        const [metadata, sampleRows] = await Promise.all([
          fetchMetadata(sourceForConnector),
          fetchSampleRows(sourceForConnector, { limit: 5 }),
        ]);
        const marketSlug = slugify(market.market_name);
        await exportRawJson(
          path.join(rawMarketsDir, `${marketSlug}-${source.dataset_id}-sample.json`),
          sampleRows,
        );

        sampledSources.push({
          dataset_id: source.dataset_id,
          dataset_name: metadata.name ?? source.dataset_name,
          agency: metadata.attribution ?? source.agency,
          status: "available",
          connector_type: source.connector_type,
          api_available: true,
          column_count: columnsFromMetadata(metadata).length,
          sample_rows: sampleRows.length,
          key_date_fields: source.key_date_fields,
          update_frequency: source.update_frequency,
          best_use_cases: source.best_use_cases,
        });
      } catch (error) {
        sampledSources.push({
          dataset_id: source.dataset_id,
          dataset_name: source.dataset_name,
          status: "error",
          error: error.message,
        });
      }
    }

    markets.push({
      market_name: market.market_name,
      launch_grade: market.launch_grade,
      notes: market.notes,
      sources: sampledSources,
    });
  }

  return {
    version: "0.1",
    generated_at: generatedAt,
    connector_priority: "Socrata first",
    markets,
  };
}

async function sampleNycSources(sources) {
  const samples = [];

  for (const source of sources) {
    try {
      const [metadata, sampleRows] = await Promise.all([
        fetchMetadata(source),
        fetchSampleRows(source, { limit: 10 }),
      ]);
      const baseFile = path.join(rawNycDir, `${source.dataset_id}-${slugify(source.source_name)}`);
      await exportRawJson(`${baseFile}-metadata.json`, {
        id: metadata.id,
        name: metadata.name,
        attribution: metadata.attribution,
        description: metadata.description,
        custom_fields: metadata.metadata?.custom_fields ?? {},
        columns: columnsFromMetadata(metadata),
      });
      await exportRawJson(`${baseFile}-sample.json`, sampleRows);
      await exportRawCsv(`${baseFile}-sample.csv`, sampleRows);

      samples.push({
        source_id: source.id,
        dataset_id: source.dataset_id,
        status: "sampled",
        sample_rows: sampleRows.length,
        column_count: columnsFromMetadata(metadata).length,
      });
    } catch (error) {
      samples.push({
        source_id: source.id,
        dataset_id: source.dataset_id,
        status: "error",
        error: error.message,
      });
    }
  }

  return samples;
}

async function fetchWindow(source, dateField, since, until, maxRecords) {
  try {
    return await paginateRecords(source, {
      dateField,
      maxRecords,
      order: `${dateField} DESC`,
      pageSize: 500,
      since,
      until,
    });
  } catch (error) {
    console.warn(`Warning: ${source?.source_name ?? source?.dataset_id} window fetch failed: ${error.message}`);
    return [];
  }
}

function normalizeActivity(row, source) {
  if (!row || !source) return null;
  const sourceId = source.id;

  if (sourceId === "nyc_dob_now_approved_permits") {
    return baseActivity({
      address: joinAddress(row.house_no, row.street_name),
      borough: row.borough,
      bin: row.bin,
      bbl: row.bbl,
      contractorName: row.applicant_business_name,
      date: row.issued_date || row.approved_date,
      declaredValue: row.estimated_job_costs,
      description: row.job_description,
      lat: row.latitude,
      lon: row.longitude,
      neighborhood: row.nta,
      permitNumber: row.work_permit || row.tracking_number,
      projectId: row.job_filing_number,
      raw: row,
      source,
      status: row.permit_status,
      type: row.work_type || row.filing_reason,
      zip: row.zip_code,
    });
  }

  if (sourceId === "nyc_dob_permit_issuance") {
    return baseActivity({
      address: joinAddress(row.house__, row.street_name),
      borough: row.borough,
      bin: row.bin__,
      bbl: row.bbl,
      contractorName: row.permittee_s_business_name,
      date: row.issuance_date || row.filing_date,
      declaredValue: null,
      description: [row.job_type, row.work_type, row.permit_type, row.permit_subtype].filter(Boolean).join(" "),
      lat: row.gis_latitude,
      lon: row.gis_longitude,
      neighborhood: row.gis_nta_name,
      permitNumber: row.permit_si_no,
      projectId: row.job__,
      raw: row,
      source,
      status: row.permit_status || row.filing_status,
      type: row.work_type || row.permit_type || row.job_type,
      zip: row.zip_code,
    });
  }

  if (sourceId === "nyc_dob_now_job_application_filings") {
    const flags = [
      row.general_construction_work_type_,
      row.mechanical_systems_work_type_,
      row.plumbing_work_type,
      row.sprinkler_work_type,
      row.foundation_work_type_,
      row.solar_work_type_,
      row.full_demolition_work_type_,
      row.sidewalk_shed_work_type_,
      row.suspended_scaffold_work_type_,
    ].filter(Boolean);

    return baseActivity({
      address: joinAddress(row.house_no, row.street_name),
      borough: row.borough,
      bin: row.bin,
      bbl: buildBbl(row.borough, row.block, row.lot),
      contractorName: [row.applicant_first_name, row.applicant_last_name].filter(Boolean).join(" "),
      date: row.filing_date || row.current_status_date || row.approved_date,
      declaredValue: row.initial_cost,
      description: [row.job_description, row.job_type, ...flags].filter(Boolean).join(" "),
      lat: null,
      lon: null,
      neighborhood: null,
      permitNumber: null,
      projectId: row.job_filing_number,
      raw: row,
      source,
      status: row.filing_status,
      type: row.job_type || flags.join(" "),
      zip: row.zip,
    });
  }

  if (sourceId === "nyc_dob_job_application_filings") {
    const flags = [
      row.plumbing,
      row.mechanical,
      row.boiler,
      row.sprinkler,
      row.fire_alarm,
      row.equipment,
      row.other_description,
    ].filter(Boolean);

    return baseActivity({
      address: joinAddress(row.house__, row.street_name),
      borough: row.borough,
      bin: row.bin__,
      bbl: buildBbl(row.borough, row.block, row.lot),
      contractorName: [row.applicant_s_first_name, row.applicant_s_last_name].filter(Boolean).join(" "),
      date: row.latest_action_date || row.pre__filing_date || row.approved,
      declaredValue: row.initial_cost,
      description: [row.job_status_descrp, row.job_type, ...flags].filter(Boolean).join(" "),
      lat: null,
      lon: null,
      neighborhood: null,
      permitNumber: null,
      projectId: row.job__,
      raw: row,
      source,
      status: row.job_status_descrp || row.job_status,
      type: row.job_type || flags.join(" "),
      zip: null,
    });
  }

  return null;
}

function baseActivity(input) {
  const borough = normalizeBorough(input.borough);
  const zip = cleanZip(input.zip);
  const description = compactText(input.description);
  const type = compactText(input.type);
  const tradeCategory = classifyTrade(`${type} ${description}`);
  const area = areaIdentity({
    borough,
    neighborhood: compactText(input.neighborhood),
    zip,
  });

  return {
    id: [input.source.dataset_id, input.projectId, input.permitNumber, input.address].filter(Boolean).join(":"),
    source_id: input.source.id,
    source_dataset_id: input.source.dataset_id,
    source_name: input.source.source_name,
    source_url: input.source.dataset_url,
    market: "New York City, NY",
    jurisdiction: input.source.agency,
    permit_number: input.permitNumber || null,
    project_id: input.projectId || null,
    permit_type: type || null,
    trade_category: tradeCategory,
    status: compactText(input.status),
    date: isoDate(input.date),
    date_issued: isoDate(input.date),
    declared_value: parseMoney(input.declaredValue),
    description,
    address: compactText(input.address),
    borough,
    zip,
    neighborhood: area.neighborhood,
    area_key: area.area_key,
    area_name: area.area_name,
    lat: parseNumber(input.lat),
    lon: parseNumber(input.lon),
    bbl: input.bbl ? String(input.bbl) : null,
    bin: input.bin ? String(input.bin) : null,
    contractor_name: compactText(input.contractorName),
    confidence_score: scoreRecordConfidence({ address: input.address, date: input.date, description, zip }),
  };
}

function normalizeComplaint(row, source) {
  const zip = cleanZip(row.zip_code);
  const area = areaIdentity({ borough: boroughFromCommunityBoard(row.community_board), zip });

  return {
    complaint_id: row.complaint_number,
    source_id: source.id,
    source_dataset_id: source.dataset_id,
    market: "New York City, NY",
    status: compactText(row.status),
    date_entered: isoDate(row.date_entered),
    complaint_category: compactText(row.complaint_category),
    address: joinAddress(row.house_number, row.house_street),
    zip,
    bin: row.bin ? String(row.bin) : null,
    area_key: area.area_key,
    area_name: area.area_name,
    confidence_score: scoreRecordConfidence({ address: joinAddress(row.house_number, row.house_street), date: row.date_entered, zip }),
  };
}

function normalizeViolation(row, source) {
  const borough = normalizeBorough(row.boro);
  const area = areaIdentity({ borough });

  return {
    violation_id: row.violation_number || row.isn_dob_bis_viol || row.ecb_number,
    source_id: source.id,
    source_dataset_id: source.dataset_id,
    market: "New York City, NY",
    date_issued: isoDate(row.issue_date),
    violation_type: compactText(row.violation_type),
    violation_category: compactText(row.violation_category),
    description: compactText(row.description),
    address: joinAddress(row.house_number, row.street),
    borough,
    bbl: buildBbl(row.boro, row.block, row.lot),
    bin: row.bin ? String(row.bin) : null,
    area_key: area.area_key,
    area_name: area.area_name,
    confidence_score: scoreRecordConfidence({ address: joinAddress(row.house_number, row.street), date: row.issue_date, description: row.description }),
  };
}

function scoreAreas({ activities, complaints, generatedAt, previousActivities, previousStart, recentStart, violations }) {
  const areas = new Map();

  for (const activity of activities) {
    const area = ensureArea(areas, activity);
    area.recent_permit_volume += 1;
    area.project_value_total += activity.declared_value ?? 0;
    area.records.push(activity.id);
    area.sources.add(activity.source_id);
    area.trade_counts[activity.trade_category] = (area.trade_counts[activity.trade_category] ?? 0) + 1;
    if (activity.lat && activity.lon) area.has_coordinates += 1;
  }

  for (const activity of previousActivities) {
    const area = ensureArea(areas, activity);
    area.previous_permit_volume += 1;
  }

  for (const complaint of complaints) {
    const area = ensureArea(areas, complaint);
    area.complaint_count += 1;
    area.sources.add(complaint.source_id);
  }

  for (const violation of violations) {
    const area = ensureArea(areas, violation);
    area.violation_count += 1;
    area.sources.add(violation.source_id);
  }

  const areaList = Array.from(areas.values()).filter((area) => area.recent_permit_volume > 0);
  const maxVolume = Math.max(1, ...areaList.map((area) => area.recent_permit_volume));
  const maxIssues = Math.max(1, ...areaList.map((area) => area.complaint_count + area.violation_count));
  const maxAvgValue = Math.max(1, ...areaList.map((area) => averageValue(area)));
  const maxDiversity = Math.max(1, ...areaList.map((area) => Object.keys(area.trade_counts).length));

  return areaList
    .map((area) => {
      const issueCount = area.complaint_count + area.violation_count;
      const growth = growthRate(area.recent_permit_volume, area.previous_permit_volume);
      const volumeScore = 35 * (area.recent_permit_volume / maxVolume);
      const growthScore = growthComponent(growth, area.previous_permit_volume);
      const issueScore = 15 * (issueCount / maxIssues);
      const diversityScore = 10 * (Object.keys(area.trade_counts).length / maxDiversity);
      const valueScore = 10 * (averageValue(area) / maxAvgValue);
      const coordinateBoost = area.has_coordinates ? 5 : 0;
      const sourceCoverage = Math.min(5, area.sources.size * 1.25);
      const constructionHeatScore = clamp(Math.round(volumeScore + growthScore + issueScore + diversityScore + valueScore + coordinateBoost + sourceCoverage), 0, 100);

      return {
        area_key: area.area_key,
        market: "New York City, NY",
        borough: area.borough,
        zip: area.zip,
        neighborhood: area.neighborhood,
        area_name: area.area_name,
        recent_permit_volume: area.recent_permit_volume,
        previous_permit_volume: area.previous_permit_volume,
        recent_activity_growth: Number(growth.toFixed(2)),
        complaint_count: area.complaint_count,
        violation_count: area.violation_count,
        project_value_total: Math.round(area.project_value_total),
        average_declared_value: Math.round(averageValue(area)),
        dominant_trade_categories: topEntries(area.trade_counts).slice(0, 4),
        construction_heat_score: constructionHeatScore,
        confidence_score: Number(Math.min(0.95, 0.68 + area.sources.size * 0.04 + (area.has_coordinates ? 0.05 : 0)).toFixed(2)),
        source_count: area.sources.size,
        record_count: area.records.length,
        generated_at: generatedAt,
        recent_start: recentStart,
        previous_start: previousStart,
      };
    })
    .sort((a, b) => b.construction_heat_score - a.construction_heat_score);
}

function buildTopAreas(heatAreas, activities, generatedAt) {
  const activitiesByArea = groupBy(activities, (activity) => activity.area_key);

  return heatAreas.slice(0, 8).map((area, index) => {
    const areaActivities = activitiesByArea.get(area.area_key) ?? [];
    const category = area.dominant_trade_categories[0]?.[0] ?? "general";
    const displayName = displayAreaName(area);
    const zipLabel = area.zip || "NYC";
    const growthText = formatGrowth(area.recent_activity_growth);
    const avgJob = area.average_declared_value ? compactCurrency(area.average_declared_value) : "N/A";

    return {
      id: slugify(`${displayName}-${zipLabel}`),
      rank: index + 1,
      name: displayName,
      zip: zipLabel,
      score: area.construction_heat_score,
      grade: gradeForScore(area.construction_heat_score),
      homes: area.recent_permit_volume,
      targetLabel: "active public records",
      avgJob,
      signal: signalForScore(area.construction_heat_score),
      color: COLOR_BY_RANK[index] ?? "gray",
      headline: index === 0 ? "NYC public-data beta area" : "Public-data construction signal",
      summary: `${area.recent_permit_volume} DOB permits/job filings in the last ${RECENT_DAYS} days, with ${growthText.toLowerCase()} versus the prior window.`,
      stats: [
        ["Recent DOB records", String(area.recent_permit_volume)],
        ["Activity growth", growthText],
        ["DOB complaints", String(area.complaint_count)],
        ["DOB violations", String(area.violation_count)],
        ["Avg declared cost", avgJob],
      ],
      reasons: [
        `${area.recent_permit_volume} recent DOB permits/job filings in the scoring window`,
        `${growthText} versus the previous ${PREVIOUS_DAYS}-day window`,
        `${area.complaint_count + area.violation_count} DOB complaint/violation records add code-activity context`,
        `${labelCategory(category)} is the dominant detected work category`,
        `Source-backed by NYC Open Data records, with PLUTO ready for parcel enrichment`,
      ],
      route: [
        `Focus: ${displayName}${area.zip ? ` / ZIP ${area.zip}` : ""}`,
        `Pull the DOB project packet for ${areaActivities.length} sampled records`,
        `Sort by ${labelCategory(category)} and declared cost`,
        "Build outreach list from permits, job filings, and parcel matches",
        "Use this as intelligence, not a purchased lead list",
      ],
      routeMeta: `${area.recent_permit_volume} public records - ${area.source_count} source types - generated ${generatedAt.slice(0, 10)}`,
      dataSource: "NYC Open Data",
      betaBadge: "NYC public-data beta",
    };
  });
}

function buildSampleProjects(activities, topAreas, generatedAt) {
  const topAreaKeys = new Set(topAreas.map((area) => area.id));
  const projects = activities
    .filter((activity) => activity.address || activity.description)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 40)
    .map((activity) => ({
      project_id: activity.project_id || activity.permit_number || activity.id,
      permit_number: activity.permit_number,
      address: activity.address || "Address not provided",
      borough: activity.borough,
      zip: activity.zip,
      area_name: activity.area_name,
      area_key: activity.area_key,
      date: activity.date,
      year: activity.date ? activity.date.slice(0, 4) : "DOB",
      trade_category: activity.trade_category,
      description: activity.description || activity.permit_type || "DOB construction record",
      declared_value: activity.declared_value,
      declared_value_label: activity.declared_value ? compactCurrency(activity.declared_value) : "N/A",
      status: activity.status,
      contractor_name: activity.contractor_name,
      source_name: activity.source_name,
      source_dataset_id: activity.source_dataset_id,
      source_url: activity.source_url,
      confidence_score: activity.confidence_score,
      in_top_area: topAreaKeys.has(slugify(`${activity.area_name}-${activity.zip || "NYC"}`)),
    }));

  return {
    version: "0.1",
    market: "New York City, NY",
    badge: "NYC public-data beta",
    source_badge: "sources: DOB / NYC Open Data / PLUTO",
    generated_at: generatedAt,
    projects,
    target_homes: projects.slice(0, 6).map((project) => [
      project.address,
      project.year,
      labelCategory(project.trade_category),
    ]),
  };
}

function ensureArea(areas, record) {
  const areaKey = record.area_key || areaIdentity(record).area_key;

  if (!areas.has(areaKey)) {
    const identity = areaIdentity(record);
    areas.set(areaKey, {
      area_key: areaKey,
      borough: identity.borough,
      zip: identity.zip,
      neighborhood: identity.neighborhood,
      area_name: identity.area_name,
      recent_permit_volume: 0,
      previous_permit_volume: 0,
      complaint_count: 0,
      violation_count: 0,
      project_value_total: 0,
      trade_counts: {},
      has_coordinates: 0,
      records: [],
      sources: new Set(),
    });
  }

  return areas.get(areaKey);
}

function areaIdentity(input) {
  const borough = normalizeBorough(input.borough);
  const zip = cleanZip(input.zip);
  const neighborhood = compactText(input.neighborhood);

  if (zip) {
    return {
      area_key: `zip:${zip}`,
      area_name: neighborhood || `${borough ? `${borough} ` : ""}ZIP ${zip}`,
      borough,
      zip,
      neighborhood,
    };
  }

  if (neighborhood) {
    return {
      area_key: `neighborhood:${slugify(`${borough}-${neighborhood}`)}`,
      area_name: neighborhood,
      borough,
      zip: null,
      neighborhood,
    };
  }

  if (borough) {
    return {
      area_key: `borough:${slugify(borough)}`,
      area_name: borough,
      borough,
      zip: null,
      neighborhood: null,
    };
  }

  return {
    area_key: "citywide:new-york-city",
    area_name: "New York City",
    borough: null,
    zip: null,
    neighborhood: null,
  };
}

function classifyTrade(text) {
  const value = String(text ?? "").toLowerCase();
  if (/\broof|reroof/.test(value)) return "roofing";
  if (/mechanical|hvac|air condition|cooling|heating|boiler/.test(value)) return "mechanical";
  if (/plumb|standpipe|sprinkler/.test(value)) return "plumbing";
  if (/electric|fire alarm/.test(value)) return "electrical";
  if (/demolition|demo/.test(value)) return "demolition";
  if (/solar/.test(value)) return "solar";
  if (/scaffold|shed|facade|façade|exterior|fence|curb|sidewalk/.test(value)) return "exterior";
  if (/alter|remodel|renov|kitchen|bath|general construction|addition|enlargement/.test(value)) return "remodel";
  if (/new building|new construction|\bnb\b/.test(value)) return "new_build";
  return "general";
}

function labelCategory(category) {
  const labels = {
    demolition: "demolition",
    electrical: "electrical",
    exterior: "exterior/facade",
    general: "general construction",
    mechanical: "mechanical/HVAC",
    new_build: "new construction",
    plumbing: "plumbing",
    remodel: "remodel/alteration",
    roofing: "roofing",
    solar: "solar",
  };
  return labels[category] ?? category;
}

function averageValue(area) {
  return area.recent_permit_volume ? area.project_value_total / area.recent_permit_volume : 0;
}

function growthRate(recent, previous) {
  if (!previous && recent) return 1;
  if (!previous) return 0;
  return (recent - previous) / previous;
}

function growthComponent(growth, previous) {
  if (!previous && growth > 0) return 18;
  if (growth >= 1) return 20;
  if (growth >= 0) return 12 + growth * 8;
  return Math.max(0, 12 + growth * 12);
}

function topEntries(counts) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    const group = map.get(key) ?? [];
    group.push(item);
    map.set(key, group);
  }
  return map;
}

function displayAreaName(area) {
  if (area.neighborhood) return titleCase(area.neighborhood);
  if (area.zip && area.borough) return `${area.borough} ZIP ${area.zip}`;
  if (area.zip) return `ZIP ${area.zip}`;
  return area.borough || area.area_name || "New York City";
}

function gradeForScore(score) {
  if (score >= 80) return "High";
  if (score >= 60) return "Good";
  if (score >= 40) return "Watch";
  return "Low";
}

function signalForScore(score) {
  if (score >= 80) return "Very high public signals";
  if (score >= 60) return "High public signals";
  if (score >= 40) return "Moderate public signals";
  return "Early public signals";
}

function formatGrowth(value) {
  if (value === 1) return "New signal baseline";
  const percent = Math.round(value * 100);
  return `${percent >= 0 ? "+" : ""}${percent}% activity`;
}

function compactCurrency(value) {
  if (!value) return "N/A";
  if (value >= 1000000) return `$${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${Math.round(value)}`;
}

function parseMoney(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function joinAddress(...parts) {
  return compactText(parts.filter(Boolean).join(" "));
}

function compactText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim() || null;
}

function cleanZip(value) {
  const match = String(value ?? "").match(/\d{5}/);
  return match ? match[0] : null;
}

function normalizeBorough(value) {
  const raw = compactText(value);
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (BOROUGH_CODES.has(upper)) return BOROUGH_CODES.get(upper);
  if (/MANHATTAN|NEW YORK/.test(upper)) return "Manhattan";
  if (/BRONX/.test(upper)) return "Bronx";
  if (/BROOKLYN|KINGS/.test(upper)) return "Brooklyn";
  if (/QUEENS/.test(upper)) return "Queens";
  if (/STATEN|RICHMOND/.test(upper)) return "Staten Island";
  return titleCase(raw);
}

function boroughFromCommunityBoard(value) {
  const raw = String(value ?? "").toUpperCase();
  if (/MANHATTAN/.test(raw)) return "Manhattan";
  if (/BRONX/.test(raw)) return "Bronx";
  if (/BROOKLYN|KINGS/.test(raw)) return "Brooklyn";
  if (/QUEENS/.test(raw)) return "Queens";
  if (/STATEN|RICHMOND/.test(raw)) return "Staten Island";
  return null;
}

function buildBbl(borough, block, lot) {
  if (!borough || !block || !lot) return null;
  const boroughCode = boroughToCode(borough);
  if (!boroughCode) return null;
  return `${boroughCode}${String(block).padStart(5, "0")}${String(lot).padStart(4, "0")}`;
}

function boroughToCode(value) {
  const borough = normalizeBorough(value);
  if (borough === "Manhattan") return "1";
  if (borough === "Bronx") return "2";
  if (borough === "Brooklyn") return "3";
  if (borough === "Queens") return "4";
  if (borough === "Staten Island") return "5";
  return null;
}

function isoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function scoreRecordConfidence({ address, date, description, zip }) {
  let score = 0.55;
  if (address) score += 0.12;
  if (zip) score += 0.1;
  if (date) score += 0.1;
  if (description) score += 0.08;
  return Number(Math.min(0.95, score).toFixed(2));
}

function titleCase(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function daysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
