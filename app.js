// ---- Config ----
const SPOTLIGHT_TAGS = ["Anoma", "ZK", "Modular", "AI", "RWA", "DeFi", "Meme"];
// di app.js
const DATA = {
  assets: "data/assets.json",
  fundraising: "data/fundraising.json",
  sectors: "data/sectors.json"
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
let lastIntent = null;

// ---- DOM ----
const globalSearch = document.getElementById("globalSearch");
const chipsWrap = document.getElementById("spotlightChips");
const cryptoTbody = document.getElementById("cryptoTbody");
const sortSelect = document.getElementById("sortSelect");
const onlyWatchlistCb = document.getElementById("onlyWatchlist");
const fundraisingList = document.getElementById("fundraisingList");
const loginBtn = document.getElementById("loginBtn");
const openPaletteBtn = document.getElementById("openPaletteBtn");

// Palette DOM
const intentOverlay = document.getElementById("intentOverlay");
const intentInput   = document.getElementById("intentInput");
const intentPreview = document.getElementById("intentPreview");
const intentApply   = document.getElementById("intentApply");
const intentClose   = document.getElementById("intentClose");

// Utility: safe listener (menghindari error jika elemen null)
function safeOn(el, ev, fn){ if (el) el.addEventListener(ev, fn); }

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
safeOn(loginBtn, "click", () => alert("Demo mode — login disabled."));

// ---- Command Palette ----
function openPalette(seed=""){
  if (!intentOverlay || !intentInput) return;
  intentOverlay.classList.remove("hidden");
  intentInput.value = seed;
  intentInput.focus();
  renderIntentPreview();
}
function closePalette(){
  if (!intentOverlay) return;
  intentOverlay.classList.add("hidden");
  lastIntent = null;
}
safeOn(openPaletteBtn, "click", () => openPalette(""));
document.addEventListener("keydown", (e)=>{
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==="k"){ e.preventDefault(); openPalette(""); }
  if (e.key==="Escape" && !intentOverlay.classList.contains("hidden")) closePalette();
});
safeOn(intentClose, "click", closePalette);
// klik area gelap di luar card untuk menutup
safeOn(intentOverlay, "click", (e)=>{ if (e.target === intentOverlay) closePalette(); });

// Spotlight chips
function renderChips() {
  chipsWrap.innerHTML = "";
  SPOTLIGHT_TAGS.forEach(tag => {
    const btn = document.createElement("button");
    btn.className = "chip" + (activeChip === tag ? " active" : "");
    btn.textContent = tag;
    btn.addEventListener("click", () => {
      activeChip = activeChip === tag ? null : tag;
      renderChips(); renderCrypto(); renderFundraising();
    });
    chipsWrap.appendChild(btn);
  });
}

// Search
safeOn(globalSearch, "input", (e) => {
  query = e.target.value.trim().toLowerCase();
  renderCrypto(); renderFundraising();
});

