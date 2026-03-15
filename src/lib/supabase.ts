import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, key);

export interface LeagueFinancial {
  id: string;
  season: number;
  league_name: string;
  league_id: string | null;
  buy_in: number;
  payout_1st: number;
  payout_2nd: number;
  payout_3rd: number;
  payout_extra: number;
  extra_notes: string | null;
  teams: number;
  playoff_spots: number;
  tier: string;
  finish: number | null;
  made_playoffs: boolean;
  made_semis: boolean;
  made_finals: boolean;
  won_championship: boolean;
  net_profit: number;
  archetype: string | null;
  edge_score: number | null;
  notes: string | null;
}

export async function getLeagues(season: number): Promise<LeagueFinancial[]> {
  const { data, error } = await supabase
    .from("league_financials")
    .select("*")
    .eq("season", season)
    .order("net_profit", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((d) => ({
    ...d,
    buy_in: Number(d.buy_in) || 0,
    payout_1st: Number(d.payout_1st) || 0,
    payout_2nd: Number(d.payout_2nd) || 0,
    payout_3rd: Number(d.payout_3rd) || 0,
    payout_extra: Number(d.payout_extra) || 0,
    net_profit: Number(d.net_profit) || 0,
    edge_score: d.edge_score ? Number(d.edge_score) : null,
  }));
}

export async function getSeasons(): Promise<number[]> {
  const { data, error } = await supabase
    .from("league_financials")
    .select("season")
    .order("season", { ascending: false });
  if (error) throw error;
  const unique = [...new Set((data ?? []).map((d) => d.season))];
  return unique.length > 0 ? unique : [2025];
}

export async function upsertLeague(league: Partial<LeagueFinancial> & { season: number }) {
  if (league.id) {
    const { error } = await supabase
      .from("league_financials")
      .update({ ...league, updated_at: new Date().toISOString() })
      .eq("id", league.id);
    if (error) throw error;
  } else {
    const { id: _, ...rest } = league;
    const { error } = await supabase.from("league_financials").insert(rest);
    if (error) throw error;
  }
}

export async function deleteLeague(id: string) {
  const { error } = await supabase.from("league_financials").delete().eq("id", id);
  if (error) throw error;
}
