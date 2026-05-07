import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { BarChart, Bar, AreaChart, Area, ComposedChart, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getAllLeagues, getSeasons, upsertLeague, deleteLeague as delApi } from "./lib/supabase";

const TC = { "<$50": "#6b7280", "$50-$99": "#059669", "$100-$199": "#2563eb", "$200-$299": "#d97706", "$300-$499": "#ef4444" };
const TIERS = Object.keys(TC);
const fmt = n => n >= 0 ? "$" + Math.abs(n).toLocaleString() : "-$" + Math.abs(n).toLocaleString();
const tierOf = bi => bi < 50 ? "<$50" : bi < 100 ? "$50-$99" : bi < 200 ? "$100-$199" : bi < 300 ? "$200-$299" : "$300-$499";
const rankLabel = l => l.live_rank_in_league != null && l.live_rosters_in_league != null ? "Rank " + l.live_rank_in_league + " of " + l.live_rosters_in_league : null;
const edgeFreshnessLabel = l => l.edge_updated_at ? "Updated " + l.edge_updated_at : "Pre-season";

function calcEV(l) {
  const e = l.edge_score || 80;
  const adj = (e - 85) / 100;
  const ab = (l.archetype === "Competitor" ? 0.05 : l.archetype === "Rebuilder" ? -0.05 : 0);
  const pp = Math.min(0.85, Math.max(0.15, (l.playoff_spots || 6) / (l.teams || 12) + adj + ab));
  const wb = Math.max(0, adj * 2);
  const p1r = Math.min(0.28, 0.12 + wb);
  const p2r = Math.min(0.22, 0.14 + wb * 0.5);
  const p3r = 0.18;
  const evP = p1r * (l.payout_1st || 0) + p2r * (l.payout_2nd || 0) + p3r * (l.payout_3rd || 0);
  const ev = Math.round(pp * evP + (l.payout_extra || 0) - l.buy_in);
  return { ev, pp: Math.round(pp * 100), be: (l.payout_3rd || 0) >= l.buy_in ? "3rd+" : (l.payout_2nd || 0) >= l.buy_in ? "2nd+" : "1st only", upside: l.buy_in > 0 ? Math.round((l.payout_1st || 0) / l.buy_in) : 0 };
}

