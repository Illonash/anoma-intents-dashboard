/* ==============
   Minimal state
================= */
const state = {
  data: [],
  filtered: [],
  watchlist: new Set(JSON.parse(localStorage.getItem("watchlist") || "[]")),
  sortKey: "marketCap",
  sortDir: "desc",
  page: 1,
  pageSize: 10,
};

/* ==============
   Elements
================= */
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

/* ==============
   Utils
================= */
const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function compactNumber(v){
  if (v == null || isNaN(v)) return "-";
  if (Math.abs(v) >= 1e12) return nf.format(v/1e12) + "T";
  if (Math.abs(v) >= 1e9)  return nf.format(v/1e9)  + "B";
  if (Math.abs(v) >= 1e6)  return nf.format(v/1e6)  + "M";
  if (Math.abs(v) >= 1e3)  return nf.format(v/1e3)  + "K";
  return nf.format(v);
}
const fmtPrice   = (v)=> (v==null? "-" : (v>=1000? "$"+nf.format(v) : "$"+v));
const fmtPct     = (v)=> (v==null? "-" : (v>=0? "" : "") + (v*1).toFixed(2) + "%");
const isPos      = (v)=> v!=null && v >= 0;

/* ==============
   Data load
================= */
async function loadData(){
  // sesuaikan dengan repo kamu
  const res = await fetch("assets/data/assets.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Assets JSON not found: "+res.status);
  const arr = await res.json();

  // pastikan struktur minimal
  state.data = (arr||[]).map(a=>({
    symbol: a.symbol,  name: a.name,
    price: a.price,    change24h: a.change24h,
    marketCap: a.marketCap, fdv: a.fdv, volume24h: a.volume24h,
    sector: a.sector,  roi1m: a.roi1m, roi1y: a.roi1y,
    tags: a.tags || [],
    badge: a.badge, logo: a.logo
  }));
}

/* ==============
   Filtering + sort
================= */
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

/* ==============
   Render table
================= */
function render(){
  applyFilterSort();

  const total = state.filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;

  const start = (state.page - 1) * state.pageSize;
  const slice = state.filtered.slice(start, start + state.pageSize);

  // kosongkan
  tbody.innerHTML = "";

  if (!slice.length){
    document.getElementById("cryptoEmpty").classList.remove("hidden");
  } else {
    document.getElementById("cryptoEmpty").classList.add("hidden");

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

      // Vol24h
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
        // placeholder: klik row → nanti bisa diarahkan ke detail
        // console.log("open detail", a.symbol);
      });
    });
  }

  pageInfo.textContent = ` ${slice.length? (start+1):0}-${Math.min(start+state.pageSize, total)} of ${total}`;
  updateSortIndicators();
}

/* ==============
   Sort handlers
================= */
function updateSortIndicators(){
  // reset
  thead.querySelectorAll(".sortable").forEach(th=>{
    th.removeAttribute("data-sort");
  });
  // set indicator
  const current = thead.querySelector(`.sortable[data-key="${state.sortKey}"]`);
  if (current) current.setAttribute("data-sort", state.sortDir);
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

/* ==============
   Pager
================= */
pageSizeSel.addEventListener("change", ()=>{
  state.pageSize = parseInt(pageSizeSel.value,10)||10;
  state.page = 1; render();
});
btnFirst.onclick = ()=>{ state.page=1; render(); };
btnPrev.onclick  = ()=>{ state.page=Math.max(1, state.page-1); render(); };
btnNext.onclick  = ()=>{ state.page+=1; render(); };
btnLast.onclick  = ()=>{ const totalPages=Math.max(1, Math.ceil(state.filtered.length/state.pageSize)); state.page=totalPages; render(); };

/* ==============
   Search & filters
================= */
searchInput.addEventListener("input", ()=>{
  state.page = 1; render();
});
sortSelect.addEventListener("change", ()=>{
  const [k,dir] = sortSelect.value.split("|");
  state.sortKey = k; state.sortDir = dir; state.page=1; render();
});
watchOnly.addEventListener("change", ()=>{ state.page=1; render(); });

/* ==============
   Theme toggle
================= */
themeBtn.addEventListener("click", ()=>{
  document.documentElement.classList.toggle("light");
});

/* ==============
   Boot
================= */
(async function init(){
  try{
    await loadData();
  }catch(err){
    console.error(err);
    // tetap render kosong supaya UI tidak "mati"
  }
  // default dari select sort
  const [k,dir] = sortSelect.value.split("|");
  state.sortKey = k; state.sortDir = dir;
  state.pageSize = parseInt(pageSizeSel.value,10)||10;
  render();
})();
