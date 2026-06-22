import { RANK_LIMIT } from "./config.js";
import { formatCoins, formatPercent, formatWon, toInt, toPositiveInt } from "./utils.js";

const els = {
  rankList: document.getElementById("rankList"),
  selfRank: document.getElementById("selfRank"),
  playerName: document.getElementById("playerName"),
  cashBalance: document.getElementById("cashBalance"),
  coinBalance: document.getElementById("coinBalance"),
  totalEquity: document.getElementById("totalEquity"),
  breakingFeed: document.getElementById("breakingFeed"),
  exchangeAmount: document.getElementById("exchangeAmount"),
  exchangeBtn: document.getElementById("exchangeBtn"),
  investAmount: document.getElementById("investAmount"),
  clearInvestBtn: document.getElementById("clearInvestBtn"),
  investGuide: document.getElementById("investGuide"),
  positionBox: document.getElementById("positionBox"),
  positionTitle: document.getElementById("positionTitle"),
  positionText: document.getElementById("positionText"),
  sellBtn: document.getElementById("sellBtn"),
  marketList: document.getElementById("marketList"),
  systemLog: document.getElementById("systemLog"),
  portalLock: document.getElementById("portalLock"),
  sessionStatus: document.getElementById("sessionStatus")
};

const exchangeButtons = Array.from(document.querySelectorAll("[data-exchange-fill]"));
const investButtons = Array.from(document.querySelectorAll("[data-invest-fill]"));

function div(className, text) {
  const node = document.createElement("div");
  node.className = className;
  node.textContent = text;
  return node;
}

function rankValue(row) {
  return toInt(row.rank_position ?? row.rankPosition, 0);
}

function playerKeyOf(row) {
  return String(row.player_key ?? row.playerKey ?? "");
}

function isUp(row) {
  return Number(row.change_rate ?? row.changeRate ?? 0) >= 0;
}

function newsKind(row) {
  return String(row.news_kind ?? row.newsKind ?? "").toLowerCase();
}

function newsKindLabel(kind) {
  return {
    surge: "급등",
    crash: "급락",
    up: "강세",
    down: "약세"
  }[kind] || "시황";
}

function companyName(row) {
  return row.company_name || row.companyName || row.symbol || "UNKNOWN";
}

function marketSymbol(row) {
  return String(row.symbol || "").trim();
}

function createRankRow(row, playerKey) {
  const item = document.createElement("div");
  const isSelf = playerKeyOf(row) === playerKey;
  item.className = `rank-row${isSelf ? " self" : ""}`;
  item.append(
    div("rank-no", String(rankValue(row) || "--")),
    div("rank-name", row.display_name || row.displayName || "UNKNOWN"),
    div("rank-value", formatWon(row.total_equity ?? row.totalEquity))
  );
  return item;
}

function createStockCard(row, canInvest) {
  const symbol = marketSymbol(row);
  const kind = newsKind(row);
  const card = document.createElement("article");
  card.className = `stock-card ${kind}`;

  const top = document.createElement("div");
  top.className = "stock-top";

  const nameBox = document.createElement("div");
  nameBox.append(
    div("stock-symbol", symbol),
    div("stock-name", companyName(row))
  );

  const priceBox = document.createElement("div");
  priceBox.append(
    div("stock-price", formatWon(row.price)),
    div(`stock-change ${isUp(row) ? "up" : "down"}`, formatPercent(row.change_rate ?? row.changeRate))
  );

  top.append(nameBox, priceBox);

  const news = document.createElement("div");
  news.className = "stock-news";
  news.append(
    div("stock-kind", newsKindLabel(kind)),
    Object.assign(document.createElement("strong"), { textContent: row.news_title || row.newsTitle || "시황 업데이트" }),
    Object.assign(document.createElement("p"), { textContent: row.news_body || row.newsBody || "" })
  );

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.symbol = symbol;
  button.textContent = "투자";
  button.disabled = !canInvest;

  card.append(top, news, button);
  return card;
}

export function setLog(message) {
  els.systemLog.textContent = message;
}

export function setBusyView(busy, locked) {
  const disabled = Boolean(busy || locked);
  els.exchangeBtn.disabled = disabled;
  els.clearInvestBtn.disabled = disabled;
  els.sellBtn.disabled = disabled || els.sellBtn.dataset.blocked === "true";
  exchangeButtons.forEach((button) => {
    button.disabled = disabled;
  });
  investButtons.forEach((button) => {
    button.disabled = disabled;
  });
  Array.from(els.marketList.querySelectorAll("button")).forEach((button) => {
    button.disabled = disabled || button.dataset.blocked === "true";
  });
}

export function showLocked() {
  document.body.classList.add("locked");
  els.portalLock.classList.remove("hidden");
  els.sessionStatus.textContent = "LOCKED";
  els.playerName.textContent = "PORTAL REQUIRED";
  els.selfRank.textContent = "포털 로그인 필요";
  setLog("867988 메인 포털 로그인 세션을 찾지 못했습니다.");
}

