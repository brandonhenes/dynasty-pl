import { useState, useEffect, useMemo, useCallback } from "react";
import {
  getLeagues,
  getSeasons,
  upsertLeague,
  deleteLeague as delLeagueApi,
  type LeagueFinancial,
} from "./lib/supabase";

const TIERS = ["<$50", "$50-$99", "$100-$199", "$200-$299", "$300-$499"];
const TC: Record<string, string> = {
  "<$50": "#64748b",
  "$50-$99": "#22c55e",
  "$100-$199": "#3b82f6",
  "$200-$299": "#f59e0b",
  "$300-$499": "#ef4444",
};
const ARCHS = [
  "Dynasty Juggernaut",
  "All-In Contender",
  "Fragile Contender",
  "Competitor",
  "Productive Struggle",
  "Rebuilder",
  "Dead Zone",
];
const AC: Record<string, string> = {
  "Dynasty Juggernaut": "#f59e0b",
  "All-In Contender": "#3b82f6",
  "Fragile Contender": "#f97316",
  Competitor: "#64748b",
  "Productive Struggle": "#22c55e",
  Rebuilder: "#a855f7",
  "Dead Zone": "#ef4444",
};

function fmt(n: number) {
  return n >= 0
    ? "$" + Math.abs(n).toLocaleString()
    : "-$" + Math.abs(n).toLocaleString();
}
function pct(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 100) + "%" : "0%";
}

function calcBe(l: LeagueFinancial) {
  if (l.payout_3rd >= l.buy_in) return { p: "3rd", e: true };
  if (l.payout_2nd >= l.buy_in) return { p: "2nd", e: false };
  if (l.payout_1st >= l.buy_in) return { p: "1st", e: false };
  return { p: "None", e: false };
}

function calcPri(l: LeagueFinancial) {
  const t = l.teams || 12;
  const ev =
    (l.payout_1st / t) * 0.15 +
    (l.payout_2nd / t) * 0.25 +
    (l.payout_3rd / t) * 0.35;
  const adj = ev * Math.min(1, 6 / t);
  return Math.round(Math.min(99, Math.max(1, l.buy_in > 0 ? (adj / l.buy_in) * 100 : 0)));
}

function finLabel(f: number | null) {
  if (!f) return "TBD";
  if (f === 1) return "1st";
  if (f === 2) return "2nd";
  if (f === 3) return "3rd";
  return f + "th";
}

function computeNet(l: {
  finish: number | null;
  buy_in: number;
  payout_1st: number;
  payout_2nd: number;
  payout_3rd: number;
  payout_extra: number;
}) {
  const fin = l.finish || 99;
  if (fin === 1) return l.payout_1st - l.buy_in + l.payout_extra;
  if (fin === 2) return l.payout_2nd - l.buy_in + l.payout_extra;
  if (fin === 3) return l.payout_3rd - l.buy_in + l.payout_extra;
  return -l.buy_in + l.payout_extra;
}

/* ─── Components ─── */

