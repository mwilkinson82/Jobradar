import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Compass,
  Database,
  Download,
  ExternalLink,
  Home,
  Layers3,
  Mail,
  MapPin,
  Megaphone,
  Navigation,
  Radar,
  RefreshCcw,
  Route,
  Settings,
  ShieldCheck,
  Signal,
  Sparkles,
  Target,
  Users,
  X,
  Zap,
} from "lucide-react";

const trades = [
  {
    id: "roofing",
    label: "Roofing",
    offer: "Fast exterior refresh before summer storms.",
    postcard: "New roof. No mess. Honest price.",
    ad: "Roofing work in your neighborhood? Get a fast inspection before the next storm season.",
    signalLabel: "roofing permits",
    cycle: "18-25 year roof cycle",
    jobRange: "$6,000-$18,000",
    campaignCost: 412,
  },
  {
    id: "hvac",
    label: "HVAC Replacement",
    offer: "Same-week system assessment before peak heat.",
    postcard: "Old system. Hot house. Clear options.",
    ad: "Homes built 18-25 years ago are hitting replacement age. Book a system check this week.",
    signalLabel: "mechanical permits",
    cycle: "18-25 year system cycle",
    jobRange: "$8,000-$16,000",
    campaignCost: 385,
  },
  {
    id: "kitchen",
    label: "Kitchen / Bath",
    offer: "Design scope review for recent buyers.",
    postcard: "Bought the house. Fix the kitchen.",
    ad: "Recent buyers in older homes are planning remodels now. Start with a clear scope review.",
    signalLabel: "remodel permits",
    cycle: "20-50 year renovation cycle",
    jobRange: "$25,000-$85,000",
    campaignCost: 560,
  },
  {
    id: "outdoor",
    label: "Deck / Fence / Patio",
    offer: "Backyard upgrade estimate before summer weekends.",
    postcard: "Make the backyard usable again.",
    ad: "New homeowners and growing subdivisions are buying exterior upgrades this season.",
    signalLabel: "exterior permits",
    cycle: "new-owner exterior upgrade window",
    jobRange: "$5,000-$22,000",
    campaignCost: 438,
  },
];

const NYC_METRO = "New York City, NY";
const metros = ["Dallas, TX", NYC_METRO, "Nashville, TN", "Charlotte, NC", "Austin, TX"];

const modes = [
  {
    id: "work",
    label: "Jobs this week",
    icon: Zap,
    question: "Where should I go this week?",
    note: "Best neighborhoods and campaigns this week.",
    startCopy: "Show me the highest-probability areas to market right now.",
  },
  {
    id: "relationships",
    label: "GCs to call",
    icon: Users,
    question: "Which GCs should I call?",
    note: "Builders, GCs, landlords, and property managers getting active.",
    startCopy: "Find active builders, remodelers, developers, and property managers.",
  },
  {
    id: "canvas",
    label: "Door-knock routes",
    icon: Route,
    question: "Which neighborhoods should I door knock?",
    note: "Dense routes where nearby signals make a cold canvass worth the gas.",
    startCopy: "Give me a tight route with the reasons each area is worth walking.",
  },
  {
    id: "market",
    label: "Markets to watch",
    icon: BarChart3,
    question: "Which markets are heating up?",
    note: "Expansion signals, pressure, and thin competition.",
    startCopy: "Forecast where demand is building before everyone chases it.",
  },
];

const signalSources = [
  ["Permits", "updated 2 days ago", "Public portal + normalized trade class"],
  ["Property fit", "updated 21 days ago", "Home age, value, ownership, parcel match"],
  ["Storm / event triggers", "updated 1 day ago", "NOAA/NWS hail, wind, heat, cold"],
  ["Market momentum", "updated monthly", "Sales, price movement, buyer activity"],
  ["Competition", "sampled weekly", "Contractor density and category saturation"],
];

const nycSignalSources = [
  ["DOB permits", "updated daily", "DOB NOW approved permits + DOB permit issuance"],
  ["DOB filings", "updated daily", "DOB NOW job application filings"],
  ["Code activity", "daily / weekday", "DOB complaints and violations"],
  ["PLUTO", "updated quarterly", "Property, parcel, land use, and year-built context"],
];

const engineSteps = [
  ["Collect", "Permits, planning, property, weather, sales, and competition signals."],
  ["Normalize", "Messy public records become one trade-aware schema."],
  ["Score", "Each trade gets a different demand, timing, and route-density model."],
  ["Recommend", "The app turns the score into a route, campaign, and call list."],
];

