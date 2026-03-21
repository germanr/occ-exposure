import React, { useState, useEffect, useMemo, useCallback } from "react";
import _ from "lodash";
import OCCUPATIONS_RAW from "./src/occupations.json";
import SUMMARIES from "./src/summaries.json";

const OCCUPATIONS = OCCUPATIONS_RAW.map(o => ({
  ...o,
  employmentShare: o.employmentShare || 0,
}));

const TOTAL_TASKS = OCCUPATIONS.reduce((sum, o) => sum + (o.taskCount || 0), 0);

// Lazy-load tasks.json — not bundled, fetched on demand from public/data/
let ALL_TASKS = null;
const _tasksPromise = fetch(`${import.meta.env.BASE_URL}data/tasks.json`)
  .then(r => r.json())
  .then(d => { ALL_TASKS = d; return d; });

// ─── Formatters ───
const fmt = (n) => {
  if (n == null) return "—";
  return n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(0) + "K" : String(n);
};
const fmtFull = (n) => (n != null ? n.toLocaleString() : "—");
const fmtPct = (n) => (n != null ? (n * 100).toFixed(0) + "%" : "—");
const fmtWage = (n) => (n != null ? "$" + n.toLocaleString() : "—");

// ─── Palette ───
const C = {
  bg: "#F5F2ED",
  surface: "#FFFFFF",
  text: "#1A1A1A",
  textSec: "#6B6B6B",
  textTer: "#A0A0A0",
  accent: "#1A1A1A",
  accentLight: "#F0EEEA",
  border: "#E0DDD8",
  borderHover: "#C5C0B8",
  borderLight: "#EBE7E1",
  auto: "#C53030",
  aug: "#276749",
  barFill: "#1A1A1A",
};

const F = {
  sans: "Inter, -apple-system, 'Segoe UI', sans-serif",
  mono: "'Share Tech Mono', 'JetBrains Mono', 'Consolas', monospace",
};

