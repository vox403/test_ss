import { PORTAL_STORAGE_KEY } from "./config.js";
import { fetchLeaderboard, fetchMarket, fetchProfile, requestBuy, requestExchange, requestSell } from "./api.js";
import { loadPortalIdentity } from "./session.js";
import { applyProfile, getState, setBusy, setIdentity, setLocked } from "./state.js";
import { errorText, formatWon } from "./utils.js";
import {
  bindViewEvents,
  readExchangeAmount,
  readInvestAmount,
  renderLeaderboard,
  renderMarket,
  renderProfile,
  setBusyView,
  setLog,
  setPlayerName,
  showActive,
  showLocked,
  writeExchangeAmount,
  writeInvestAmount
} from "./view.js";

let marketRows = [];

function syncBusy(value) {
  setBusy(value);
  const state = getState();
  setBusyView(state.busy, state.locked);
}

function lockTerminal() {
  setLocked(true);
  syncBusy(false);
  showLocked();
  setBusyView(false, true);
}

function unlockTerminal() {
  setLocked(false);
  showActive();
  setBusyView(false, false);
}

function updateProfile(profile) {
  const current = applyProfile(profile);
  renderProfile(current);
  renderMarket(marketRows, current.canInvest);
  return current;
}

async function refreshMarket() {
  marketRows = await fetchMarket();
  renderMarket(marketRows, getState().canInvest);
}

async function refreshLeaderboard() {
  const state = getState();
  const rows = await fetchLeaderboard(state.playerKey);
  renderLeaderboard(rows, state.playerKey);
}

async function refreshProfile() {
  const state = getState();
  const profile = await fetchProfile(state.playerKey, state.displayName);
  updateProfile(profile);
}

async function refreshAll() {
  await refreshMarket();
  await refreshProfile();
  await refreshLeaderboard();
}

async function exchangeCoins() {
  const state = getState();
  if (state.busy || state.locked) return;

  const amount = readExchangeAmount();
  if (!amount || amount < 10000 || amount % 10000 !== 0) {
    setLog("환전 금액은 10,000 코인 단위로 입력하십시오.");
    return;
  }
  if (amount > state.coinBalance) {
    setLog("보유 코인보다 큰 금액은 환전할 수 없습니다.");
    return;
  }

  syncBusy(true);
  try {
    const profile = await requestExchange(state.playerKey, state.displayName, amount);
    updateProfile(profile);
    writeExchangeAmount("");
    await refreshLeaderboard();
    setLog(`${formatWon(amount)} 환전 처리 완료.`);
  } catch (error) {
    const message = errorText(error);
    setLog(message.includes("NOT_ENOUGH_COINS") ? "코인이 부족합니다." : `환전 처리 실패: ${message}`);
  } finally {
    syncBusy(false);
  }
}

async function buyStock(symbol) {
  const state = getState();
  if (state.busy || state.locked) return;

  const amount = readInvestAmount();
  if (!state.canInvest) {
    setLog("오늘의 투자권을 이미 사용했거나 보유 주식이 있습니다.");
    return;
  }
  if (!amount) {
    setLog("투자 금액을 입력하십시오.");
    return;
  }
  if (amount > state.cashWon) {
    setLog("보유 원화보다 큰 금액은 투자할 수 없습니다.");
    return;
  }

  syncBusy(true);
  try {
    const profile = await requestBuy(state.playerKey, state.displayName, symbol, amount);
    updateProfile(profile);
    writeInvestAmount("");
    await refreshLeaderboard();
    setLog(`${symbol} 매수 처리 완료. 투자 금액 ${formatWon(amount)}.`);
  } catch (error) {
    const message = errorText(error);
    if (message.includes("DAILY_INVEST_USED")) {
      setLog("오늘의 투자권은 이미 사용되었습니다.");
    } else if (message.includes("ACTIVE_POSITION_EXISTS")) {
      setLog("이미 보유 중인 주식이 있습니다. 매도 후 다음 Breaking News를 기다리십시오.");
    } else if (message.includes("NOT_ENOUGH_CASH")) {
      setLog("주식 게임 잔액이 부족합니다.");
    } else {
      setLog(`매수 처리 실패: ${message}`);
    }
  } finally {
    syncBusy(false);
  }
}

async function sellStock() {
  const state = getState();
  if (state.busy || state.locked) return;
  if (!state.positionSymbol) {
    setLog("매도할 보유 주식이 없습니다.");
    return;
  }

  syncBusy(true);
  try {
    const symbol = state.positionSymbol;
    const profile = await requestSell(state.playerKey, state.displayName);
    updateProfile(profile);
    await refreshLeaderboard();
    setLog(`${symbol} 매도 처리 완료.`);
  } catch (error) {
    const message = errorText(error);
    setLog(message.includes("NO_ACTIVE_POSITION") ? "매도할 보유 주식이 없습니다." : `매도 처리 실패: ${message}`);
  } finally {
    syncBusy(false);
  }
}

function fillExchange(type) {
  const state = getState();
  if (state.locked) return;

  const fixedAmount = Number(type);
  const amount = type === "max"
    ? Math.floor(state.coinBalance / 10000) * 10000
    : fixedAmount;

  writeExchangeAmount(amount > 0 ? amount : "");
}

function fillInvest(type) {
  const state = getState();
  if (state.locked) return;

  const fixedAmount = Number(type);
  const amount = type === "half"
    ? Math.floor(state.cashWon / 2)
    : type === "max"
      ? state.cashWon
      : fixedAmount;

  writeInvestAmount(Math.min(Math.max(1, amount), state.cashWon));
}

function normalizeExchangeInput() {
  writeExchangeAmount(readExchangeAmount());
}

function normalizeInvestInput() {
  writeInvestAmount(readInvestAmount());
}

async function boot() {
  bindViewEvents({
    exchange: exchangeCoins,
    buy: buyStock,
    sell: sellStock,
    fillExchange,
    fillInvest,
    exchangeInput: normalizeExchangeInput,
    investInput: normalizeInvestInput
  });

  window.addEventListener("storage", (event) => {
    if (event.key === PORTAL_STORAGE_KEY) location.reload();
  });

  const identity = loadPortalIdentity();
  if (!identity) {
    lockTerminal();
    return;
  }

  setIdentity(identity);
  setPlayerName(identity.displayName);
  unlockTerminal();

  syncBusy(true);
  try {
    await refreshAll();
    setLog("시장 세션 확인 완료. Breaking News 데이터가 활성화되었습니다.");
  } catch (error) {
    setLog(`Supabase 연결 실패: ${errorText(error)}`);
  } finally {
    syncBusy(false);
  }
}

boot();
