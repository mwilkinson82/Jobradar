import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Database,
  Download,
  ExternalLink,
  FileText,
  Home,
  Layers3,
  LockKeyhole,
  Map as MapIcon,
  Navigation,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
  Bell,
  ListPlus,
  Check,
  X,
} from "lucide-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./App.css";

const NOT_AVAILABLE = "Not available in public source";

const navItems = [
  { id: "map", label: "Heat Map", icon: MapIcon },
  { id: "projects", label: "Projects", icon: FileText },
  { id: "companies", label: "Companies", icon: Users },
  { id: "properties", label: "Properties", icon: Home },
  { id: "areas", label: "Areas", icon: Layers3 },
  { id: "reports", label: "Packets", icon: ClipboardList },
];

const projectTypeOptions = [
  ["all", "All"],
  ["remodel", "Alteration / Renovation"],
  ["new_build", "New Building"],
  ["demolition", "Demolition"],
  ["mechanical", "Mechanical / HVAC"],
  ["electrical", "Electrical"],
  ["plumbing", "Plumbing"],
  ["exterior", "Facade / Exterior"],
  ["solar", "Solar"],
  ["general", "Other"],
];

const timeframeOptions = [
  ["30", "Last 30 days"],
  ["90", "Last 90 days"],
  ["180", "Last 180 days"],
  ["365", "Last 365 days"],
];

const minimumValueOptions = [
  ["0", "Any"],
  ["25000", "$25K+"],
  ["100000", "$100K+"],
  ["500000", "$500K+"],
  ["1000000", "$1M+"],
];

const moneyPathOptions = [
  {
    id: "projects",
    label: "Find projects to bid",
    shortLabel: "Project leads",
    summaryLabel: "Project signals in view",
    cta: "Build project + company packet",
    packetLabel: "Project + Company Packet",
    reportNoun: "project + company packet",
    mapTitle: "Project leads in the current map view",
    description: "Find active filings, scopes, values, and project players worth bidding or servicing.",
    audience: "Good for GCs, subs, estimators, expediters, and service firms.",
    action: "Filter by work type, value, status, and date, then build a source-backed list.",
  },
  {
    id: "companies",
    label: "Find companies to call",
    shortLabel: "Companies to call",
    summaryLabel: "Companies to call",
    cta: "Get company activity packet",
    packetLabel: "Company Activity Packet",
    reportNoun: "company activity packet",
    mapTitle: "Active companies in this area",
    description: "See contractors, applicants, owners, and project players appearing in recent public records.",
    audience: "Good for suppliers, distributors, manufacturers, reps, and B2B service providers.",
    action: "Start with visible companies, then turn related records into a territory call list.",
  },
  {
    id: "areas",
    label: "Find hot neighborhoods",
    shortLabel: "Hot neighborhoods",
    summaryLabel: "Hot zones in view",
    cta: "Create neighborhood intelligence packet",
    packetLabel: "Neighborhood Intelligence Packet",
    reportNoun: "neighborhood intelligence packet",
    mapTitle: "Neighborhoods heating up",
    description: "Spot where activity, project value, and permit categories are concentrating.",
    audience: "Good for brokers, real estate pros, contractors, suppliers, and local operators.",
    action: "Use hot zones to focus outreach, territory planning, or watchlists.",
  },
  {
    id: "properties",
    label: "Track repeat properties",
    shortLabel: "Repeat properties",
    summaryLabel: "Repeat properties to watch",
    cta: "Create property activity packet",
    packetLabel: "Property Activity Packet",
    reportNoun: "property activity packet",
    mapTitle: "Properties with repeat activity",
    description: "Find buildings with multiple records, related permits, source details, and activity patterns.",
    audience: "Good for property managers, investors, brokers, lenders, service firms, and compliance teams.",
    action: "Watch repeat-activity buildings and follow the companies connected to them.",
  },
  {
    id: "value",
    label: "Find high-value filings",
    shortLabel: "High-value work",
    summaryLabel: "High-value filings in view",
    cta: "View high-value project packet",
    packetLabel: "High-Value Project Packet",
    reportNoun: "high-value project packet",
    mapTitle: "High-value work moving now",
    description: "Find projects with larger declared values and the people attached to them.",
    audience: "Good for commercial subs, suppliers, brokers, developers, lenders, and deal teams.",
    action: "Prioritize high-value records and turn them into a source-backed project list.",
  },
];

const NYC_CENTER = [-73.975, 40.715];
const NYC_BOUNDS = [
  [-74.28, 40.47],
  [-73.68, 40.94],
];

const MAP_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const packetProducts = [
  ["Project + Company List", "Projects, values, companies, and source records"],
  ["Company Activity Packet", "Who is active, where, and in what categories"],
  ["Property Activity Packet", "Repeat buildings, related filings, and watchlists"],
  ["Territory Packet", "Area-level records, targets, exports, and actions"],
  ["Weekly Money Map / Heat Index", "Recurring changes, alerts, and hot zones"],
];

const workspaceItems = [
  ["My Packets", "Requested area, company, and property packets"],
  ["Saved Companies", "Contractors, applicants, owners, and project players"],
  ["Saved Properties", "Buildings with repeat or high-value activity"],
  ["Watchlist", "Areas, companies, properties, and project types to monitor"],
  ["Call List", "Outreach-ready project and company targets"],
  ["Exports", "CSV files and packet downloads"],
  ["Alerts", "New filings, repeat activity, and weekly heat changes"],
];

const BOROUGH_CENTERS = {
  Bronx: [-73.8801, 40.8448],
  Brooklyn: [-73.9442, 40.6782],
  Manhattan: [-73.9712, 40.7831],
  Queens: [-73.7949, 40.7282],
  "Staten Island": [-74.1502, 40.5795],
};

const ZIP_CENTERS = {
  "10001": [-73.9967, 40.7506],
  "10002": [-73.9874, 40.7159],
  "10003": [-73.9893, 40.7319],
  "10006": [-74.0132, 40.7084],
  "10007": [-74.0071, 40.7131],
  "10009": [-73.9786, 40.7264],
  "10011": [-74.0006, 40.742],
  "10013": [-74.0047, 40.7219],
  "10016": [-73.9782, 40.7466],
  "10017": [-73.9718, 40.7527],
  "10018": [-73.9925, 40.7547],
  "10019": [-73.9851, 40.7658],
  "10021": [-73.9588, 40.769],
  "10022": [-73.9687, 40.7585],
  "10023": [-73.9826, 40.7763],
  "10024": [-73.9763, 40.7864],
  "10025": [-73.9698, 40.7985],
  "10027": [-73.9532, 40.8116],
  "10029": [-73.9442, 40.7918],
  "10036": [-73.9895, 40.759],
  "10037": [-73.9371, 40.8134],
  "10038": [-74.0036, 40.7093],
  "10065": [-73.9631, 40.7651],
  "10128": [-73.9519, 40.7813],
  "10301": [-74.0944, 40.6318],
  "10304": [-74.0874, 40.6114],
  "10306": [-74.1179, 40.5691],
  "10307": [-74.2447, 40.5087],
  "10452": [-73.9217, 40.8372],
  "10457": [-73.8985, 40.8467],
  "10462": [-73.8616, 40.8436],
  "10465": [-73.8196, 40.8266],
  "10467": [-73.8711, 40.8732],
  "10473": [-73.8577, 40.8199],
  "10475": [-73.8274, 40.875],
  "11101": [-73.9396, 40.7447],
  "11102": [-73.9262, 40.7729],
  "11201": [-73.9903, 40.6955],
  "11204": [-73.9845, 40.618],
  "11208": [-73.8756, 40.676],
  "11209": [-74.031, 40.6264],
  "11215": [-73.9867, 40.6653],
  "11217": [-73.9799, 40.6824],
  "11218": [-73.9769, 40.6424],
  "11219": [-73.9966, 40.6338],
  "11226": [-73.9567, 40.6464],
  "11228": [-74.0112, 40.6177],
  "11230": [-73.9654, 40.622],
  "11354": [-73.827, 40.7675],
  "11355": [-73.8227, 40.7513],
  "11357": [-73.8062, 40.7857],
  "11358": [-73.7963, 40.7609],
  "11361": [-73.7747, 40.7623],
  "11364": [-73.7583, 40.7477],
  "11366": [-73.7956, 40.7289],
  "11377": [-73.9062, 40.7449],
  "11385": [-73.8896, 40.7026],
  "11417": [-73.8441, 40.6777],
  "11418": [-73.8359, 40.6997],
  "11432": [-73.7949, 40.715],
  "11691": [-73.7623, 40.6006],
  "11694": [-73.8429, 40.5766],
};