const GCSS = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap');
* { box-sizing: border-box; margin: 0; }
body { background: ${C.bg}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
::selection { background: #1A1A1A; color: #FFF; }
@keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
@media (max-width: 768px) {
  .grid-main { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important; }
  .detail-layout { max-width: 100% !important; padding-left: 20px !important; padding-right: 20px !important; }
  .hero-stats { gap: 16px !important; }
  .controls-row { flex-direction: column; align-items: stretch !important; }
  .controls-row input { width: 100% !important; }
  .footer-grid { grid-template-columns: 1fr !important; }
  .exposure-grid { grid-template-columns: 1fr !important; }
  .quiz-cards { flex-direction: column !important; align-items: stretch !important; }
  .quiz-cards > div { max-width: 100% !important; }
  .quiz-tasks { grid-template-columns: 1fr !important; }
}
@media (max-width: 480px) {
  .grid-main { grid-template-columns: 1fr !important; gap: 6px !important; }
  .hero-title { font-size: 28px !important; }
}
`;

// ─── SOC minor group (XX-X) → image mapping (broad groups fall back to this) ───
const MINOR_IMAGES = {
  "11-1": "minor-111-top-executives.jpg", "11-2": "minor-112-advertising-marketing-managers.jpg",
  "11-3": "minor-113-operations-managers.jpg", "11-9": "minor-119-other-managers.jpg",
  "13-1": "minor-131-business-operations.jpg", "13-2": "minor-132-financial-specialists.jpg",
  "15-1": "minor-151-computer-occupations.jpg", "15-2": "minor-152-mathematical-science.jpg",
  "17-1": "minor-171-architects-surveyors.jpg", "17-2": "minor-172-engineers.jpg",
  "17-3": "minor-173-drafters-technicians.jpg",
  "19-1": "minor-191-life-scientists.jpg", "19-2": "minor-192-physical-scientists.jpg",
  "19-3": "minor-193-social-scientists.jpg", "19-4": "minor-194-life-physical-science-technici.jpg",
  "19-5": "minor-195-occupational-health.jpg",
  "21-1": "minor-211-counselors-social-workers.jpg", "21-2": "minor-212-religious-workers.jpg",
  "23-1": "minor-231-lawyers-judges.jpg", "23-2": "minor-232-legal-support.jpg",
  "25-1": "minor-251-postsecondary-teachers.jpg", "25-2": "minor-252-k-12-teachers.jpg",
  "25-3": "minor-253-other-teachers.jpg", "25-4": "minor-254-librarians-curators.jpg",
  "25-9": "minor-259-other-education-workers.jpg",
  "27-1": "minor-271-art-design.jpg", "27-2": "minor-272-entertainers-performers.jpg",
  "27-3": "minor-273-media-communication.jpg", "27-4": "minor-274-media-technicians.jpg",
  "29-1": "minor-291-health-diagnosing-treating.jpg", "29-2": "minor-292-health-technologists.jpg",
  "29-9": "minor-299-other-healthcare-practitioner.jpg",
  "31-1": "minor-311-nursing-home-health-aides.jpg", "31-2": "minor-312-therapy-assistants.jpg",
  "31-9": "minor-319-other-healthcare-support.jpg",
  "33-1": "minor-331-protective-service-superviso.jpg", "33-2": "minor-332-firefighters.jpg",
  "33-3": "minor-333-law-enforcement.jpg", "33-9": "minor-339-other-protective-service.jpg",
  "35-1": "minor-351-food-service-supervisors-che.jpg", "35-2": "minor-352-cooks.jpg",
  "35-3": "minor-353-food-beverage-serving.jpg", "35-9": "minor-359-other-food-service.jpg",
  "37-1": "minor-371-building-grounds-supervisor.jpg", "37-2": "minor-372-janitors-cleaners.jpg",
  "37-3": "minor-373-grounds-maintenance.jpg",
  "39-1": "minor-391-personal-service-supervisor.jpg", "39-2": "minor-392-animal-care.jpg",
  "39-3": "minor-393-entertainment-attendants.jpg", "39-4": "minor-394-funeral-service.jpg",
  "39-5": "minor-395-personal-appearance.jpg", "39-6": "minor-396-baggage-concierge.jpg",
  "39-7": "minor-397-tour-guides.jpg", "39-9": "minor-399-other-personal-care.jpg",
  "41-1": "minor-411-sales-supervisors.jpg", "41-2": "minor-412-retail-sales.jpg",
  "41-3": "minor-413-financial-service-sales.jpg", "41-4": "minor-414-wholesale-sales.jpg",
  "41-9": "minor-419-other-sales.jpg",
  "43-1": "minor-431-office-supervisors.jpg", "43-2": "minor-432-communications-equipment-ope.jpg",
  "43-3": "minor-433-financial-clerks.jpg", "43-4": "minor-434-information-record-clerks.jpg",
  "43-5": "minor-435-material-recording-schedulin.jpg", "43-6": "minor-436-secretaries-assistants.jpg",
  "43-9": "minor-439-other-office-support.jpg",
  "45-1": "minor-451-farming-supervisors.jpg", "45-2": "minor-452-agricultural-workers.jpg",
  "45-3": "minor-453-fishing-hunting.jpg", "45-4": "minor-454-forest-logging.jpg",
  "47-1": "minor-471-construction-supervisors.jpg", "47-2": "minor-472-construction-trades.jpg",
  "47-3": "minor-473-construction-helpers.jpg", "47-4": "minor-474-other-construction.jpg",
  "47-5": "minor-475-extraction-workers.jpg",
  "49-1": "minor-491-maintenance-supervisors.jpg", "49-2": "minor-492-electrical-telecom-installer.jpg",
  "49-3": "minor-493-vehicle-mechanics.jpg", "49-9": "minor-499-other-maintenance-repair.jpg",
  "51-1": "minor-511-production-supervisors.jpg", "51-2": "minor-512-assemblers-fabricators.jpg",
  "51-3": "minor-513-food-processing.jpg", "51-4": "minor-514-metal-plastic-workers.jpg",
  "51-5": "minor-515-printing-workers.jpg", "51-6": "minor-516-textile-workers.jpg",
  "51-7": "minor-517-woodworkers.jpg", "51-8": "minor-518-plant-system-operators.jpg",
  "51-9": "minor-519-other-production.jpg",
  "53-1": "minor-531-transportation-supervisors.jpg", "53-2": "minor-532-air-transportation.jpg",
  "53-3": "minor-533-motor-vehicle-operators.jpg", "53-4": "minor-534-rail-transportation.jpg",
  "53-5": "minor-535-water-transportation.jpg", "53-6": "minor-536-other-transportation.jpg",
  "53-7": "minor-537-material-movers.jpg",
  "55-1": "minor-551-military-officers.jpg", "55-2": "minor-552-military-supervisors.jpg",
  "55-3": "minor-553-military-enlisted.jpg",
};

// Gradient fallbacks by major group
const MAJOR_GRADIENTS = {
  "11": "linear-gradient(135deg, #2D3436, #636E72)", "13": "linear-gradient(135deg, #0C2461, #1E3799)",
  "15": "linear-gradient(135deg, #0A3D62, #3C6382)", "17": "linear-gradient(135deg, #6D4C41, #8D6E63)",
  "19": "linear-gradient(135deg, #1B5E20, #388E3C)", "21": "linear-gradient(135deg, #4A148C, #7B1FA2)",
  "23": "linear-gradient(135deg, #1A237E, #303F9F)", "25": "linear-gradient(135deg, #B71C1C, #D32F2F)",
  "27": "linear-gradient(135deg, #880E4F, #C2185B)", "29": "linear-gradient(135deg, #004D40, #00796B)",
  "31": "linear-gradient(135deg, #00695C, #00897B)", "33": "linear-gradient(135deg, #263238, #455A64)",
  "35": "linear-gradient(135deg, #E65100, #F57C00)", "37": "linear-gradient(135deg, #33691E, #558B2F)",
  "39": "linear-gradient(135deg, #AD1457, #D81B60)", "41": "linear-gradient(135deg, #4E342E, #6D4C41)",
  "43": "linear-gradient(135deg, #37474F, #546E7A)", "45": "linear-gradient(135deg, #2E7D32, #43A047)",
  "47": "linear-gradient(135deg, #BF360C, #E64A19)", "49": "linear-gradient(135deg, #424242, #616161)",
  "51": "linear-gradient(135deg, #1565C0, #1976D2)", "53": "linear-gradient(135deg, #283593, #3949AB)",
  "55": "linear-gradient(135deg, #1B3A2D, #2E5A47)",
};

const MINOR_LABELS = {
  "11-1": "Top Executives", "11-2": "Marketing & Advertising Managers", "11-3": "Operations Managers", "11-9": "Other Managers",
  "13-1": "Business Operations", "13-2": "Financial Specialists",
  "15-1": "Computer & IT", "15-2": "Data & Mathematical Science",
  "17-1": "Architects & Surveyors", "17-2": "Engineers", "17-3": "Drafters & Technicians",
  "19-1": "Life Scientists", "19-2": "Physical Scientists", "19-3": "Social Scientists", "19-4": "Science Technicians", "19-5": "Occupational Health",
  "21-1": "Counselors & Social Workers", "21-2": "Religious Workers",
  "23-1": "Lawyers & Judges", "23-2": "Legal Support",
  "25-1": "College Professors", "25-2": "K-12 Teachers", "25-3": "Other Teachers & Tutors", "25-4": "Librarians & Curators", "25-9": "Other Education",
  "27-1": "Art & Design", "27-2": "Entertainers & Performers", "27-3": "Media & Communication", "27-4": "Media Technicians",
  "29-1": "Doctors, Nurses & Pharmacists", "29-2": "Health Technicians", "29-9": "Other Healthcare",
  "31-1": "Nursing & Home Health Aides", "31-2": "Therapy Assistants", "31-9": "Other Healthcare Support",
  "33-1": "Protective Service Supervisors", "33-2": "Firefighters", "33-3": "Law Enforcement", "33-9": "Security & Other Protective",
  "35-1": "Chefs & Food Service Managers", "35-2": "Cooks", "35-3": "Waiters & Bartenders", "35-9": "Other Food Service",
  "37-1": "Building & Grounds Supervisors", "37-2": "Janitors & Cleaners", "37-3": "Landscaping & Grounds",
  "39-1": "Personal Service Supervisors", "39-2": "Animal Care", "39-3": "Entertainment & Recreation", "39-4": "Funeral Service",
  "39-5": "Hairdressers & Personal Appearance", "39-6": "Hotel & Hospitality", "39-7": "Tour Guides", "39-9": "Childcare & Recreation",
  "41-1": "Sales Supervisors", "41-2": "Retail Sales", "41-3": "Insurance & Financial Sales", "41-4": "Wholesale Sales", "41-9": "Real Estate & Other Sales",
  "43-1": "Office Supervisors", "43-2": "Communications Operators", "43-3": "Financial Clerks", "43-4": "Customer Service & Records",
  "43-5": "Shipping & Scheduling", "43-6": "Secretaries & Assistants", "43-9": "Other Office Support",
  "45-1": "Farm Supervisors", "45-2": "Farmworkers", "45-3": "Fishing & Hunting", "45-4": "Logging & Forestry",
  "47-1": "Construction Supervisors", "47-2": "Construction Trades", "47-3": "Construction Helpers", "47-4": "Inspectors & Highway Maintenance", "47-5": "Mining & Extraction",
  "49-1": "Maintenance Supervisors", "49-2": "Electrical & Telecom Repair", "49-3": "Vehicle Mechanics", "49-9": "Other Repair & Maintenance",
  "51-1": "Production Supervisors", "51-2": "Assemblers", "51-3": "Food Processing", "51-4": "Metal & Plastic Workers",
  "51-5": "Printing Workers", "51-6": "Textile Workers", "51-7": "Woodworkers", "51-8": "Plant & System Operators", "51-9": "Other Production",
  "53-1": "Transportation Supervisors", "53-2": "Pilots & Flight Crew", "53-3": "Truck & Delivery Drivers",
  "53-4": "Rail Workers", "53-5": "Ship & Boat Workers", "53-6": "Other Transportation", "53-7": "Warehouse & Material Movers",
  "55-1": "Military Officers", "55-2": "Military Supervisors", "55-3": "Military Enlisted",
};

function getImageInfo(soc) {
  const minor = soc.substring(0, 4);
  const major = soc.substring(0, 2);
  // Try occupation-specific image first (top 100 by employment)
  const occImg = `occ-${soc.replace(".00", "").replace("-", "")}.jpg`;
  const minorImg = MINOR_IMAGES[minor] || null;
  const label = MINOR_LABELS[minor] || "Other";
  const gradient = MAJOR_GRADIENTS[major] || "linear-gradient(135deg, #37474F, #546E7A)";
  return { occImg, minorImg, label, gradient };
}

// ─── Image with 3-tier fallback: occupation → minor group → gradient ───
function CatImage({ soc, height = 140, style = {} }) {
  const [tier, setTier] = useState(0); // 0=occ, 1=minor, 2=gradient
  const info = getImageInfo(soc);
  const srcs = [info.occImg, info.minorImg].filter(Boolean);

  if (tier >= srcs.length || srcs.length === 0) {
    return (
      <div style={{
        height, background: info.gradient, borderRadius: "6px 6px 0 0",
        display: "flex", alignItems: "flex-end", padding: "12px 16px",
        ...style,
      }}>
        <span style={{ fontSize: 11, fontFamily: F.mono, color: "rgba(255,255,255,0.7)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
          {info.label}
        </span>
      </div>
    );
  }

  return (
    <div style={{ height, position: "relative", overflow: "hidden", borderRadius: style.borderRadius || "6px 6px 0 0", ...style }}>
      <img
        src={`${import.meta.env.BASE_URL}images/${srcs[tier]}`}
        alt={info.label}
        onError={() => setTier(t => t + 1)}
        loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "brightness(0.75) saturate(1.1)" }}
      />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "24px 16px 10px",
        background: "linear-gradient(transparent, rgba(0,0,0,0.5))",
      }}>
        <span style={{ fontSize: 10, fontFamily: F.mono, color: "rgba(255,255,255,0.8)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
          {info.label}
        </span>
      </div>
    </div>
  );
}

// ─── Exposure bar for cards ───
function ExposureBar({ value }) {
  if (value == null) return null;
  return (
    <div style={{ height: 3, borderRadius: 2, background: C.borderLight, width: "100%", overflow: "hidden", marginTop: 2 }}>
      <div style={{ height: 3, borderRadius: 2, background: C.text, opacity: 0.4, width: `${Math.min(value * 100, 100)}%`, transition: "width 0.3s" }} />
    </div>
  );
}

// ─── Labeled exposure bar for detail view ───
function Bar({ value, max, color, label, sublabel }) {
  if (value == null) return null;
  const pct = Math.min((value / (max || 1)) * 100, 100);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: C.textSec, fontFamily: F.sans }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: F.mono }}>{fmtPct(value)}</span>
      </div>
      <div style={{ height: 4, background: C.borderLight, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: 4, background: color, borderRadius: 2, width: `${pct}%`, transition: "width 0.5s cubic-bezier(.22,1,.36,1)" }} />
      </div>
      {sublabel && <div style={{ fontSize: 11, color: C.textTer, marginTop: 3, fontFamily: F.sans }}>{sublabel}</div>}
    </div>
  );
}

// ─── Grid Tile ───
function Tile({ occ, onClick, highlighted, idx, search }) {
  const [h, setH] = useState(false);
  const isHl = highlighted === occ.soc;
  const ex = occ.exposure || {};
  const mainExposure = ex.eloundou_beta ?? ex.genoe ?? ex.felten ?? null;
  const q = search ? search.toLowerCase() : "";
  const nameMatches = !q || occ.title.toLowerCase().includes(q);
  const matchingAlt = !nameMatches && q && occ.altTitles ? occ.altTitles.find(a => a.toLowerCase().includes(q)) : null;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: isHl ? C.accentLight : C.surface,
        border: `1px solid ${h || isHl ? C.borderHover : C.border}`,
        borderRadius: 6,
        cursor: "pointer",
        transition: "all 0.15s ease",
        position: "relative",
        transform: h ? "translateY(-2px)" : "none",
        boxShadow: h ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
        animation: `fadeUp 0.35s cubic-bezier(.22,1,.36,1) ${Math.min(idx * 0.02, 0.4)}s both`,
        overflow: "hidden",
      }}
    >
      <CatImage soc={occ.soc} height={100} />
      <div style={{ padding: "12px 16px 14px" }}>
        <div style={{ fontSize: 10, color: C.textTer, fontFamily: F.mono, letterSpacing: "0.5px", marginBottom: 4 }}>{occ.soc.replace(".00", "")}</div>
        <div style={{
          fontSize: 14, fontWeight: 600, fontFamily: F.sans, lineHeight: 1.35, color: C.text, marginBottom: 6,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          minHeight: 38,
        }}>{occ.title}</div>
        {matchingAlt && <div style={{ fontSize: 11, color: C.textTer, fontFamily: F.sans, marginBottom: 2, fontStyle: "italic" }}>also known as: {matchingAlt}</div>}
        <div style={{ fontSize: 12, color: C.textSec, fontFamily: F.sans, marginBottom: 6 }}>
          {fmt(occ.employment)} workers{occ.meanWage != null ? ` · ${fmtWage(occ.meanWage)}` : ""}
        </div>
        <ExposureBar value={mainExposure} />
      </div>
    </div>
  );
}

// ─── Sort option ───
function SortOption({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "4px 0", border: "none", background: "none", fontSize: 12, cursor: "pointer",
      color: active ? C.text : C.textTer, fontWeight: active ? 600 : 400, fontFamily: F.sans,
      transition: "color 0.12s", borderBottom: active ? `1.5px solid ${C.text}` : "1.5px solid transparent",
      letterSpacing: "0.3px",
    }}>{label}</button>
  );
}

// ─────────────────────────────────────
// Quiz Game
// ─────────────────────────────────────
const QUIZ_POOL = OCCUPATIONS.filter(o => {
  const ex = o.exposure || {};
  return (ex.eloundou_beta != null) && o.employment != null;
});

function getExposure(occ) {
  const ex = occ.exposure || {};
  return ex.eloundou_beta ?? null;
}

function pickPair(prev) {
  const pool = QUIZ_POOL;
  let a, b, attempts = 0;
  do {
    a = pool[Math.floor(Math.random() * pool.length)];
    b = pool[Math.floor(Math.random() * pool.length)];
    attempts++;
  } while ((a.soc === b.soc || Math.abs(getExposure(a) - getExposure(b)) < 0.03 || (prev && (a.soc === prev.soc || b.soc === prev.soc))) && attempts < 100);
  return [a, b];
}

function QuizView({ onBack }) {
  const [[occA, occB], setPair] = useState(() => pickPair(null));
  const [picked, setPicked] = useState(null); // "a" | "b" | null
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [total, setTotal] = useState(0);
  const [correct, setCorrect] = useState(0);

  const expA = getExposure(occA);
  const expB = getExposure(occB);
  const answer = expA >= expB ? "a" : "b";
  const isCorrect = picked === answer;

  const handlePick = (side) => {
    if (picked) return;
    setPicked(side);
    setTotal(t => t + 1);
    if (side === answer) {
      setStreak(s => { const n = s + 1; setBest(b => Math.max(b, n)); return n; });
      setCorrect(c => c + 1);
    } else {
      setStreak(0);
    }
  };

  const handleNext = () => {
    setPicked(null);
    setPair(pickPair(occA));
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "ArrowLeft") { if (!picked) handlePick("a"); }
      else if (e.key === "ArrowRight") { if (!picked) handlePick("b"); }
      else if (e.key === "Enter" || e.key === " ") { if (picked) { e.preventDefault(); handleNext(); } }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const cardStyle = (side) => {
    const isPicked = picked === side;
    const isAnswer = side === answer;
    let border = C.border;
    if (picked) {
      if (isAnswer) border = "#276749";
      else if (isPicked && !isAnswer) border = "#C53030";
    }
    return {
      flex: 1, background: C.surface, border: `2px solid ${border}`,
      borderRadius: 8, cursor: picked ? "default" : "pointer", overflow: "hidden",
      transition: "all 0.2s ease", transform: !picked && isPicked ? "none" : "none",
      boxShadow: picked && isAnswer ? "0 0 0 2px #27674933" : "none",
      maxWidth: 400,
    };
  };

  const occ = (side) => side === "a" ? occA : occB;
  const exp = (side) => side === "a" ? expA : expB;

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 32px" }}>
      <div style={{ padding: "48px 0 24px", animation: "fadeUp 0.4s cubic-bezier(.22,1,.36,1) both" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.textSec, fontFamily: F.sans, padding: 0, marginBottom: 20 }}>
          ← Back to explorer
        </button>
        <h1 style={{ fontSize: 36, fontWeight: 700, fontFamily: F.sans, letterSpacing: "-0.03em", margin: "0 0 8px", lineHeight: 1.1 }}>
          Which job is more exposed to AI?
        </h1>
        <p style={{ fontSize: 14, color: C.textSec, margin: "0 0 24px", lineHeight: 1.6 }}>
          Two occupations, one question. Pick the one you think has higher AI exposure.
        </p>
        <div style={{ display: "flex", gap: 16, fontSize: 13, color: C.textTer, fontFamily: F.mono, letterSpacing: "0.3px", marginBottom: 32 }}>
          <span>Streak: <strong style={{ color: C.text }}>{streak}</strong></span>
          <span>Best: <strong style={{ color: C.text }}>{best}</strong></span>
          <span>Score: <strong style={{ color: C.text }}>{correct}/{total}</strong></span>
        </div>
      </div>

      <div className="quiz-cards" style={{ display: "flex", gap: 20, marginBottom: 32, animation: picked ? "none" : "fadeUp 0.35s cubic-bezier(.22,1,.36,1) both" }}>
        {["a", "b"].map(side => (
          <div key={side} style={cardStyle(side)} onClick={() => handlePick(side)}
            onMouseEnter={e => { if (!picked) e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = picked ? e.currentTarget.style.boxShadow : "0 6px 20px rgba(0,0,0,0.1)"; }}
            onMouseLeave={e => { if (!picked) e.currentTarget.style.transform = "none"; if (!picked) e.currentTarget.style.boxShadow = "none"; }}
          >
            <CatImage soc={occ(side).soc} height={160} />
            <div style={{ padding: "16px 20px 20px" }}>
              <div style={{ fontSize: 10, color: C.textTer, fontFamily: F.mono, letterSpacing: "0.5px", marginBottom: 4 }}>{occ(side).soc.replace(".00", "")}</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: F.sans, lineHeight: 1.25, color: C.text, marginBottom: 8 }}>{occ(side).title}</div>
              <div style={{ fontSize: 13, color: C.textSec, fontFamily: F.sans }}>
                {fmt(occ(side).employment)} workers · {fmtWage(occ(side).meanWage)}
              </div>
              {picked && (
                <div style={{ marginTop: 16, animation: "fadeUp 0.3s cubic-bezier(.22,1,.36,1) both" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: C.textSec }}>AI exposure</span>
                    <span style={{ fontSize: 18, fontWeight: 700, fontFamily: F.mono, color: side === answer ? "#276749" : C.text }}>{fmtPct(exp(side))}</span>
                  </div>
                  <div style={{ height: 8, background: C.accentLight, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(exp(side) ?? 0) * 100}%`, background: side === answer ? "#276749" : C.barFill, borderRadius: 4, transition: "width 0.6s cubic-bezier(.22,1,.36,1)" }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginBottom: 16, fontSize: 12, fontFamily: F.mono, color: C.textTer }}>
        {picked ? "Press Enter for next pair" : "\u2190 \u2192 to pick \u00b7 Enter for next"}
      </div>

      {picked && (() => {
        const winner = occ(answer);
        const loser = occ(answer === "a" ? "b" : "a");
        const winExp = exp(answer);
        const loseExp = exp(answer === "a" ? "b" : "a");
        const tasksA = ALL_TASKS[occA.soc] || [];
        const tasksB = ALL_TASKS[occB.soc] || [];
        const exA = occA.exposure || {};
        const exB = occB.exposure || {};

        const indexLabels = [
          ["eloundou_beta", "AI + tools (Eloundou)"],
          ["eloundou_alpha", "AI alone (Eloundou)"],
          ["aei_augmentation", "AI as helper (Anthropic)"],
          ["aei_automation", "AI as replacement (Anthropic)"],
          ["felten", "AI–skill overlap (Felten)"],
          ["genoe", "Generative AI (OECD)"],
          ["sml", "Machine learning (Brynjolfsson)"],
        ];

        return (
          <div style={{ animation: "fadeUp 0.3s cubic-bezier(.22,1,.36,1) both", marginBottom: 48 }}>
            {/* Result banner */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: F.sans, marginBottom: 8, color: isCorrect ? "#276749" : "#C53030" }}>
                {isCorrect ? "Correct!" : "Not quite!"}
              </div>
              <p style={{ fontSize: 14, color: C.textSec, maxWidth: 600, margin: "0 auto" }}>
                <strong>{winner.title}</strong> ({fmtPct(winExp)}) is more exposed to AI than <strong>{loser.title}</strong> ({fmtPct(loseExp)}).
              </p>
            </div>

            {/* Next button — immediately after banner */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <button onClick={handleNext} style={{
                padding: "10px 28px", border: `1px solid ${C.text}`, borderRadius: 4, fontSize: 14,
                fontWeight: 600, cursor: "pointer", background: C.text, color: C.bg,
                fontFamily: F.sans, letterSpacing: "0.3px",
              }}>Next pair →</button>
            </div>

            {/* Exposure comparison table */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 24px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: C.textTer, marginBottom: 14, letterSpacing: "0.5px", fontFamily: F.mono, textTransform: "uppercase" }}>Exposure indices compared</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px 16px", alignItems: "center" }}>
                <div style={{ fontSize: 11, color: C.textTer, fontFamily: F.mono }}>Index</div>
                <div style={{ fontSize: 11, color: C.textTer, fontFamily: F.mono, textAlign: "right", minWidth: 80 }}>{occA.title.length > 20 ? occA.title.slice(0, 18) + "…" : occA.title}</div>
                <div style={{ fontSize: 11, color: C.textTer, fontFamily: F.mono, textAlign: "right", minWidth: 80 }}>{occB.title.length > 20 ? occB.title.slice(0, 18) + "…" : occB.title}</div>
                {indexLabels.map(([key, label]) => {
                  const vA = exA[key], vB = exB[key];
                  if (vA == null && vB == null) return null;
                  const higherA = (vA ?? 0) >= (vB ?? 0);
                  return (
                    <React.Fragment key={key}>
                      <div style={{ fontSize: 12, color: C.textSec }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: higherA ? 700 : 400, color: higherA ? "#276749" : C.text, textAlign: "right", fontFamily: F.mono }}>{vA != null ? fmtPct(vA) : "—"}</div>
                      <div style={{ fontSize: 13, fontWeight: !higherA ? 700 : 400, color: !higherA ? "#276749" : C.text, textAlign: "right", fontFamily: F.mono }}>{vB != null ? fmtPct(vB) : "—"}</div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Side-by-side tasks */}
            <div className="quiz-tasks" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
              {[["a", occA, tasksA], ["b", occB, tasksB]].map(([side, o, t]) => (
                <div key={side} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 24px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: F.sans, marginBottom: 4 }}>{o.title}</div>
                  <div style={{ fontSize: 11, color: C.textTer, fontFamily: F.mono, marginBottom: 12 }}>{t.length} tasks · {fmtPct(exp(side))} exposure</div>
                  {t.length > 0 ? (
                    <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.65, color: C.textSec, maxHeight: 280, overflowY: "auto" }}>
                      {t.map((task, i) => <li key={i} style={{ marginBottom: 4 }}>{task}</li>)}
                    </ol>
                  ) : (
                    <p style={{ fontSize: 12, color: C.textTer, fontStyle: "italic" }}>No task statements available.</p>
                  )}
                </div>
              ))}
            </div>

            {/* Insight */}
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 13, color: C.textSec, maxWidth: 600, margin: "0 auto", lineHeight: 1.65 }}>
                Read through the task lists above. Jobs with more information processing, writing, analysis, and data work tend to have higher AI exposure, while jobs involving physical tasks, hands-on care, or unpredictable environments tend to have lower exposure.
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─────────────────────────────────────
// Major group labels for category filter
// ─────────────────────────────────────
const MAJOR_GROUPS = [
  ["11", "Management"], ["13", "Business & Financial"], ["15", "Computer & Mathematical"],
  ["17", "Architecture & Engineering"], ["19", "Life, Physical & Social Science"],
  ["21", "Community & Social Service"], ["23", "Legal"], ["25", "Education"],
  ["27", "Arts, Design & Media"], ["29", "Healthcare Practitioners"],
  ["31", "Healthcare Support"], ["33", "Protective Service"], ["35", "Food Preparation"],
  ["37", "Building & Grounds"], ["39", "Personal Care"], ["41", "Sales"],
  ["43", "Office & Admin Support"], ["45", "Farming, Fishing & Forestry"],
  ["47", "Construction"], ["49", "Installation & Repair"], ["51", "Production"],
  ["53", "Transportation"], ["55", "Military"],
];

