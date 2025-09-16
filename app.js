// ---- Config ----
const SPOTLIGHT_TAGS = ["Anoma", "ZK", "Modular", "AI", "RWA", "DeFi", "Meme"];
const DATA = {
  assets: "data/assets.json",
  fundraising: "data/fundraising.json",
  sectors: "data/sectors.json"
};
const LS_WATCHLIST_KEY = "anoma_demo_watchlist";
const THEME_KEY = "anoma_theme";

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
const themeToggle = document.getElementById("themeToggle");
const btnTopGainers = document.getElementById("btnTopGainers");
const btnTopLosers  = document.getElementById("btnTopLosers");

// Modal elements
const coinModal = document.getElementById("coinModal");
const coinModalClose = document.getElementById("coinModalClose");
const coinModalTitle = document.getElementById("coinModalTitle");
const coinModalMeta = document.getElementById("coinModalMeta");
const coinModalChart = document.getElementById("coinModalChart");
const coinModalNews = document.getElementById("coinModalNews");
const coinModalSwap = document.getElementById("coinModalSwap");

// ---- Utils ----
function formatNum(n) {
  if (n === null || n === undefined || isNaN(n)) return "-";
  if (Math.abs(n) >= 1e12) return (n/1e12).toFixed(2)+"T";
  if (Math.abs(n) >= 1e9)  return (n/1e9).toFixed(2)+"B";
  if (Math.abs(n) >= 1e6)  return (n/1e6).toFixed(2)+"M";
  if (Math.abs(n) >= 1e3)  return (n/1e3).toFixed(2)+"K";
  return Number(n).toLocaleString();
}
function pctClass(v){ return v > 0 ? "up" : v < 0 ? "down" : "" }
function saveWatchlist(){ localStorage.setItem(LS_WATCHLIST_KEY, JSON.stringify(Array.from(watchlist))); }
function applyTheme(mode){
  document.documentElement.classList.toggle("light", mode === "light");
  localStorage.setItem(THEME_KEY, mode);
}

// ---- Theme init + toggle ----
applyTheme(localStorage.getItem(THEME_KEY) || "dark");
themeToggle?.addEventListener("click", ()=>{
  const next = document.documentElement.classList.contains("light") ? "dark" : "light";
  applyTheme(next);
});

// ---- Tabs ----
document.getElementById("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  activeTab = btn.dataset.tab;
  document.getElementById("cryptoSection").classList.toggle("hidden", activeTab !== "crypto");
  document.getElementById("fundraisingSection").classList.toggle("hidden", activeTab !== "fundraising");
});

// ---- Demo login ----
loginBtn?.addEventListener("click", () => alert("Demo mode — login disabled."));

// ---- Spotlight chips ----
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

// ---- Search ----
globalSearch?.addEventListener("input", (e) => {
  query = e.target.value.trim().toLowerCase();
  renderCrypto();
  renderFundraising();
});

// ---- Sorting + watchlist toggles ----
sortSelect?.addEventListener("change", (e) => {
  const [key, dir] = e.target.value.split(":");
  sortKey = key; sortDir = dir;
  renderCrypto();
});
onlyWatchlistCb?.addEventListener("change", (e) => {
  onlyWatchlist = e.target.checked;
  renderCrypto();
});

// ---- Top Movers ----
btnTopGainers?.addEventListener("click", ()=>{
  sortKey = "change24h"; sortDir = "desc";
  const val = `${sortKey}:${sortDir}`;
  if ([...sortSelect.options].some(o=>o.value===val)) sortSelect.value = val;
  renderCrypto();
});
btnTopLosers?.addEventListener("click", ()=>{
  sortKey = "change24h"; sortDir = "asc";
  const val = `${sortKey}:${sortDir}`;
  if ([...sortSelect.options].some(o=>o.value===val)) sortSelect.value = val;
  renderCrypto();
});

