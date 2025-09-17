/* ===========================
   Anoma Intents Dashboard - app.js (FINAL)
   - Auto base-path GitHub Pages
   - Fallback data jika fetch gagal
   - Tabel header/body sinkron (butuh style.css final)
   - Reset filter agar tidak ke-0
=========================== */

/* ---------- Global State ---------- */
const state = {
  data: [],
  filtered: [],
  watchlist: new Set(JSON.parse(localStorage.getItem("watchlist") || "[]")),
  sortKey: "marketCap",
  sortDir: "desc",
  page: 1,
  pageSize: 10,
};

/* ---------- Elements ---------- */
const el = (id) => document.getElementById(id);
const tbody = el("cryptoTbody");
const thead = el("cryptoThead");
const searchInput = el("searchInput");
const sortSelect = el("sortSelect");
const pageInfo = el("pageInfo");
const pageSizeSel = el("pageSize");
const btnFirst = el("btnFirst");
const btnPrev  = el("btnPrev");
const btnNext  = el("btnNext");
const btnLast  = el("btnLast");
const watchOnly = el("watchOnly");
const themeBtn = el("themeBtn");

/* ---------- Utils ---------- */
const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function compactNumber(v){
  if (v == null || isNaN(v)) return "-";
  const av = Math.abs(v);
  if (av >= 1e12) return nf.format(v/1e12) + "T";
  if (av >= 1e9)  return nf.format(v/1e9)  + "B";
  if (av >= 1e6)  return nf.format(v/1e6)  + "M";
  if (av >= 1e3)  return nf.format(v/1e3)  + "K";
  return nf.format(v);
}
const fmtPrice = (v)=> (v==null? "-" : (v>=1000? "$"+nf.format(v) : "$"+v));
const fmtPct   = (v)=> (v==null? "-" : (v*1).toFixed(2) + "%");
const isPos    = (v)=> v!=null && v >= 0;