function App() {
  const [dataState, setDataState] = useState({
    status: "loading",
    heat: null,
    projects: null,
    topAreas: null,
    error: null,
  });
  const [activeSection, setActiveSection] = useState("map");
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [proModalOpen, setProModalOpen] = useState(false);
  const [mapFocus, setMapFocus] = useState(null);
  const [viewportStats, setViewportStats] = useState(null);
  const [tourActive, setTourActive] = useState(false);
  const [query, setQuery] = useState("");
  const [timeframe, setTimeframe] = useState("180");
  const [projectType, setProjectType] = useState("all");
  const [minimumValue, setMinimumValue] = useState("0");
  const [borough, setBorough] = useState("all");
  const [moneyPathId, setMoneyPathId] = useState("projects");
  const [mapResizeSignal, setMapResizeSignal] = useState(0);
  const mapSectionRef = useRef(null);
  const tourStartTimeoutRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [topAreas, heat, projects] = await Promise.all([
          fetchPublicJson("/data/nyc_top_areas.json"),
          fetchPublicJson("/data/nyc_construction_heat.json"),
          fetchPublicJson("/data/nyc_sample_projects.json"),
        ]);

        if (!cancelled) {
          setDataState({ status: "ready", heat, projects, topAreas, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setDataState((current) => ({ ...current, status: "error", error }));
        }
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (tourStartTimeoutRef.current) window.clearTimeout(tourStartTimeoutRef.current);
    };
  }, []);

  const heatAreas = dataState.heat?.areas ?? [];
  const rawTopAreas = dataState.topAreas?.areas ?? [];
  const rawProjects = dataState.projects?.projects ?? [];

  const projectCentroids = useMemo(() => buildProjectCentroids(rawProjects), [rawProjects]);

  const heatByArea = useMemo(() => {
    const map = new Map();
    heatAreas.forEach((area) => {
      if (area.area_key) map.set(area.area_key, area);
      if (area.zip) map.set(`zip:${area.zip}`, area);
    });
    return map;
  }, [heatAreas]);

  const areas = useMemo(() => {
    return rawTopAreas.map((area, index) => {
      const heat = heatByArea.get(`zip:${area.zip}`) ?? heatByArea.get(area.area_key) ?? {};
      return {
        ...area,
        ...heat,
        id: area.id,
        name: area.name,
        rank: area.rank ?? index + 1,
        zip: area.zip ?? heat.zip,
        score: heat.construction_heat_score ?? area.score,
        recordCount: heat.recent_permit_volume ?? area.homes ?? 0,
        declaredValue: heat.project_value_total ?? 0,
        activityGrowth: heat.recent_activity_growth,
        topCategories: heat.dominant_trade_categories ?? [],
        sourceCount: heat.source_count ?? 0,
        confidence: heat.confidence_score,
        coordinates: coordinateForArea({ ...area, ...heat }, index, projectCentroids),
      };
    });
  }, [heatByArea, projectCentroids, rawTopAreas]);

  const areaLookup = useMemo(() => {
    const lookup = new Map();
    areas.forEach((area) => {
      if (area.area_key) lookup.set(area.area_key, area);
      if (area.zip) lookup.set(`zip:${area.zip}`, area);
      if (area.name) lookup.set(`name:${area.name}`, area);
    });
    return lookup;
  }, [areas]);

  const allProjects = useMemo(
    () => rawProjects.map((project, index) => ({
      ...project,
      coordinates: coordinateForProject(project, index, areaLookup),
    })),
    [areaLookup, rawProjects],
  );

  useEffect(() => {
    if (!selectedAreaId && areas.length) {
      setSelectedAreaId(areas[0].id);
    }
  }, [areas, selectedAreaId]);

  const selectedArea = areas.find((area) => area.id === selectedAreaId) ?? areas[0];

  const boroughOptions = useMemo(() => {
    const boroughs = new Set(heatAreas.map((area) => area.borough).filter(Boolean));
    return ["all", ...Array.from(boroughs).sort()];
  }, [heatAreas]);

  const filteredProjects = useMemo(() => {
    const minValue = Number(minimumValue);
    const queryText = query.trim().toLowerCase();
    const maxProjectDate = latestProjectDate(allProjects);
    const sinceDate = new Date(maxProjectDate);
    sinceDate.setUTCDate(sinceDate.getUTCDate() - Number(timeframe));

    return allProjects.filter((project) => {
      const matchesType = projectType === "all" || project.trade_category === projectType;
      const matchesValue = (project.declared_value ?? 0) >= minValue;
      const matchesBorough = borough === "all" || project.borough === borough;
      const matchesTimeframe = !project.date || new Date(project.date) >= sinceDate;
      const matchesQuery =
        !queryText ||
        [
          project.address,
          project.area_name,
          project.borough,
          project.zip,
          project.contractor_name,
          project.description,
          project.permit_number,
          project.project_id,
          project.source_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(queryText);

      return matchesType && matchesValue && matchesBorough && matchesTimeframe && matchesQuery;
    });
  }, [allProjects, borough, minimumValue, projectType, query, timeframe]);

  const selectedAreaProjects = useMemo(() => {
    if (!selectedArea) return [];
    return filteredProjects.filter((project) => projectMatchesArea(project, selectedArea));
  }, [filteredProjects, selectedArea]);

  const previewProjects = selectedAreaProjects.length
    ? selectedAreaProjects.slice(0, 8)
    : filteredProjects.slice(0, 8);

  const companies = useMemo(() => deriveCompanies(allProjects), [allProjects]);
  const selectedAreaCompanies = useMemo(
    () => deriveCompanies(selectedAreaProjects),
    [selectedAreaProjects],
  );
  const properties = useMemo(() => deriveProperties(allProjects), [allProjects]);

  const citySummary = useMemo(() => deriveCitySummary(heatAreas, allProjects), [heatAreas, allProjects]);
  const lockedCount = selectedArea
    ? Math.max(0, selectedArea.recordCount - selectedAreaProjects.length)
    : 0;
  const moneyPath = moneyPathOptions.find((path) => path.id === moneyPathId) ?? moneyPathOptions[0];
  const querySummary = useMemo(
    () => buildQuerySummary(query, filteredProjects, areas),
    [areas, filteredProjects, query],
  );

  function viewSection(sectionId) {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const selectArea = useCallback((area, options = {}) => {
    setSelectedAreaId(area.id);
    setSelectedProject(null);
    setMapFocus({ type: "area", id: area.id, coordinates: area.coordinates, zoom: options.zoom ?? 13.2 });
    if (options.openModal) setAreaModalOpen(true);
  }, []);

  const selectProject = useCallback((project) => {
    setSelectedProject(project);
    setMapFocus({ type: "project", id: project.project_id, coordinates: project.coordinates, zoom: 15.4 });
  }, []);

  const handleViewportStats = useCallback((stats) => {
    setViewportStats((current) => (sameViewportStats(current, stats) ? current : stats));
  }, []);

  function runSearch() {
    const queryText = query.trim().toLowerCase();
    if (!queryText) {
      if (selectedArea) setMapFocus({ type: "area", id: selectedArea.id, coordinates: selectedArea.coordinates, zoom: 12.8 });
      return;
    }

    const areaMatch = areas.find((area) => [
      area.name,
      area.zip,
      area.borough,
      categorySentence(area.topCategories),
    ].filter(Boolean).join(" ").toLowerCase().includes(queryText));

    if (areaMatch) {
      selectArea(areaMatch, { zoom: 13.2 });
      return;
    }

    const projectMatch = filteredProjects[0];
    if (projectMatch) {
      selectProject(projectMatch);
      const areaMatchForProject = areas.find((area) => projectMatchesArea(projectMatch, area));
      if (areaMatchForProject) setSelectedAreaId(areaMatchForProject.id);
    }
  }

  function startHotspotTour() {
    setQuery("");
    setSelectedProject(null);
    setTourActive(false);
    mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (tourStartTimeoutRef.current) window.clearTimeout(tourStartTimeoutRef.current);
    tourStartTimeoutRef.current = window.setTimeout(() => {
      setMapResizeSignal((signal) => signal + 1);
      const first = areas[0];
      if (first) selectArea(first, { zoom: 12.8 });
      setTourActive(true);
    }, 620);
  }

  useEffect(() => {
    if (!tourActive || !areas.length) return undefined;
    let index = 0;
    const tourAreas = areas.slice(0, 5);
    const timer = window.setInterval(() => {
      index += 1;
      if (index >= tourAreas.length) {
        setTourActive(false);
        window.clearInterval(timer);
        return;
      }
      selectArea(tourAreas[index], { zoom: 13.1 });
    }, 1700);

    return () => window.clearInterval(timer);
  }, [areas, selectArea, tourActive]);

  if (dataState.status === "loading") {
    return <LoadingScreen />;
  }

  if (dataState.status === "error") {
    return <ErrorScreen error={dataState.error} />;
  }

  return (
    <div className="ci-shell">
      <Sidebar activeSection={activeSection} onNavigate={viewSection} />
      <main className="ci-main">
        <Hero
          citySummary={citySummary}
          lockedCount={lockedCount}
          moneyPath={moneyPath}
          onMoneyPathChange={setMoneyPathId}
          onOpenReport={() => setProModalOpen(true)}
          onQueryChange={setQuery}
          onSearch={runSearch}
          onTour={startHotspotTour}
          query={query}
          querySummary={querySummary}
          tourActive={tourActive}
        />

        <div className="workspace-grid">
          <section className="workspace-primary">
            <section className="section-panel map-section" id="map" ref={mapSectionRef} aria-labelledby="map-title">
              <MapExplorer
                areas={areas}
                focusTarget={mapFocus}
                mapResizeSignal={mapResizeSignal}
                moneyPath={moneyPath}
                onOpenReport={() => setProModalOpen(true)}
                onProjectClick={selectProject}
                onSelectArea={(area) => selectArea(area)}
                onTour={startHotspotTour}
                onViewportStats={handleViewportStats}
                projects={filteredProjects}
                selectedArea={selectedArea}
                selectedAreaCompanies={selectedAreaCompanies}
                selectedAreaProjects={selectedAreaProjects}
                tourActive={tourActive}
                viewportStats={viewportStats}
              />
            </section>

            <Filters
              borough={borough}
              boroughOptions={boroughOptions}
              minimumValue={minimumValue}
              projectType={projectType}
              setBorough={setBorough}
              setMinimumValue={setMinimumValue}
              setProjectType={setProjectType}
              setTimeframe={setTimeframe}
              timeframe={timeframe}
            />

            <WorkspacePreview />

            <PreviewBlock
              areaProjects={selectedAreaProjects}
              lockedCount={lockedCount}
              moneyPath={moneyPath}
              onOpenReport={() => setProModalOpen(true)}
              onProjectClick={selectProject}
              projects={previewProjects}
              selectedArea={selectedArea}
            />

            <ProjectsTable
              lockedCount={lockedCount}
              moneyPath={moneyPath}
              noAreaMatches={!selectedAreaProjects.length}
              onOpenReport={() => setProModalOpen(true)}
              onProjectClick={selectProject}
              projects={previewProjects}
              selectedArea={selectedArea}
              totalFiltered={filteredProjects.length}
            />

            <CompaniesSection
              companies={selectedAreaCompanies.length ? selectedAreaCompanies : companies.slice(0, 6)}
              isAreaSpecific={Boolean(selectedAreaCompanies.length)}
              moneyPath={moneyPath}
              onCompanyClick={setSelectedCompany}
              onOpenReport={() => setProModalOpen(true)}
              selectedArea={selectedArea}
            />

            <PropertiesSection
              moneyPath={moneyPath}
              onOpenReport={() => setProModalOpen(true)}
              properties={properties.slice(0, 6)}
            />

            <AreasSection
              areas={areas}
              onSelectArea={(area) => selectArea(area, { openModal: true })}
              selectedArea={selectedArea}
            />

            <MoneyExplainer moneyPath={moneyPath} />

            <ReportsSection moneyPath={moneyPath} onOpenReport={() => setProModalOpen(true)} selectedArea={selectedArea} />
          </section>
        </div>

        <TrustFooter generatedAt={dataState.heat?.generated_at} />
      </main>

      {areaModalOpen && selectedArea ? (
        <AreaModal
          companies={selectedAreaCompanies}
          lockedCount={lockedCount}
          moneyPath={moneyPath}
          onClose={() => setAreaModalOpen(false)}
          onOpenReport={() => setProModalOpen(true)}
          onProjectClick={setSelectedProject}
          projects={selectedAreaProjects}
          selectedArea={selectedArea}
        />
      ) : null}

      {selectedProject ? (
        <ProjectModal
          moneyPath={moneyPath}
          onClose={() => setSelectedProject(null)}
          onOpenReport={() => setProModalOpen(true)}
          project={selectedProject}
        />
      ) : null}

      {selectedCompany ? (
        <CompanyModal
          company={selectedCompany}
          moneyPath={moneyPath}
          onClose={() => setSelectedCompany(null)}
          onOpenReport={() => setProModalOpen(true)}
        />
      ) : null}

      {proModalOpen ? (
        <ProAccessModal moneyPath={moneyPath} onClose={() => setProModalOpen(false)} selectedArea={selectedArea} />
      ) : null}
    </div>
  );
}

function Sidebar({ activeSection, onNavigate }) {
  return (
    <aside className="ci-sidebar" aria-label="Product navigation">
      <div className="brand-lockup">
        <span className="brand-mark"><Building2 aria-hidden="true" /></span>
        <div>
          <strong>NYC Construction Intelligence</strong>
          <small>Public-record beta</small>
        </div>
      </div>
      <nav>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={activeSection === item.id ? "active" : ""}
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="sidebar-source">
        <Database aria-hidden="true" />
        <span>DOB / NYC Open Data / PLUTO</span>
      </div>
    </aside>
  );
}

function Hero({
  citySummary,
  moneyPath,
  onMoneyPathChange,
  onQueryChange,
  onSearch,
  onTour,
  query,
  querySummary,
  tourActive,
}) {
  return (
    <header className="intel-header">
      <div className="header-copy">
        <h1>Find NYC construction projects, companies to call, and hot zones.</h1>
        <p>
          Use the map to find activity, see who is behind it, and build source-backed project/company/property packets.
        </p>
      </div>
      <form className="search-panel" onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}>
        <label htmlFor="intel-search">Search address, company, ZIP, neighborhood, permit ID...</label>
        <div className="search-box">
          <Search aria-hidden="true" />
          <input
            id="intel-search"
            placeholder="Chelsea, 10018, BR Construction Group, permit number..."
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <button type="submit">Search</button>
        </div>
        {querySummary ? (
          <div className="search-result-line">
            We found {number(querySummary.records)} records matching “{querySummary.query}”.
          </div>
        ) : null}
      </form>
      <div className="found-panel" aria-label="What we found">
        <Metric label="Project signals" value={number(citySummary.records)} />
        <Metric label="Money moving" value={compactCurrency(citySummary.value)} />
        <Metric label="Companies" value={number(citySummary.companyCount)} />
        <Metric label="Hot zones" value={number(citySummary.areaCount)} />
      </div>
      <div className="money-path-panel" aria-label="Choose your money path">
        <div className="money-path-heading">
          <span>Choose your money path</span>
          <strong>{moneyPath.mapTitle}</strong>
        </div>
        <div className="money-path-grid">
          {moneyPathOptions.map((path) => (
            <button
              className={`money-path-card ${moneyPath.id === path.id ? "active" : ""}`}
              key={path.id}
              type="button"
              onClick={() => onMoneyPathChange(path.id)}
            >
              <strong>{path.label}</strong>
              <span>{path.description}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="packet-product-strip" aria-label="Packet products">
        {packetProducts.map(([label, copy]) => (
          <article key={label}>
            <CheckCircle2 aria-hidden="true" />
            <div>
              <strong>{label}</strong>
              <span>{copy}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="command-actions">
        <button className="secondary-action" type="button" onClick={onTour}>
          <Play aria-hidden="true" />
          {tourActive ? "Touring hotspots" : "Tour this week's hotspots"}
        </button>
        <button className="secondary-action" type="button" onClick={onSearch}>
          <Target aria-hidden="true" />
          View current search on map
        </button>
      </div>
    </header>
  );
}

function Filters({
  borough,
  boroughOptions,
  minimumValue,
  projectType,
  setBorough,
  setMinimumValue,
  setProjectType,
  setTimeframe,
  timeframe,
}) {
  return (
    <section className="filter-bar" aria-label="Construction intelligence filters">
      <Field label="Market">
        <select value="New York City" disabled>
          <option>New York City</option>
        </select>
      </Field>
      <Field label="View">
        <select value="Construction Activity" disabled>
          <option>Construction Activity</option>
        </select>
      </Field>
      <Field label="Timeframe">
        <select value={timeframe} onChange={(event) => setTimeframe(event.target.value)}>
          {timeframeOptions.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </Field>
      <Field label="Project Type">
        <select value={projectType} onChange={(event) => setProjectType(event.target.value)}>
          {projectTypeOptions.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </Field>
      <Field label="Minimum Value">
        <select value={minimumValue} onChange={(event) => setMinimumValue(event.target.value)}>
          {minimumValueOptions.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </Field>
      <Field label="Borough">
        <select value={borough} onChange={(event) => setBorough(event.target.value)}>
          {boroughOptions.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "All boroughs" : option}
            </option>
          ))}
        </select>
      </Field>
    </section>
  );
}

function MapExplorer({
  areas,
  focusTarget,
  mapResizeSignal,
  moneyPath,
  onOpenReport,
  onProjectClick,
  onSelectArea,
  onTour,
  onViewportStats,
  projects,
  selectedArea,
  selectedAreaCompanies,
  selectedAreaProjects,
  tourActive,
  viewportStats,
}) {
  const recordsInView = viewportStats?.records ?? projects.length;
  const valueInView = viewportStats?.value ?? projects.reduce((sum, project) => sum + (project.declared_value ?? 0), 0);
  const hottestArea = viewportStats?.hottestArea ?? selectedArea;
  const companiesInView = viewportStats?.companies ?? new Set(projects.map((project) => project.contractor_name).filter(Boolean)).size;

  return (
    <div className="map-explorer">
      <div className="map-loop-strip">
        <strong>How this turns into money</strong>
        <span>Find activity</span>
        <span>See who is behind it</span>
        <span>Build the packet and act</span>
      </div>
      <div className="map-toolbar">
        <div>
          <span>Live money map</span>
          <h2>{moneyPath.mapTitle}</h2>
          <p>{moneyPath.action}</p>
        </div>
        <button className="secondary-action" type="button" onClick={onTour}>
          <Navigation aria-hidden="true" />
          {tourActive ? "Tour running" : "Tour this week's hotspots"}
        </button>
      </div>
      <div className="map-live-summary">
        <PreviewMetric label={moneyPath.summaryLabel} value={number(recordsInView)} />
        <PreviewMetric label="Declared value in view" value={compactCurrency(valueInView)} />
        <PreviewMetric label="Companies found" value={number(companiesInView)} />
        <PreviewMetric label="Hottest area in view" value={hottestArea?.name ?? "NYC"} />
      </div>
      <div className="map-stage">
        <InteractiveNycMap
          areas={areas}
          focusTarget={focusTarget}
          mapResizeSignal={mapResizeSignal}
          onProjectClick={onProjectClick}
          onSelectArea={onSelectArea}
          onViewportStats={onViewportStats}
          projects={projects}
          selectedArea={selectedArea}
        />
        <SelectedReportPreview
          companies={selectedAreaCompanies}
          moneyPath={moneyPath}
          onOpenReport={onOpenReport}
          projects={selectedAreaProjects}
          selectedArea={selectedArea}
        />
      </div>
      <RecordsDrawer
        lockedCount={selectedArea ? Math.max(0, selectedArea.recordCount - selectedAreaProjects.length) : 0}
        moneyPath={moneyPath}
        onOpenReport={onOpenReport}
        onProjectClick={onProjectClick}
        projects={selectedAreaProjects.length ? selectedAreaProjects : projects.slice(0, 12)}
        selectedArea={selectedArea}
      />
    </div>
  );
}

function InteractiveNycMap({
  areas,
  focusTarget,
  mapResizeSignal,
  onProjectClick,
  onSelectArea,
  onViewportStats,
  projects,
  selectedArea,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const latestDataRef = useRef({ areas: [], projects: [] });

  useEffect(() => {
    latestDataRef.current = { areas, projects };
  }, [areas, projects]);

  const updateViewportStats = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = map.getBounds();
    const { areas: currentAreas, projects: currentProjects } = latestDataRef.current;
    const projectsInView = currentProjects.filter((project) => coordinateInBounds(project.coordinates, bounds));
    const areasInView = currentAreas.filter((area) => coordinateInBounds(area.coordinates, bounds));
    const hottestArea = areasInView.sort((a, b) => b.score - a.score)[0] ?? currentAreas[0];
    const companies = new Set(projectsInView.map((project) => project.contractor_name).filter(Boolean));
    onViewportStats({
      companies: companies.size,
      hottestArea,
      records: projectsInView.length,
      value: projectsInView.reduce((sum, project) => sum + (project.declared_value ?? 0), 0),
    });
  }, [onViewportStats]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const map = new maplibregl.Map({
      attributionControl: false,
      center: NYC_CENTER,
      container: containerRef.current,
      maxBounds: NYC_BOUNDS,
      maxZoom: 17,
      minZoom: 9,
      pitch: 0,
      style: MAP_STYLE,
      zoom: 10.2,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.on("load", updateViewportStats);
    map.on("moveend", updateViewportStats);
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [updateViewportStats]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    areas.slice(0, 35).forEach((area) => {
      if (!area.coordinates) return;
      const markerElement = document.createElement("button");
      markerElement.type = "button";
      markerElement.className = `area-map-marker ${selectedArea?.id === area.id ? "selected" : ""}`;
      markerElement.style.setProperty("--marker-size", `${Math.max(34, Math.min(72, area.score))}px`);
      markerElement.innerHTML = `<span>${area.score}</span>`;
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 18 })
        .setHTML(`<strong>${escapeHtml(area.name)}</strong><br>${number(area.recordCount)} records · ${compactCurrency(area.declaredValue)}`);
      markerElement.addEventListener("mouseenter", () => popup.setLngLat(area.coordinates).addTo(map));
      markerElement.addEventListener("mouseleave", () => popup.remove());
      markerElement.addEventListener("click", () => onSelectArea(area));
      markersRef.current.push(new maplibregl.Marker({ element: markerElement }).setLngLat(area.coordinates).addTo(map));
    });

    projects.slice(0, 120).forEach((project) => {
      if (!project.coordinates) return;
      const markerElement = document.createElement("button");
      markerElement.type = "button";
      markerElement.className = `project-map-marker ${project.trade_category || "general"}`;
      markerElement.title = project.address || "Project record";
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14 })
        .setHTML(`<strong>${escapeHtml(project.address || "Project record")}</strong><br>${escapeHtml(categoryLabel(project.trade_category))} · ${project.declared_value_label || "N/A"}`);
      markerElement.addEventListener("mouseenter", () => popup.setLngLat(project.coordinates).addTo(map));
      markerElement.addEventListener("mouseleave", () => popup.remove());
      markerElement.addEventListener("click", () => onProjectClick(project));
      markersRef.current.push(new maplibregl.Marker({ element: markerElement }).setLngLat(project.coordinates).addTo(map));
    });

    updateViewportStats();
  }, [areas, onProjectClick, onSelectArea, projects, selectedArea, updateViewportStats]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusTarget?.coordinates) return;
    map.flyTo({
      center: focusTarget.coordinates,
      duration: 850,
      essential: true,
      zoom: focusTarget.zoom ?? 13,
    });
  }, [focusTarget]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapResizeSignal) return;
    window.requestAnimationFrame(() => {
      map.resize();
      updateViewportStats();
    });
  }, [mapResizeSignal, updateViewportStats]);

  return (
    <div className="map-shell">
      <div className="map-canvas" ref={containerRef} />
      <div className="map-disclaimer">
        Map positions use DOB coordinates when available; otherwise ZIP/neighborhood centroids are used for this public preview.
      </div>
    </div>
  );
}

