// ---- Config ----
const SPOTLIGHT_TAGS = ["Anoma", "ZK", "Modular", "AI", "RWA", "DeFi", "Meme"];
const DATA = {
  assets: "./data/assets.json",
  fundraising: "./data/fundraising.json",
  sectors: "./data/sectors.json"
};
const LS_WATCHLIST_KEY = "anoma_demo_watchlist";

// ---- State ----
let assets = [];
let fundraising = [];
let activeTab = "crypto";
let query = "";
let activeChip = null;
let sortKey = "marketCap";
let sortDir = "desc";
let onlyWatchlist = false;
let watchlist = new Set(JSON.parse(localStorage.getItem(LS_WATCHLIST_KEY) || "[]"));

// ---- DOM ----
const globalSearch = document.getElementById("globalSearch");
const chipsWrap = document.getElementById("spotlightChips");
const cryptoTbody = document.getElementById("cryptoTbody");
const sortSelect = document.getElementById("sortSelect");
const onlyWatchlistCb = document.getElementById("onlyWatchlist");
const fundraisingList = document.getElementById("fundraisingList");
const loginBtn = document.getElementById("loginBtn");

// Tabs
document.getElementById("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  activeTab = btn.dataset.tab;
  document.getElementById("cryptoSection").classList.toggle("hidden", activeTab !== "crypto");
  document.getElementById("fundraisingSection").classList.toggle("hidden", activeTab !== "fundraising");
});

// Demo login
loginBtn.addEventListener("click", () => {
  alert("Demo mode — login disabled.");
});

// Spotlight chips
function renderChips() {
  chipsWrap.innerHTML = "";
  SPOTLIGHT_TAGS.forEach(tag => {
    const btn = document.createElement("button");
    btn.className = "chip" + (activeChip === tag ? " active" : "");
    btn.textContent = tag;
    btn.addEventListener("click", () => {
      activeChip = activeChip === tag ? null : tag;
      renderChips();
      renderCrypto();
      renderFundraising();
    });
    chipsWrap.appendChild(btn);
  });
}

// Search
globalSearch.addEventListener("input", (e) => {
  query = e.target.value.trim().toLowerCase();
  renderCrypto();
  renderFundraising();
});

// Sorting
sortSelect.addEventListener("change", (e) => {
  const [key, dir] = e.target.value.split(":");
  sortKey = key;
  sortDir = dir;
  renderCrypto();
});

// Watchlist only
onlyWatchlistCb.addEventListener("change", (e) => {
  onlyWatchlist = e.target.checked;
  renderCrypto();
});

// Helpers
function formatNum(n) {
  if (n === null || n === undefined || isNaN(n)) return "-";
  if (Math.abs(n) >= 1e12) return (n/1e12).toFixed(2)+"T";
  if (Math.abs(n) >= 1e9)  return (n/1e9).toFixed(2)+"B";
  if (Math.abs(n) >= 1e6)  return (n/1e6).toFixed(2)+"M";
  if (Math.abs(n) >= 1e3)  return (n/1e3).toFixed(2)+"K";
  return n.toLocaleString();
}
function pctClass(v){ return v > 0 ? "up" : v < 0 ? "down" : "" }

function saveWatchlist(){
  localStorage.setItem(LS_WATCHLIST_KEY, JSON.stringify(Array.from(watchlist)));
}