function verdict(l, hist) {
  const ev = calcEV(l);
  const e = l.edge_score || 80;
  const comp = l.archetype === "Competitor";
  const rebuild = l.archetype === "Rebuilder";
  const hi = e >= 90;
  const big = (l.teams || 12) >= 16;
  const redraft = l.format === "redraft";
  const careerNet = hist ? hist.net : 0;
  const hasShip = hist ? hist.ships > 0 : l.won_championship;
  const lastUp = hist ? hist.trend[hist.trend.length - 1] > 0 : false;
  const neverProf = hist ? hist.trend.every(v => v <= 0) : false;

  // KEEP: proven winners, strong EV, or cheap holds
  if (hasShip && careerNet > 0) return { v: "KEEP", c: "#059669", bg: "#ecfdf5", r: "Career +" + fmt(careerNet) + ", " + hist.ships + " ship" + (hist.ships > 1 ? "s" : "") + ". EV " + fmt(ev.ev) + ".", a: "Core holding. This league pays you." };
  if (hasShip || l.won_championship) return { v: "KEEP", c: "#059669", bg: "#ecfdf5", r: "Won a championship. EV " + fmt(ev.ev) + ".", a: "You've won here. Keep competing." };
  if (hi && comp && ev.ev > 0 && !big) return { v: "KEEP", c: "#059669", bg: "#ecfdf5", r: e.toFixed(0) + " edge, Competitor, EV " + fmt(ev.ev) + " (" + (l.buy_in > 0 ? Math.round(ev.ev / l.buy_in * 100) : 0) + "%). Roster and math both favor you.", a: "Strong position. Keep." };
  if (redraft && ev.ev > 0) return { v: "KEEP", c: "#059669", bg: "#ecfdf5", r: "Redraft with positive EV (" + fmt(ev.ev) + "). " + ev.be + " breakeven.", a: "Payout structure is favorable. Focus on draft prep." };
  if (careerNet > 0 && ev.ev > 0) return { v: "KEEP", c: "#059669", bg: "#ecfdf5", r: "Career positive (" + fmt(careerNet) + "), EV " + fmt(ev.ev) + ".", a: "Keep. History and math agree." };
  if (l.buy_in <= 50 && ev.ev >= -10) return { v: "KEEP", c: "#059669", bg: "#ecfdf5", r: "Low cost (" + fmt(l.buy_in) + "), near-breakeven EV. " + ev.upside + "x upside.", a: "Cheap hold. The upside justifies the cost." };

  // TURNABLE: losing but fixable
  if (hi && comp && ev.ev <= 0) return { v: "TURNABLE", c: "#2563eb", bg: "#eff6ff", r: e.toFixed(0) + " edge, Competitor. Roster CAN win but EV is " + fmt(ev.ev) + " due to buy-in. " + ev.pp + "% playoff odds.", a: "Stay. One playoff run flips this. Roster justifies the cost." };
  if (hi && rebuild) return { v: "TURNABLE", c: "#2563eb", bg: "#eff6ff", r: e.toFixed(0) + " edge as Rebuilder. Assets are strong. EV " + fmt(ev.ev) + ".", a: "1-2 moves from contending. Hold and finish the rebuild." };
  if (comp && lastUp && ev.ev > -50) return { v: "TURNABLE", c: "#2563eb", bg: "#eff6ff", r: "Competitor with positive recent trend. EV " + fmt(ev.ev) + ".", a: "Momentum building. One good offseason away." };
  if (redraft && ev.ev <= 0 && ev.ev > -100) return { v: "TURNABLE", c: "#2563eb", bg: "#eff6ff", r: "Redraft with marginal EV (" + fmt(ev.ev) + "). Structure is close to breakeven.", a: "Playable if you enjoy it. Draft execution is the edge." };

  // CUT: bad EV, bad history, no path
  if (neverProf && ev.ev < -20 && !hi) return { v: "CUT", c: "#dc2626", bg: "#fef2f2", r: "Never profitable" + (hist ? " across " + hist.yr + " seasons" : "") + ". " + e.toFixed(0) + " edge, EV " + fmt(ev.ev) + ".", a: "Exit. Reinvest " + fmt(l.buy_in) + " where you compete." };
  if (rebuild && ev.ev < -30 && l.buy_in >= 100) return { v: "CUT", c: "#dc2626", bg: "#fef2f2", r: "Rebuilder at " + fmt(l.buy_in) + "/yr with " + e.toFixed(0) + " edge. EV " + fmt(ev.ev) + ".", a: "Sell assets for picks or exit. Roster doesn't justify the cost." };
  if (big && ev.ev < -20) return { v: "CUT", c: "#dc2626", bg: "#fef2f2", r: (l.teams || 12) + "-team field. " + ev.pp + "% playoff odds. EV " + fmt(ev.ev) + ".", a: l.buy_in <= 50 ? "Only keep if you enjoy the league format." : "Exit. Field math is against you at this price." };
  if (ev.ev < -50 && careerNet < -100) return { v: "CUT", c: "#dc2626", bg: "#fef2f2", r: "EV " + fmt(ev.ev) + ", career " + fmt(careerNet) + ". History and math both say no.", a: "Walk away. This is a capital drain." };

  // WATCH: everything else
  return { v: "WATCH", c: "#d97706", bg: "#fffbeb", r: e.toFixed(0) + " edge, " + (l.archetype || "?") + ". EV " + fmt(ev.ev) + ". Mixed signals.", a: "Monitor 2026. If still negative, cut." };
}

function AnimNum({ value, color, sz = 22 }) {
  const [d, setD] = useState(value);
  const r = useRef(null);
  useEffect(() => {
    let s = d; const e = value, dur = 500, t0 = Date.now();
    const tick = () => { const p = Math.min(1, (Date.now() - t0) / dur); setD(Math.round(s + (e - s) * (1 - Math.pow(1 - p, 3)))); if (p < 1) r.current = requestAnimationFrame(tick); };
    r.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(r.current);
  }, [value]);
  return <span style={{ fontSize: sz, fontWeight: 800, color, letterSpacing: "-0.5px" }}>{fmt(d)}</span>;
}