// Sorting + watchlist
safeOn(sortSelect, "change", (e) => {
  const [key, dir] = e.target.value.split(":");
  sortKey = key; sortDir = dir; renderCrypto();
});
safeOn(onlyWatchlistCb, "change", (e) => {
  onlyWatchlist = e.target.checked; renderCrypto();
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
function saveWatchlist(){ localStorage.setItem(LS_WATCHLIST_KEY, JSON.stringify(Array.from(watchlist))); }

// ---- Intent Parsing & Exec ----
function parseIntent(text){
  const s = (text||"").trim().toLowerCase();

  // swap 100 usdc -> xan
  const mSwap = s.match(/swap\s+(\d+(?:\.\d+)?)\s*([a-z0-9]+)\s*(?:->|→|to)\s*([a-z0-9]+)/i);
  if (mSwap){
    return { type:"swap", amount:Number(mSwap[1]), from:mSwap[2].toUpperCase(), to:mSwap[3].toUpperCase() };
  }

  // top gainer modular / top gainers sektor modular
  const mTop = s.match(/top\s+gainers?(?:\s+se(k|c)tor)?\s+([a-z0-9]+)/i);
  if (mTop){
    return { type:"view", sort:"change24h:desc", filter:{ sectorOrTag: capitalize(mTop[2]) } };
  }

  // filter anoma
  const mFilter = s.match(/filter\s+(?:tag\s+)?([a-z0-9]+)/i);
  if (mFilter){
    return { type:"view", filter:{ sectorOrTag: capitalize(mFilter[1]) } };
  }

  // add btc to watchlist
  const mAdd = s.match(/add(?:\s+to)?\s+watchlist\s+([a-z0-9]+)|add\s+([a-z0-9]+)\s+to\s+watchlist/i);
  if (mAdd){
    const sym = (mAdd[1]||mAdd[2]||"").toUpperCase();
    return { type:"watchlist", action:"add", symbol:sym };
  }
  return null;
}
function capitalize(str){ return (str||"").charAt(0).toUpperCase()+ (str||"").slice(1).toLowerCase(); }

function applyIntent(intent){
  if (!intent) return;
  lastIntent = intent;

  if (intent.type==="swap"){
    alert(`(DEMO) Swap intent\nFrom: ${intent.from}\nTo: ${intent.to}\nAmount: ${intent.amount}`);
    return;
  }

  if (intent.type==="view"){
    activeChip = intent.filter?.sectorOrTag || null;
    if (intent.sort){
      const [k,d] = intent.sort.split(":");
      sortKey = k; sortDir = d || "desc";
      const val = `${sortKey}:${sortDir}`;
      const opt = [...sortSelect.options].find(o=>o.value===val);
      if (!opt){ sortKey="change24h"; sortDir="desc"; }
    }
    renderChips(); renderCrypto(); renderFundraising();
    return;
  }

  if (intent.type==="watchlist"){
    if (intent.action==="add" && intent.symbol){
      watchlist.add(intent.symbol);
      saveWatchlist(); renderCrypto();
      alert(`(DEMO) Added ${intent.symbol} to watchlist`);
    }
  }
}

// Preview & Apply (palette)
function renderIntentPreview(){
  const i = parseIntent(intentInput?.value || "");
  if (!intentPreview) return;
  intentPreview.textContent = i ? ("parsed: " + JSON.stringify(i))
                                : "intent tidak dikenali. contoh: swap 100 usdc → xan";
}
safeOn(intentInput, "input", renderIntentPreview);
safeOn(intentApply, "click", ()=>{ const i = parseIntent(intentInput?.value || ""); applyIntent(i); closePalette(); });
safeOn(intentInput, "keydown", (e)=>{ if (e.key==="Enter"){ e.preventDefault(); intentApply?.click(); } });

// ---- Renderers ----
function renderCrypto(){
  const q = query;
  let rows = assets.slice();

  if (q){
    rows = rows.filter(a =>
      a.symbol.toLowerCase().includes(q) ||
      (a.name || "").toLowerCase().includes(q) ||
      (a.tags || []).some(t => t.toLowerCase().includes(q))
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

    const tdStar = document.createElement("td");
    const star = document.createElement("button");
    star.className = "star" + (watchlist.has(a.symbol) ? " active" : "");
    star.textContent = "★";
    star.addEventListener("click", ()=>{
      if (watchlist.has(a.symbol)) watchlist.delete(a.symbol);
      else watchlist.add(a.symbol);
      saveWatchlist(); renderCrypto();
    });
    tdStar.appendChild(star);

    const tdSymbol = document.createElement("td");
    tdSymbol.textContent = a.symbol;
    if (a.badge){
      const b = document.createElement("span");
      b.textContent = a.badge;
      b.className = "badge-small primary";
      b.style.marginLeft = "8px";
      tdSymbol.appendChild(b);
    }

    const tdName = document.createElement("td");
    const wrap = document.createElement("div");
    wrap.style.display = "flex"; wrap.style.alignItems = "center"; wrap.style.gap = "8px";
    if (a.logo){
      const img = document.createElement("img");
      img.src = a.logo; img.alt = a.symbol; img.width = 18; img.height = 18; img.style.borderRadius="4px";
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
    const tdTags = document.createElement("td"); tdTags.textContent = (a.tags || []).join(", ");

    tr.append(tdStar, tdSymbol, tdName, tdPrice, tdChg, tdMc, tdFd, tdVol, tdSec, tdR1m, tdR1y, tdTags);
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