const demoAreas = [
  {
    id: "north-oak",
    rank: 1,
    name: "North Oak",
    zip: "75214",
    score: 92,
    grade: "High",
    homes: 127,
    avgJob: "$18K",
    signal: "Very high signals",
    color: "orange",
    headline: "This week's best area",
    summary: "Greatest concentration of roof need, higher budgets, and active sellers.",
    stats: [
      ["Average job value", "$18,200"],
      ["Homes 25+ years old", "71%"],
      ["Recent storm / hail", "High"],
      ["Active permits (30 days)", "23"],
      ["Recent home sales (30 days)", "19"],
    ],
    reasons: [
      "23 roofing permits pulled in the last 30 days",
      "19 homes sold recently",
      "71% of homes are 25+ years old",
      "Storm activity in the last 30 days",
      "Higher household income than the metro average",
    ],
    route: [
      "Start: Greenville Ave & Shadycrest Dr",
      "Turn right: Wentwood Dr",
      "Left: Thackery St",
      "Left: Abrams Rd",
      "Right: Robin Rd",
    ],
    routeMeta: "42-door route - 1.8 miles - 45-60 min",
  },
  {
    id: "lakewood",
    rank: 2,
    name: "Lakewood",
    zip: "75206",
    score: 78,
    grade: "High",
    homes: 94,
    avgJob: "$15K",
    signal: "High signals",
    color: "green",
    headline: "Strong adjacency play",
    summary: "Clusters of exterior improvements and recent sales within walking routes.",
    stats: [
      ["Average job value", "$15,100"],
      ["Homes 25+ years old", "64%"],
      ["Recent storm / hail", "Medium"],
      ["Active permits (30 days)", "17"],
      ["Recent home sales (30 days)", "15"],
    ],
    reasons: [
      "17 relevant permits in the last 30 days",
      "Exterior upgrades are clustering within 0.4 miles",
      "High owner occupancy around target route",
      "Recent buyers are improving curb appeal",
      "Competition is active but not saturated",
    ],
    route: [
      "Start: Lakeshore Dr",
      "South: Tokalon Dr",
      "Cross: Lakewood Blvd",
      "North: West Shore Dr",
      "Finish: Sondra Dr",
    ],
    routeMeta: "34-door route - 1.4 miles - 35-50 min",
  },
  {
    id: "old-lake",
    rank: 3,
    name: "Old Lake Highlands",
    zip: "75218",
    score: 64,
    grade: "Good",
    homes: 83,
    avgJob: "$13K",
    signal: "Medium signals",
    color: "blue",
    headline: "Budget-efficient test",
    summary: "Older homes and recent sales are present, but signals are less concentrated.",
    stats: [
      ["Average job value", "$13,400"],
      ["Homes 25+ years old", "58%"],
      ["Recent storm / hail", "Medium"],
      ["Active permits (30 days)", "11"],
      ["Recent home sales (30 days)", "12"],
    ],
    reasons: [
      "11 relevant permits in the last 30 days",
      "Aging homes near lake-side streets",
      "Good route density for a small canvass",
      "Lower mail cost than North Oak",
      "Useful comparison test for offer quality",
    ],
    route: [
      "Start: Peavy Rd",
      "East: Creekmere Dr",
      "Loop: Van Dyke Rd",
      "West: Easton Rd",
      "Finish: Northcliff Dr",
    ],
    routeMeta: "29-door route - 1.3 miles - 35-45 min",
  },
  {
    id: "casa-view",
    rank: 4,
    name: "Casa View",
    zip: "75228",
    score: 48,
    grade: "Good",
    homes: 61,
    avgJob: "$11K",
    signal: "Medium signals",
    color: "gray",
    headline: "Watch list area",
    summary: "Moderate activity, useful when route capacity opens later in the month.",
    stats: [
      ["Average job value", "$11,200"],
      ["Homes 25+ years old", "69%"],
      ["Recent storm / hail", "Low"],
      ["Active permits (30 days)", "7"],
      ["Recent home sales (30 days)", "8"],
    ],
    reasons: [
      "Several older subdivisions fit replacement cycle",
      "Enough activity to monitor weekly",
      "Lower household income reduces offer strength",
      "Door route is efficient but lower value",
      "Better after a fresh storm or sale cluster",
    ],
    route: [
      "Start: Gus Thomasson Rd",
      "East: San Medina Ave",
      "North: Materhorn Dr",
      "West: Shiloh Rd",
      "Finish: Oates Dr",
    ],
    routeMeta: "24-door route - 1.2 miles - 30-40 min",
  },
  {
    id: "east-dallas",
    rank: 5,
    name: "East Dallas",
    zip: "75223",
    score: 41,
    grade: "Fair",
    homes: 52,
    avgJob: "$10K",
    signal: "Lower signals",
    color: "gray",
    headline: "Do not lead here",
    summary: "Activity exists, but timing and ability-to-pay signals are weaker this week.",
    stats: [
      ["Average job value", "$10,300"],
      ["Homes 25+ years old", "62%"],
      ["Recent storm / hail", "Low"],
      ["Active permits (30 days)", "5"],
      ["Recent home sales (30 days)", "6"],
    ],
    reasons: [
      "Fewer relevant permit clusters",
      "Lower target job value",
      "Weaker recent sales momentum",
      "Route density is acceptable but less urgent",
      "Hold until new signals appear",
    ],
    route: [
      "Start: Live Oak St",
      "South: Tremont St",
      "East: Munger Blvd",
      "North: Worth St",
      "Finish: Beacon St",
    ],
    routeMeta: "19-door route - 1.1 miles - 25-35 min",
  },
];

const demoTargetHomes = [
  ["6126 Shadycrest Dr", "1961", "Permit filed"],
  ["6135 Wentwood Dr", "1958", "Recent sale"],
  ["6171 Thackery St", "1960", "25+ yrs old"],
  ["6208 Robin Rd", "1962", "Storm area"],
  ["6143 Shadycrest Dr", "1957", "Permit filed"],
  ["6102 Vanderbilt Ave", "1964", "High equity"],
];