// FINAL: loader multi-path + fallback + footer log
async function loadData() {
  const isGh = location.hostname.endsWith("github.io");
  const repo = isGh ? `/${location.pathname.split("/")[1]}` : "";

  // Kandidat path yang sering bikin 404 di GH Pages
  const candidates = [
    `${location.origin}${repo}/assets/data/assets.json`,        // project pages (paling umum)
    `${location.origin}/assets/data/assets.json`,               // root
    new URL("assets/data/assets.json", location.href).href      // relatif
  ];

  // Fallback minimal agar UI tetap hidup
  const fallback = [
    {symbol:"BTC", name:"Bitcoin",  price:65000, change24h:-0.8, marketCap:1.28e12, fdv:1.28e12, volume24h:3.5e10, sector:"Store of Value", roi1m:5.3, roi1y:40.1, tags:["DeFi"], logo:`${repo}/assets/logo-btc.png`},
    {symbol:"ETH", name:"Ethereum", price:3200,  change24h: 2.1, marketCap:3.8e11,  fdv:3.8e11,  volume24h:1.8e10, sector:"Smart Contract", roi1m:6.7, roi1y:55.0, tags:["DeFi","AI"], logo:`${repo}/assets/logo-eth.png`},
    {symbol:"XAN", name:"Anoma Token", price:1.25, change24h:3.2, marketCap:1.5e9,  fdv:2.5e9,   volume24h:5.6e8,  sector:"Modular", roi1m:12.5, roi1y:85.3, tags:["Anoma","ZK","Modular"], logo:`${repo}/assets/logo-xan.png`}
  ];

  // helper fetch
  const tryFetch = async (url) => {
    try {
      const res = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  };

  let usedUrl = null;
  for (const url of candidates) {
    const arr = await tryFetch(url);
    if (Array.isArray(arr) && arr.length) {
      usedUrl = url;
      state.data = arr.map(a => ({
        symbol: a.symbol, name: a.name,
        price: a.price, change24h: a.change24h,
        marketCap: a.marketCap, fdv: a.fdv, volume24h: a.volume24h,
        sector: a.sector, roi1m: a.roi1m, roi1y: a.roi1y,
        tags: a.tags || [], badge: a.badge,
        logo: a.logo
          ? (a.logo.startsWith("http") ? a.logo : `${repo}/${a.logo.replace(/^\/+/,"")}`)
          : ""
      }));
      break;
    }
  }

  if (!state.data || !state.data.length) {
    console.warn("[data] semua kandidat gagal → pakai fallback");
    state.data = fallback;
  }

  // Tulis sumber data di footer
  const log = document.getElementById("dataSourceLog");
  if (log) {
    log.textContent = usedUrl
      ? `data source: ${usedUrl.replace(location.origin, "")}`
      : `data source: fallback (assets/data/assets.json tidak ditemukan)`;
  }
}

/* ---------- Filter & Sort ---------- */
function applyFilterSort(){
  const q = (searchInput.value||"").trim().toLowerCase();
  let rows = state.data;

  if (q){
    rows = rows.filter(r =>
      (r.symbol||"").toLowerCase().includes(q) ||
      (r.name||"").toLowerCase().includes(q) ||
      (r.sector||"").toLowerCase().includes(q) ||
      (r.tags||[]).some(t => (t||"").toLowerCase().includes(q))
    );
  }

  if (watchOnly.checked){
    rows = rows.filter(r => state.watchlist.has(r.symbol));
  }

  const {sortKey, sortDir} = state;
  rows.sort((a,b)=>{
    const va = a[sortKey], vb = b[sortKey];
    let res = 0;
    if (typeof va === "string" || typeof vb === "string"){
      res = String(va).localeCompare(String(vb));
    }else{
      res = (va==null? -Infinity:va) - (vb==null? -Infinity:vb);
    }
    return sortDir === "asc" ? res : -res;
  });

  state.filtered = rows;
}

/* ---------- Render Table ---------- */
function render(){
  applyFilterSort();

  const total = state.filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;

  const start = (state.page - 1) * state.pageSize;
  const slice = state.filtered.slice(start, start + state.pageSize);

  const empty = document.getElementById("cryptoEmpty");
  tbody.innerHTML = "";

  if (!slice.length) {
    empty.classList.remove("hidden");
    empty.textContent = "No results found.";
  } else {
    empty.classList.add("hidden");

    slice.forEach(a=>{
      const tr = document.createElement("tr");
      tr.style.cursor = "pointer";
      if (a.symbol === "XAN") tr.classList.add("highlight-xan");

      // ★
      const tdStar = document.createElement("td");
      const star = document.createElement("button");
      star.className = "star"+(state.watchlist.has(a.symbol)?" active":"");
      star.textContent = "★";
      star.addEventListener("click",(ev)=>{
        ev.stopPropagation();
        if (state.watchlist.has(a.symbol)) state.watchlist.delete(a.symbol);
        else state.watchlist.add(a.symbol);
        localStorage.setItem("watchlist", JSON.stringify([...state.watchlist]));
        render();
      });
      tdStar.appendChild(star);

      // Symbol
      const tdSym = document.createElement("td");
      tdSym.textContent = a.symbol || "-";

      // Name (logo + text)
      const tdName = document.createElement("td");
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.alignItems = "center";
      wrap.style.gap = "8px";
      if (a.logo){
        const img = document.createElement("img");
        img.src = a.logo; img.alt = a.symbol; img.width = 18; img.height = 18; img.style.borderRadius="4px";
        wrap.appendChild(img);
      }
      const nm = document.createElement("span");
      nm.textContent = a.name || "-";
      wrap.appendChild(nm);
      tdName.appendChild(wrap);

      // Price
      const tdPrice = document.createElement("td");
      tdPrice.className = "num";
      tdPrice.textContent = fmtPrice(a.price);

      // 24h
      const tdChg = document.createElement("td");
      tdChg.className = "num";
      tdChg.textContent = fmtPct(a.change24h);
      tdChg.style.color = a.change24h==null ? "inherit" : (isPos(a.change24h)? "var(--pos)":"var(--neg)");

      // MCap
      const tdMc = document.createElement("td");
      tdMc.className = "num";
      tdMc.textContent = compactNumber(a.marketCap);

      // FDV
      const tdFd = document.createElement("td");
      tdFd.className = "num";
      tdFd.textContent = compactNumber(a.fdv);

      // Vol 24h
      const tdVol = document.createElement("td");
      tdVol.className = "num";
      tdVol.textContent = compactNumber(a.volume24h);

      // Sector
      const tdSec = document.createElement("td");
      tdSec.textContent = a.sector || "-";
      tdSec.title = a.sector || "";

      // ROI 1M
      const tdR1m = document.createElement("td");
      tdR1m.className = "num";
      tdR1m.textContent = fmtPct(a.roi1m);
      tdR1m.style.color = a.roi1m==null ? "inherit" : (isPos(a.roi1m)? "var(--pos)":"var(--neg)");

      // ROI 1Y
      const tdR1y = document.createElement("td");
      tdR1y.className = "num";
      tdR1y.textContent = fmtPct(a.roi1y);
      tdR1y.style.color = a.roi1y==null ? "inherit" : (isPos(a.roi1y)? "var(--pos)":"var(--neg)");

      // Tags
      const tdTags = document.createElement("td");
      tdTags.textContent = (a.tags||[]).join(", ");
      tdTags.title = tdTags.textContent;

      tr.append(tdStar, tdSym, tdName, tdPrice, tdChg, tdMc, tdFd, tdVol, tdSec, tdR1m, tdR1y, tdTags);
      tbody.appendChild(tr);

      tr.addEventListener("click", ()=> {
        // Placeholder: klik untuk detail page (bisa diarahkan nanti)
        // console.log("detail:", a.symbol);
      });
    });
  }

  pageInfo.textContent = ` ${slice.length? (start+1):0}-${Math.min(start+state.pageSize, total)} of ${total}`;
  updateSortIndicators();
}

/* ---------- Sort Indicators & Click ---------- */
function updateSortIndicators(){
  thead.querySelectorAll(".sortable").forEach(th=> th.removeAttribute("data-sort"));
  const cur = thead.querySelector(`.sortable[data-key="${state.sortKey}"]`);
  if (cur) cur.setAttribute("data-sort", state.sortDir);
}

thead.addEventListener("click",(e)=>{
  const th = e.target.closest(".sortable");
  if (!th) return;
  const key = th.dataset.key;
  if (state.sortKey === key){
    state.sortDir = (state.sortDir === "asc" ? "desc" : "asc");
  } else {
    state.sortKey = key;
    state.sortDir = "desc";
  }
  render();
});

/* ---------- Pager ---------- */
pageSizeSel.addEventListener("change", ()=>{
  state.pageSize = parseInt(pageSizeSel.value,10)||10;
  state.page = 1; render();
});
btnFirst.onclick = ()=>{ state.page=1; render(); };
btnPrev.onclick  = ()=>{ state.page=Math.max(1, state.page-1); render(); };
btnNext.onclick  = ()=>{ state.page+=1; render(); };
btnLast.onclick  = ()=>{ const totalPages=Math.max(1, Math.ceil(state.filtered.length/state.pageSize)); state.page=totalPages; render(); };

/* ---------- Search & Filters ---------- */
searchInput.addEventListener("input", ()=>{ state.page=1; render(); });
sortSelect.addEventListener("change", ()=>{
  const [k,dir] = sortSelect.value.split("|");
  state.sortKey=k; state.sortDir=dir; state.page=1; render();
});
watchOnly.addEventListener("change", ()=>{ state.page=1; render(); });

/* ---------- Theme toggle ---------- */
themeBtn?.addEventListener("click", ()=>{
  document.documentElement.classList.toggle("light");
});

/* ---------- Error hooks (opsional) ---------- */
window.addEventListener("error", e => console.error("[window error]", e.message));
window.addEventListener("unhandledrejection", e => console.error("[promise rejection]", e.reason));

/* ---------- Init ---------- */
(async function init(){
  try {
    await loadData();
  } catch (e) {
    console.error(e);
  }

  // Reset filter agar tidak mengosongkan tabel
  searchInput.value = "";
  watchOnly.checked = false;
  state.page = 1;

  // set default sort dari select
  const [k,dir] = (sortSelect?.value || "marketCap|desc").split("|");
  state.sortKey = k; 
  state.sortDir = dir;
  state.pageSize = parseInt(pageSizeSel?.value,10)||10;

  render();
})();
