import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
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
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
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

const mapPositions = [
  { x: 46, y: 26 },
  { x: 42, y: 34 },
  { x: 53, y: 42 },
  { x: 72, y: 68 },
  { x: 50, y: 30 },
  { x: 58, y: 24 },
  { x: 39, y: 31 },
  { x: 65, y: 39 },
];

const projectPointPositions = [
  { x: 28, y: 62 },
  { x: 34, y: 48 },
  { x: 41, y: 36 },
  { x: 53, y: 29 },
  { x: 61, y: 44 },
  { x: 72, y: 59 },
  { x: 66, y: 72 },
  { x: 48, y: 70 },
];

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
  const allProjects = dataState.projects?.projects ?? [];

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
      };
    });
  }, [heatByArea, rawTopAreas]);

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

    return allProjects.filter((project) => {
      const matchesType = projectType === "all" || project.trade_category === projectType;
      const matchesValue = (project.declared_value ?? 0) >= minValue;
      const matchesBorough = borough === "all" || project.borough === borough;
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

      return matchesType && matchesValue && matchesBorough && matchesQuery;
    });
  }, [allProjects, borough, minimumValue, projectType, query]);

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

  function viewSection(sectionId) {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectArea(area, openModal = false) {
    setSelectedAreaId(area.id);
    if (openModal) setAreaModalOpen(true);
  }

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
          onQueryChange={setQuery}
          query={query}
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
              <SectionTitle
                eyebrow="Heat map preview"
                title="NYC construction heat map"
                copy="Click a hot zone or project point to inspect the public-record intelligence behind it."
              />
              <HeatMapPreview
                areas={areas}
                onProjectClick={setSelectedProject}
                onSelectArea={(area) => selectArea(area, true)}
                projects={previewProjects}
                selectedArea={selectedArea}
              />
            </section>

            <PreviewBlock
              areaProjects={selectedAreaProjects}
              lockedCount={lockedCount}
              onOpenReport={() => setProModalOpen(true)}
              onProjectClick={setSelectedProject}
              projects={previewProjects}
              selectedArea={selectedArea}
            />

            <ProjectsTable
              lockedCount={lockedCount}
              noAreaMatches={!selectedAreaProjects.length}
              onOpenReport={() => setProModalOpen(true)}
              onProjectClick={setSelectedProject}
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
              onSelectArea={(area) => selectArea(area, true)}
              selectedArea={selectedArea}
            />

            <ReportsSection onOpenReport={() => setProModalOpen(true)} selectedArea={selectedArea} />
          </section>

          <aside className="workspace-aside" aria-label="Selected intelligence">
            <SelectedAreaPanel
              companies={selectedAreaCompanies}
              onOpenArea={() => setAreaModalOpen(true)}
              onOpenReport={() => setProModalOpen(true)}
              projects={selectedAreaProjects}
              selectedArea={selectedArea}
            />
            <UnlockPanel onOpenReport={() => setProModalOpen(true)} selectedArea={selectedArea} />
          </aside>
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

function Hero({ citySummary, onQueryChange, query }) {
  return (
    <header className="hero-shell">
      <div className="hero-copy">
        <h1>NYC construction activity, mapped and scored.</h1>
        <p>
          Track permits, filings, project values, companies, properties, and neighborhood activity
          across New York City.
        </p>
      </div>
      <div className="search-panel">
        <label htmlFor="intel-search">Search any neighborhood, address, company, permit, or ZIP.</label>
        <div className="search-box">
          <Search aria-hidden="true" />
          <input
            id="intel-search"
            placeholder="Search Chelsea, 10018, SOLAR CONTRACTING, permit number..."
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>
      </div>
      <div className="hero-metrics" aria-label="NYC public data summary">
        <Metric label="Public records scored" value={number(citySummary.records)} />
        <Metric label="Declared value found" value={compactCurrency(citySummary.value)} />
        <Metric label="Companies in preview" value={number(citySummary.companyCount)} />
        <Metric label="Scored hot zones" value={number(citySummary.areaCount)} />
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

function HeatMapPreview({ areas, onProjectClick, onSelectArea, projects, selectedArea }) {
  return (
    <div className="heat-map-layout">
      <div className="nyc-map" aria-label="Heat map preview">
        <div className="borough-shape manhattan" />
        <div className="borough-shape queens" />
        <div className="borough-shape brooklyn" />
        <div className="borough-shape bronx" />
        <div className="borough-shape staten" />
        {areas.slice(0, 8).map((area, index) => {
          const position = mapPositions[index] ?? mapPositions[0];
          return (
            <button
              className={`heat-zone ${selectedArea?.id === area.id ? "selected" : ""}`}
              key={area.id}
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
              type="button"
              onClick={() => onSelectArea(area)}
            >
              <span>{area.rank}</span>
              <strong>{area.score}</strong>
            </button>
          );
        })}
        {projects.slice(0, 8).map((project, index) => {
          const position = projectPointPositions[index] ?? projectPointPositions[0];
          return (
            <button
              className="project-dot"
              key={`${project.project_id}-${index}`}
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
              title={project.address}
              type="button"
              onClick={() => onProjectClick(project)}
            />
          );
        })}
        <div className="map-note">
          Heat map preview. Full map tiles, parcel boundaries, and export layers unlock in the full report.
        </div>
      </div>

      <div className="hot-area-list">
        <h3>This week&apos;s hottest construction areas</h3>
        {areas.slice(0, 5).map((area) => (
          <button
            className={`hot-area-row ${selectedArea?.id === area.id ? "selected" : ""}`}
            key={area.id}
            type="button"
            onClick={() => onSelectArea(area)}
          >
            <span>{area.rank}</span>
            <div>
              <strong>{area.name}</strong>
              <small>{area.borough || "NYC"} / ZIP {area.zip}</small>
            </div>
            <em>{area.score}</em>
          </button>
        ))}
      </div>
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
        <PreviewMetric label="Free records visible" value={number(visibleCount || previewRecords.length)} />
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
        Unlock full {selectedArea.name} report
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
        title="Visible public-record preview"
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
                <td colSpan="8">
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
        title={isAreaSpecific ? `Companies visible in ${selectedArea.name}` : "Top companies in the free NYC preview"}
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
              <div>
                <dt>BBL / BIN</dt>
                <dd>{NOT_AVAILABLE}</dd>
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
        title="Unlock deeper intelligence"
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
        <Detail label="BBL / BIN" value={NOT_AVAILABLE} />
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