function LeagueForm({ league, season, onSave, onCancel }) {
  const blank = { season, league_name: "", buy_in: 50, payout_1st: 0, payout_2nd: 0, payout_3rd: 0, payout_extra: 0, extra_notes: "", teams: 12, playoff_spots: 6, tier: "$50-$99", finish: null, archetype: "Competitor", edge_score: null, format: "dynasty" };
  const [f, sF] = useState(league || blank);
  const s = (k, v) => sF(p => ({ ...p, [k]: v }));
  const save = () => {
    const fin = f.finish || 99;
    const n = fin === 1 ? (f.payout_1st || 0) - f.buy_in + (f.payout_extra || 0) : fin === 2 ? (f.payout_2nd || 0) - f.buy_in + (f.payout_extra || 0) : fin === 3 ? (f.payout_3rd || 0) - f.buy_in + (f.payout_extra || 0) : -f.buy_in + (f.payout_extra || 0);
    onSave({ ...f, net_profit: n, made_playoffs: fin <= (f.playoff_spots || 6), made_semis: fin <= 4, made_finals: fin <= 2, won_championship: fin === 1, tier: tierOf(f.buy_in) });
  };
  const I = { width: "100%", padding: "7px 9px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, color: "#0f172a", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" };
  const L = { fontSize: 9, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 2, display: "block" };
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>{league ? "Edit" : "Add"} League</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
        <div><label style={L}>Name</label><input style={I} value={f.league_name || ""} onChange={e => s("league_name", e.target.value)} /></div>
        <div><label style={L}>Season</label><input style={I} type="number" value={f.season} onChange={e => s("season", +e.target.value)} /></div>
        <div><label style={L}>Buy-In</label><input style={I} type="number" value={f.buy_in} onChange={e => s("buy_in", +e.target.value)} /></div>
        <div><label style={L}>Teams</label><input style={I} type="number" value={f.teams || 12} onChange={e => s("teams", +e.target.value)} /></div>
        <div><label style={L}>1st</label><input style={I} type="number" value={f.payout_1st || 0} onChange={e => s("payout_1st", +e.target.value)} /></div>
        <div><label style={L}>2nd</label><input style={I} type="number" value={f.payout_2nd || 0} onChange={e => s("payout_2nd", +e.target.value)} /></div>
        <div><label style={L}>3rd</label><input style={I} type="number" value={f.payout_3rd || 0} onChange={e => s("payout_3rd", +e.target.value)} /></div>
        <div><label style={L}>Extra $</label><input style={I} type="number" value={f.payout_extra || 0} onChange={e => s("payout_extra", +e.target.value)} /></div>
        <div><label style={L}>Finish</label><input style={I} type="number" min="1" value={f.finish || ""} onChange={e => s("finish", e.target.value ? +e.target.value : null)} /></div>
        <div><label style={L}>Format</label><select style={I} value={f.format || "dynasty"} onChange={e => s("format", e.target.value)}><option>dynasty</option><option>redraft</option></select></div>
        <div><label style={L}>Archetype</label><select style={I} value={f.archetype || ""} onChange={e => s("archetype", e.target.value)}><option value="">-</option><option>Competitor</option><option>Rebuilder</option></select></div>
        <div><label style={L}>Edge</label><input style={I} type="number" step="0.1" value={f.edge_score || ""} onChange={e => s("edge_score", e.target.value ? +e.target.value : null)} /></div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        <button onClick={save} style={{ padding: "7px 18px", borderRadius: 6, border: "none", background: "#0f172a", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Save</button>
        <button onClick={onCancel} style={{ padding: "7px 18px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 12, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

export default function App() {
  const [all, setAll] = useState([]);
  const [seasons, setSeasonsState] = useState([]);
  const [season, setSeason] = useState("latest");
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [showForm, setSF] = useState(false);
  const [editL, setEL] = useState(null);
  const [excluded, setExcluded] = useState(new Set());
  const [optimized, setOptimized] = useState(false);
  const [insightSort, setIS] = useState("ev");
  const [vFilter, setVF] = useState("all");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [data, yrs] = await Promise.all([getAllLeagues(), getSeasons()]);
      setAll(data);
      setSeasonsState(yrs.length > 0 ? yrs : [2025]);
      if (season === "latest" && yrs.length > 0) setSeason(yrs[0]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const curSeason = season === "latest" ? (seasons[0] || 2025) : season;
  const curData = useMemo(() => all.filter(l => l.season === curSeason), [all, curSeason]);

  // Career history per league name (lowercase key)
  const careerMap = useMemo(() => {
    const m = {};
    all.forEach(l => {
      const k = (l.league_name || "").toLowerCase().replace(/\s*\(.*\)/, "").trim();
      if (!m[k]) m[k] = { nm: l.league_name, yr: 0, net: 0, ships: 0, trend: [], inv: 0, prof: 0 };
      m[k].yr++;
      m[k].net += l.net_profit;
      m[k].inv += l.buy_in;
      if (l.won_championship) m[k].ships++;
      if (l.net_profit > 0) m[k].prof++;
      m[k].trend.push(l.net_profit);
    });
    return m;
  }, [all]);

  const getHist = (name) => {
    const k = (name || "").toLowerCase().replace(/\s*\(.*\)/, "").trim();
    const h = careerMap[k];
    return h && h.yr >= 2 ? h : null;
  };

  // Diagnosed current season leagues
  const diagnosed = useMemo(() => {
    return curData.map(l => {
      const ev = calcEV(l);
      const h = getHist(l.league_name);
      const dx = verdict(l, h);
      return { ...l, ev, dx, hist: h };
    }).sort((a, b) => {
      if (insightSort === "ev") return b.ev.ev - a.ev.ev;
      if (insightSort === "edge") return (b.edge_score || 0) - (a.edge_score || 0);
      if (insightSort === "net") return b.net_profit - a.net_profit;
      if (insightSort === "buyin") return b.buy_in - a.buy_in;
      return 0;
    });
  }, [curData, careerMap, insightSort]);

  const filtered = vFilter === "all" ? diagnosed : diagnosed.filter(l => l.dx.v === vFilter);
  const vCounts = useMemo(() => { const m = {}; diagnosed.forEach(l => { m[l.dx.v] = (m[l.dx.v] || 0) + 1; }); return m; }, [diagnosed]);

  // Portfolio calculations
  const active = diagnosed.filter(l => !excluded.has(l.id));
  const totBI = active.reduce((s, l) => s + l.buy_in, 0);
  const totNet = active.reduce((s, l) => s + l.net_profit, 0);
  const totEV = active.reduce((s, l) => s + l.ev.ev, 0);
  const totShips = active.filter(l => l.won_championship).length;
  const totCount = active.length;
  const yr1 = totEV;
  const yr2 = totEV * 2;

  // Full portfolio (no exclusions) for comparison
  const fullBI = diagnosed.reduce((s, l) => s + l.buy_in, 0);
  const fullEV = diagnosed.reduce((s, l) => s + l.ev.ev, 0);
  const fullCount = diagnosed.length;

  const savings = fullBI - totBI;
  const evDelta = totEV - fullEV;

  // Season aggregates for charts
  const seasonAgg = useMemo(() => {
    const m = {};
    all.forEach(l => {
      if (!m[l.season]) m[l.season] = { year: l.season, net: 0, deployed: 0, leagues: 0, ships: 0 };
      m[l.season].net += l.net_profit;
      m[l.season].deployed += l.buy_in;
      m[l.season].leagues++;
      if (l.won_championship) m[l.season].ships++;
    });
    return Object.values(m).sort((a, b) => a.year - b.year);
  }, [all]);

  const cumData = useMemo(() => { let r = 0; return seasonAgg.map(s => { r += s.net; return { ...s, cum: r }; }); }, [seasonAgg]);

  // Optimizer: auto-exclude all CUT leagues
  const runOptimize = () => {
    const cuts = diagnosed.filter(l => l.dx.v === "CUT").map(l => l.id);
    setExcluded(new Set(cuts));
    setOptimized(true);
  };
  const resetPortfolio = () => { setExcluded(new Set()); setOptimized(false); };
  const toggleExclude = (id) => {
    setExcluded(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    setOptimized(false);
  };

  // CRUD
  const saveLeague = async (l) => {
    try { await upsertLeague({ ...l, season: l.season || curSeason }); setSF(false); setEL(null); load(); } catch (e) { console.error(e); }
  };
  const delLeague = async (id) => { try { await delApi(id); load(); } catch (e) { console.error(e); } };

  const ttS = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 11, color: "#1e293b", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" };
  const P = { background: "#f8fafc", borderRadius: 10, padding: "16px 18px", border: "0.5px solid #f1f5f9" };
  const PT = { fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 10 };
  const pill = (active, color) => ({ padding: "4px 12px", borderRadius: 16, fontSize: 10, fontWeight: 600, border: active ? "1.5px solid " + (color || "#0f172a") : "1px solid #e5e7eb", background: active ? (color || "#0f172a") + "12" : "#fff", color: active ? (color || "#0f172a") : "#94a3b8", cursor: "pointer" });

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", color: "#94a3b8" }}>Loading from Supabase...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#0f172a", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>
        {/* NAV */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>League P&L</h1>
          <div style={{ display: "flex", gap: 2, background: "#f1f5f9", borderRadius: 8, padding: 2 }}>
            {["overview", "leagues", "insights"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: tab === t ? "#fff" : "transparent", color: tab === t ? "#0f172a" : "#64748b", boxShadow: tab === t ? "0 1px 2px rgba(0,0,0,0.06)" : "none", textTransform: "capitalize" }}>{t}</button>
            ))}
          </div>
        </div>

        {/* METRIC STRIP */}
        <div style={{ display: "flex", padding: "14px 0", marginBottom: 16, borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9" }}>
          {[{ l: "Deployed", v: totBI, c: "#0f172a" }, { l: "Net (" + curSeason + ")", v: totNet, c: totNet >= 0 ? "#059669" : "#dc2626" }, { l: "Ships", c: "#d97706", raw: totShips }, { l: "Portfolio EV", v: totEV, c: totEV >= 0 ? "#059669" : "#dc2626" }, { l: "Leagues", c: "#0f172a", raw: totCount }].map((m, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", borderRight: i < 4 ? "1px solid #f1f5f9" : "none" }}>
              {m.raw !== undefined ? <span style={{ fontSize: 22, fontWeight: 800, color: m.c }}>{m.raw}</span> : <AnimNum value={m.v} color={m.c} />}
              <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 2 }}>{m.l}</div>
            </div>
          ))}
        </div>

        {/* SEASON PILLS */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
          {seasons.map(y => {
            const sn = seasonAgg.find(s => s.year === y);
            return (
              <button key={y} onClick={() => { setSeason(y); setExcluded(new Set()); setOptimized(false); }} style={pill(curSeason === y)}>
                {y} {sn && <span style={{ fontWeight: 700, color: curSeason === y ? (sn.net >= 0 ? "#059669" : "#dc2626") : (sn.net >= 0 ? "#059669" : "#dc2626"), marginLeft: 4 }}>{fmt(sn.net)}</span>}
              </button>
            );
          })}
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div style={P}><div style={PT}>Season P&L (career)</div><ResponsiveContainer width="100%" height={180}><BarChart data={seasonAgg}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 9 }} /><YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} tickFormatter={v => v >= 0 ? "$" + (v / 1000).toFixed(1) + "k" : "-$" + (Math.abs(v) / 1000).toFixed(1) + "k"} /><Tooltip contentStyle={ttS} formatter={v => [fmt(v), "Net"]} /><Bar dataKey="net" radius={[4, 4, 0, 0]}>{seasonAgg.map((e, i) => <Cell key={i} fill={e.net >= 0 ? "#059669" : "#dc2626"} />)}</Bar></BarChart></ResponsiveContainer></div>
              <div style={P}><div style={PT}>Cumulative P&L</div><ResponsiveContainer width="100%" height={180}><AreaChart data={cumData}><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#059669" stopOpacity={0.15} /><stop offset="100%" stopColor="#059669" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 9 }} /><YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} tickFormatter={v => "$" + (v / 1000).toFixed(1) + "k"} /><Tooltip contentStyle={ttS} formatter={v => [fmt(v), "Total"]} /><Area type="monotone" dataKey="cum" stroke="#059669" fill="url(#cg)" strokeWidth={2} dot={{ fill: "#059669", r: 3 }} /></AreaChart></ResponsiveContainer></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={P}><div style={PT}>Scale vs profit</div><ResponsiveContainer width="100%" height={180}><ComposedChart data={seasonAgg}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 9 }} /><YAxis yAxisId="l" tick={{ fill: "#2563eb", fontSize: 9 }} /><YAxis yAxisId="r" orientation="right" tick={{ fill: "#059669", fontSize: 9 }} tickFormatter={v => fmt(v)} /><Tooltip contentStyle={ttS} /><Bar yAxisId="l" dataKey="leagues" fill="#2563eb" opacity={0.2} radius={[3, 3, 0, 0]} name="Leagues" /><Line yAxisId="r" type="monotone" dataKey="net" stroke="#059669" strokeWidth={2} dot={{ fill: "#059669", r: 3 }} name="Net" /></ComposedChart></ResponsiveContainer></div>
              <div style={P}>
                <div style={PT}>{curSeason} EV distribution</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={[...diagnosed].sort((a, b) => b.ev.ev - a.ev.ev)} margin={{ left: 0, right: 0 }}>
                    <XAxis dataKey="league_name" tick={false} /><YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} tickFormatter={v => fmt(v)} />
                    <Tooltip contentStyle={ttS} formatter={(v, n, p) => [fmt(v), p.payload.league_name]} labelFormatter={() => ""} />
                    <Bar dataKey="ev.ev" radius={[2, 2, 0, 0]}>{[...diagnosed].sort((a, b) => b.ev.ev - a.ev.ev).map((e, i) => <Cell key={i} fill={e.ev.ev >= 0 ? "#059669" : "#dc2626"} opacity={0.7} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* LEAGUES */}
        {tab === "leagues" && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center" }}>
              <button onClick={() => { setSF(true); setEL(null); }} style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: "#0f172a", color: "#fff", fontWeight: 700, fontSize: 10, cursor: "pointer" }}>+ Add League</button>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>Showing {curSeason}</span>
            </div>
            {showForm && <LeagueForm league={editL} season={curSeason} onSave={saveLeague} onCancel={() => { setSF(false); setEL(null); }} />}
            <div style={{ borderRadius: 10, overflow: "hidden", border: "0.5px solid #e5e7eb", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 700 }}>
                <thead><tr style={{ background: "#f8fafc" }}>
                  {["#", "League", "Format", "Buy", "Edge", "Fin", "EV", "Verdict", "Net", ""].map((h, i) => (
                    <th key={i} style={{ padding: "7px 8px", textAlign: i <= 1 ? "left" : "center", fontSize: 9, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {diagnosed.map((l, i) => (
                    <tr key={l.id} style={{ borderTop: "1px solid #f5f5f5", background: l.won_championship ? "#fffbeb" : excluded.has(l.id) ? "#fef2f2" : "#fff", opacity: excluded.has(l.id) ? 0.5 : 1 }}>
                      <td style={{ padding: "7px 8px", color: "#94a3b8", fontSize: 9 }}>{i + 1}</td>
                      <td style={{ padding: "7px 8px" }}>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{l.league_name}{l.won_championship ? " \u{1F3C6}" : ""}</div>
                        <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>
                          {[rankLabel(l), edgeFreshnessLabel(l)].filter(Boolean).join(" | ")}
                        </div>
                      </td>
                      <td style={{ padding: "7px 8px", textAlign: "center" }}><span style={{ fontSize: 8, padding: "1px 6px", borderRadius: 8, background: l.format === "redraft" ? "#dbeafe" : "#f0fdf4", color: l.format === "redraft" ? "#2563eb" : "#059669", fontWeight: 600 }}>{l.format || "dynasty"}</span></td>
                      <td style={{ padding: "7px 8px", textAlign: "center", fontWeight: 600 }}>{fmt(l.buy_in)}</td>
                      <td style={{ padding: "7px 8px", textAlign: "center", fontWeight: 700, fontSize: 10, color: (l.edge_score || 0) >= 90 ? "#059669" : (l.edge_score || 0) >= 80 ? "#d97706" : "#dc2626" }}>{l.edge_score ? l.edge_score.toFixed(0) : "-"}</td>
                      <td style={{ padding: "7px 8px", textAlign: "center", fontWeight: 600, color: l.finish === 1 ? "#d97706" : "#64748b" }}>{!l.finish ? "?" : l.finish <= 3 ? ["1st", "2nd", "3rd"][l.finish - 1] : l.finish + "th"}</td>
                      <td style={{ padding: "7px 8px", textAlign: "center", fontWeight: 700, fontSize: 10, color: l.ev.ev >= 0 ? "#059669" : "#dc2626" }}>{fmt(l.ev.ev)}</td>
                      <td style={{ padding: "7px 8px", textAlign: "center" }}><span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 8, background: l.dx.c + "15", color: l.dx.c, fontWeight: 700 }}>{l.dx.v}</span></td>
                      <td style={{ padding: "7px 8px", textAlign: "center", fontWeight: 700, color: l.net_profit > 0 ? "#059669" : l.net_profit === 0 ? "#94a3b8" : "#dc2626" }}>{(l.net_profit > 0 ? "+" : "") + fmt(l.net_profit)}</td>
                      <td style={{ padding: "7px 8px", textAlign: "center", whiteSpace: "nowrap" }}>
                        <button onClick={() => { setEL(l); setSF(true); }} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: 8 }}>Edit</button>
                        <button onClick={() => delLeague(l.id)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 8, marginLeft: 2 }}>Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr style={{ borderTop: "2px solid #e5e7eb", background: "#f8fafc" }}>
                  <td colSpan={3} style={{ padding: "10px", fontWeight: 800 }}>Total ({totCount})</td>
                  <td style={{ padding: "10px", textAlign: "center", fontWeight: 700 }}>{fmt(totBI)}</td>
                  <td colSpan={2} />
                  <td style={{ padding: "10px", textAlign: "center", fontWeight: 700, color: totEV >= 0 ? "#059669" : "#dc2626" }}>{fmt(totEV)}</td>
                  <td />
                  <td style={{ padding: "10px", textAlign: "center", fontWeight: 800, color: totNet >= 0 ? "#059669" : "#dc2626" }}>{(totNet > 0 ? "+" : "") + fmt(totNet)}</td>
                  <td />
                </tr></tfoot>
              </table>
            </div>
          </div>
        )}

        {/* INSIGHTS */}
        {tab === "insights" && (
          <div>
            {/* Portfolio Simulator Banner */}
            <div style={{ background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Portfolio Simulator</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>Uncheck leagues below or hit Optimize to auto-cut negative-EV leagues</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={runOptimize} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: optimized ? "#059669" : "#0f172a", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{optimized ? "\u2713 Optimized" : "Optimize"}</button>
                  {excluded.size > 0 && <button onClick={resetPortfolio} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 11, cursor: "pointer" }}>Reset</button>}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                <div style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", border: "0.5px solid #e2e8f0" }}>
                  <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Leagues</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{totCount}<span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400 }}>/{fullCount}</span></div>
                </div>
                <div style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", border: "0.5px solid #e2e8f0" }}>
                  <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Deployed</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{fmt(totBI)}</div>
                  {savings > 0 && <div style={{ fontSize: 9, color: "#059669", fontWeight: 600 }}>Saves {fmt(savings)}</div>}
                </div>
                <div style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", border: "0.5px solid #e2e8f0" }}>
                  <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Portfolio EV</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: totEV >= 0 ? "#059669" : "#dc2626" }}>{fmt(totEV)}</div>
                  {evDelta !== 0 && <div style={{ fontSize: 9, color: evDelta > 0 ? "#059669" : "#dc2626", fontWeight: 600 }}>{evDelta > 0 ? "+" : ""}{fmt(evDelta)} vs full</div>}
                </div>
                <div style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", border: "0.5px solid #e2e8f0" }}>
                  <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Year 1 projected</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: yr1 >= 0 ? "#059669" : "#dc2626" }}>{fmt(yr1)}</div>
                </div>
                <div style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", border: "0.5px solid #e2e8f0" }}>
                  <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Year 2 cumulative</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: yr2 >= 0 ? "#059669" : "#dc2626" }}>{fmt(yr2)}</div>
                </div>
              </div>
            </div>

            {/* Verdict + Sort pills */}
            <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>Verdict:</span>
              {[{ k: "all", l: "All", c: "#0f172a" }, { k: "KEEP", l: "Keep", c: "#059669" }, { k: "TURNABLE", l: "Turnable", c: "#2563eb" }, { k: "WATCH", l: "Watch", c: "#d97706" }, { k: "CUT", l: "Cut", c: "#dc2626" }].filter(f => f.k === "all" || vCounts[f.k]).map(f => (
                <button key={f.k} onClick={() => setVF(f.k)} style={pill(vFilter === f.k, f.c)}>
                  {f.l} {vCounts[f.k] !== undefined && <span style={{ fontWeight: 700 }}>({vCounts[f.k]})</span>}
                </button>
              ))}
              <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, marginLeft: 12 }}>Sort:</span>
              {[["ev", "EV"], ["edge", "Edge"], ["net", "Result"], ["buyin", "Buy-In"]].map(([k, l]) => (
                <button key={k} onClick={() => setIS(k)} style={pill(insightSort === k)}>{l}</button>
              ))}
            </div>

            {/* League Cards with Checkboxes */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
              {filtered.map(l => {
                const ev = l.ev; const dx = l.dx; const h = l.hist; const off = excluded.has(l.id);
                return (
                  <div key={l.id} style={{ padding: "12px 16px", background: off ? "#f8f8f8" : dx.bg, borderRadius: 8, border: "0.5px solid " + (off ? "#e5e7eb" : dx.c + "25"), borderLeft: "3px solid " + (off ? "#d1d5db" : dx.c), opacity: off ? 0.5 : 1, transition: "all 0.2s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ display: "flex", gap: 10, flex: 1 }}>
                        <input type="checkbox" checked={!off} onChange={() => toggleExclude(l.id)} style={{ marginTop: 3, cursor: "pointer", accentColor: dx.c }} />
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 14, fontWeight: 800 }}>{l.league_name}</span>
                            <span style={{ fontSize: 8, padding: "2px 7px", borderRadius: 10, background: dx.c + "20", color: dx.c, fontWeight: 700 }}>{dx.v}</span>
                            <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 6, background: l.format === "redraft" ? "#dbeafe" : "#f0fdf4", color: l.format === "redraft" ? "#2563eb" : "#059669", fontWeight: 600 }}>{l.format || "dynasty"}</span>
                            {l.archetype && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 6, background: "#f1f5f9", color: "#64748b", fontWeight: 600 }}>{l.archetype}</span>}
                          </div>
                          <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 3 }}>
                            {[rankLabel(l), edgeFreshnessLabel(l)].filter(Boolean).join(" | ")}
                          </div>
                          <div style={{ fontSize: 10, color: "#64748b", marginTop: 3 }}>
                            {fmt(l.buy_in)}/yr, {l.edge_score != null ? l.edge_score.toFixed(0) + " edge" : "Pre-season edge"}, {ev.pp}% playoff, {ev.be} BE, {ev.upside}x upside{h ? ", " + h.yr + " seasons" : ""}
                          </div>
                          <div style={{ fontSize: 11, color: dx.c, fontWeight: 600, marginTop: 4 }}>{dx.r}</div>
                          <div style={{ fontSize: 10, color: "#64748b", fontStyle: "italic", marginTop: 2 }}>{dx.a}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: l.net_profit >= 0 ? "#059669" : "#dc2626" }}>{(l.net_profit > 0 ? "+" : "") + fmt(l.net_profit)}</div>
                        <div style={{ fontSize: 9, color: ev.ev >= 0 ? "#059669" : "#dc2626", fontWeight: 700, marginTop: 2 }}>EV: {fmt(ev.ev)}</div>
                        <div style={{ fontSize: 8, color: "#94a3b8" }}>{fmt(l.buy_in)}/yr</div>
                        {h && <div style={{ display: "flex", gap: 2, marginTop: 4, justifyContent: "flex-end" }}>{h.trend.map((v, i) => (<div key={i} style={{ width: 14, height: 8, borderRadius: 2, background: v > 0 ? "#059669" : v < 0 ? "#dc2626" : "#d1d5db", opacity: i === h.trend.length - 1 ? 1 : 0.5 }} />))}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Season + Tier below */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
              <div style={P}>
                <div style={PT}>Season performance</div>
                {[...seasonAgg].sort((a, b) => b.net - a.net).map(s => (
                  <div key={s.year} onClick={() => { setSeason(s.year); setTab("overview"); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f8fafc", cursor: "pointer" }}>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: 15, marginRight: 8 }}>{s.year}</span>
                      <span style={{ fontSize: 10, color: "#94a3b8" }}>{s.leagues} lgs, {fmt(s.deployed)}</span>
                      {s.ships > 0 && <span style={{ fontSize: 10, color: "#d97706", marginLeft: 6, fontWeight: 600 }}>{s.ships} ships</span>}
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 14, color: s.net >= 0 ? "#059669" : "#dc2626" }}>{fmt(s.net)}</span>
                  </div>
                ))}
              </div>
              <div style={P}>
                <div style={PT}>Tier ROI ({curSeason})</div>
                {TIERS.map(t => {
                  const tl = active.filter(l => tierOf(l.buy_in) === t);
                  if (!tl.length) return null;
                  const n = tl.reduce((s, l) => s + l.net_profit, 0);
                  const d = tl.reduce((s, l) => s + l.buy_in, 0);
                  const roi = d > 0 ? Math.round(n / d * 100) : 0;
                  const mx = Math.max(...TIERS.map(tt => Math.abs(active.filter(l => tierOf(l.buy_in) === tt).reduce((s, l) => s + l.net_profit, 0))), 1);
                  return (
                    <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: TC[t] }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: TC[t], minWidth: 60 }}>{t}</span>
                      <span style={{ fontSize: 9, color: "#94a3b8", minWidth: 20 }}>{tl.length}</span>
                      <div style={{ flex: 1, height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: Math.abs(n) / mx * 100 + "%", height: "100%", borderRadius: 4, background: n >= 0 ? "#059669" : "#dc2626" }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: n >= 0 ? "#059669" : "#dc2626", minWidth: 55, textAlign: "right" }}>{fmt(n)}</span>
                      <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 8, background: roi >= 0 ? "#ecfdf5" : "#fef2f2", color: roi >= 0 ? "#059669" : "#dc2626", fontWeight: 600, minWidth: 35, textAlign: "center" }}>{roi}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
