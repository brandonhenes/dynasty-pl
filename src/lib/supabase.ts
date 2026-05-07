import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;

export async function getLeagues(season) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("league_financials_live")
    .select("*")
    .eq("season", season)
    .order("net_profit", { ascending: false });
  if (error) throw error;
  return (data || []).map(d => ({
    ...d,
    buy_in: +d.buy_in || 0,
    payout_1st: +d.payout_1st || 0,
    payout_2nd: +d.payout_2nd || 0,
    payout_3rd: +d.payout_3rd || 0,
    payout_extra: +d.payout_extra || 0,
    net_profit: +d.net_profit || 0,
    edge_score: d.edge_score != null ? +d.edge_score : null,
    edge_score_static: d.edge_score_static != null ? +d.edge_score_static : null,
    teams: +d.teams || 12,
    playoff_spots: +d.playoff_spots || 6,
    live_edge_total: d.live_edge_total != null ? +d.live_edge_total : null,
    live_starter_edge: d.live_starter_edge != null ? +d.live_starter_edge : null,
    live_draft_capital_edge: d.live_draft_capital_edge != null ? +d.live_draft_capital_edge : null,
    live_edge_pct: d.live_edge_pct != null ? +d.live_edge_pct : null,
    live_rank_in_league: d.live_rank_in_league != null ? +d.live_rank_in_league : null,
    live_rosters_in_league: d.live_rosters_in_league != null ? +d.live_rosters_in_league : null,
    edge_updated_at: d.edge_updated_at || null,
  }));
}

export async function getAllLeagues() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("league_financials_live")
    .select("*")
    .order("season", { ascending: true })
    .order("net_profit", { ascending: false });
  if (error) throw error;
  return (data || []).map(d => ({
    ...d,
    buy_in: +d.buy_in || 0,
    payout_1st: +d.payout_1st || 0,
    payout_2nd: +d.payout_2nd || 0,
    payout_3rd: +d.payout_3rd || 0,
    payout_extra: +d.payout_extra || 0,
    net_profit: +d.net_profit || 0,
    edge_score: d.edge_score != null ? +d.edge_score : null,
    edge_score_static: d.edge_score_static != null ? +d.edge_score_static : null,
    teams: +d.teams || 12,
    playoff_spots: +d.playoff_spots || 6,
    live_edge_total: d.live_edge_total != null ? +d.live_edge_total : null,
    live_starter_edge: d.live_starter_edge != null ? +d.live_starter_edge : null,
    live_draft_capital_edge: d.live_draft_capital_edge != null ? +d.live_draft_capital_edge : null,
    live_edge_pct: d.live_edge_pct != null ? +d.live_edge_pct : null,
    live_rank_in_league: d.live_rank_in_league != null ? +d.live_rank_in_league : null,
    live_rosters_in_league: d.live_rosters_in_league != null ? +d.live_rosters_in_league : null,
    edge_updated_at: d.edge_updated_at || null,
  }));
}

export async function getSeasons() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("league_financials_live")
    .select("season")
    .order("season", { ascending: false });
  if (error) throw error;
  return [...new Set((data || []).map(d => d.season))];
}

export async function upsertLeague(league) {
  if (!supabase) return;
  if (league.id) {
    const { error } = await supabase
      .from("league_financials")
      .update({ ...league, updated_at: new Date().toISOString() })
      .eq("id", league.id);
    if (error) throw error;
  } else {
    const { id, ...rest } = league;
    const { error } = await supabase.from("league_financials").insert(rest);
    if (error) throw error;
  }
}

export async function deleteLeague(id) {
  if (!supabase) return;
  const { error } = await supabase.from("league_financials").delete().eq("id", id);
  if (error) throw error;
}