// ─────────────────────────────────────
// Hash routing helpers
// ─────────────────────────────────────
function parseHash() {
  const h = window.location.hash.replace("#", "").replace(/^\//, "");
  if (h === "quiz") return { view: "quiz" };
  if (h.startsWith("compare/")) {
    const parts = h.replace("compare/", "").split("/");
    if (parts.length === 2) return { view: "compare", socs: parts.map(s => s.includes(".") ? s : s + ".00") };
  }
  if (/^\d{2}-\d{4}/.test(h)) {
    const soc = h.includes(".") ? h : h + ".00";
    return { view: "detail", soc };
  }
  return { view: "grid" };
}

function setHash(path) {
  const next = "#/" + path;
  if (window.location.hash !== next) window.location.hash = next;
}

// ─────────────────────────────────────
// Main App
// ─────────────────────────────────────
export default function App() {
  const initHash = useMemo(() => parseHash(), []);
  const [view, setView] = useState(initHash.view);
  const [selectedSoc, setSelectedSoc] = useState(initHash.soc || null);
  const initCompare = initHash.view === "compare" && initHash.socs ? initHash.socs : [];
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("employment");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [shuffleHl, setShuffleHl] = useState(null);
  const [fadeIn, setFadeIn] = useState(true);
  const [showExplainer, setShowExplainer] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSocs, setCompareSocs] = useState(initCompare);
  const [tasksReady, setTasksReady] = useState(!!ALL_TASKS);
  useEffect(() => { if (!ALL_TASKS) _tasksPromise.then(() => setTasksReady(true)); }, []);
  const perPage = 36;

  const filtered = useMemo(() => {
    let list = [...OCCUPATIONS];
    if (category !== "all") list = list.filter(o => o.soc.startsWith(category));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o => o.title.toLowerCase().includes(q) || o.soc.includes(q) || (o.altTitles && o.altTitles.some(a => a.toLowerCase().includes(q))));
    }
    if (sortBy === "alpha") return _.sortBy(list, "title");
    if (sortBy === "soc") return _.sortBy(list, "soc");
    if (sortBy === "exposure") return _.orderBy(list, o => {
      const ex = o.exposure || {};
      return ex.eloundou_beta ?? ex.genoe ?? ex.felten ?? ex.aei_automation ?? -1;
    }, "desc");
    if (sortBy === "wage") return _.orderBy(list, o => o.meanWage ?? 0, "desc");
    return _.orderBy(list, o => o.employment ?? 0, "desc");
  }, [search, sortBy, category]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  useEffect(() => { setPage(1); }, [search, sortBy, category]);

  // Hash routing: sync URL ↔ view state
  useEffect(() => {
    if (view === "detail" && selectedSoc) setHash(selectedSoc.replace(".00", ""));
    else if (view === "quiz") setHash("quiz");
    else if (view === "compare" && compareSocs.length === 2) setHash("compare/" + compareSocs.map(s => s.replace(".00", "")).join("/"));
    else if (view === "grid") setHash("");
  }, [view, selectedSoc, compareSocs]);

  useEffect(() => {
    const onHash = () => {
      const h = parseHash();
      if (h.view === "detail" && h.soc) {
        const occ = OCCUPATIONS.find(o => o.soc === h.soc);
        if (occ) { setSelectedSoc(h.soc); setView("detail"); setFadeIn(true); }
      } else if (h.view === "quiz") {
        setView("quiz"); setFadeIn(true);
      } else if (h.view === "compare" && h.socs) {
        setCompareSocs(h.socs); setView("compare"); setFadeIn(true);
      } else {
        setView("grid"); setSelectedSoc(null); setFadeIn(true);
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const getTasks = useCallback((soc) => ALL_TASKS ? (ALL_TASKS[soc] || null) : null, [tasksReady]);

  const openOcc = useCallback((soc) => {
    setFadeIn(false);
    setTimeout(() => { setSelectedSoc(soc); setView("detail"); window.scrollTo({ top: 0 }); requestAnimationFrame(() => setFadeIn(true)); }, 120);
  }, []);

  const goBack = useCallback(() => {
    setFadeIn(false);
    setTimeout(() => { setView("grid"); setSelectedSoc(null); requestAnimationFrame(() => setFadeIn(true)); }, 120);
  }, []);

  const handleRandom = useCallback(() => {
    let count = 0;
    const iv = setInterval(() => {
      setShuffleHl(OCCUPATIONS[Math.floor(Math.random() * OCCUPATIONS.length)].soc);
      if (++count > 10) {
        clearInterval(iv);
        const valid = OCCUPATIONS.filter(o => o.employment != null);
        const tot = valid.reduce((s, o) => s + o.employment, 0);
        let r = Math.random() * tot, chosen;
        for (const o of valid) { r -= o.employment; if (r <= 0) { chosen = o; break; } }
        if (!chosen) chosen = valid[0];
        setShuffleHl(chosen.soc);
        setTimeout(() => { setShuffleHl(null); openOcc(chosen.soc); }, 400);
      }
    }, 70);
  }, [openOcc]);

  const exportCSV = useCallback(() => {
    const rows = ["SOC Code,Occupation Title,Task Index,Task,Employment,Mean Wage,Eloundou Alpha,Eloundou Beta,Eloundou Gamma,AEI Automation,AEI Augmentation,Felten AIOE,Pizzinelli CAIOE,GENOE,Brynjolfsson SML"];
    for (const occ of OCCUPATIONS) {
      const tasks = getTasks(occ.soc);
      if (!tasks) continue;
      const ex = occ.exposure || {};
      tasks.forEach((t, i) => {
        rows.push(`${occ.soc},"${occ.title}",${i + 1},"${t.replace(/"/g, '""')}",${occ.employment ?? ""},${occ.meanWage ?? ""},${ex.eloundou_alpha ?? ""},${ex.eloundou_beta ?? ""},${ex.eloundou_gamma ?? ""},${ex.aei_automation ?? ""},${ex.aei_augmentation ?? ""},${ex.felten ?? ""},${ex.pizzinelli ?? ""},${ex.genoe ?? ""},${ex.sml ?? ""}`);
      });
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ai_occupation_tasks.csv";
    a.click();
  }, [getTasks]);

  const selOcc = selectedSoc ? OCCUPATIONS.find(o => o.soc === selectedSoc) : null;
  const tasks = selectedSoc ? getTasks(selectedSoc) : null;
  const tT = tasks ? tasks.length : 0;

  const shell = { fontFamily: F.sans, background: C.bg, minHeight: "100vh", color: C.text, opacity: fadeIn ? 1 : 0, transition: "opacity 0.12s ease" };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DETAIL VIEW
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (view === "detail" && selOcc) {
    const ex = selOcc.exposure || {};
    const info = getImageInfo(selOcc.soc);
    const summary = SUMMARIES[selOcc.soc];

    // Collect all available indices for this occupation
    const indices = [];
    if (ex.eloundou_beta != null) indices.push({ label: "AI + software tools", sublabel: "Eloundou et al. (2023): share of tasks where AI with software tools could cut the time needed in half", value: ex.eloundou_beta, color: C.barFill });
    if (ex.eloundou_alpha != null) indices.push({ label: "AI alone", sublabel: "Eloundou et al. (2023): share of tasks an AI language model alone could speed up by at least 50%", value: ex.eloundou_alpha, color: C.barFill });
    if (ex.aei_augmentation != null) indices.push({ label: "AI as a helper", sublabel: "Anthropic (2025): how often AI is used to assist workers in these tasks (augmentation)", value: ex.aei_augmentation, color: C.aug });
    if (ex.aei_automation != null) indices.push({ label: "AI as a replacement", sublabel: "Anthropic (2025): how often AI is used to fully perform these tasks (automation)", value: ex.aei_automation, color: C.auto });
    if (ex.genoe != null) indices.push({ label: "Generative AI exposure", sublabel: "Georgieff & Hyee (2024): estimated share of tasks that generative AI could perform, within 5 years", value: ex.genoe, color: C.barFill });
    if (ex.felten != null) indices.push({ label: "AI capability overlap", sublabel: "Felten et al. (2023): how much the AI abilities needed for this job have improved recently", value: ex.felten, color: C.barFill });
    if (ex.pizzinelli != null) indices.push({ label: "Complementary AI exposure", sublabel: "Pizzinelli et al. (2023): how exposed this occupation is to AI, accounting for tasks that complement AI", value: ex.pizzinelli, color: C.barFill });
    if (ex.sml != null) indices.push({ label: "Machine learning suitability", sublabel: "Brynjolfsson et al. (2018): how suitable the tasks in this job are for machine learning", value: ex.sml, color: C.barFill });

    return (
      <div style={shell}>
        <style>{GCSS}</style>

        {/* Header bar */}
        <header style={{
          borderBottom: `1px solid ${C.border}`, background: `${C.bg}EE`,
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          padding: "14px 0", position: "sticky", top: 0, zIndex: 100,
        }}>
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button onClick={goBack} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 14px", border: `1px solid ${C.border}`, borderRadius: 4,
              fontSize: 12, cursor: "pointer", background: C.surface, color: C.textSec, fontFamily: F.sans, fontWeight: 500,
            }}>← Back</button>
            <button onClick={exportCSV} style={{
              padding: "6px 14px", border: `1px solid ${C.border}`, borderRadius: 4,
              fontSize: 12, cursor: "pointer", background: C.surface, fontFamily: F.sans, fontWeight: 500,
            }}>Export CSV</button>
          </div>
        </header>

        {/* Hero image */}
        <CatImage soc={selOcc.soc} height={280} style={{ borderRadius: 0 }} />

        <div className="detail-layout" style={{ maxWidth: 860, margin: "0 auto", padding: "40px 32px 80px" }}>

          {/* Occupation identity */}
          <div style={{ marginBottom: 36, animation: "fadeUp 0.4s cubic-bezier(.22,1,.36,1) both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: C.textTer, fontFamily: F.mono, letterSpacing: "1px", textTransform: "uppercase" }}>{selOcc.soc}</span>
              <span style={{ fontSize: 11, color: C.textTer }}>·</span>
              <span style={{ fontSize: 11, color: C.textTer, fontFamily: F.mono, letterSpacing: "0.5px" }}>{info.label}</span>
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 700, fontFamily: F.sans, letterSpacing: "-0.03em", margin: "0 0 16px", lineHeight: 1.15, maxWidth: 640 }}>{selOcc.title}</h1>

            {summary && (
              <p style={{ fontSize: 16, lineHeight: 1.7, color: C.textSec, margin: "0 0 24px", maxWidth: 620 }}>{summary}</p>
            )}

            <div className="hero-stats" style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
              {[
                ["EMPLOYMENT", fmtFull(selOcc.employment)],
                ["MEAN WAGE", fmtWage(selOcc.meanWage)],
                ["SHARE OF WORKFORCE", selOcc.employmentShare ? selOcc.employmentShare.toFixed(2) + "%" : "—"],
                ["TASKS", String(tT)],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10, color: C.textTer, fontWeight: 500, marginBottom: 4, letterSpacing: "1px", fontFamily: F.mono }}>{k}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: F.sans, color: C.text, letterSpacing: "-0.02em" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: C.border, marginBottom: 32 }} />

          {/* Exposure indices — plain language */}
          {indices.length > 0 && (
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "28px", marginBottom: 32,
              animation: "fadeUp 0.4s cubic-bezier(.22,1,.36,1) 0.05s both",
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, fontFamily: F.sans, margin: "0 0 6px" }}>How exposed is this job to AI?</h2>
              <p style={{ fontSize: 13, color: C.textSec, margin: "0 0 24px", lineHeight: 1.55 }}>
                Different research teams have measured how much AI could affect this occupation. Higher bars mean more exposure. All values are normalized to a 0–100% scale for comparison.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {indices.map(d => (
                  <Bar key={d.label} value={d.value} max={1} color={d.color} label={d.label} sublabel={d.sublabel} />
                ))}
              </div>
            </div>
          )}

          {/* Task statements */}
          <div style={{ animation: "fadeUp 0.4s cubic-bezier(.22,1,.36,1) 0.1s both" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, fontFamily: F.sans, margin: "0 0 6px" }}>What do these workers actually do?</h2>
            <p style={{ fontSize: 13, color: C.textSec, margin: "0 0 20px", lineHeight: 1.55 }}>
              Core task statements from O*NET, the federal database of occupational information.
            </p>

            {(!tasks || tasks.length === 0) ? (
              <div style={{ textAlign: "center", padding: "56px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                <p style={{ fontSize: 14, color: C.textSec }}>No task statements available for this occupation.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {tasks.map((task, idx) => (
                  <div key={idx} style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 6, padding: "14px 18px",
                    animation: `fadeUp 0.3s cubic-bezier(.22,1,.36,1) ${0.12 + idx * 0.025}s both`,
                  }}>
                    <p style={{ fontSize: 14, lineHeight: 1.65, margin: 0, fontFamily: F.sans }}>
                      <span style={{ color: C.textTer, fontSize: 10, fontWeight: 500, marginRight: 10, fontFamily: F.mono }}>{String(idx + 1).padStart(2, "0")}</span>
                      {task}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // QUIZ VIEW
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (view === "quiz") {
    return (
      <div style={shell}>
        <style>{GCSS}</style>
        <header style={{
          background: `${C.bg}DD`, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100,
        }}>
          <div style={{ maxWidth: 1120, margin: "0 auto", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 500, fontFamily: F.mono, letterSpacing: "0.5px", color: C.textSec }}>AI & THE FUTURE OF WORK</span>
            <button onClick={() => { setView("grid"); }} style={{
              padding: "5px 12px", border: `1px solid ${C.border}`, borderRadius: 4,
              fontSize: 11, cursor: "pointer", background: C.surface, fontFamily: F.sans, fontWeight: 500, color: C.textSec,
            }}>← Explorer</button>
          </div>
        </header>
        <QuizView onBack={() => { setView("grid"); }} />
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // COMPARE VIEW
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (view === "compare" && compareSocs.length === 2) {
    const [socA, socB] = compareSocs;
    const cA = OCCUPATIONS.find(o => o.soc === socA);
    const cB = OCCUPATIONS.find(o => o.soc === socB);
    if (cA && cB) {
      const exA = cA.exposure || {}, exB = cB.exposure || {};
      const tasksA = ALL_TASKS[socA] || [], tasksB = ALL_TASKS[socB] || [];
      const indexLabels = [
        ["eloundou_beta", "AI + tools (Eloundou)"], ["eloundou_alpha", "AI alone (Eloundou)"],
        ["aei_augmentation", "AI as helper (Anthropic)"], ["aei_automation", "AI as replacement (Anthropic)"],
        ["felten", "AI–skill overlap (Felten)"], ["genoe", "Generative AI (OECD)"],
        ["pizzinelli", "Complementary AI (Pizzinelli)"], ["sml", "Machine learning (Brynjolfsson)"],
      ];
      return (
        <div style={shell}>
          <style>{GCSS}</style>
          <header style={{ background: `${C.bg}DD`, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100 }}>
            <div style={{ maxWidth: 1120, margin: "0 auto", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 500, fontFamily: F.mono, letterSpacing: "0.5px", color: C.textSec }}>AI & THE FUTURE OF WORK</span>
              <button onClick={() => { setView("grid"); setCompareSocs([]); setCompareMode(false); }} style={{ padding: "5px 12px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 11, cursor: "pointer", background: C.surface, fontFamily: F.sans, fontWeight: 500, color: C.textSec }}>← Explorer</button>
            </div>
          </header>
          <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 32px" }}>
            <div style={{ padding: "48px 0 24px", animation: "fadeUp 0.4s cubic-bezier(.22,1,.36,1) both" }}>
              <h1 style={{ fontSize: 32, fontWeight: 700, fontFamily: F.sans, letterSpacing: "-0.03em", margin: "0 0 8px" }}>Comparing two occupations</h1>
              <p style={{ fontSize: 14, color: C.textSec, margin: 0 }}>{cA.title} vs. {cB.title}</p>
            </div>

            {/* Side-by-side cards */}
            <div className="quiz-cards" style={{ display: "flex", gap: 20, marginBottom: 28, animation: "fadeUp 0.35s cubic-bezier(.22,1,.36,1) both" }}>
              {[[cA, socA], [cB, socB]].map(([o, soc]) => (
                <div key={soc} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", maxWidth: 400, cursor: "pointer" }} onClick={() => { setView("detail"); setSelectedSoc(soc); setCompareMode(false); }}>
                  <CatImage soc={soc} height={140} />
                  <div style={{ padding: "14px 18px 16px" }}>
                    <div style={{ fontSize: 10, color: C.textTer, fontFamily: F.mono, marginBottom: 4 }}>{soc.replace(".00", "")}</div>
                    <div style={{ fontSize: 17, fontWeight: 700, fontFamily: F.sans, lineHeight: 1.25, marginBottom: 6 }}>{o.title}</div>
                    <div style={{ fontSize: 13, color: C.textSec }}>{fmt(o.employment)} workers · {fmtWage(o.meanWage)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Exposure comparison */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 24px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: C.textTer, marginBottom: 14, letterSpacing: "0.5px", fontFamily: F.mono, textTransform: "uppercase" }}>Exposure indices compared</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px 16px", alignItems: "center" }}>
                <div style={{ fontSize: 11, color: C.textTer, fontFamily: F.mono }}>Index</div>
                <div style={{ fontSize: 11, color: C.textTer, fontFamily: F.mono, textAlign: "right", minWidth: 80 }}>{cA.title.length > 20 ? cA.title.slice(0, 18) + "…" : cA.title}</div>
                <div style={{ fontSize: 11, color: C.textTer, fontFamily: F.mono, textAlign: "right", minWidth: 80 }}>{cB.title.length > 20 ? cB.title.slice(0, 18) + "…" : cB.title}</div>
                {indexLabels.map(([key, label]) => {
                  const vA = exA[key], vB = exB[key];
                  if (vA == null && vB == null) return null;
                  const higherA = (vA ?? 0) >= (vB ?? 0);
                  return (
                    <React.Fragment key={key}>
                      <div style={{ fontSize: 12, color: C.textSec }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: higherA ? 700 : 400, color: higherA ? "#276749" : C.text, textAlign: "right", fontFamily: F.mono }}>{vA != null ? fmtPct(vA) : "—"}</div>
                      <div style={{ fontSize: 13, fontWeight: !higherA ? 700 : 400, color: !higherA ? "#276749" : C.text, textAlign: "right", fontFamily: F.mono }}>{vB != null ? fmtPct(vB) : "—"}</div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Side-by-side tasks */}
            <div className="quiz-tasks" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 48 }}>
              {[[cA, tasksA], [cB, tasksB]].map(([o, t]) => (
                <div key={o.soc} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 24px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: F.sans, marginBottom: 4 }}>{o.title}</div>
                  <div style={{ fontSize: 11, color: C.textTer, fontFamily: F.mono, marginBottom: 12 }}>{t.length} tasks</div>
                  {t.length > 0 ? (
                    <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.65, color: C.textSec, maxHeight: 320, overflowY: "auto" }}>
                      {t.map((task, i) => <li key={i} style={{ marginBottom: 4 }}>{task}</li>)}
                    </ol>
                  ) : (
                    <p style={{ fontSize: 12, color: C.textTer, fontStyle: "italic" }}>No task statements available.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GRID VIEW
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div style={shell}>
      <style>{GCSS}</style>

      <header style={{
        background: `${C.bg}DD`, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 500, fontFamily: F.mono, letterSpacing: "0.5px", color: C.textSec }}>AI & THE FUTURE OF WORK</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowExplainer(v => !v)} style={{
              padding: "5px 12px", border: `1px solid ${showExplainer ? C.text : C.border}`, borderRadius: 4,
              fontSize: 11, cursor: "pointer", background: showExplainer ? C.accentLight : C.surface, fontFamily: F.sans, fontWeight: 500, color: C.textSec,
            }}>What is AI exposure?</button>
            <button onClick={exportCSV} style={{
              padding: "5px 12px", border: `1px solid ${C.border}`, borderRadius: 4,
              fontSize: 11, cursor: "pointer", background: C.surface, fontFamily: F.sans, fontWeight: 500, color: C.textSec,
            }}>Export data</button>
            <button onClick={() => { setShowAbout(v => !v); if (!showAbout) setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100); }} style={{
              padding: "5px 12px", border: `1px solid ${showAbout ? C.text : C.border}`, borderRadius: 4,
              fontSize: 11, cursor: "pointer", background: showAbout ? C.accentLight : C.surface, fontFamily: F.sans, fontWeight: 500, color: C.textSec,
            }}>About</button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 32px" }}>

        {/* Hero */}
        <div style={{ padding: "72px 0 56px", maxWidth: 640, animation: "fadeUp 0.5s cubic-bezier(.22,1,.36,1) both" }}>
          <h1 className="hero-title" style={{ fontSize: 48, fontWeight: 700, fontFamily: F.sans, letterSpacing: "-0.04em", margin: "0 0 16px", lineHeight: 1.08 }}>
            Which jobs will AI transform?
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: C.textSec, margin: "0 0 32px", maxWidth: 640 }}>
            Browse hundreds of occupations. Learn what workers actually do and how exposed each role is to AI, according to state-of-the-art research.
          </p>
          <div style={{ display: "flex", gap: 20, fontSize: 13, color: C.textTer, fontFamily: F.mono, letterSpacing: "0.3px" }}>
            <span><strong style={{ color: C.text, fontWeight: 600 }}>{OCCUPATIONS.length}</strong> occupations</span>
            <span><strong style={{ color: C.text, fontWeight: 600 }}>8</strong> exposure indices</span>
            <span><strong style={{ color: C.text, fontWeight: 600 }}>{TOTAL_TASKS.toLocaleString()}</strong> job tasks</span>
          </div>
        </div>

        {/* Controls */}
        <div className="controls-row" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 20, animation: "fadeUp 0.4s cubic-bezier(.22,1,.36,1) 0.05s both" }}>
          <input placeholder="Search occupations…" value={search} onChange={e => { setSearch(e.target.value); if (view === "detail") { setView("grid"); setSelectedSoc(null); } }}
            style={{ padding: "8px 14px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13, width: 240, outline: "none", fontFamily: F.sans, background: C.surface, transition: "border-color 0.15s" }}
            onFocus={e => { e.target.style.borderColor = C.text; }} onBlur={e => { e.target.style.borderColor = C.border; }}
          />
          <select value={category} onChange={e => { setCategory(e.target.value); if (view === "detail") { setView("grid"); setSelectedSoc(null); } }}
            style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 12, fontFamily: F.sans, background: C.surface, color: C.text, outline: "none", cursor: "pointer" }}>
            <option value="all">All categories</option>
            {MAJOR_GROUPS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginLeft: 8 }}>
            <span style={{ fontSize: 11, color: C.textTer, fontFamily: F.mono, letterSpacing: "0.5px", textTransform: "uppercase" }}>Sort</span>
            {[["employment", "Employment"], ["wage", "Wage"], ["exposure", "Exposure"]].map(([k, l]) => (
              <SortOption key={k} label={l} active={sortBy === k} onClick={() => { setSortBy(k); if (view === "detail") { setView("grid"); setSelectedSoc(null); } }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button onClick={handleRandom} style={{
              padding: "7px 16px", border: `1px solid ${C.text}`, borderRadius: 4, fontSize: 12,
              fontWeight: 500, cursor: "pointer", background: C.text, color: C.bg,
              fontFamily: F.sans, transition: "opacity 0.12s", letterSpacing: "0.3px",
            }}>Random occupation</button>
            <button onClick={() => { setView("quiz"); window.scrollTo({ top: 0 }); }} style={{
              padding: "7px 16px", border: `1px solid ${C.text}`, borderRadius: 4, fontSize: 12,
              fontWeight: 500, cursor: "pointer", background: C.text, color: C.bg,
              fontFamily: F.sans, transition: "opacity 0.12s", letterSpacing: "0.3px",
            }}>Quiz me</button>
            <button onClick={() => { setCompareMode(m => !m); setCompareSocs([]); }} style={{
              padding: "7px 16px", border: `1px solid ${compareMode ? "#276749" : C.border}`, borderRadius: 4, fontSize: 12,
              fontWeight: 500, cursor: "pointer", background: compareMode ? "#27674915" : C.surface, color: compareMode ? "#276749" : C.text,
              fontFamily: F.sans, transition: "all 0.15s", letterSpacing: "0.3px",
            }}>{compareMode ? "Cancel" : "Compare"}</button>
          </div>
        </div>

        {/* Compare mode selection bar */}
        {compareMode && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, fontSize: 13, fontFamily: F.sans, color: C.textSec, animation: "fadeUp 0.2s both" }}>
            <span>{compareSocs.length === 0 ? "Click two occupations to compare" : compareSocs.length === 1 ? "Click one more occupation" : "Ready to compare"}</span>
            {compareSocs.length > 0 && <span style={{ fontWeight: 600, color: C.text }}>{compareSocs.map(s => OCCUPATIONS.find(o => o.soc === s)?.title).filter(Boolean).join(" vs. ")}</span>}
            <div style={{ flex: 1 }} />
            {compareSocs.length === 2 && <button onClick={() => { setView("compare"); setCompareMode(false); window.scrollTo({ top: 0 }); }} style={{ padding: "5px 14px", border: `1px solid ${C.text}`, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", background: C.text, color: C.bg, fontFamily: F.sans }}>Compare →</button>}
          </div>
        )}

        {/* Exposure to AI explainer */}
        {showExplainer && (
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
            padding: "28px", marginBottom: 24,
            animation: "fadeUp 0.3s cubic-bezier(.22,1,.36,1) both",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: F.sans, margin: 0 }}>What does "exposure to AI" mean?</h2>
              <button onClick={() => setShowExplainer(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.textTer, padding: "0 4px" }}>×</button>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: C.textSec, margin: "0 0 8px", maxWidth: 700 }}>
              "Exposure" measures how much an occupation's tasks overlap with what AI can do. A highly exposed job isn't necessarily at risk of disappearing — it could also mean workers in that role will use AI tools to become more productive. Think of it as: <em>how relevant is AI to the day-to-day work?</em>
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: C.textSec, margin: "0 0 20px", maxWidth: 700 }}>
              Different research teams have measured this in different ways. Some look at whether AI could speed up tasks, others at whether it could replace them entirely, and others at how AI capabilities match the skills a job requires. No single index is definitive — together they paint a richer picture.
            </p>

            <div style={{ fontSize: 11, fontWeight: 500, color: C.textTer, marginBottom: 12, letterSpacing: "0.5px", fontFamily: F.mono, textTransform: "uppercase" }}>Indices shown on this site</div>
            <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { title: "Eloundou et al. (2023)", desc: "Had human raters and GPT-4 judge what share of each occupation's tasks AI could speed up by at least 50%, at three capability tiers: AI alone, AI with basic tools, and AI with full software access.", link: "https://doi.org/10.1126/science.adj0998" },
                { title: "Anthropic Economic Index (2025)", desc: "Analyzed millions of real AI conversations to measure how often AI is actually being used for each occupation's tasks — distinguishing between using AI as a helper (augmentation) vs. a replacement (automation).", link: "https://www.anthropic.com/research/the-anthropic-economic-index" },
                { title: "Felten, Raj & Seamans (2023)", desc: "Measured how much recent advances in AI capabilities (especially language models) overlap with the abilities each job requires, using AI benchmark scores mapped to occupational skills.", link: "https://doi.org/10.2139/ssrn.4375268" },
                { title: "Georgieff & Hyee (2024) — GENOE", desc: "Estimated the share of each occupation's tasks that generative AI could perform at 1-year, 5-year, and 10-year horizons, based on expert assessments of AI capabilities.", link: "https://doi.org/10.1787/f6c10404-en" },
                { title: "Pizzinelli et al. (2023)", desc: "Extended the AIOE framework to account for complementarity — tasks where humans and AI work together, not just tasks AI could replace. Developed at the IMF.", link: "https://www.imf.org/en/Publications/WP/Issues/2023/01/13/Labor-Market-Exposure-to-AI-Cross-country-Differences-and-Distributional-Implications-528101" },
                { title: "Brynjolfsson, Mitchell & Rock (2018)", desc: "An early measure of which tasks are suitable for machine learning, based on a rubric evaluating 18,000+ O*NET tasks. Predates the generative AI era but captures traditional ML exposure.", link: "https://doi.org/10.1257/pandp.20181019" },
              ].map(d => (
                <a key={d.title} href={d.link} target="_blank" rel="noopener noreferrer" style={{
                  padding: "14px 16px", background: C.bg, borderRadius: 6, border: `1px solid ${C.borderLight}`,
                  textDecoration: "none", display: "block", transition: "border-color 0.15s",
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.borderHover}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.borderLight}
                >
                  <div style={{ fontWeight: 600, color: C.text, marginBottom: 4, fontSize: 13 }}>{d.title} ↗</div>
                  <div style={{ color: C.textSec, lineHeight: 1.55, fontSize: 12 }}>{d.desc}</div>
                </a>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 500, color: C.textTer, marginBottom: 12, marginTop: 28, letterSpacing: "0.5px", fontFamily: F.mono, textTransform: "uppercase" }}>Does exposure translate into employment effects?</div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: C.textSec, margin: "0 0 16px", maxWidth: 700 }}>
              Exposure does not automatically mean displacement. But early evidence suggests it matters. Using payroll data from millions of U.S. workers, <a href="https://digitaleconomy.stanford.edu/publications/canaries-in-the-coal-mine/" target="_blank" rel="noopener noreferrer" style={{ color: C.text, fontWeight: 500 }}>Brynjolfsson, Chandar & Chen (2025)</a> find that occupations more exposed to AI have seen declining employment among early-career workers (ages 22-25) since the release of ChatGPT, while employment for older workers in the same occupations has remained stable or grown.
            </p>

            <div style={{ background: C.bg, borderRadius: 8, padding: "16px 20px", maxWidth: 460, margin: "0 auto 20px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 2, fontFamily: F.sans }}>Employment of workers aged 22-25, by AI exposure quintile</div>
              <div style={{ fontSize: 10.5, color: C.textTer, marginBottom: 10, lineHeight: 1.4 }}>Indexed to October 2022. Darker lines = more AI-exposed occupations.</div>
              <img src={`${import.meta.env.BASE_URL}images/canaries-figure2-panel.png`} alt="Employment trends by AI exposure quintile for workers aged 22-25" style={{ width: "100%", display: "block" }} />
              <div style={{ fontSize: 9.5, color: C.textTer, marginTop: 8, lineHeight: 1.45, fontFamily: F.mono }}>Source: Brynjolfsson, Chandar & Chen (2025), Figure 2. ADP payroll records.</div>
            </div>

            <p style={{ fontSize: 14, lineHeight: 1.7, color: C.textSec, margin: "0 0 16px", maxWidth: 700 }}>
              Critically, not all forms of AI exposure have the same effect. The same study distinguishes between occupations where AI primarily <em>automates</em> work (replacing tasks) versus those where it <em>augments</em> work (assisting workers). Employment declines are concentrated in automation-heavy occupations, while occupations where AI is used as a helper show stable or growing employment.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 700, margin: "0 auto 20px" }} className="footer-grid">
              <div style={{ background: C.bg, borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#C53030", marginBottom: 2, fontFamily: F.sans }}>Automation: employment declines</div>
                <div style={{ fontSize: 10.5, color: C.textTer, marginBottom: 8, lineHeight: 1.4 }}>Jobs where AI replaces tasks show falling employment for young workers.</div>
                <div style={{ overflow: "hidden", maxHeight: 200 }}>
                  <img src={`${import.meta.env.BASE_URL}images/canaries-automation.png`} alt="Employment by automation quintile" style={{ width: "100%", display: "block" }} />
                </div>
              </div>
              <div style={{ background: C.bg, borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#276749", marginBottom: 2, fontFamily: F.sans }}>Augmentation: no decline</div>
                <div style={{ fontSize: 10.5, color: C.textTer, marginBottom: 8, lineHeight: 1.4 }}>Jobs where AI assists workers show stable or growing employment.</div>
                <div style={{ overflow: "hidden", maxHeight: 200 }}>
                  <img src={`${import.meta.env.BASE_URL}images/canaries-augmentation.png`} alt="Employment by augmentation quintile" style={{ width: "100%", display: "block" }} />
                </div>
              </div>
            </div>
            <div style={{ fontSize: 9.5, color: C.textTer, lineHeight: 1.45, fontFamily: F.mono, maxWidth: 700, margin: "0 auto 16px", textAlign: "center" }}>Source: Brynjolfsson, Chandar & Chen (2025), Figure 3. Automation and augmentation quintiles defined using the Anthropic Economic Index.</div>

            <p style={{ fontSize: 13, lineHeight: 1.7, color: C.textTer, margin: "0", maxWidth: 700, fontStyle: "italic" }}>
              These findings are consistent with AI substituting for some entry-level tasks while complementing others. The labor market effects of AI remain an active area of research, and the long-run implications are still unfolding.
            </p>
          </div>
        )}

        <div style={{ fontSize: 11, color: C.textTer, marginBottom: 16, fontFamily: F.mono, letterSpacing: "0.3px" }}>
          {paged.length} of {filtered.length} occupations{search ? ` matching "${search}"` : ""} · page {page}/{totalPages}
        </div>

        <div className="grid-main" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
          {paged.map((occ, i) => (
            <Tile key={occ.soc} occ={occ} idx={i} onClick={() => {
              if (compareMode) {
                setCompareSocs(prev => {
                  if (prev.includes(occ.soc)) return prev.filter(s => s !== occ.soc);
                  if (prev.length >= 2) return [prev[1], occ.soc];
                  return [...prev, occ.soc];
                });
              } else { openOcc(occ.soc); }
            }} highlighted={shuffleHl || (compareMode && compareSocs.includes(occ.soc) ? occ.soc : null)} search={search} />
          ))}
        </div>

        {totalPages > 1 && (
          <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 32, alignItems: "center" }}>
            <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 12, cursor: page === 1 ? "default" : "pointer", background: C.surface, color: C.textSec, fontFamily: F.sans, opacity: page === 1 ? 0.3 : 1 }}>‹</button>
            {Array.from({ length: Math.min(totalPages, 9) }, (_, i) => {
              let p;
              if (totalPages <= 9) p = i + 1;
              else if (page <= 5) p = i + 1;
              else if (page >= totalPages - 4) p = totalPages - 8 + i;
              else p = page - 4 + i;
              return (
                <button key={p} onClick={() => setPage(p)} style={{
                  padding: "6px 10px", border: `1px solid ${p === page ? C.text : C.border}`,
                  borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: F.mono,
                  background: p === page ? C.text : C.surface, color: p === page ? C.bg : C.textSec, fontWeight: p === page ? 600 : 400,
                }}>{p}</button>
              );
            })}
            <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{ padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 12, cursor: page === totalPages ? "default" : "pointer", background: C.surface, color: C.textSec, fontFamily: F.sans, opacity: page === totalPages ? 0.3 : 1 }}>›</button>
          </div>
        )}

        {/* About section */}
        {showAbout && (
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
            padding: "28px", marginTop: 32,
            animation: "fadeUp 0.3s cubic-bezier(.22,1,.36,1) both",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: F.sans, margin: 0 }}>About this tool</h2>
              <button onClick={() => setShowAbout(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.textTer, padding: "0 4px" }}>×</button>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: C.textSec, margin: "0 0 20px", maxWidth: 700 }}>
              This tool brings together data from several sources to help you explore how AI intersects with different occupations. All exposure values are normalized to a 0–100% scale for comparability.
            </p>

            <div style={{ fontSize: 11, fontWeight: 500, color: C.textTer, marginBottom: 12, letterSpacing: "0.5px", fontFamily: F.mono, textTransform: "uppercase" }}>Data sources</div>
            <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
              {[
                { title: "O*NET Task Statements", desc: "Core task statements for each occupation from the O*NET database (U.S. Department of Labor / Employment and Training Administration). 13,417 tasks across 878 occupations.", link: "https://www.onetonline.org/", license: "CC BY 4.0" },
                { title: "BLS Occupational Employment & Wage Statistics", desc: "Employment counts and annual mean wages from the Bureau of Labor Statistics, May 2024 National Occupational Employment and Wage Estimates.", link: "https://www.bls.gov/oes/", license: "Public domain" },
                { title: "Eloundou et al. (2023) — \"GPTs are GPTs\"", desc: "Share of tasks exposed to AI at three capability tiers: LLM alone (alpha), with complementary tools (beta), and with full system access (gamma). Covers 923 occupations.", link: "https://doi.org/10.1126/science.adj0998" },
                { title: "Anthropic Economic Index (2025)", desc: "Analysis of millions of real AI conversations measuring how often AI is used for each occupation's tasks, distinguishing augmentation (AI as helper) from automation (AI as replacement). Covers 674 occupations.", link: "https://www.anthropic.com/research/the-anthropic-economic-index" },
                { title: "Felten, Raj & Seamans (2023) — AIOE", desc: "Measures how much recent AI capability advances overlap with the abilities each job requires, using AI benchmark scores mapped to occupational skills.", link: "https://doi.org/10.2139/ssrn.4375268" },
                { title: "Georgieff & Hyee (2024) — GENOE", desc: "Estimated share of tasks that generative AI could perform at 1-year, 5-year, and 10-year horizons, based on expert assessments. Developed at the OECD.", link: "https://doi.org/10.1787/f6c10404-en" },
                { title: "Pizzinelli et al. (2023) — IMF", desc: "Extended the AIOE framework to account for complementarity — tasks where humans and AI work together, not just tasks AI could replace.", link: "https://www.imf.org/en/Publications/WP/Issues/2023/01/13/Labor-Market-Exposure-to-AI-Cross-country-Differences-and-Distributional-Implications-528101" },
                { title: "Brynjolfsson, Mitchell & Rock (2018) — SML", desc: "An early measure of which tasks are suitable for machine learning, based on a rubric evaluating 18,000+ O*NET tasks. Predates the generative AI era.", link: "https://doi.org/10.1257/pandp.20181019" },
              ].map(d => (
                <a key={d.title} href={d.link} target="_blank" rel="noopener noreferrer" style={{
                  padding: "14px 16px", background: C.bg, borderRadius: 6, border: `1px solid ${C.borderLight}`,
                  textDecoration: "none", display: "block", transition: "border-color 0.15s",
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.borderHover}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.borderLight}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{d.title}{d.license ? <span style={{ fontWeight: 400, color: C.textTer, fontSize: 11, marginLeft: 8 }}>{d.license}</span> : null}</div>
                  <div style={{ color: C.textSec, lineHeight: 1.55, fontSize: 12 }}>{d.desc}</div>
                </a>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 500, color: C.textTer, marginBottom: 12, letterSpacing: "0.5px", fontFamily: F.mono, textTransform: "uppercase" }}>Crosswalk notes</div>
            <ul style={{ fontSize: 13, lineHeight: 1.7, color: C.textSec, margin: 0, paddingLeft: 20 }}>
              <li>O*NET uses 8-digit codes (XX-XXXX.XX), BLS uses 6-digit (XX-XXXX). Matched by appending .00.</li>
              <li>819 of 1,016 O*NET occupations matched to BLS data. 197 unmatched occupations are typically specialty or emerging roles.</li>
              <li>Eloundou scores cover 923 occupations; AEI covers 674. Missing values are shown as "—".</li>
              <li>138 occupations have no core tasks listed in O*NET.</li>
            </ul>
          </div>
        )}

        <footer style={{
          marginTop: 56, marginBottom: 56, padding: "24px 28px",
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
          fontSize: 13, lineHeight: 1.7, color: C.textSec,
        }}>
          <p style={{ margin: "0 0 8px", maxWidth: 680 }}>
            Task statements from <a href="https://www.onetonline.org/" target="_blank" rel="noopener noreferrer" style={{ color: C.text }}>O*NET</a>. Employment and wage data from <a href="https://www.bls.gov/oes/" target="_blank" rel="noopener noreferrer" style={{ color: C.text }}>BLS</a> (May 2024). AI exposure indices from six research teams — click <button onClick={() => { setShowExplainer(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ background: "none", border: "none", color: C.text, fontWeight: 600, cursor: "pointer", padding: 0, fontSize: "inherit", fontFamily: "inherit", textDecoration: "underline" }}>Exposure to AI</button> above for details.
          </p>
          <p style={{ fontSize: 11, color: C.textTer, margin: 0, fontFamily: F.mono }}>
            O*NET: CC BY 4.0, U.S. Dept of Labor/ETA · BLS: public domain · All exposure values normalized to 0–100% · <button onClick={() => { setShowAbout(true); window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); }} style={{ background: "none", border: "none", color: C.textTer, cursor: "pointer", padding: 0, fontSize: "inherit", fontFamily: "inherit", textDecoration: "underline" }}>About</button>
          </p>
        </footer>
      </div>
    </div>
  );
}