const scoreSignals = {
  high: [
    ["Demand", "High"],
    ["Timing", "High"],
    ["Ability to pay", "High"],
    ["Competition", "Medium"],
    ["Route efficiency", "High"],
  ],
  good: [
    ["Demand", "Medium"],
    ["Timing", "Medium"],
    ["Ability to pay", "Medium"],
    ["Competition", "Low"],
    ["Route efficiency", "High"],
  ],
  fair: [
    ["Demand", "Low"],
    ["Timing", "Medium"],
    ["Ability to pay", "Medium"],
    ["Competition", "Medium"],
    ["Route efficiency", "Medium"],
  ],
};

const signalLayers = [
  ["Target homes", "orange"],
  ["Recent permits", "violet"],
  ["Recent sales", "green"],
  ["Home age 25+ yrs", "blue"],
  ["Storm activity", "red"],
  ["Code activity", "amber"],
];

const navItems = [
  { id: "start", label: "Start", icon: Compass },
  { id: "radar", label: "Radar", icon: Radar },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "routes", label: "Routes", icon: Route },
  { id: "leads", label: "Leads", icon: Users },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

function App() {
  const [tradeId, setTradeId] = useState("roofing");
  const [metro, setMetro] = useState("Dallas, TX");
  const [mode, setMode] = useState("work");
  const [radarStarted, setRadarStarted] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState("north-oak");
  const [nycData, setNycData] = useState(null);
  const [nycDataStatus, setNycDataStatus] = useState("idle");
  const [layerState, setLayerState] = useState(() =>
    Object.fromEntries(signalLayers.map(([label]) => [label, true])),
  );
  const [pilotModalOpen, setPilotModalOpen] = useState(false);
  const [pilotSubmitted, setPilotSubmitted] = useState(false);

  const trade = trades.find((item) => item.id === tradeId) ?? trades[0];
  const selectedMode = modes.find((item) => item.id === mode) ?? modes[0];
  const isNycMetro = metro === NYC_METRO;
  const displayAreas =
    isNycMetro && nycData?.topAreas?.areas?.length ? nycData.topAreas.areas : demoAreas;
  const selectedArea = displayAreas.find((item) => item.id === selectedAreaId) ?? displayAreas[0];
  const targetRows =
    isNycMetro && nycData?.projects?.target_homes?.length
      ? nycData.projects.target_homes
      : demoTargetHomes;
  const topbarBadge = isNycMetro
    ? "NYC public-data beta - sources: DOB / NYC Open Data / PLUTO"
    : "Signal engine demo";
  const ctaLabel = isNycMetro
    ? "Request NYC Construction Intelligence beta"
    : "Request real-market pilot";

  useEffect(() => {
    if (!isNycMetro) return undefined;

    let cancelled = false;
    async function loadNycData() {
      setNycDataStatus("loading");
      try {
        const [topAreas, heat, projects] = await Promise.all([
          fetchPublicJson("/data/nyc_top_areas.json"),
          fetchPublicJson("/data/nyc_construction_heat.json"),
          fetchPublicJson("/data/nyc_sample_projects.json"),
        ]);
        if (!cancelled) {
          setNycData({ heat, projects, topAreas });
          setNycDataStatus("ready");
        }
      } catch (error) {
        console.error("NYC public-data beta failed to load", error);
        if (!cancelled) setNycDataStatus("error");
      }
    }

    loadNycData();
    return () => {
      cancelled = true;
    };
  }, [isNycMetro]);

  useEffect(() => {
    if (!displayAreas.some((area) => area.id === selectedAreaId)) {
      setSelectedAreaId(displayAreas[0]?.id ?? "north-oak");
    }
  }, [displayAreas, selectedAreaId]);

  const campaign = useMemo(() => {
    const postcards = selectedArea.rank === 1 ? 300 : selectedArea.rank === 2 ? 220 : 160;
    const doors = selectedArea.routeMeta.match(/\d+/)?.[0] ?? "42";
    return {
      postcards,
      doors,
      radius: selectedArea.rank <= 2 ? "2-mile radius ad" : "1-mile radius ad",
      cost: trade.campaignCost + selectedArea.rank * 26,
    };
  }, [selectedArea, trade]);

  function exportRoute() {
    const text = [
      `Job Radar - ${selectedArea.name} / ZIP ${selectedArea.zip}`,
      `${trade.label} - ${metro}`,
      selectedArea.routeMeta,
      "",
      "Route",
      ...selectedArea.route.map((step, index) => `${index + 1}. ${step}`),
      "",
      "Why here",
      ...selectedArea.reasons.map((reason) => `- ${reason}`),
      "",
      "Campaign",
      `${campaign.postcards} postcards`,
      campaign.radius,
      `${campaign.doors}-door route`,
      `Estimated cost: ${currency(campaign.cost)}`,
      `Target job value: ${trade.jobRange}`,
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `job-radar-${selectedArea.id}-route.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeView={radarStarted ? "radar" : "start"}
        onNavigate={(itemId) => {
          if (itemId === "start") {
            setRadarStarted(false);
            return;
          }
          setRadarStarted(true);
        }}
      />
      <div className="product-shell">
        <Topbar badge={topbarBadge} />
        {radarStarted ? (
          <main className="radar-workspace" aria-label="Job Radar workspace">
            <ControlPanel
              areas={displayAreas}
              mode={mode}
              metro={metro}
              selectedAreaId={selectedAreaId}
              selectedMode={selectedMode}
              setMode={setMode}
              setMetro={setMetro}
              setSelectedAreaId={setSelectedAreaId}
              setTradeId={setTradeId}
              tradeId={tradeId}
            />
            <section className="map-and-brief" aria-label="Money brief and territory map">
              <div className="question-row">
                <div>
                  <h1>{selectedMode.question}</h1>
                  <p>Week of June 29 - July 5, 2026</p>
                </div>
                <button className="secondary-button" type="button">
                  <RefreshCcw aria-hidden="true" />
                  Refresh signals
                </button>
              </div>
              <DataConfidence
                dataStatus={nycDataStatus}
                heatCount={nycData?.heat?.areas?.length}
                isNycMetro={isNycMetro}
              />
              <TerritoryMap
                areas={displayAreas}
                layerState={layerState}
                selectedArea={selectedArea}
                setLayerState={setLayerState}
                setSelectedAreaId={setSelectedAreaId}
              />
              <TodayMove
                campaign={campaign}
                isNycMetro={isNycMetro}
                selectedArea={selectedArea}
                trade={trade}
              />
              <MoneyBrief isNycMetro={isNycMetro} selectedArea={selectedArea} trade={trade} />
            </section>
            <ExecutionPanel
              campaign={campaign}
              ctaLabel={ctaLabel}
              exportRoute={exportRoute}
              isNycMetro={isNycMetro}
              openPilotModal={() => {
                setPilotSubmitted(false);
                setPilotModalOpen(true);
              }}
              selectedArea={selectedArea}
              targetRows={targetRows}
              trade={trade}
            />
          </main>
        ) : (
          <StartWorkspace
            metro={metro}
            mode={mode}
            onStart={() => setRadarStarted(true)}
            isNycMetro={isNycMetro}
            selectedMode={selectedMode}
            setMetro={setMetro}
            setMode={setMode}
            setTradeId={setTradeId}
            trade={trade}
            tradeId={tradeId}
          />
        )}
        {pilotModalOpen ? (
          <PilotModal
            ctaLabel={ctaLabel}
            isNycMetro={isNycMetro}
            metro={metro}
            onClose={() => setPilotModalOpen(false)}
            onSubmit={() => setPilotSubmitted(true)}
            selectedArea={selectedArea}
            submitted={pilotSubmitted}
            trade={trade}
          />
        ) : null}
      </div>
    </div>
  );
}

function Sidebar({ activeView, onNavigate }) {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="side-brand">
        <Radar aria-hidden="true" />
        <strong>Job Radar</strong>
      </div>
      <nav className="nav-list">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={`nav-item ${activeView === item.id ? "active" : ""}`}
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
      <div className="collapse-help">
        <button aria-label="Help" type="button">?</button>
        <span>Help</span>
      </div>
    </aside>
  );
}

function Topbar({ badge }) {
  return (
    <header className="topbar">
      <div className="wordmark">
        <strong>Job Radar</strong>
        <span>Know which neighborhoods to hit before you waste gas.</span>
      </div>
      <span className="demo-badge">{badge}</span>
      <div className="account-row">
        <select aria-label="Selected company" defaultValue="acme">
          <option value="acme">Acme Construction</option>
          <option value="ridge">Ridge & Beam Exterior</option>
        </select>
        <button aria-label="Help" className="round-button" type="button">?</button>
        <span className="avatar">AC</span>
      </div>
    </header>
  );
}

function StartWorkspace({
  isNycMetro,
  metro,
  mode,
  onStart,
  selectedMode,
  setMetro,
  setMode,
  setTradeId,
  trade,
  tradeId,
}) {
  return (
    <main className="start-workspace" aria-label="Job Radar start">
      <section className="start-hero" aria-labelledby="start-title">
        <div className="start-copy">
          <span className="demo-chip">Forecasting tool, not a scraper dashboard</span>
          <h1 id="start-title">What are you trying to attack?</h1>
          <p>
            Pick the trade, market, and job-to-be-done. Job Radar turns permits, property records,
            weather, market movement, and competition signals into a weekly action plan.
          </p>
        </div>

        <div className="start-controls" aria-label="Start controls">
          <Field label="Trade">
            <Select value={tradeId} onChange={(event) => setTradeId(event.target.value)}>
              {trades.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Metro">
            <Select value={metro} onChange={(event) => setMetro(event.target.value)}>
              {metros.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="start-action-row">
          <button className="launch-button start-button" type="button" onClick={onStart}>
            <Radar aria-hidden="true" />
            Show {selectedMode.label.toLowerCase()} radar
          </button>
          <p>
            {isNycMetro
              ? "New York City loads a public-data beta from DOB, NYC Open Data, and PLUTO. Real source collection stays on the operator side."
              : `Current prototype uses sample ${trade.label.toLowerCase()} intelligence for ${metro}. Real source collection stays on the operator side.`}
          </p>
        </div>

        <div className="mission-grid" aria-label="Choose an attack plan">
          {modes.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={`mission-card ${mode === item.id ? "selected" : ""}`}
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
              >
                <span><Icon aria-hidden="true" /></span>
                <strong>{item.label}</strong>
                <small>{item.startCopy}</small>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="signal-engine-panel" aria-label="Signal engine preview">
        <div className="engine-heading">
          <span className="operator-badge">Operator side</span>
          <h2>Signal engine</h2>
          <p>Your team connects sources, runs collectors, normalizes records, and publishes scored recommendations.</p>
        </div>
        <div className="engine-steps">
          {engineSteps.map(([label, copy], index) => (
            <div key={label}>
              <span>{index + 1}</span>
              <strong>{label}</strong>
              <p>{copy}</p>
            </div>
          ))}
        </div>
        <div className="engine-source-box">
          <h3>Source types</h3>
          <ul>
            <li><Database aria-hidden="true" /> Socrata, ArcGIS, Accela, OpenGov, CSV exports</li>
            <li><ClipboardList aria-hidden="true" /> Planning agendas, permits, code, demolitions</li>
            <li><Layers3 aria-hidden="true" /> Parcels, home age, sales, storms, competition</li>
          </ul>
        </div>
      </aside>
    </main>
  );
}

function DataConfidence({ dataStatus, heatCount, isNycMetro }) {
  const sources = isNycMetro ? nycSignalSources : signalSources;
  const confidenceLabel = isNycMetro ? (dataStatus === "ready" ? "82%" : "Loading") : "84%";
  const confidenceCopy = isNycMetro
    ? `NYC public-data beta built from official DOB permits/job filings, complaints, violations, and PLUTO source registry${heatCount ? ` across ${heatCount} scored areas` : ""}.`
    : "Sample pilot score built from permit momentum, property fit, event triggers, market movement, competition, and route density.";

  return (
    <section className="data-confidence" aria-label="Data confidence">
      <div className="confidence-score">
        <ShieldCheck aria-hidden="true" />
        <div>
          <span>Confidence</span>
          <strong>{confidenceLabel}</strong>
        </div>
      </div>
      <div className="confidence-copy">
        <h2>Why trust this recommendation?</h2>
        <p>{confidenceCopy}</p>
      </div>
      <div className="source-pill-row">
        {sources.slice(0, 4).map(([label, freshness]) => (
          <span className="source-pill" key={label}>
            <Sparkles aria-hidden="true" />
            {label}: {freshness}
          </span>
        ))}
      </div>
    </section>
  );
}

function ControlPanel({
  areas,
  mode,
  metro,
  selectedAreaId,
  selectedMode,
  setMode,
  setMetro,
  setSelectedAreaId,
  setTradeId,
  tradeId,
}) {
  return (
    <aside className="control-panel" aria-label="Radar controls">
      <Field label="Trade">
        <Select value={tradeId} onChange={(event) => setTradeId(event.target.value)}>
          {trades.map((trade) => (
            <option key={trade.id} value={trade.id}>
              {trade.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Metro">
        <Select value={metro} onChange={(event) => setMetro(event.target.value)}>
          {metros.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </Field>
      <section className="mode-stack" aria-label="Product modes">
        <h2>Mode</h2>
        {modes.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={`mode-button ${mode === item.id ? "selected" : ""}`}
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
        <p>{selectedMode.note}</p>
      </section>
      <section className="ranked-list" aria-label="Ranked areas">
        <div className="list-heading">
          <h2>Ranked areas</h2>
          <button type="button">Score <ChevronDown aria-hidden="true" /></button>
        </div>
        {areas.map((area) => (
          <button
            className={`area-card ${selectedAreaId === area.id ? "selected" : ""}`}
            key={area.id}
            type="button"
            onClick={() => setSelectedAreaId(area.id)}
          >
            <span className={`rank-badge ${area.color}`}>{area.rank}</span>
            <span className="area-main">
              <strong>{area.name}</strong>
              <small>{area.rank === 1 ? "Best area" : `ZIP ${area.zip}`}</small>
              <em>
                <Home aria-hidden="true" />
                {area.homes} {area.targetLabel ?? "homes"}
                <Signal aria-hidden="true" />
                {area.signal}
              </em>
            </span>
            <span className="area-score">
              <strong>{area.score}</strong>
              <small>{area.grade}</small>
            </span>
            <span className="details-link">View details</span>
          </button>
        ))}
      </section>
    </aside>
  );
}

function TerritoryMap({ areas, layerState, selectedArea, setLayerState, setSelectedAreaId }) {
  const [primary, secondary, tertiary] = areas.slice(0, 3);

  return (
    <section className="territory-map" aria-label="Territory map">
      <div className="map-tabs">
        <button className="selected" type="button">Map</button>
        <button type="button">Satellite</button>
      </div>
      <div className="signal-layers">
        {signalLayers.map(([label, color]) => (
          <label key={label}>
            <input
              checked={layerState[label]}
              type="checkbox"
              onChange={(event) =>
                setLayerState((current) => ({ ...current, [label]: event.target.checked }))
              }
            />
            <span className={`dot ${color}`} />
            {label}
          </label>
        ))}
      </div>
      <svg className="map-svg" role="img" viewBox="0 0 900 460" aria-label="Ranked local job radar map">
        <defs>
          <pattern id="streetGrid" width="42" height="42" patternUnits="userSpaceOnUse">
            <path d="M 42 0 L 0 0 0 42" fill="none" stroke="#e4e8eb" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="900" height="460" fill="#f7f8f8" />
        <rect width="900" height="460" fill="url(#streetGrid)" />
        <path d="M-20 245 C 170 210 250 240 375 205 S 630 125 935 155" className="road major" />
        <path d="M45 405 C 185 315 290 340 455 300 S 700 230 930 260" className="road" />
        <path d="M210 -20 C 270 105 290 185 255 455" className="road" />
        <path d="M640 -10 C 620 125 650 240 610 480" className="road" />
        <path d="M0 125 L910 125" className="road faint" />
        <path d="M0 335 L910 335" className="road faint" />

        <path
          className={`zone north-oak ${selectedArea.id === primary?.id ? "selected" : ""}`}
          d="M330 75 L485 45 L570 90 L565 205 L500 245 L380 220 L325 160 Z"
          onClick={() => primary && setSelectedAreaId(primary.id)}
        />
        <path
          className={`zone lakewood ${selectedArea.id === secondary?.id ? "selected" : ""}`}
          d="M170 215 L290 165 L400 215 L385 325 L245 365 L155 315 Z"
          onClick={() => secondary && setSelectedAreaId(secondary.id)}
        />
        <path
          className={`zone old-lake ${selectedArea.id === tertiary?.id ? "selected" : ""}`}
          d="M610 205 L750 175 L825 245 L790 345 L650 350 L585 280 Z"
          onClick={() => tertiary && setSelectedAreaId(tertiary.id)}
        />

        {layerState["Target homes"] && <SignalDots color="orange" x={365} y={78} />}
        {layerState["Recent sales"] && <SignalDots color="green" x={195} y={205} />}
        {layerState["Home age 25+ yrs"] && <SignalDots color="blue" x={635} y={218} />}
        {layerState["Recent permits"] && <SignalDots color="violet" x={405} y={112} sparse />}
        {layerState["Storm activity"] && (
          <path d="M340 50 C 395 25 510 35 575 92" className="storm-band" />
        )}
        {layerState["Code activity"] && (
          <g className="code-marks">
            <circle cx="288" cy="360" r="5" />
            <circle cx="545" cy="198" r="5" />
            <circle cx="712" cy="190" r="5" />
          </g>
        )}

        <path className="route-line" d="M228 360 C 255 300 250 250 338 235 S 522 290 548 190 S 500 86 430 88" />
        <circle className="route-stop home-stop" cx="225" cy="360" r="18" />
        <circle className="route-stop" cx="338" cy="235" r="8" />
        <circle className="route-stop" cx="548" cy="190" r="8" />
        <circle className="route-stop" cx="430" cy="88" r="8" />

        <MapLabel x={380} y={62} text={mapLabel(primary?.name ?? "Area 1")} tone="orange" />
        <MapLabel x={180} y={225} text={mapLabel(secondary?.name ?? "Area 2")} tone="green" />
        <MapLabel x={652} y={214} text={mapLabel(tertiary?.name ?? "Area 3")} tone="blue" />
        <RankPin x={450} y={135} rank={String(primary?.rank ?? 1)} tone="orange" />
        <RankPin x={260} y={270} rank={String(secondary?.rank ?? 2)} tone="green" />
        <RankPin x={690} y={285} rank={String(tertiary?.rank ?? 3)} tone="blue" />
      </svg>
      <div className="map-controls">
        <button aria-label="Zoom in" type="button">+</button>
        <button aria-label="Zoom out" type="button">-</button>
        <button aria-label="Center route" type="button"><Target aria-hidden="true" /></button>
      </div>
    </section>
  );
}

function TodayMove({ campaign, isNycMetro, selectedArea, trade }) {
  const heading = isNycMetro
    ? `Today's move: Review ${selectedArea.name} and build a ${campaign.doors}-record outreach list.`
    : `Today's move: Hit ${selectedArea.name} with a ${campaign.doors}-door ${trade.label.toLowerCase()} route and ${campaign.postcards} postcards.`;
  const why = isNycMetro
    ? "Why: DOB permits/job filings, activity growth, code signals, and PLUTO parcel context point to above-average construction activity."
    : `Why: ${permitReason(selectedArea, trade)}, recent sales, older homes, and route density all line up this week.`;

  return (
    <section className="today-move" aria-labelledby="today-move-heading">
      <div className="move-copy">
        <span className="demo-chip">
          {isNycMetro ? "NYC public-data beta - DOB / NYC Open Data / PLUTO" : "Sample intelligence - operator data pipeline"}
        </span>
        <h2 id="today-move-heading">{heading}</h2>
        <p>{why}</p>
      </div>
      <dl className="move-metrics">
        <div>
          <dt>Cost</dt>
          <dd>{currency(campaign.cost)}</dd>
        </div>
        <div>
          <dt>Goal</dt>
          <dd>{isNycMetro ? "Find active projects" : "Book 1 inspection"}</dd>
        </div>
        <div>
          <dt>Area</dt>
          <dd>ZIP {selectedArea.zip}</dd>
        </div>
      </dl>
    </section>
  );
}

function SignalDots({ color, sparse = false, x, y }) {
  const dots = [];
  const rows = sparse ? 4 : 7;
  const cols = sparse ? 5 : 8;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if ((row + col) % 5 === 0 && sparse) continue;
      dots.push(
        <circle
          className={`signal-dot ${color}`}
          cx={x + col * 22 + (row % 2) * 7}
          cy={y + row * 22}
          key={`${row}-${col}`}
          r="3.7"
        />,
      );
    }
  }
  return <g>{dots}</g>;
}