// Render crypto table
function renderCrypto(){
  const q = query;
  let rows = assets.slice();

  // filter by query
  if (q){
    rows = rows.filter(a =>
      a.symbol.toLowerCase().includes(q) ||
      (a.name || "").toLowerCase().includes(q) ||
      (a.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  // filter by chip
  if (activeChip){
    rows = rows.filter(a => (a.tags || []).includes(activeChip) || a.sector === activeChip);
  }

  // watchlist filter
  if (onlyWatchlist){
    rows = rows.filter(a => watchlist.has(a.symbol));
  }

  // sort
  rows.sort((a,b)=>{
    const va = a[sortKey] ?? 0;
    const vb = b[sortKey] ?? 0;
    return sortDir === "desc" ? (vb - va) : (va - vb);
  });

  // render
  cryptoTbody.innerHTML = "";
  rows.forEach(a=>{
    const tr = document.createElement("tr");

    // star
    const tdStar = document.createElement("td");
    const star = document.createElement("button");
    star.className = "star" + (watchlist.has(a.symbol) ? " active" : "");
    star.textContent = "★";
    star.addEventListener("click", ()=>{
      if (watchlist.has(a.symbol)) watchlist.delete(a.symbol);
      else watchlist.add(a.symbol);
      saveWatchlist();
      renderCrypto();
    });
    tdStar.appendChild(star);

    // symbol + badge
    const tdSymbol = document.createElement("td");
    tdSymbol.textContent = a.symbol;
    if (a.badge){
      const b = document.createElement("span");
      b.textContent = a.badge;
      b.className = "badge-small primary";
      b.style.marginLeft = "8px";
      tdSymbol.appendChild(b);
    }

    // name + logo
    const tdName = document.createElement("td");
    const wrap = document.createElement("div");
    wrap.style.display = "flex"; wrap.style.alignItems = "center"; wrap.style.gap = "8px";
    if (a.logo){
      const img = document.createElement("img");
      img.src = a.logo; img.alt = a.symbol; img.width = 18; img.height = 18;
      img.style.borderRadius="4px";
      wrap.appendChild(img);
    }
    const nameSpan = document.createElement("span");
    nameSpan.textContent = a.name || "";
    wrap.appendChild(nameSpan);
    tdName.appendChild(wrap);

    const tdPrice = document.createElement("td"); tdPrice.className="num"; tdPrice.textContent = a.price!=null ? `$${Number(a.price).toLocaleString()}` : "-";
    const tdChg = document.createElement("td"); tdChg.className="num " + pctClass(a.change24h); tdChg.textContent = a.change24h!=null ? `${a.change24h.toFixed(2)}%` : "-";
    const tdMc = document.createElement("td"); tdMc.className="num"; tdMc.textContent = formatNum(a.marketCap);
    const tdFd = document.createElement("td"); tdFd.className="num"; tdFd.textContent = formatNum(a.fdv);
    const tdVol = document.createElement("td"); tdVol.className="num"; tdVol.textContent = formatNum(a.volume24h);
    const tdSec = document.createElement("td"); tdSec.textContent = a.sector || "-";
    const tdR1m = document.createElement("td"); tdR1m.className="num " + pctClass(a.roi1m); tdR1m.textContent = a.roi1m!=null ? `${a.roi1m.toFixed(2)}%` : "-";
    const tdR1y = document.createElement("td"); tdR1y.className="num " + pctClass(a.roi1y); tdR1y.textContent = a.roi1y!=null ? `${a.roi1y.toFixed(2)}%` : "-";
    const tdTags = document.createElement("td");
    tdTags.textContent = (a.tags || []).join(", ");

    tr.append(tdStar, tdSymbol, tdName, tdPrice, tdChg, tdMc, tdFd, tdVol, tdSec, tdR1m, tdR1y, tdTags);
    cryptoTbody.appendChild(tr);
  });
}

// Render fundraising list
function renderFundraising(){
  const q = query;
  let items = fundraising.slice();

  if (q){
    items = items.filter(f =>
      (f.project||"").toLowerCase().includes(q) ||
      (f.round||"").toLowerCase().includes(q) ||
      (f.tags||[]).some(t=> (t||"").toLowerCase().includes(q))
    );
  }
  if (activeChip){
    items = items.filter(f => (f.tags||[]).includes(activeChip));
  }

  fundraisingList.innerHTML = "";
  items.forEach(f=>{
    const li = document.createElement("li");
    li.className = "fund-item";

    const left = document.createElement("div");
    const title = document.createElement("div");
    title.innerHTML = `<strong>${f.project}</strong> • ${f.round}`;
    const meta = document.createElement("div");
    meta.className = "fund-meta";
    meta.textContent = `${f.amount} • ${f.date}`;
    left.append(title, meta);

    const right = document.createElement("div");
    (f.tags||[]).forEach(t=>{
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = t;
      right.appendChild(span);
    });

    li.append(left, right);
    fundraisingList.appendChild(li);
  });
}

// ---- Boot ----
async function boot(){
  renderChips();
  try{
    const [assetsRes, fundRes] = await Promise.all([
      fetch(DATA.assets),
      fetch(DATA.fundraising)
    ]);

    if(!assetsRes.ok) throw new Error("Assets JSON not found: " + assetsRes.status);
    if(!fundRes.ok) throw new Error("Fundraising JSON not found: " + fundRes.status);

    assets = await assetsRes.json();
    fundraising = await fundRes.json();

    // pastikan XAN selalu ada logo & badge
    assets = assets.map(a => a.symbol === "XAN" ? {
      ...a,
      badge: a.badge || "Official · Anoma",
      logo: a.logo || "assets/logo-xan.png"
    } : a);

    renderCrypto();
    renderFundraising();
  }catch(e){
    console.error(e);
    document.body.insertAdjacentHTML(
      "beforeend",
      `<pre style="color:#f88;background:#220;padding:8px;border:1px solid #400;border-radius:8px;max-width:90vw;overflow:auto">
[Demo Error] ${String(e)}</pre>`
    );
  }
}
boot();