function SelectedReportPreview({ companies, moneyPath, onOpenReport, projects, selectedArea }) {
  if (!selectedArea) return null;
  const topCompany = companies[0]?.name ?? "Company list available in packet";
  const topProperty = projects[0]?.address ?? "Property list available in packet";

  return (
    <aside className="map-report-panel">
      <span>Selected opportunity</span>
      <h2>{selectedArea.name}</h2>
      <dl>
        <div>
          <dt>Records found</dt>
          <dd>{number(selectedArea.recordCount)}</dd>
        </div>
        <div>
          <dt>Declared value</dt>
          <dd>{compactCurrency(selectedArea.declaredValue)}</dd>
        </div>
        <div>
          <dt>Companies visible</dt>
          <dd>{number(companies.length)}</dd>
        </div>
        <div>
          <dt>Top categories</dt>
          <dd>{categorySentence(selectedArea.topCategories)}</dd>
        </div>
        <div>
          <dt>Top company</dt>
          <dd>{topCompany}</dd>
        </div>
        <div>
          <dt>Top property</dt>
          <dd>{topProperty}</dd>
        </div>
      </dl>
      <div className="ways-to-use">
        <h3>Ways to use this area</h3>
        <ul>
          <li><strong>Call active companies</strong><span>See contractors, applicants, owners, and project players tied to recent filings.</span></li>
          <li><strong>Find projects to bid or service</strong><span>Filter by work type, value, status, and date.</span></li>
          <li><strong>Watch repeat-activity properties</strong><span>Find buildings with multiple permits or project activity.</span></li>
          <li><strong>Track high-value filings</strong><span>Use declared values to prioritize the records worth attention.</span></li>
        </ul>
      </div>
      <OpportunityBreakdown categories={selectedArea.topCategories} />
      <button className="primary-action" type="button" onClick={onOpenReport}>
        <LockKeyhole aria-hidden="true" />
        {moneyPath.cta}
      </button>
    </aside>
  );
}