export function showActive() {
  document.body.classList.remove("locked");
  els.portalLock.classList.add("hidden");
  els.sessionStatus.textContent = "ACTIVE";
}

export function setPlayerName(name) {
  els.playerName.textContent = name;
}

export function renderProfile(profile) {
  if (!profile) return;

  els.playerName.textContent = profile.displayName;
  els.cashBalance.textContent = formatWon(profile.cashWon);
  els.coinBalance.textContent = formatCoins(profile.coinBalance);
  els.totalEquity.textContent = formatWon(profile.totalEquity);
  els.investGuide.textContent = profile.canInvest
    ? "오늘의 투자권이 활성화되었습니다. 한 종목만 선택하십시오."
    : "오늘의 투자권을 이미 사용했거나 보유 주식이 있습니다.";

  if (profile.positionSymbol) {
    els.positionBox.classList.add("active");
    els.positionBox.classList.remove("empty");
    els.positionTitle.textContent = `${profile.positionCompany || profile.positionSymbol} 보유 중`;
    els.positionText.textContent = `${profile.shares.toFixed(6)}주 · 평균 ${formatWon(profile.avgPrice)} · 현재 평가 ${formatWon(profile.positionValue)}`;
    delete els.sellBtn.dataset.blocked;
    els.sellBtn.disabled = false;
  } else {
    els.positionBox.classList.remove("active");
    els.positionBox.classList.add("empty");
    els.positionTitle.textContent = "보유 주식 없음";
    els.positionText.textContent = profile.canInvest ? "투자 가능한 종목을 선택하십시오." : "다음 Breaking News 이후 다시 투자할 수 있습니다.";
    els.sellBtn.dataset.blocked = "true";
    els.sellBtn.disabled = true;
  }
}

export function renderMarket(rows, canInvest) {
  const list = Array.isArray(rows) ? rows : [];
  const major = list.filter((row) => ["surge", "crash"].includes(newsKind(row)));
  els.breakingFeed.textContent = major.length
    ? major.map((row) => `${row.news_title || row.newsTitle} · ${companyName(row)} ${formatPercent(row.change_rate ?? row.changeRate)}`).join(" / ")
    : "오늘의 주요 뉴스가 대기 중입니다.";

  if (!list.length) {
    const empty = document.createElement("article");
    empty.className = "stock-card";
    empty.append(div("stock-name", "시장 데이터 없음"));
    els.marketList.replaceChildren(empty);
    return;
  }

  els.marketList.replaceChildren(...list.map((row) => {
    const card = createStockCard(row, canInvest);
    const button = card.querySelector("button");
    if (!canInvest) button.dataset.blocked = "true";
    return card;
  }));
}

export function renderLeaderboard(rows, playerKey) {
  const list = Array.isArray(rows) ? rows : [];
  const topRows = list
    .filter((row) => rankValue(row) > 0 && rankValue(row) <= RANK_LIMIT)
    .sort((a, b) => rankValue(a) - rankValue(b));
  const selfRow = list.find((row) => playerKeyOf(row) === playerKey);

  if (!topRows.length) {
    const empty = document.createElement("div");
    empty.className = "rank-row";
    empty.append(div("rank-no", "--"), div("rank-name", "NO DATA"), div("rank-value", "0원"));
    els.rankList.replaceChildren(empty);
  } else {
    els.rankList.replaceChildren(...topRows.map((row) => createRankRow(row, playerKey)));
  }

  els.selfRank.textContent = selfRow ? `${rankValue(selfRow)}위 · ${formatWon(selfRow.total_equity ?? selfRow.totalEquity)}` : "순위 산출 대기";
}

export function readExchangeAmount() {
  return toPositiveInt(els.exchangeAmount.value);
}

export function readInvestAmount() {
  return toPositiveInt(els.investAmount.value);
}

export function writeExchangeAmount(value) {
  els.exchangeAmount.value = value ? String(value) : "";
}

export function writeInvestAmount(value) {
  els.investAmount.value = value ? String(value) : "";
}

export function bindViewEvents(handlers) {
  els.exchangeBtn.addEventListener("click", handlers.exchange);
  els.sellBtn.addEventListener("click", handlers.sell);
  els.clearInvestBtn.addEventListener("click", () => writeInvestAmount(""));
  els.exchangeAmount.addEventListener("input", handlers.exchangeInput);
  els.investAmount.addEventListener("input", handlers.investInput);
  exchangeButtons.forEach((button) => {
    button.addEventListener("click", () => handlers.fillExchange(button.dataset.exchangeFill));
  });
  investButtons.forEach((button) => {
    button.addEventListener("click", () => handlers.fillInvest(button.dataset.investFill));
  });
  els.marketList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-symbol]");
    if (button) handlers.buy(button.dataset.symbol);
  });
}
