import { SUPABASE_KEY, SUPABASE_URL } from "./config.js";
import { firstRow } from "./utils.js";

let db;

function client() {
  if (db) return db;
  if (!window.supabase || !window.supabase.createClient) {
    throw new Error("Supabase client 로드 실패");
  }
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return db;
}

async function rpc(name, params) {
  const { data, error } = await client().rpc(name, params);
  if (error) throw error;
  return data;
}

export async function fetchProfile(playerKey, displayName) {
  return firstRow(await rpc("vox_stock_profile", {
    p_player_key: playerKey,
    p_display_name: displayName
  }));
}

export async function fetchMarket() {
  const rows = await rpc("vox_stock_market", {});
  return Array.isArray(rows) ? rows : [];
}

export async function fetchLeaderboard(playerKey) {
  const rows = await rpc("vox_stock_leaderboard", {
    p_player_key: playerKey
  });
  return Array.isArray(rows) ? rows : [];
}

export async function requestExchange(playerKey, displayName, amount) {
  return firstRow(await rpc("vox_stock_exchange_coin", {
    p_player_key: playerKey,
    p_display_name: displayName,
    p_amount: amount
  }));
}

export async function requestBuy(playerKey, displayName, symbol, amount) {
  return firstRow(await rpc("vox_stock_buy", {
    p_player_key: playerKey,
    p_display_name: displayName,
    p_symbol: symbol,
    p_amount_won: amount
  }));
}

export async function requestSell(playerKey, displayName) {
  return firstRow(await rpc("vox_stock_sell", {
    p_player_key: playerKey,
    p_display_name: displayName
  }));
}