function SB({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        flex: "1 1 120px",
        padding: "12px 14px",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: color || "#f1f5f9",
          fontFamily: "monospace",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}

function Form({
  league,
  season,
  onSave,
  onCancel,
}: {
  league: LeagueFinancial | null;
  season: number;
  onSave: (l: Partial<LeagueFinancial> & { season: number }) => void;
  onCancel: () => void;
}) {
  const blank: Partial<LeagueFinancial> & { season: number } = {
    season,
    league_name: "",
    buy_in: 50,
    payout_1st: 0,
    payout_2nd: 0,
    payout_3rd: 0,
    payout_extra: 0,
    extra_notes: "",
    teams: 12,
    playoff_spots: 6,
    tier: "$50-$99",
    finish: null,
    archetype: "Competitor",
    edge_score: null,
  };
  const [f, sF] = useState<Record<string, unknown>>(league ? { ...league } : blank);
  const s = (k: string, v: unknown) => sF((p) => ({ ...p, [k]: v }));

  const save = () => {
    const fin = (f.finish as number) || 99;
    const ps = (f.playoff_spots as number) || 6;
    onSave({
      ...(f as Partial<LeagueFinancial> & { season: number }),
      season,
      net_profit: computeNet({
        finish: f.finish as number | null,
        buy_in: (f.buy_in as number) || 0,
        payout_1st: (f.payout_1st as number) || 0,
        payout_2nd: (f.payout_2nd as number) || 0,
        payout_3rd: (f.payout_3rd as number) || 0,
        payout_extra: (f.payout_extra as number) || 0,
      }),
      made_playoffs: fin <= ps,
      made_semis: fin <= 4,
      made_finals: fin <= 2,
      won_championship: fin === 1,
    });
  };

  const IS: React.CSSProperties = {
    width: "100%",
    padding: "7px 9px",
    background: "#1a2332",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 5,
    color: "#e2e8f0",
    fontSize: 12,
    fontFamily: "inherit",
    boxSizing: "border-box",
  };
  const LS: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
    display: "block",
  };

  return (
    <div
      style={{
        background: "#1a2332",
        border: "1px solid rgba(245,158,11,0.3)",
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 12 }}>
        {league ? "Edit" : "Add"} League
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 8,
        }}
      >
        <div>
          <label style={LS}>Name</label>
          <input style={IS} value={String(f.league_name ?? "")} onChange={(e) => s("league_name", e.target.value)} />
        </div>
        <div>
          <label style={LS}>Buy-In</label>
          <input style={IS} type="number" value={Number(f.buy_in ?? 0)} onChange={(e) => s("buy_in", +e.target.value)} />
        </div>
        <div>
          <label style={LS}>Teams</label>
          <input style={IS} type="number" value={Number(f.teams ?? 12)} onChange={(e) => s("teams", +e.target.value)} />
        </div>
        <div>
          <label style={LS}>Playoff Spots</label>
          <input style={IS} type="number" value={Number(f.playoff_spots ?? 6)} onChange={(e) => s("playoff_spots", +e.target.value)} />
        </div>
        <div>
          <label style={LS}>1st Payout</label>
          <input style={IS} type="number" value={Number(f.payout_1st ?? 0)} onChange={(e) => s("payout_1st", +e.target.value)} />
        </div>
        <div>
          <label style={LS}>2nd Payout</label>
          <input style={IS} type="number" value={Number(f.payout_2nd ?? 0)} onChange={(e) => s("payout_2nd", +e.target.value)} />
        </div>
        <div>
          <label style={LS}>3rd Payout</label>
          <input style={IS} type="number" value={Number(f.payout_3rd ?? 0)} onChange={(e) => s("payout_3rd", +e.target.value)} />
        </div>
        <div>
          <label style={LS}>Extra $</label>
          <input style={IS} type="number" value={Number(f.payout_extra ?? 0)} onChange={(e) => s("payout_extra", +e.target.value)} />
        </div>
        <div>
          <label style={LS}>Finish</label>
          <input style={IS} type="number" min="1" value={f.finish != null ? Number(f.finish) : ""} onChange={(e) => s("finish", e.target.value ? +e.target.value : null)} />
        </div>
        <div>
          <label style={LS}>Tier</label>
          <select style={IS} value={String(f.tier ?? "$50-$99")} onChange={(e) => s("tier", e.target.value)}>
            {TIERS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={LS}>Archetype</label>
          <select style={IS} value={String(f.archetype ?? "")} onChange={(e) => s("archetype", e.target.value)}>
            <option value="">-</option>
            {ARCHS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={LS}>Edge</label>
          <input style={IS} type="number" step="0.1" value={f.edge_score != null ? Number(f.edge_score) : ""} onChange={(e) => s("edge_score", e.target.value ? +e.target.value : null)} />
        </div>
        <div>
          <label style={LS}>Notes</label>
          <input style={IS} value={String(f.extra_notes ?? "")} onChange={(e) => s("extra_notes", e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        <button
          onClick={save}
          style={{
            padding: "7px 18px",
            borderRadius: 5,
            border: "none",
            background: "#f59e0b",
            color: "#0c1220",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Save
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: "7px 18px",
            borderRadius: 5,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent",
            color: "#94a3b8",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ─── Main App ─── */

export default function App() {
  const [leagues, setLeagues] = useState<LeagueFinancial[]>([]);
  const [seasons, setSeasonsState] = useState<number[]>([2025]);
  const [season, setSeason] = useState(2025);
  const [sort, setSort] = useState("priority");
  const [fTier, setFT] = useState<string | null>(null);
  const [fArch, setFA] = useState<string | null>(null);
  const [showForm, setSF] = useState(false);
  const [editL, setEL] = useState<LeagueFinancial | null>(null);
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [data, yrs] = await Promise.all([getLeagues(season), getSeasons()]);
      setLeagues(data);
      setSeasonsState(yrs.length > 0 ? yrs : [2025]);
      setErr(null);
    } catch (e: unknown) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }, [season]);

  useEffect(() => {
    load();
  }, [load]);

  const saveLeague = async (l: Partial<LeagueFinancial> & { season: number }) => {
    try {
      await upsertLeague(l);
      setSF(false);
      setEL(null);
      load();
    } catch (e: unknown) {
      setErr(String(e));
    }
  };

  const delLeague = async (id: string) => {
    try {
      await delLeagueApi(id);
      load();
    } catch (e: unknown) {
      setErr(String(e));
    }
  };

  type Enriched = LeagueFinancial & { priority: number; brk: { p: string; e: boolean } };

  const data = useMemo<Enriched[]>(() => {
    let list: Enriched[] = leagues.map((l) => ({
      ...l,
      priority: calcPri(l),
      brk: calcBe(l),
    }));
    if (fTier) list = list.filter((l) => l.tier === fTier);
    if (fArch) list = list.filter((l) => l.archetype === fArch);
    if (sort === "finish") list.sort((a, b) => (a.finish || 99) - (b.finish || 99));
    else if (sort === "net") list.sort((a, b) => b.net_profit - a.net_profit);
    else if (sort === "buyin") list.sort((a, b) => b.buy_in - a.buy_in);
    else if (sort === "edge")
      list.sort((a, b) => (b.edge_score || 0) - (a.edge_score || 0));
    else list.sort((a, b) => b.priority - a.priority);
    return list;
  }, [leagues, sort, fTier, fArch]);

  const tBI = data.reduce((s, l) => s + l.buy_in, 0);
  const tN = data.reduce((s, l) => s + l.net_profit, 0);
  const ch = data.filter((l) => l.won_championship).length;
  const ca = data.filter((l) => l.net_profit > 0).length;
  const aR = data
    .filter((l) => !l.finish || l.net_profit < 0)
    .reduce((s, l) => s + l.buy_in, 0);

  const archSt = useMemo(() => {
    const m: Record<string, { c: number; d: number; n: number }> = {};
    for (const l of data) {
      const a = l.archetype || "?";
      if (!m[a]) m[a] = { c: 0, d: 0, n: 0 };
      m[a].c++;
      m[a].d += l.buy_in;
      m[a].n += l.net_profit;
    }
    return Object.entries(m).sort((a, b) => b[1].n - a[1].n);
  }, [data]);

  const BtnS = (active: boolean): React.CSSProperties => ({
    padding: "4px 10px",
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    border: active ? "2px solid #f59e0b" : "1px solid rgba(255,255,255,0.08)",
    background: active ? "rgba(245,158,11,0.1)" : "transparent",
    color: active ? "#f59e0b" : "#64748b",
  });

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0c1220",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#f59e0b",
          fontFamily: "system-ui",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0c1220",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "20px 14px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "#f59e0b",
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              Dynasty Fantasy Football
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: "2px 0 0" }}>
              League P&L
            </h1>
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
            {seasons.map((y) => (
              <button
                key={y}
                onClick={() => {
                  setSeason(y);
                  setFT(null);
                  setFA(null);
                }}
                style={BtnS(season === y)}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {err && (
          <div
            style={{
              padding: "8px 12px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 6,
              marginBottom: 10,
              fontSize: 11,
              color: "#ef4444",
            }}
          >
            {err}
          </div>
        )}

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 2,
            marginBottom: 12,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            paddingBottom: 5,
          }}
        >
          {["dashboard", "leagues", "insights"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "4px 12px",
                borderRadius: "4px 4px 0 0",
                border: "none",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                background: tab === t ? "rgba(245,158,11,0.1)" : "transparent",
                color: tab === t ? "#f59e0b" : "#64748b",
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <SB label="Deployed" value={fmt(tBI)} sub={data.length + " leagues"} />
              <SB
                label="Net P&L"
                value={fmt(tN)}
                color={tN >= 0 ? "#22c55e" : "#ef4444"}
                sub={tBI > 0 ? ((tN / tBI) * 100).toFixed(0) + "% ROI" : ""}
              />
              <SB label="Ships" value={ch} color="#f59e0b" sub={pct(ch, data.length)} />
              <SB label="Cashed" value={ca + "/" + data.length} color="#22c55e" />
              <SB label="At Risk" value={fmt(aR)} color="#ef4444" />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 6,
                marginBottom: 12,
              }}
            >
              {TIERS.map((tier) => {
                const tl = data.filter((l) => l.tier === tier);
                if (!tl.length) return null;
                const n = tl.reduce((s, l) => s + l.net_profit, 0);
                return (
                  <button
                    key={tier}
                    onClick={() => setFT(fTier === tier ? null : tier)}
                    style={{
                      padding: "7px 9px",
                      borderRadius: 5,
                      cursor: "pointer",
                      textAlign: "left",
                      border:
                        fTier === tier
                          ? "2px solid " + TC[tier]
                          : "1px solid rgba(255,255,255,0.06)",
                      background:
                        fTier === tier ? TC[tier] + "15" : "rgba(255,255,255,0.02)",
                      fontFamily: "inherit",
                      color: "#e2e8f0",
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 700, color: TC[tier] }}>
                      {tier} ({tl.length})
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: n >= 0 ? "#22c55e" : "#ef4444",
                        fontWeight: 700,
                        marginTop: 1,
                      }}
                    >
                      {fmt(n)}
                    </div>
                  </button>
                );
              })}
            </div>

            {data.length > 0 &&
              (() => {
                const best = [...data].sort((a, b) => b.net_profit - a.net_profit)[0];
                const worst = [...data].sort((a, b) => a.net_profit - b.net_profit)[0];
                return (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <div
                      style={{
                        flex: 1,
                        minWidth: 200,
                        padding: "10px 12px",
                        background: "rgba(34,197,94,0.06)",
                        border: "1px solid rgba(34,197,94,0.12)",
                        borderRadius: 6,
                      }}
                    >
                      <div style={{ fontSize: 8, fontWeight: 700, color: "#22c55e", textTransform: "uppercase" }}>Best</div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{best.league_name}</div>
                      <div style={{ fontSize: 11, color: "#22c55e", fontFamily: "monospace", fontWeight: 700 }}>+{fmt(best.net_profit)}</div>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        minWidth: 200,
                        padding: "10px 12px",
                        background: "rgba(239,68,68,0.06)",
                        border: "1px solid rgba(239,68,68,0.12)",
                        borderRadius: 6,
                      }}
                    >
                      <div style={{ fontSize: 8, fontWeight: 700, color: "#ef4444", textTransform: "uppercase" }}>Worst</div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{worst.league_name}</div>
                      <div style={{ fontSize: 11, color: "#ef4444", fontFamily: "monospace", fontWeight: 700 }}>{fmt(worst.net_profit)}</div>
                    </div>
                  </div>
                );
              })()}
          </div>
        )}

        {/* LEAGUES */}
        {tab === "leagues" && (
          <div>
            <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={() => { setSF(true); setEL(null); }}
                style={{ padding: "5px 12px", borderRadius: 4, border: "none", background: "#f59e0b", color: "#0c1220", fontWeight: 700, fontSize: 10, cursor: "pointer" }}
              >
                + Add
              </button>
              <span style={{ fontSize: 9, color: "#64748b" }}>Sort:</span>
              {(
                [
                  ["priority", "Priority"],
                  ["finish", "Finish"],
                  ["net", "Net"],
                  ["buyin", "Buy-In"],
                  ["edge", "Edge"],
                ] as const
              ).map(([k, l]) => (
                <button key={k} onClick={() => setSort(k)} style={BtnS(sort === k)}>
                  {l}
                </button>
              ))}
            </div>

            {showForm && (
              <Form
                league={editL}
                season={season}
                onSave={saveLeague}
                onCancel={() => { setSF(false); setEL(null); }}
              />
            )}

            <div style={{ borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, minWidth: 700 }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                    {["#", "League", "Buy", "Payouts", "Fin", "BE", "Edge", "Pri", "Net", ""].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          padding: "5px 6px",
                          textAlign: i <= 1 ? "left" : "center",
                          fontSize: 8,
                          fontWeight: 700,
                          color: "#64748b",
                          textTransform: "uppercase",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((l, i) => (
                    <tr
                      key={l.id}
                      style={{
                        borderTop: "1px solid rgba(255,255,255,0.03)",
                        background: l.won_championship ? "rgba(245,158,11,0.03)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "5px 6px", color: "#4b5563", fontFamily: "monospace", fontSize: 9 }}>{i + 1}</td>
                      <td style={{ padding: "5px 6px" }}>
                        <div style={{ fontWeight: 600, fontSize: 11 }}>
                          {l.league_name}
                          {l.won_championship ? " \u{1F3C6}" : ""}
                        </div>
                        <div style={{ display: "flex", gap: 3, marginTop: 1 }}>
                          {l.archetype && (
                            <span
                              style={{
                                fontSize: 7,
                                padding: "1px 3px",
                                borderRadius: 2,
                                background: (AC[l.archetype] || "#64748b") + "20",
                                color: AC[l.archetype] || "#64748b",
                                fontWeight: 700,
                              }}
                            >
                              {l.archetype}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "5px 6px", textAlign: "center", fontFamily: "monospace", fontSize: 10, color: TC[l.tier] || "#94a3b8" }}>{fmt(l.buy_in)}</td>
                      <td style={{ padding: "5px 6px", textAlign: "center", fontSize: 8, color: "#94a3b8", whiteSpace: "nowrap" }}>
                        {fmt(l.payout_1st)}/{fmt(l.payout_2nd)}/{fmt(l.payout_3rd)}
                      </td>
                      <td style={{ padding: "5px 6px", textAlign: "center", fontSize: 9, fontWeight: 700, color: l.finish === 1 ? "#f59e0b" : l.finish && l.finish <= 3 ? "#94a3b8" : l.finish ? "#4b5563" : "#f59e0b" }}>
                        {finLabel(l.finish)}
                      </td>
                      <td style={{ padding: "5px 6px", textAlign: "center", fontSize: 8, color: l.brk.e ? "#22c55e" : l.brk.p !== "None" ? "#f59e0b" : "#ef4444", fontWeight: 600 }}>
                        {l.brk.p === "None" ? "1st" : l.brk.p}
                        {l.brk.e ? " \u2713" : ""}
                      </td>
                      <td style={{ padding: "5px 6px", textAlign: "center", fontFamily: "monospace", fontSize: 9, fontWeight: 700, color: (l.edge_score || 0) >= 90 ? "#22c55e" : (l.edge_score || 0) >= 80 ? "#f59e0b" : (l.edge_score || 0) > 0 ? "#ef4444" : "#4b5563" }}>
                        {l.edge_score ? l.edge_score.toFixed(1) : "-"}
                      </td>
                      <td style={{ padding: "5px 6px", textAlign: "center" }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            fontSize: 10,
                            padding: "1px 4px",
                            borderRadius: 2,
                            background: l.priority >= 60 ? "rgba(34,197,94,0.1)" : l.priority >= 35 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                            color: l.priority >= 60 ? "#22c55e" : l.priority >= 35 ? "#f59e0b" : "#ef4444",
                          }}
                        >
                          {l.priority}
                        </span>
                      </td>
                      <td style={{ padding: "5px 6px", textAlign: "center", fontFamily: "monospace", fontWeight: 700, fontSize: 10, color: l.net_profit > 0 ? "#22c55e" : l.net_profit === 0 ? "#94a3b8" : "#ef4444" }}>
                        {l.finish ? (l.net_profit > 0 ? "+" : "") + fmt(l.net_profit) : "-"}
                      </td>
                      <td style={{ padding: "5px 6px", textAlign: "center", whiteSpace: "nowrap" }}>
                        <button onClick={() => { setEL(l); setSF(true); }} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: 8 }}>Edit</button>
                        <button onClick={() => delLeague(l.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 8, marginLeft: 2 }}>Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}>
                    <td colSpan={2} style={{ padding: "6px", fontWeight: 800, fontSize: 10 }}>TOTAL ({data.length})</td>
                    <td style={{ padding: "6px", textAlign: "center", fontFamily: "monospace", fontWeight: 700 }}>{fmt(tBI)}</td>
                    <td colSpan={5} />
                    <td style={{ padding: "6px", textAlign: "center", fontFamily: "monospace", fontWeight: 800, fontSize: 11, color: tN >= 0 ? "#22c55e" : "#ef4444" }}>{fmt(tN)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* INSIGHTS */}
        {tab === "insights" && (
          <div>
            <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 12 }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>P&L by Archetype</div>
              {archSt.map(([a, st]) => {
                const mx = Math.max(...archSt.map((x) => Math.abs(x[1].n)), 1);
                return (
                  <button
                    key={a}
                    onClick={() => setFA(fArch === a ? null : a)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      borderRadius: 4,
                      cursor: "pointer",
                      border: fArch === a ? "2px solid " + (AC[a] || "#64748b") : "1px solid rgba(255,255,255,0.03)",
                      background: "transparent",
                      fontFamily: "inherit",
                      color: "#e2e8f0",
                      textAlign: "left",
                      width: "100%",
                      marginBottom: 3,
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 700, color: AC[a] || "#64748b", minWidth: 130 }}>{a}</span>
                    <span style={{ fontSize: 9, color: "#64748b", minWidth: 40 }}>{st.c} lgs</span>
                    <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.04)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: (Math.abs(st.n) / mx) * 100 + "%", height: "100%", borderRadius: 2, background: st.n >= 0 ? "#22c55e" : "#ef4444" }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color: st.n >= 0 ? "#22c55e" : "#ef4444", minWidth: 60, textAlign: "right" }}>{fmt(st.n)}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 12 }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Capital Insights</div>
              {(() => {
                const hw = data.filter((l) => l.buy_in >= 100 && ["Rebuilder", "Dead Zone", "Productive Struggle"].includes(l.archetype || ""));
                const dr = data.filter((l) => l.net_profit <= -200);
                return (
                  <div style={{ display: "grid", gap: 6 }}>
                    {hw.length > 0 && (
                      <div style={{ padding: "8px 10px", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)", borderRadius: 4 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#ef4444" }}>
                          Misallocated: {hw.length} leagues, {fmt(hw.reduce((s, l) => s + l.buy_in, 0))} at risk
                        </div>
                        <div style={{ fontSize: 8, color: "#64748b", marginTop: 2 }}>{hw.map((l) => l.league_name).join(" | ")}</div>
                      </div>
                    )}
                    {dr.length > 0 && (
                      <div style={{ padding: "8px 10px", background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.1)", borderRadius: 4 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#f59e0b" }}>
                          Money Pits: {fmt(dr.reduce((s, l) => s + Math.abs(l.net_profit), 0))} lost
                        </div>
                        <div style={{ fontSize: 8, color: "#64748b", marginTop: 2 }}>{dr.map((l) => l.league_name + " (" + fmt(l.net_profit) + ")").join(" | ")}</div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Priority Ranking</div>
              {[...data]
                .sort((a, b) => b.priority - a.priority)
                .slice(0, 10)
                .map((l, i) => (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <span style={{ fontSize: 9, fontFamily: "monospace", color: "#4b5563", minWidth: 14 }}>{i + 1}</span>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        fontWeight: 800,
                        padding: "1px 4px",
                        borderRadius: 3,
                        background: l.priority >= 60 ? "rgba(34,197,94,0.1)" : l.priority >= 35 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                        color: l.priority >= 60 ? "#22c55e" : l.priority >= 35 ? "#f59e0b" : "#ef4444",
                      }}
                    >
                      {l.priority}
                    </span>
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 600 }}>{l.league_name}</span>
                    <span style={{ fontSize: 8, color: TC[l.tier], fontWeight: 700 }}>{fmt(l.buy_in)}</span>
                    <span style={{ fontSize: 8, color: "#64748b" }}>BE:{l.brk.p}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