function RecordsDrawer({ lockedCount, moneyPath, onOpenReport, onProjectClick, projects, selectedArea }) {
  return (
    <div className="records-drawer">
      <div>
        <span>Records in current map view</span>
        <h3>{moneyPath.shortLabel}: {projects.slice(0, 8).length} free of {number(selectedArea?.recordCount ?? projects.length)}</h3>
      </div>
      <div className="drawer-records">
        {projects.slice(0, 8).map((project) => (
          <button key={`${project.project_id}-${project.permit_number}`} type="button" onClick={() => onProjectClick(project)}>
            <strong>{project.address || "Address not provided"}</strong>
            <span>{categoryLabel(project.trade_category)} · {project.declared_value_label || "N/A"} · {project.contractor_name || "Company in packet"}</span>
          </button>
        ))}
      </div>
      {lockedCount > 0 ? (
        <button className="drawer-lock" type="button" onClick={onOpenReport}>
          <LockKeyhole aria-hidden="true" />
          {number(lockedCount)} more records found - {moneyPath.cta.toLowerCase()}
        </button>
      ) : null}
    </div>
  );
}

function PreviewBlock({ areaProjects, lockedCount, moneyPath, onOpenReport, onProjectClick, projects, selectedArea }) {
  if (!selectedArea) return null;
  const visibleCount = areaProjects.length;
  const previewRecords = areaProjects.length ? areaProjects.slice(0, 3) : projects.slice(0, 3);

  return (
    <section className="preview-block" aria-label="Free intelligence preview">
      <div className="preview-copy">
        <h2>{selectedArea.name}: {number(selectedArea.recordCount)} project signals you can act on.</h2>
        <p>
          {compactCurrency(selectedArea.declaredValue)} in declared project value, {categorySentence(selectedArea.topCategories)},
          and {trendText(selectedArea.activityGrowth)} versus the prior period. Use it to find who to call, what to bid,
          and which properties to watch.
        </p>
      </div>
      <div className="preview-proof">
        <PreviewMetric label={`Free preview: ${number(visibleCount || previewRecords.length)} records`} value={`${number(visibleCount || previewRecords.length)} visible`} />
        <PreviewMetric label="Packet records" value={number(lockedCount)} />
        <PreviewMetric label="Source coverage" value={`${selectedArea.sourceCount || 1} sources`} />
      </div>
      <div className="mini-records">
        {previewRecords.map((project) => (
          <button key={project.project_id} type="button" onClick={() => onProjectClick(project)}>
            <strong>{project.address}</strong>
            <span>{categoryLabel(project.trade_category)} / {project.declared_value_label || NOT_AVAILABLE}</span>
          </button>
        ))}
      </div>
      <button className="primary-action" type="button" onClick={onOpenReport}>
        <LockKeyhole aria-hidden="true" />
        {moneyPath.cta}
      </button>
    </section>
  );
}

