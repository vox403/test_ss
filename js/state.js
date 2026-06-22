import { cleanName, toInt } from "./utils.js";

const state = {
  playerKey: "",
  displayName: "",
  coinBalance: 0,
  cashWon: 0,
  totalEquity: 0,
  positionSymbol: "",
  positionCompany: "",
  shares: 0,
  avgPrice: 0,
  currentPrice: 0,
  positionValue: 0,
  canInvest: false,
  nextResetAt: "",
  busy: false,
  locked: false
};

export function getState() {
  return state;
}

export function setIdentity(identity) {
  state.playerKey = identity.playerKey;
  state.displayName = identity.displayName;
}

export function setBusy(value) {
  state.busy = Boolean(value);
}

export function setLocked(value) {
  state.locked = Boolean(value);
}

export function applyProfile(profile) {
  if (!profile || typeof profile !== "object") return null;

  state.playerKey = String(profile.player_key || profile.playerKey || state.playerKey || "").trim();
  state.displayName = cleanName(profile.display_name || profile.displayName || state.displayName || "");
  state.coinBalance = Math.max(0, toInt(profile.coin_balance ?? profile.coinBalance, state.coinBalance));
  state.cashWon = Math.max(0, toInt(profile.cash_won ?? profile.cashWon, state.cashWon));
  state.totalEquity = Math.max(0, toInt(profile.total_equity ?? profile.totalEquity, state.totalEquity));
  state.positionSymbol = String(profile.position_symbol ?? profile.positionSymbol ?? "").trim();
  state.positionCompany = String(profile.position_company ?? profile.positionCompany ?? "").trim();
  state.shares = Number(profile.shares || 0);
  state.avgPrice = toInt(profile.avg_price ?? profile.avgPrice, 0);
  state.currentPrice = toInt(profile.current_price ?? profile.currentPrice, 0);
  state.positionValue = toInt(profile.position_value ?? profile.positionValue, 0);
  state.canInvest = Boolean(profile.can_invest ?? profile.canInvest);
  state.nextResetAt = String(profile.next_reset_at ?? profile.nextResetAt ?? "");

  return { ...state };
}