function MapLabel({ text, tone, x, y }) {
  const width = Math.max(78, Math.min(168, text.length * 7 + 22));

  return (
    <g className={`map-label ${tone}`}>
      <rect x={x} y={y} width={width} height="28" rx="4" />
      <text x={x + 10} y={y + 18}>{text}</text>
    </g>
  );
}

function RankPin({ rank, tone, x, y }) {
  return (
    <g className={`rank-pin ${tone}`}>
      <circle cx={x} cy={y} r="20" />
      <text x={x} y={y + 7}>{rank}</text>
    </g>
  );
}

function MoneyBrief({ isNycMetro, selectedArea, trade }) {
  const scoreTier = selectedArea.score >= 70 ? "high" : selectedArea.score >= 48 ? "good" : "fair";
  const scoreRows = scoreSignals[scoreTier];
  const targetLabel = selectedArea.targetLabel ?? "likely homes";

  return (
    <section className="money-brief" aria-labelledby="money-brief-heading">
      <div className="brief-title">
        <h2 id="money-brief-heading">Money brief</h2>
        <p>The facts that matter this week.</p>
      </div>
      <div className="brief-columns">
        <article className="best-area">
          <h3>{selectedArea.headline}</h3>
          <div className="area-title">
            <span className={`rank-badge ${selectedArea.color}`}>{selectedArea.rank}</span>
            <strong>{selectedArea.name} / ZIP {selectedArea.zip}</strong>
          </div>
          <h4>{selectedArea.homes} {targetLabel}</h4>
          <p>{selectedArea.summary}</p>
          <dl>
            {selectedArea.stats.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="green-line">
            {isNycMetro
              ? "Public DOB activity + PLUTO context = construction intelligence beta"
              : "High buyer activity + higher budgets = big opportunity"}
          </p>
        </article>
        <article className="why-here">
          <h3>Why here</h3>
          <ul>
            {selectedArea.reasons.map((reason, index) => (
              <li key={reason}>
                <CheckCircle2 aria-hidden="true" />
                <span>
                  {index === 0 && !isNycMetro
                    ? permitReason(selectedArea, trade)
                    : index === 2
                      ? reason.replace("25+ years old", trade.cycle)
                      : reason}
                </span>
              </li>
            ))}
          </ul>
        </article>
        <article className="target-route">
          <h3>Target route</h3>
          <p>{selectedArea.routeMeta}</p>
          <ol>
            {selectedArea.route.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <button className="text-button" type="button">
            Preview full route
            <ExternalLink aria-hidden="true" />
          </button>
        </article>
      </div>
      <details className="score-details">
        <summary>How this score was calculated</summary>
        <div>
          <strong>{selectedArea.name} score: {selectedArea.score}</strong>
          <p>
            {isNycMetro
              ? "Public-data score using recent DOB activity, growth, complaints/violations, trade mix, declared value, and source coverage."
              : "Simple pilot score using sample demand, timing, buyer, competition, and route-efficiency signals."}
          </p>
          <dl>
            {scoreRows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </details>
    </section>
  );
}

function ExecutionPanel({
  campaign,
  ctaLabel,
  exportRoute,
  isNycMetro,
  openPilotModal,
  selectedArea,
  targetRows,
  trade,
}) {
  const targetLabel = selectedArea.targetLabel ?? "homes";
  const tableTitle = isNycMetro
    ? `Sample projects (${targetRows.length})`
    : `Target homes (${selectedArea.homes})`;
  const routeTitle = isNycMetro
    ? `${campaign.doors}-Record Project Packet`
    : `${campaign.doors}-Door Route`;
  const routeNote = isNycMetro
    ? "DOB-backed construction outreach list"
    : "In-person door knocking";

  return (
    <aside className="execution-panel" aria-label="Campaign execution">
      <div className="execution-heading">
        <h2>Run this campaign</h2>
        <p>Execute the plan. Get jobs on the books.</p>
      </div>

      <section className="campaign-card">
        <h3>Recommended campaign</h3>
        <CampaignItem icon={Mail} title={`${campaign.postcards} Postcards`} note="Homeowner offer postcard" />
        <CampaignItem icon={MapPin} title={campaign.radius} note="Google Local Services Ad" />
        <CampaignItem icon={Route} title={routeTitle} note={routeNote} />
      </section>

      <section className="postcard-preview">
        <div>
          <h3>Postcard preview</h3>
          <button className="text-button" type="button">Edit</button>
        </div>
        <article>
          <strong>{trade.postcard}</strong>
          <p>{trade.offer}</p>
          <span>Call or scan to book a fast inspection.</span>
          <em>Your logo</em>
        </article>
      </section>

      <section className="budget-card">
        <h3>Budget & returns</h3>
        <dl>
          <div>
            <dt>Estimated cost</dt>
            <dd>{currency(campaign.cost)}</dd>
          </div>
          <div>
            <dt>Target job value</dt>
            <dd>{trade.jobRange}</dd>
          </div>
          <div>
            <dt>Break-even</dt>
            <dd>1 booked inspection</dd>
          </div>
          <div>
            <dt>Upside</dt>
            <dd className="green">One job can pay for 20+ campaigns</dd>
          </div>
        </dl>
        <button className="launch-button" type="button" onClick={openPilotModal}>
          <Navigation aria-hidden="true" />
          {ctaLabel}
        </button>
        <button className="secondary-button full-width" type="button" onClick={exportRoute}>
          <Download aria-hidden="true" />
          Export route
        </button>
        <p className="compliance-note">Outreach guardrail: direct mail, ads, and door route only. No cold automated SMS.</p>
      </section>

      <section className="homes-table">
        <div>
          <h3>{tableTitle}</h3>
          <button className="text-button" type="button">Export leads</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Address</th>
              <th>{isNycMetro ? "Date" : "Year"}</th>
              <th>Sig</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {targetRows.map(([address, year, note]) => (
              <tr key={address}>
                <td>{address}</td>
                <td>{year}</td>
                <td><span className="mini-signal" /></td>
                <td>{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="view-all" type="button">View all {selectedArea.homes} {targetLabel}</button>
      </section>
    </aside>
  );
}

function PilotModal({ ctaLabel, isNycMetro, metro, onClose, onSubmit, selectedArea, submitted, trade }) {
  const [form, setForm] = useState({
    name: "",
    company: "Acme Construction",
    trade: trade.label,
    metro,
    spend: "$1,000-$3,000",
    leadSource: "Referrals",
    runCampaign: "Yes - next week",
    trustData: "",
    email: "",
    phone: "",
  });

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="pilot-modal" aria-labelledby="pilot-title" role="dialog" aria-modal="true">
        <button className="modal-close" type="button" aria-label="Close pilot request" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
        {submitted ? (
          <div className="pilot-success">
            <ShieldCheck aria-hidden="true" />
            <h2 id="pilot-title">Pilot request captured</h2>
            <p>
              Demo only. In production this would route a real-market pilot request for {form.company || "your company"} in {selectedArea.name}.
            </p>
            <button className="launch-button" type="button" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <div className="modal-heading">
              <span className="demo-chip">{isNycMetro ? "NYC public-data beta" : "Signal engine demo"}</span>
              <h2 id="pilot-title">{ctaLabel}</h2>
              <p>
                {isNycMetro
                  ? "Tell us what NYC construction intelligence you need. The current pack uses official public DOB, NYC Open Data, and PLUTO sources."
                  : "Tell us where you work. We will validate whether real local signals can support this campaign."}
              </p>
            </div>
            <form className="pilot-form" onSubmit={handleSubmit}>
              <label>
                Name
                <input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Marshall Wilkinson" />
              </label>
              <label>
                Company
                <input value={form.company} onChange={(event) => updateField("company", event.target.value)} />
              </label>
              <label>
                Trade
                <input value={form.trade} onChange={(event) => updateField("trade", event.target.value)} />
              </label>
              <label>
                Metro
                <input value={form.metro} onChange={(event) => updateField("metro", event.target.value)} />
              </label>
              <label>
                Monthly marketing spend
                <select value={form.spend} onChange={(event) => updateField("spend", event.target.value)}>
                  <option>$0-$1,000</option>
                  <option>$1,000-$3,000</option>
                  <option>$3,000-$7,500</option>
                  <option>$7,500+</option>
                </select>
              </label>
              <label>
                Primary lead source
                <select value={form.leadSource} onChange={(event) => updateField("leadSource", event.target.value)}>
                  <option>Referrals</option>
                  <option>Google / SEO</option>
                  <option>Facebook / Instagram</option>
                  <option>HomeAdvisor / Angi</option>
                  <option>Door knocking / direct mail</option>
                  <option>Other</option>
                </select>
              </label>
              <label>
                Would you run this campaign if the data was real?
                <select value={form.runCampaign} onChange={(event) => updateField("runCampaign", event.target.value)}>
                  <option>Yes - next week</option>
                  <option>Maybe - need proof</option>
                  <option>No</option>
                </select>
              </label>
              <label className="wide-field">
                What data would you need to trust this?
                <textarea
                  value={form.trustData}
                  onChange={(event) => updateField("trustData", event.target.value)}
                  placeholder="Permits, home age, storm reports, recent sales, proof it booked jobs..."
                  rows="3"
                />
              </label>
              <label>
                Email
                <input value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@company.com" type="email" />
              </label>
              <label>
                Phone
                <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="214-555-0199" type="tel" />
              </label>
              <button className="launch-button" type="submit">{ctaLabel}</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

function CampaignItem({ icon: Icon, note, title }) {
  return (
    <div className="campaign-item">
      <span><Icon aria-hidden="true" /></span>
      <div>
        <strong>{title}</strong>
        <small>{note}</small>
      </div>
      <button type="button">Edit</button>
    </div>
  );
}

function Field({ children, label }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Select({ children, onChange, value }) {
  return (
    <span className="select-wrap">
      <select value={value} onChange={onChange}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" />
    </span>
  );
}

async function fetchPublicJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

function mapLabel(value) {
  const text = String(value ?? "Area");
  return text.length > 18 ? `${text.slice(0, 15)}...` : text;
}

function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function permitReason(selectedArea, trade) {
  const permits = selectedArea.stats.find(([label]) => label === "Active permits (30 days)")?.[1] ?? "Several";
  return `${permits} ${trade.signalLabel} pulled in the last 30 days`;
}

export default App;