function OpportunityBreakdown({ categories = [] }) {
  const visibleCategories = categories.slice(0, 4);
  if (!visibleCategories.length) return null;

  return (
    <div className="sell-opportunity">
      <h3>What can be sold here?</h3>
      <ul>
        {visibleCategories.map(([category, count]) => (
          <li key={category}>
            <strong>{categoryLabel(category)}</strong>
            <span>{number(count)} records - {salesAngle(category)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProjectsTable({
  lockedCount,
  moneyPath,
  noAreaMatches,
  onOpenReport,
  onProjectClick,
  projects,
  selectedArea,
  totalFiltered,
}) {
  return (
    <section className="section-panel" id="projects" aria-labelledby="projects-title">
      <SectionTitle
        eyebrow="Project / Permit Records"
        title={`Free preview: ${projects.length} of ${number(selectedArea?.recordCount ?? projects.length)} records`}
        copy={`Sample DOB permit and filing records are visible for free. The complete ${moneyPath.reportNoun} adds source links, exports, related records, and outreach context.`}
      />

      {noAreaMatches ? (
        <div className="source-warning">
          No exact sample rows for {selectedArea?.name} are included in the free preview. Showing latest NYC records.
          The packet includes the selected area&apos;s full record list.
        </div>
      ) : null}

      <div className="record-count-row">
        <span>{projects.length} visible rows</span>
        <span>{number(totalFiltered)} records match current filters in the preview file</span>
      </div>

      <div className="records-table-wrap">
        <table className="records-table">
          <thead>
            <tr>
              <th>Address</th>
              <th>Date</th>
              <th>Project / work type</th>
              <th>Status</th>
              <th>Declared value</th>
              <th>Company / applicant / contractor</th>
              <th>Permit / filing ID</th>
              <th>Source</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.project_id}>
                <td>
                  <strong>{project.address || NOT_AVAILABLE}</strong>
                  <small>{project.borough || NOT_AVAILABLE} {project.zip ? `/ ${project.zip}` : ""}</small>
                </td>
                <td>{project.date || NOT_AVAILABLE}</td>
                <td>{categoryLabel(project.trade_category)}</td>
                <td>{project.status || NOT_AVAILABLE}</td>
                <td>{project.declared_value_label || NOT_AVAILABLE}</td>
                <td>{project.contractor_name || NOT_AVAILABLE}</td>
                <td>{project.permit_number || project.project_id || NOT_AVAILABLE}</td>
                <td>{project.source_name || NOT_AVAILABLE}</td>
                <td>
                  <button className="text-action" type="button" onClick={() => onProjectClick(project)}>
                    View
                    <ExternalLink aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
            {lockedCount > 0 ? (
              <tr className="locked-row">
                <td colSpan="9">
                  <LockKeyhole aria-hidden="true" />
                  {number(lockedCount)} more public records found in this area - {moneyPath.cta.toLowerCase()}.
                  <button type="button" onClick={onOpenReport}>Get packet</button>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CompaniesSection({ companies, isAreaSpecific, moneyPath, onCompanyClick, onOpenReport, selectedArea }) {
  return (
    <section className="section-panel" id="companies" aria-labelledby="companies-title">
      <SectionTitle
        eyebrow="Sales Targets"
        title={isAreaSpecific ? `Companies to call in ${selectedArea.name}` : "Companies to call in the free NYC preview"}
        copy="These companies appear in recent public construction records. The full packet adds source links, activity patterns, exportable contact research, and list-building context."
      />
      <div className="company-grid">
        {companies.slice(0, 6).map((company) => (
          <article className="company-row" key={company.name}>
            <button className="entity-main-button" type="button" onClick={() => onCompanyClick(company)}>
              <div>
                <strong>{company.name}</strong>
                <small>{company.role}</small>
              </div>
              <dl>
                <div>
                  <dt>Records</dt>
                  <dd>{number(company.records)}</dd>
                </div>
                <div>
                  <dt>Value</dt>
                  <dd>{compactCurrency(company.value)}</dd>
                </div>
                <div>
                  <dt>Trend</dt>
                  <dd>{company.trend}</dd>
                </div>
              </dl>
            </button>
            <WorkflowActions context={company.name} />
          </article>
        ))}
      </div>
      {!isAreaSpecific ? (
        <div className="locked-note">
          Area-specific company ranking for {selectedArea?.name} is included in the {moneyPath.packetLabel} when the free preview does not expose enough rows.
          <button type="button" onClick={onOpenReport}>{moneyPath.cta}</button>
        </div>
      ) : null}
    </section>
  );
}

function PropertiesSection({ moneyPath, onOpenReport, properties }) {
  return (
    <section className="section-panel" id="properties" aria-labelledby="properties-title">
      <SectionTitle
        eyebrow="Properties"
        title="Repeat-activity property preview"
        copy="The current public preview shows recent project addresses. BBL/BIN, PLUTO parcel context, related records, and watchlist context are packaged in the property activity packet."
      />
      <div className="property-list">
        {properties.map((property) => (
          <article className="property-row" key={property.address}>
            <div>
              <strong>{property.address}</strong>
              <small>{property.area || NOT_AVAILABLE}</small>
            </div>
            <dl>
              <div>
                <dt>Preview records</dt>
                <dd>{number(property.records)}</dd>
              </div>
              <div>
                <dt>Declared value</dt>
                <dd>{compactCurrency(property.value)}</dd>
              </div>
            </dl>
            <div className="entity-actions-cell">
              <button className="text-action" type="button" onClick={onOpenReport}>
                {moneyPath.id === "properties" ? moneyPath.cta : "Create property activity packet"}
                <ExternalLink aria-hidden="true" />
              </button>
              <WorkflowActions compact context={property.address} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AreasSection({ areas, onSelectArea, selectedArea }) {
  return (
    <section className="section-panel" id="areas" aria-labelledby="areas-title">
      <SectionTitle
        eyebrow="Hot Areas"
        title="Neighborhood and ZIP intelligence"
        copy="Each hot area has a score, activity volume, declared value, growth, source coverage, and a packet/list path."
      />
      <div className="area-grid">
        {areas.slice(0, 8).map((area) => (
          <article
            className={`area-tile ${selectedArea?.id === area.id ? "selected" : ""}`}
            key={area.id}
          >
            <button className="entity-main-button area-main-button" type="button" onClick={() => onSelectArea(area)}>
              <span>#{area.rank}</span>
              <strong>{area.name}</strong>
              <small>{area.borough || "NYC"} / ZIP {area.zip}</small>
              <dl>
                <div>
                  <dt>Heat</dt>
                  <dd>{area.score}</dd>
                </div>
                <div>
                  <dt>Records</dt>
                  <dd>{number(area.recordCount)}</dd>
                </div>
                <div>
                  <dt>Value</dt>
                  <dd>{compactCurrency(area.declaredValue)}</dd>
                </div>
                <div>
                  <dt>Trend</dt>
                  <dd>{trendText(area.activityGrowth)}</dd>
                </div>
              </dl>
              <em>View intelligence</em>
            </button>
            <WorkflowActions compact context={area.name} />
          </article>
        ))}
      </div>
    </section>
  );
}

function MoneyExplainer({ moneyPath }) {
  return (
    <section className="section-panel money-explainer" aria-labelledby="money-explainer-title">
      <SectionTitle
        eyebrow="How this turns into money"
        title="Find the activity, see who is behind it, then build the packet."
        copy={`${moneyPath.description} ${moneyPath.audience}`}
      />
      <div className="money-step-grid">
        <article>
          <strong>1. Find where activity is happening</strong>
          <p>Use the map, filters, and tour to see where records, value, companies, and hot zones are clustering.</p>
        </article>
        <article>
          <strong>2. See the projects and companies behind it</strong>
          <p>Open project details, preview active companies, and identify properties with recent public construction activity.</p>
        </article>
        <article>
          <strong>3. Build the packet and act</strong>
          <p>Export the list, build outreach, create a watchlist, or turn the area into a weekly territory brief.</p>
        </article>
      </div>
    </section>
  );
}

function ReportsSection({ moneyPath, onOpenReport, selectedArea }) {
  const reports = [
    ["Project + Company List", "All records, values, descriptions, source links, and active companies for the area."],
    ["Company Activity Packet", "Active companies, where they are working, work categories, source records, and trend direction."],
    ["Property Activity Packet", "Buildings with repeat activity, permits, values, source links, and related records."],
    ["Territory Packet", "Area-level records, companies, properties, exports, watchlists, and outreach context."],
    ["Weekly NYC Money Map / Heat Index", "Recurring monitor for hot zones, record spikes, high-value filings, and watchlist changes."],
  ];

  return (
    <section className="section-panel report-section" id="reports" aria-labelledby="reports-title">
      <SectionTitle
        eyebrow="Packets"
        title={`Build the ${selectedArea?.name ?? "NYC"} ${moneyPath.packetLabel}`}
        copy={`Start with the ${selectedArea?.name ?? "NYC"} packet, then expand to companies, properties, exports, and weekly watchlists.`}
      />
      <div className="report-options">
        {reports.map(([title, copy]) => (
          <article key={title}>
            <CheckCircle2 aria-hidden="true" />
            <div>
              <strong>{title}</strong>
              <p>{copy}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="report-actions">
        <button className="primary-action" type="button" onClick={onOpenReport}>
          <LockKeyhole aria-hidden="true" />
          {moneyPath.cta}
        </button>
        <button className="secondary-action" type="button" onClick={onOpenReport}>
          What happens after I pay?
        </button>
      </div>
    </section>
  );
}

function WorkspacePreview() {
  return (
    <section className="section-panel workspace-preview" aria-labelledby="workspace-preview-title">
      <div className="workspace-preview-copy">
        <span>Action workspace preview</span>
        <h2 id="workspace-preview-title">Build the packet, then work the list.</h2>
        <p>After a packet is requested, the same intelligence becomes saved lists, watchlists, exports, and alerts.</p>
      </div>
      <div className="workspace-preview-grid">
        {workspaceItems.map(([label, copy]) => (
          <article key={label}>
            <CheckCircle2 aria-hidden="true" />
            <div>
              <strong>{label}</strong>
              <span>{copy}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AreaModal({ companies, lockedCount, moneyPath, onClose, onOpenReport, onProjectClick, projects, selectedArea }) {
  return (
    <Modal onClose={onClose} title={`${selectedArea.name} Opportunity Intelligence`}>
      <div className="modal-metrics">
        <Metric label="Heat Score" value={selectedArea.score} />
        <Metric label="Records found" value={number(selectedArea.recordCount)} />
        <Metric label="Declared value" value={compactCurrency(selectedArea.declaredValue)} />
        <Metric label="Activity trend" value={trendText(selectedArea.activityGrowth)} />
      </div>
      <WorkflowActions context={selectedArea.name} />
      <div className="ways-to-use modal-way-list">
        <h3>Ways to use this area</h3>
        <ul>
          <li><strong>Call active companies</strong><span>Use visible companies as the start of a source-backed call list.</span></li>
          <li><strong>Find projects to bid or service</strong><span>Use type, value, status, and source records to prioritize outreach.</span></li>
          <li><strong>Watch repeat-activity properties</strong><span>Find buildings that keep showing up in public construction records.</span></li>
          <li><strong>Track high-value filings</strong><span>Follow where declared value is moving in this area.</span></li>
        </ul>
      </div>
      <OpportunityBreakdown categories={selectedArea.topCategories} />
      <div className="detail-grid">
        <Detail label="Top project types" value={categorySentence(selectedArea.topCategories)} />
        <Detail label="Top companies/applicants" value={companies.map((company) => company.name).slice(0, 3).join(", ") || NOT_AVAILABLE} />
        <Detail label="Top properties in preview" value={projects.map((project) => project.address).slice(0, 3).join(", ") || NOT_AVAILABLE} />
        <Detail label="Source coverage" value={`${selectedArea.sourceCount || 1} public source types`} />
        <Detail label="Last updated" value={selectedArea.generated_at?.slice(0, 10) || NOT_AVAILABLE} />
      </div>
      <div className="modal-records">
        <h3>Sample records</h3>
        {projects.length ? projects.slice(0, 6).map((project) => (
          <button key={project.project_id} type="button" onClick={() => onProjectClick(project)}>
            <span>{project.address}</span>
            <small>{categoryLabel(project.trade_category)} / {project.declared_value_label || NOT_AVAILABLE}</small>
          </button>
        )) : <p>No exact records from this area are exposed in the free preview.</p>}
      </div>
      {lockedCount > 0 ? (
        <div className="locked-note">
          {number(lockedCount)} additional public records are available in the {moneyPath.packetLabel}.
        </div>
      ) : null}
      <div className="modal-actions">
        <button className="secondary-action" type="button">
          <Download aria-hidden="true" />
          Export preview
        </button>
        <button className="primary-action" type="button" onClick={onOpenReport}>
          {moneyPath.cta}
        </button>
      </div>
    </Modal>
  );
}

function ProjectModal({ moneyPath, onClose, onOpenReport, project }) {
  return (
    <Modal onClose={onClose} title="Project Detail">
      <div className="project-heading">
        <strong>{project.address || NOT_AVAILABLE}</strong>
        <span>{project.borough || NOT_AVAILABLE} {project.zip ? `/ ZIP ${project.zip}` : ""}</span>
      </div>
      <WorkflowActions context={project.address || project.permit_number || "this project"} />
      <div className="detail-grid">
        <Detail label="Permit / filing number" value={project.permit_number || project.project_id || NOT_AVAILABLE} />
        <Detail label="Work type" value={categoryLabel(project.trade_category)} />
        <Detail label="Status" value={project.status || NOT_AVAILABLE} />
        <Detail label="Filed date" value={project.date || NOT_AVAILABLE} />
        <Detail label="Issued date" value={project.date || NOT_AVAILABLE} />
        <Detail label="Declared value" value={project.declared_value_label || NOT_AVAILABLE} />
        <Detail label="Owner / applicant / contractor" value={project.contractor_name || NOT_AVAILABLE} />
        <Detail label="BBL / BIN" value={[project.bbl, project.bin].filter(Boolean).join(" / ") || NOT_AVAILABLE} />
        <Detail label="Source dataset" value={`${project.source_name || NOT_AVAILABLE} (${project.source_dataset_id || "no id"})`} />
      </div>
      <div className="description-box">
        <h3>Description</h3>
        <p>{project.description || NOT_AVAILABLE}</p>
      </div>
      <div className="detail-grid">
        <Detail label="Money angle" value="Use this record to identify the project, work type, company/applicant, source trail, and nearby activity." />
        <Detail label="Related records nearby" value={`Included in the ${moneyPath.packetLabel}`} />
      </div>
      <div className="modal-actions">
        {project.source_url ? (
          <a className="secondary-action" href={project.source_url} rel="noreferrer" target="_blank">
            Source link
            <ExternalLink aria-hidden="true" />
          </a>
        ) : null}
        <button className="primary-action" type="button" onClick={onOpenReport}>
          {moneyPath.cta}
        </button>
      </div>
    </Modal>
  );
}

function CompanyModal({ company, moneyPath, onClose, onOpenReport }) {
  return (
    <Modal onClose={onClose} title="Company Intelligence">
      <div className="project-heading">
        <strong>{company.name}</strong>
        <span>{company.role}</span>
      </div>
      <div className="modal-metrics">
        <Metric label="Recent records" value={number(company.records)} />
        <Metric label="Declared value total" value={compactCurrency(company.value)} />
        <Metric label="Active neighborhoods" value={number(company.neighborhoods.length)} />
        <Metric label="Trend" value={company.trend} />
      </div>
      <WorkflowActions context={company.name} />
      <div className="detail-grid">
        <Detail label="Active neighborhoods" value={company.neighborhoods.join(", ") || NOT_AVAILABLE} />
        <Detail label="Project categories" value={company.categories.map(categoryLabel).join(", ") || NOT_AVAILABLE} />
        <Detail label="Related properties" value={company.properties.slice(0, 4).join(", ") || NOT_AVAILABLE} />
      </div>
      <div className="modal-actions">
        <button className="primary-action" type="button" onClick={onOpenReport}>
          {moneyPath.id === "companies" ? moneyPath.cta : "Get company activity packet"}
        </button>
      </div>
    </Modal>
  );
}

function ProAccessModal({ moneyPath, onClose, selectedArea }) {
  return (
    <Modal onClose={onClose} title={`${selectedArea?.name ?? "NYC"} ${moneyPath.packetLabel}`}>
      <div className="unlock-intro">
        <h3>What you get after requesting this packet</h3>
        <p>
          This is not just a record preview. It is an organized work product: records, companies, properties,
          source links, export fields, watchlist setup, and suggested action angles.
        </p>
      </div>
      <div className="packet-includes-grid">
        <article>
          <strong>Full project list</strong>
          <p>All public project and permit records, values, work types, dates, statuses, permit IDs, and source links.</p>
        </article>
        <article>
          <strong>Company list</strong>
          <p>Contractors, applicants, owners, and project players appearing in the records.</p>
        </article>
        <article>
          <strong>Property watchlist</strong>
          <p>Buildings with repeat activity, high-value filings, or multiple recent public records.</p>
        </article>
        <article>
          <strong>CSV export</strong>
          <p>Export-ready rows for research, CRM upload, list building, or sales assignment.</p>
        </article>
        <article>
          <strong>Source links</strong>
          <p>DOB and public-record source trails attached to the records in the packet.</p>
        </article>
        <article>
          <strong>Suggested outreach angles</strong>
          <p>Action ideas by contractor, supplier, real estate, developer, investor, or property use case.</p>
        </article>
        <article>
          <strong>Optional weekly alerts</strong>
          <p>Updates when new records, companies, high-value filings, or repeat-property activity appears.</p>
        </article>
        <article>
          <strong>Saved workspace access</strong>
          <p>Save the packet into My Packets, watchlists, call lists, exports, and alert views.</p>
        </article>
      </div>
      <form className="beta-form" onSubmit={(event) => event.preventDefault()}>
        <label>
          Name
          <input placeholder="Marshall Wilkinson" />
        </label>
        <label>
          Company
          <input placeholder="Company name" />
        </label>
        <label>
          Email
          <input placeholder="you@company.com" type="email" />
        </label>
        <label>
          Use case
          <select defaultValue="area">
            <option value="area">Neighborhood intelligence packet</option>
            <option value="company">Company activity packet</option>
            <option value="project">Project + company packet</option>
            <option value="watchlist">Weekly NYC money map / heat index</option>
          </select>
        </label>
        <button className="primary-action" type="submit">Request this packet</button>
      </form>
    </Modal>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="intel-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
        <h2 id="modal-title">{title}</h2>
        {children}
      </section>
    </div>
  );
}

function SectionTitle({ copy, eyebrow, title }) {
  return (
    <div className="section-title">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PreviewMetric({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function WorkflowActions({ compact = false, context }) {
  const [queuedAction, setQueuedAction] = useState(null);
  const actions = [
    ["Save", Star],
    ["Watch", Bell],
    ["Add to call list", ListPlus],
    ["Export preview", Download],
  ];

  function queueWorkflowAction(label) {
    setQueuedAction(label);
  }

  return (
    <div className={`workflow-actions ${compact ? "compact" : ""}`} aria-label={`Workflow actions for ${context}`}>
      {actions.map(([label, Icon]) => (
        <button key={label} type="button" onClick={() => queueWorkflowAction(label)}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
      {queuedAction ? (
        <span className="inline-workflow-notice">
          <Check aria-hidden="true" />
          {queuedAction} queued
        </span>
      ) : null}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value || NOT_AVAILABLE}</strong>
    </div>
  );
}

function Field({ children, label }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div>
        {children}
        <ChevronDown aria-hidden="true" />
      </div>
    </label>
  );
}

function TrustFooter({ generatedAt }) {
  return (
    <footer className="trust-footer">
      <ShieldCheck aria-hidden="true" />
      <span>
        Built from official public NYC DOB, NYC Open Data, PLUTO, ACRIS, complaints, and violations records.
        Last generated {generatedAt ? generatedAt.slice(0, 10) : NOT_AVAILABLE}.
      </span>
    </footer>
  );
}

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <Sparkles aria-hidden="true" />
      <h1>Loading NYC Construction Intelligence</h1>
      <p>Reading static public-data beta files.</p>
    </main>
  );
}

function ErrorScreen({ error }) {
  return (
    <main className="loading-screen">
      <Database aria-hidden="true" />
      <h1>NYC data failed to load</h1>
      <p>{error?.message || "Unknown loading error"}</p>
    </main>
  );
}

async function fetchPublicJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

function deriveCitySummary(areas, projects) {
  const records = areas.reduce((sum, area) => sum + (area.recent_permit_volume ?? 0), 0);
  const value = areas.reduce((sum, area) => sum + (area.project_value_total ?? 0), 0);
  const companies = new Set(projects.map((project) => project.contractor_name).filter(Boolean));
  return {
    areaCount: areas.length,
    companyCount: companies.size,
    records,
    value,
  };
}

function deriveCompanies(projects) {
  const companies = new Map();

  projects.forEach((project) => {
    const name = project.contractor_name || NOT_AVAILABLE;
    if (name === NOT_AVAILABLE) return;

    const current = companies.get(name) ?? {
      categories: new Set(),
      name,
      neighborhoods: new Set(),
      properties: new Set(),
      records: 0,
      role: "Contractor / applicant",
      trend: "New public activity",
      value: 0,
    };

    current.records += 1;
    current.value += project.declared_value ?? 0;
    if (project.area_name) current.neighborhoods.add(project.area_name);
    if (project.address) current.properties.add(project.address);
    if (project.trade_category) current.categories.add(project.trade_category);
    companies.set(name, current);
  });

  return Array.from(companies.values())
    .map((company) => ({
      ...company,
      categories: Array.from(company.categories),
      neighborhoods: Array.from(company.neighborhoods),
      properties: Array.from(company.properties),
    }))
    .sort((a, b) => b.records - a.records || b.value - a.value);
}

function deriveProperties(projects) {
  const properties = new Map();

  projects.forEach((project) => {
    if (!project.address) return;
    const current = properties.get(project.address) ?? {
      address: project.address,
      area: project.area_name || project.borough,
      records: 0,
      value: 0,
    };
    current.records += 1;
    current.value += project.declared_value ?? 0;
    properties.set(project.address, current);
  });

  return Array.from(properties.values()).sort((a, b) => b.records - a.records || b.value - a.value);
}

function projectMatchesArea(project, area) {
  if (!project || !area) return false;
  return project.zip === area.zip || project.area_key === area.area_key || project.area_name === area.name;
}

function buildProjectCentroids(projects) {
  const groups = new Map();

  projects.forEach((project) => {
    const coordinate = rawProjectCoordinate(project);
    if (!coordinate) return;
    const keys = [project.area_key, project.zip ? `zip:${project.zip}` : null, project.area_name ? `name:${project.area_name}` : null].filter(Boolean);
    keys.forEach((key) => {
      const current = groups.get(key) ?? { count: 0, lat: 0, lon: 0 };
      current.count += 1;
      current.lon += coordinate[0];
      current.lat += coordinate[1];
      groups.set(key, current);
    });
  });

  const centroids = new Map();
  groups.forEach((value, key) => {
    centroids.set(key, [value.lon / value.count, value.lat / value.count]);
  });
  return centroids;
}

function coordinateForArea(area, index = 0, projectCentroids = new Map()) {
  const centroid = projectCentroids.get(area.area_key)
    ?? (area.zip ? projectCentroids.get(`zip:${area.zip}`) : null)
    ?? (area.name ? projectCentroids.get(`name:${area.name}`) : null);
  const base = centroid
    ?? (area.zip ? ZIP_CENTERS[area.zip] : null)
    ?? BOROUGH_CENTERS[area.borough]
    ?? NYC_CENTER;
  return offsetCoordinate(base, `area:${area.area_key || area.id || index}`, 0.006);
}

function coordinateForProject(project, index = 0, areaLookup = new Map()) {
  const coordinate = rawProjectCoordinate(project);
  if (coordinate) return coordinate;
  const area = areaLookup.get(project.area_key)
    ?? (project.zip ? areaLookup.get(`zip:${project.zip}`) : null)
    ?? (project.area_name ? areaLookup.get(`name:${project.area_name}`) : null);
  const base = area?.coordinates
    ?? (project.zip ? ZIP_CENTERS[project.zip] : null)
    ?? BOROUGH_CENTERS[project.borough]
    ?? NYC_CENTER;
  return offsetCoordinate(base, `project:${project.project_id || project.address || index}`, 0.004);
}

function rawProjectCoordinate(project) {
  const lat = Number(project.lat);
  const lon = Number(project.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < 40.45 || lat > 40.95 || lon < -74.3 || lon > -73.65) return null;
  return [lon, lat];
}

function offsetCoordinate(coordinate, seed, maxOffset) {
  const hash = hashString(seed);
  const angle = (hash % 360) * (Math.PI / 180);
  const radius = ((hash % 100) / 100) * maxOffset;
  return [
    coordinate[0] + Math.cos(angle) * radius,
    coordinate[1] + Math.sin(angle) * radius * 0.78,
  ];
}

function coordinateInBounds(coordinate, bounds) {
  if (!coordinate || !bounds) return false;
  const [lon, lat] = coordinate;
  return lon >= bounds.getWest() && lon <= bounds.getEast() && lat >= bounds.getSouth() && lat <= bounds.getNorth();
}

function buildQuerySummary(query, projects, areas) {
  const queryText = query.trim();
  if (!queryText) return null;
  const lower = queryText.toLowerCase();
  const matchingAreas = areas.filter((area) => [
    area.name,
    area.zip,
    area.borough,
    categorySentence(area.topCategories),
  ].filter(Boolean).join(" ").toLowerCase().includes(lower));
  return {
    areas: matchingAreas.length,
    query: queryText,
    records: projects.length || matchingAreas.reduce((sum, area) => sum + (area.recordCount ?? 0), 0),
  };
}

function latestProjectDate(projects) {
  const dates = projects.map((project) => project.date).filter(Boolean).sort();
  return dates[dates.length - 1] ?? new Date().toISOString().slice(0, 10);
}

function sameViewportStats(current, next) {
  if (!current || !next) return false;
  return current.records === next.records
    && current.value === next.value
    && current.companies === next.companies
    && current.hottestArea?.id === next.hottestArea?.id;
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < String(value).length; index += 1) {
    hash = (hash << 5) - hash + String(value).charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function categoryLabel(category) {
  const labels = {
    demolition: "Demolition",
    electrical: "Electrical",
    exterior: "Facade / Exterior",
    general: "Other",
    mechanical: "Mechanical / HVAC",
    new_build: "New Building",
    plumbing: "Plumbing",
    remodel: "Alteration / Renovation",
    roofing: "Roofing",
    solar: "Solar",
  };
  return labels[category] ?? category ?? NOT_AVAILABLE;
}

function categorySentence(categories = []) {
  if (!categories.length) return NOT_AVAILABLE;
  return categories.slice(0, 3).map(([category, count]) => `${categoryLabel(category)} (${count})`).join(", ");
}

function salesAngle(category) {
  const angles = {
    demolition: "good for demolition contractors, hauling, environmental, site prep, and redevelopment tracking.",
    electrical: "good for electrical contractors, lighting vendors, switchgear suppliers, and building-service firms.",
    exterior: "good for facade restoration, scaffolding, compliance, waterproofing, and exterior contractors.",
    general: "good for GCs, subs, expediters, building services, and suppliers watching active work.",
    mechanical: "good for HVAC contractors, mechanical subs, equipment suppliers, controls, and service firms.",
    new_build: "good for developers, GCs, subs, materials suppliers, lenders, and brokerage teams.",
    plumbing: "good for plumbing contractors, supply houses, service firms, and mechanical trade partners.",
    remodel: "good for GCs, subs, materials, architects, expediters, and interior trade outreach.",
    roofing: "good for roofers, waterproofing, exterior contractors, solar installers, and suppliers.",
    solar: "good for solar installers, roofers, electricians, financing partners, and equipment suppliers.",
  };
  return angles[category] ?? "good for contractors, suppliers, service firms, and market watchers.";
}

function trendText(value) {
  if (value === null || value === undefined) return NOT_AVAILABLE;
  if (value === 1) return "New baseline";
  const percent = Math.round(value * 100);
  return `${percent >= 0 ? "+" : ""}${percent}%`;
}

function number(value) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

function compactCurrency(value) {
  if (!value) return "$0";
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value >= 1000000 ? 1 : 0,
    notation: "compact",
    style: "currency",
  }).format(value);
}

export default App;