// ---- Modal helpers ----
function openCoinModal(asset){
  if (!coinModal) return;
  coinModalTitle.innerHTML = `<strong>${asset.symbol}</strong> — ${asset.name}`;
  coinModalMeta.innerHTML = `
    <div>Price: <strong>$${formatNum(asset.price)}</strong> • 
    24h: <strong class="${pctClass(asset.change24h)}">${asset.change24h!=null?asset.change24h.toFixed(2):"-"}%</strong> • 
    Market Cap: <strong>${formatNum(asset.marketCap)}</strong> • Sector: ${asset.sector || "-"}</div>`;

  coinModalChart.innerHTML = renderSparkline();

  const q = encodeURIComponent(`${asset.name} ${asset.symbol} crypto`);
  coinModalNews.innerHTML = `
    <div><strong>News</strong></div>
    <ul>
      <li><a target="_blank" rel="noopener" href="https://news.google.com/search?q=${q}">Google News for ${asset.symbol}</a></li>
      <li><a target="_blank" rel="noopener" href="https://www.google.com/search?q=${q}">Web search</a></li>
      <li><a target="_blank" rel="noopener" href="https://www.tradingview.com/symbols/${asset.symbol}USD/">TradingView ${asset.symbol}/USD</a></li>
    </ul>`;

  coinModalSwap.innerHTML = `
    <div><strong>Swap (demo)</strong></div>
    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center">
      <label>Amount: <input id="swapAmount" type="number" value="100" min="0" style="width:110px;padding:6px"></label>
      <span>${asset.symbol}</span>
      <span>→</span>
      <span>XAN</span>
      <button id="swapSimBtn" class="ghost">Simulate</button>
      <div id="swapResult" style="margin-left:auto"></div>
    </div>`;

  coinModal.style.display = "flex";

  // attach simulate
  document.getElementById("swapSimBtn")?.addEventListener("click", ()=>{
    const amt = Number(document.getElementById("swapAmount").value || 0);
    const fromPrice = Number(asset.price || 0);
    const xan = assets.find(a => a.symbol === "XAN");
    const toPrice = Number(xan?.price || 1);
    const grossTo = (amt * fromPrice) / toPrice;
    const fee = 0.003; // 0.3%
    const netTo = grossTo * (1 - fee);
    document.getElementById("swapResult").textContent =
      isFinite(netTo) ? `≈ ${netTo.toFixed(4)} XAN (fee 0.3%)` : "—";
  });
}
function closeCoinModal(){ if (coinModal) coinModal.style.display = "none"; }
coinModalClose?.addEventListener("click", closeCoinModal);
coinModal?.addEventListener("click", (e)=>{ if (e.target === coinModal) closeCoinModal(); });

// very small sparkline generator (random walk demo)
function renderSparkline(){
  const pts = [50]; for(let i=1;i<40;i++){ pts.push(Math.max(10, Math.min(90, pts[i-1] + (Math.random()*10-5)))); }
  const d = pts.map((y,i)=> `${(i/(pts.length-1))*100},${100-y}`).join(" ");
  return `
    <svg viewBox="0 0 100 100" style="width:100%;max-width:560px;height:110px;background:var(--surface-2);border:1px solid #2a2a30;border-radius:10px">
      <polyline fill="none" stroke="var(--primary)" stroke-width="2" points="${d}" />
    </svg>`;
}

// ---- Renderers ----
function renderCrypto(){
  const q = query;
  let rows = assets.slice();

  if (q){
    rows = rows.filter(a =>
      a.symbol.toLowerCase().includes(q) ||
      (a.name || "").toLowerCase().includes(q) ||
      (a.tags || []).some(t => (t||"").toLowerCase().includes(q))
    );
  }
  if (activeChip){
    rows = rows.filter(a => (a.tags || []).includes(activeChip) || a.sector === activeChip);
  }
  if (onlyWatchlist){
    rows = rows.filter(a => watchlist.has(a.symbol));
  }

  rows.sort((a,b)=>{
    const va = a[sortKey] ?? 0;
    const vb = b[sortKey] ?? 0;
    return sortDir === "desc" ? (vb - va) : (va - vb);
  });

  cryptoTbody.innerHTML = "";
  rows.forEach(a=>{
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";

    // star
    const tdStar = document.createElement("td");
    const star = document.createElement("button");
    star.className = "star" + (watchlist.has(a.symbol) ? " active" : "");
    star.textContent = "★";
    star.addEventListener("click", (ev)=>{
      ev.stopPropagation(); // jangan buka modal
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

    const tdPrice = document.createElement("td"); tdPrice.className="num"; tdPrice.textContent = a.price!=null ? `$${formatNum(a.price)}` : "-";
    const tdChg   = document.createElement("td"); tdChg.className="num " + pctClass(a.change24h); tdChg.textContent = a.change24h!=null ? `${a.change24h.toFixed(2)}%` : "-";
    const tdMc    = document.createElement("td"); tdMc.className="num"; tdMc.textContent = formatNum(a.marketCap);
    const tdFd    = document.createElement("td"); tdFd.className="num"; tdFd.textContent = formatNum(a.fdv);
    const tdVol   = document.createElement("td"); tdVol.className="num"; tdVol.textContent = formatNum(a.volume24h);
    const tdSec   = document.createElement("td"); tdSec.textContent = a.sector || "-";
    const tdR1m   = document.createElement("td"); tdR1m.className="num " + pctClass(a.roi1m); tdR1m.textContent = a.roi1m!=null ? `${a.roi1m.toFixed(2)}%` : "-";
    const tdR1y   = document.createElement("td"); tdR1y.className="num " + pctClass(a.roi1y); tdR1y.textContent = a.roi1y!=null ? `${a.roi1y.toFixed(2)}%` : "-";
    const tdTags  = document.createElement("td"); tdTags.textContent = (a.tags || []).join(", ");

    tr.append(tdStar, tdSymbol, tdName, tdPrice, tdChg, tdMc, tdFd, tdVol, tdSec, tdR1m, tdR1y, tdTags);

    // buka modal saat klik baris (kecuali klik star)
    tr.addEventListener("click", ()=> openCoinModal(a));
    cryptoTbody.appendChild(tr);
  });
}

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
      `<pre style="color:#f88;background:#220;padding:8px;border:1px solid #400;border-radius:8px;max-width:90vw;overflow:auto">[Demo Error] ${String(e)}</pre>`
    );
  }
}
boot();
