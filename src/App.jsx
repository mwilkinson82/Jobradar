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
  Target,
  Users,
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
  { id: "reports", label: "Reports", icon: ClipboardList },
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
  const topDiscovery = selectedArea ?? areas[0];
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
    setTourActive(true);
    const first = areas[0];
    if (first) selectArea(first, { zoom: 12.8 });
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
          onQueryChange={setQuery}
          onSearch={runSearch}
          onTour={startHotspotTour}
          query={query}
          querySummary={querySummary}
          selectedArea={selectedArea}
          selectedAreaCompanies={selectedAreaCompanies}
          tourActive={tourActive}
        />

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

        <div className="workspace-grid">
          <section className="workspace-primary">
            <section className="section-panel map-section" id="map" aria-labelledby="map-title">
              <MapExplorer
                areas={areas}
                focusTarget={mapFocus}
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

            <PreviewBlock
              areaProjects={selectedAreaProjects}
              lockedCount={lockedCount}
              onOpenReport={() => setProModalOpen(true)}
              onProjectClick={selectProject}
              projects={previewProjects}
              selectedArea={selectedArea}
            />

            <ProjectsTable
              lockedCount={lockedCount}
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
              onCompanyClick={setSelectedCompany}
              onOpenReport={() => setProModalOpen(true)}
              selectedArea={selectedArea}
            />

            <PropertiesSection
              onOpenReport={() => setProModalOpen(true)}
              properties={properties.slice(0, 6)}
            />

            <AreasSection
              areas={areas}
              onSelectArea={(area) => selectArea(area, { openModal: true })}
              selectedArea={selectedArea}
            />

            <ReportsSection onOpenReport={() => setProModalOpen(true)} selectedArea={selectedArea} />
          </section>
        </div>

        <TrustFooter generatedAt={dataState.heat?.generated_at} />
      </main>

      {areaModalOpen && selectedArea ? (
        <AreaModal
          companies={selectedAreaCompanies}
          lockedCount={lockedCount}
          onClose={() => setAreaModalOpen(false)}
          onOpenReport={() => setProModalOpen(true)}
          onProjectClick={setSelectedProject}
          projects={selectedAreaProjects}
          selectedArea={selectedArea}
        />
      ) : null}

      {selectedProject ? (
        <ProjectModal
          onClose={() => setSelectedProject(null)}
          onOpenReport={() => setProModalOpen(true)}
          project={selectedProject}
        />
      ) : null}

      {selectedCompany ? (
        <CompanyModal
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onOpenReport={() => setProModalOpen(true)}
        />
      ) : null}

      {proModalOpen ? (
        <ProAccessModal onClose={() => setProModalOpen(false)} selectedArea={selectedArea} />
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
  lockedCount,
  onQueryChange,
  onSearch,
  onTour,
  query,
  querySummary,
  selectedArea,
  selectedAreaCompanies,
  tourActive,
}) {
  return (
    <header className="intel-header">
      <div className="header-copy">
        <h1>Find active NYC construction projects, companies, and hot zones.</h1>
        <p>
          We found {compactCurrency(citySummary.value)} in declared construction activity from {number(citySummary.records)}
          {" "}public NYC records, with {number(citySummary.companyCount)} companies identified and {number(citySummary.areaCount)} hot zones mapped.
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
        <Metric label="Construction records found" value={number(citySummary.records)} />
        <Metric label="Declared value found" value={compactCurrency(citySummary.value)} />
        <Metric label="Companies identified" value={number(citySummary.companyCount)} />
        <Metric label="Hot zones mapped" value={number(citySummary.areaCount)} />
      </div>
      <div className="top-discovery-card">
        <div>
          <span>Top discovery</span>
          <h2>{selectedArea?.name ?? "Chelsea-Hudson Yards"} report preview</h2>
          <p>
            Hottest area: {number(selectedArea?.recordCount)} records, {compactCurrency(selectedArea?.declaredValue)},{" "}
            {number(selectedAreaCompanies.length)} companies visible, {number(lockedCount)} locked records.
          </p>
        </div>
        <div className="discovery-actions">
          <button className="secondary-action" type="button" onClick={onTour}>
            <Play aria-hidden="true" />
            {tourActive ? "Touring hotspots" : "Tour this week's hotspots"}
          </button>
          <button className="primary-action" type="button" onClick={onSearch}>
            <Target aria-hidden="true" />
            View on map
          </button>
        </div>
      </div>
      <div className="use-strip">
        <span>Use this to find:</span>
        <strong>active projects</strong>
        <strong>companies to call</strong>
        <strong>hot neighborhoods</strong>
        <strong>repeat-activity properties</strong>
        <strong>high-value filings</strong>
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
      <div className="map-toolbar">
        <div>
          <span>Live map view</span>
          <h2>Explore NYC construction activity</h2>
        </div>
        <button className="secondary-action" type="button" onClick={onTour}>
          <Navigation aria-hidden="true" />
          {tourActive ? "Tour running" : "Tour this week's hotspots"}
        </button>
      </div>
      <div className="map-live-summary">
        <PreviewMetric label="Records in view" value={number(recordsInView)} />
        <PreviewMetric label="Declared value in view" value={compactCurrency(valueInView)} />
        <PreviewMetric label="Companies found" value={number(companiesInView)} />
        <PreviewMetric label="Hottest area in view" value={hottestArea?.name ?? "NYC"} />
      </div>
      <div className="map-stage">
        <InteractiveNycMap
          areas={areas}
          focusTarget={focusTarget}
          onProjectClick={onProjectClick}
          onSelectArea={onSelectArea}
          onViewportStats={onViewportStats}
          projects={projects}
          selectedArea={selectedArea}
        />
        <SelectedReportPreview
          companies={selectedAreaCompanies}
          onOpenReport={onOpenReport}
          projects={selectedAreaProjects}
          selectedArea={selectedArea}
        />
      </div>
      <RecordsDrawer
        lockedCount={selectedArea ? Math.max(0, selectedArea.recordCount - selectedAreaProjects.length) : 0}
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

  return (
    <div className="map-shell">
      <div className="map-canvas" ref={containerRef} />
      <div className="map-disclaimer">
        Map positions use DOB coordinates when available; otherwise ZIP/neighborhood centroids are used for this public preview.
      </div>
    </div>
  );
}

function SelectedReportPreview({ companies, onOpenReport, projects, selectedArea }) {
  if (!selectedArea) return null;
  const topCompany = companies[0]?.name ?? "Company list locked";
  const topProperty = projects[0]?.address ?? "Property list locked";

  return (
    <aside className="map-report-panel">
      <span>{selectedArea.name} report preview</span>
      <h2>Unlock the {number(selectedArea.recordCount)}-record {selectedArea.name} report.</h2>
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
      <button className="primary-action" type="button" onClick={onOpenReport}>
        <LockKeyhole aria-hidden="true" />
        Unlock full {selectedArea.name} report
      </button>
    </aside>
  );
}

function RecordsDrawer({ lockedCount, onOpenReport, onProjectClick, projects, selectedArea }) {
  return (
    <div className="records-drawer">
      <div>
        <span>Records in current map view</span>
        <h3>Free preview: {projects.slice(0, 8).length} of {number(selectedArea?.recordCount ?? projects.length)} records</h3>
      </div>
      <div className="drawer-records">
        {projects.slice(0, 8).map((project) => (
          <button key={`${project.project_id}-${project.permit_number}`} type="button" onClick={() => onProjectClick(project)}>
            <strong>{project.address || "Address not provided"}</strong>
            <span>{categoryLabel(project.trade_category)} · {project.declared_value_label || "N/A"} · {project.contractor_name || "Company locked"}</span>
          </button>
        ))}
      </div>
      {lockedCount > 0 ? (
        <button className="drawer-lock" type="button" onClick={onOpenReport}>
          <LockKeyhole aria-hidden="true" />
          {number(lockedCount)} more records found - unlock full report
        </button>
      ) : null}
    </div>
  );
}

function PreviewBlock({ areaProjects, lockedCount, onOpenReport, onProjectClick, projects, selectedArea }) {
  if (!selectedArea) return null;
  const visibleCount = areaProjects.length;
  const previewRecords = areaProjects.length ? areaProjects.slice(0, 3) : projects.slice(0, 3);

  return (
    <section className="preview-block" aria-label="Free intelligence preview">
      <div className="preview-copy">
        <h2>We found {number(selectedArea.recordCount)} public construction records in {selectedArea.name}.</h2>
        <p>
          {compactCurrency(selectedArea.declaredValue)} in declared project value, {categorySentence(selectedArea.topCategories)},
          and {trendText(selectedArea.activityGrowth)} versus the prior period.
        </p>
      </div>
      <div className="preview-proof">
        <PreviewMetric label={`Free preview: ${number(visibleCount || previewRecords.length)} records`} value={`${number(visibleCount || previewRecords.length)} visible`} />
        <PreviewMetric label="Locked records" value={number(lockedCount)} />
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
        Unlock the {number(selectedArea.recordCount)}-record {selectedArea.name} report
      </button>
    </section>
  );
}

function ProjectsTable({
  lockedCount,
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
        copy="Sample DOB permit and filing records are visible for free. Full source links, exports, related records, and all area records unlock in the report."
      />

      {noAreaMatches ? (
        <div className="source-warning">
          No exact sample rows for {selectedArea?.name} are included in the free preview. Showing latest NYC records.
          The full report unlocks the selected area&apos;s full record list.
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
                  {number(lockedCount)} more public records found in this area - unlock full report.
                  <button type="button" onClick={onOpenReport}>Unlock</button>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CompaniesSection({ companies, isAreaSpecific, onCompanyClick, onOpenReport, selectedArea }) {
  return (
    <section className="section-panel" id="companies" aria-labelledby="companies-title">
      <SectionTitle
        eyebrow="Companies"
        title={isAreaSpecific ? `Companies identified in ${selectedArea.name}` : "Top companies in the free NYC preview"}
        copy="Company roles are inferred from public permit/applicant fields. Full company matching, aliases, and source trails unlock in the report."
      />
      <div className="company-grid">
        {companies.slice(0, 6).map((company) => (
          <button className="company-row" key={company.name} type="button" onClick={() => onCompanyClick(company)}>
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
        ))}
      </div>
      {!isAreaSpecific ? (
        <div className="locked-note">
          Area-specific company ranking for {selectedArea?.name} is locked behind the full report when the free preview does not expose enough rows.
          <button type="button" onClick={onOpenReport}>Unlock company activity report</button>
        </div>
      ) : null}
    </section>
  );
}

function PropertiesSection({ onOpenReport, properties }) {
  return (
    <section className="section-panel" id="properties" aria-labelledby="properties-title">
      <SectionTitle
        eyebrow="Properties"
        title="Repeat-activity property preview"
        copy="The current public preview shows recent project addresses. BBL/BIN, PLUTO parcel context, and related records unlock in the property report."
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
            <button className="text-action" type="button" onClick={onOpenReport}>
              Unlock property report
              <ExternalLink aria-hidden="true" />
            </button>
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
        copy="Each hot area has a score, activity volume, declared value, growth, source coverage, and locked report path."
      />
      <div className="area-grid">
        {areas.slice(0, 8).map((area) => (
          <button
            className={`area-tile ${selectedArea?.id === area.id ? "selected" : ""}`}
            key={area.id}
            type="button"
            onClick={() => onSelectArea(area)}
          >
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
        ))}
      </div>
    </section>
  );
}

function ReportsSection({ onOpenReport, selectedArea }) {
  const reports = [
    ["Full area report", "All records, source links, categories, companies, properties, and source coverage."],
    ["Project list export", "CSV-ready permit and filing records with filterable project context."],
    ["Company activity report", "Company roles, active neighborhoods, project categories, and trend direction."],
    ["Weekly NYC Construction Heat Index", "Recurring monitor for hot zones, record spikes, high-value filings, and watchlist changes."],
  ];

  return (
    <section className="section-panel report-section" id="reports" aria-labelledby="reports-title">
      <SectionTitle
        eyebrow="Reports"
        title={`Unlock full ${selectedArea?.name ?? "NYC"} report`}
        copy={`Start with the ${selectedArea?.name ?? "NYC"} report, then expand to companies, properties, and weekly watchlists.`}
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
          Unlock full report
        </button>
        <button className="secondary-action" type="button" onClick={onOpenReport}>
          Request Pro Beta Access
        </button>
      </div>
    </section>
  );
}

function SelectedAreaPanel({ companies, onOpenArea, onOpenReport, projects, selectedArea }) {
  if (!selectedArea) return null;
  const topCompany = companies[0]?.name ?? NOT_AVAILABLE;
  const topProperty = projects[0]?.address ?? NOT_AVAILABLE;

  return (
    <section className="side-panel" aria-label="Selected area intelligence">
      <div className="panel-heading">
        <span>Selected Area Intelligence</span>
        <h2>{selectedArea.name}</h2>
        <p>{selectedArea.borough || "NYC"} / ZIP {selectedArea.zip}</p>
      </div>
      <dl className="intelligence-list">
        <div>
          <dt>Heat Score</dt>
          <dd>{selectedArea.score}</dd>
        </div>
        <div>
          <dt>Records found</dt>
          <dd>{number(selectedArea.recordCount)}</dd>
        </div>
        <div>
          <dt>Total declared value</dt>
          <dd>{compactCurrency(selectedArea.declaredValue)}</dd>
        </div>
        <div>
          <dt>Activity trend</dt>
          <dd>{trendText(selectedArea.activityGrowth)}</dd>
        </div>
        <div>
          <dt>Top category</dt>
          <dd>{categorySentence(selectedArea.topCategories)}</dd>
        </div>
        <div>
          <dt>Top company in preview</dt>
          <dd>{topCompany}</dd>
        </div>
        <div>
          <dt>Top property in preview</dt>
          <dd>{topProperty}</dd>
        </div>
      </dl>
      <div className="panel-actions">
        <button className="secondary-action" type="button" onClick={onOpenArea}>View sample records</button>
        <button className="primary-action" type="button" onClick={onOpenReport}>Unlock full area report</button>
      </div>
    </section>
  );
}

function UnlockPanel({ onOpenReport, selectedArea }) {
  return (
    <section className="unlock-card" aria-label="Unlock deeper intelligence">
      <h2>Unlock deeper intelligence</h2>
      <p>
        Full report for {selectedArea?.name ?? "NYC"} includes all records, company names, CSV export,
        related records, source links, and watchlist alerts.
      </p>
      <ul>
        <li><LockKeyhole aria-hidden="true" /> Full area report</li>
        <li><LockKeyhole aria-hidden="true" /> Full project list</li>
        <li><LockKeyhole aria-hidden="true" /> Company/activity report</li>
        <li><LockKeyhole aria-hidden="true" /> CSV export</li>
        <li><LockKeyhole aria-hidden="true" /> Weekly heat index</li>
      </ul>
      <button className="primary-action" type="button" onClick={onOpenReport}>Unlock full report</button>
      <button className="secondary-action" type="button" onClick={onOpenReport}>Request Pro Beta Access</button>
    </section>
  );
}

function AreaModal({ companies, lockedCount, onClose, onOpenReport, onProjectClick, projects, selectedArea }) {
  return (
    <Modal onClose={onClose} title={`${selectedArea.name} Intelligence`}>
      <div className="modal-metrics">
        <Metric label="Heat Score" value={selectedArea.score} />
        <Metric label="Records found" value={number(selectedArea.recordCount)} />
        <Metric label="Declared value" value={compactCurrency(selectedArea.declaredValue)} />
        <Metric label="Activity trend" value={trendText(selectedArea.activityGrowth)} />
      </div>
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
          {number(lockedCount)} additional public records are available in the full area report.
        </div>
      ) : null}
      <div className="modal-actions">
        <button className="secondary-action" type="button">
          <Download aria-hidden="true" />
          Export preview
        </button>
        <button className="primary-action" type="button" onClick={onOpenReport}>
          Unlock full area report
        </button>
      </div>
    </Modal>
  );
}

function ProjectModal({ onClose, onOpenReport, project }) {
  return (
    <Modal onClose={onClose} title="Project Detail">
      <div className="project-heading">
        <strong>{project.address || NOT_AVAILABLE}</strong>
        <span>{project.borough || NOT_AVAILABLE} {project.zip ? `/ ZIP ${project.zip}` : ""}</span>
      </div>
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
        <Detail label="Related records at same property" value="Unlock full project/property report" />
        <Detail label="Nearby records" value="Unlock full project/property report" />
      </div>
      <div className="modal-actions">
        {project.source_url ? (
          <a className="secondary-action" href={project.source_url} rel="noreferrer" target="_blank">
            Source link
            <ExternalLink aria-hidden="true" />
          </a>
        ) : null}
        <button className="primary-action" type="button" onClick={onOpenReport}>
          Unlock full project/property report
        </button>
      </div>
    </Modal>
  );
}

function CompanyModal({ company, onClose, onOpenReport }) {
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
      <div className="detail-grid">
        <Detail label="Active neighborhoods" value={company.neighborhoods.join(", ") || NOT_AVAILABLE} />
        <Detail label="Project categories" value={company.categories.map(categoryLabel).join(", ") || NOT_AVAILABLE} />
        <Detail label="Related properties" value={company.properties.slice(0, 4).join(", ") || NOT_AVAILABLE} />
      </div>
      <div className="modal-actions">
        <button className="primary-action" type="button" onClick={onOpenReport}>
          Unlock company intelligence report
        </button>
      </div>
    </Modal>
  );
}

function ProAccessModal({ onClose, selectedArea }) {
  return (
    <Modal onClose={onClose} title="Request Pro Beta Access">
      <div className="unlock-intro">
        <h3>Unlock full {selectedArea?.name ?? "NYC"} intelligence.</h3>
        <p>
          The beta report path will include all public records, source links, company/activity profiles,
          property context, CSV export, and weekly watchlist alerts.
        </p>
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
            <option value="area">Neighborhood / area reports</option>
            <option value="company">Company activity tracking</option>
            <option value="project">Project list export</option>
            <option value="watchlist">Weekly watchlist alerts</option>
          </select>
        </label>
        <button className="primary-action" type="submit">Request Pro Beta Access</button>
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
