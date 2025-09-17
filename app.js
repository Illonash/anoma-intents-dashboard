// =============================
// Anoma Intents Dashboard - app.js (FINAL compact)
// =============================

// ------- State -------
const state = {
  data: [],
  filtered: [],
  watchlist: new Set(JSON.parse(localStorage.getItem("watchlist") || "[]")),
  sortKey: "marketCap",
  sortDir: "desc",
  page: 1,
  pageSize: 10,
  quick: null, // 'gainers' | 'losers' | null
};

const $ = (id) => document.getElementById(id);
const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const compact = (v) =>
  v == null || isNaN(v)
    ? "-"
    : v >= 1e12
    ? nf.format(v / 1e12) + "T"
    : v >= 1e9
    ? nf.format(v / 1e9) + "B"
    : v >= 1e6
    ? nf.format(v / 1e6) + "M"
    : nf.format(v);

// ------- Logo Mapping (sesuai penamaanmu) -------
function getCoinLogo(symbol) {
  switch (symbol) {
    case "BTC":
      return "assets/coins/logo-btc.png";
    case "ETH":
      return "assets/coins/logo-eth.png";
    case "BNB":
      return "assets/coins/logo-bnb.png";
    case "XAN":
      // kamu pakai ini sebelumnya
      return "assets/logo-xan.png";
    default:
      // fallback umum (kalau ada coin tambahan)
      return `assets/coins/${symbol.toLowerCase()}.png`;
  }
}

// ------- Data Loader (multi-path + fallback) -------
async function loadData() {
  const candidates = [
    new URL("assets/data/assets.json", location.href).href,
  ];

  const fallback = [
    {symbol:"BTC", name:"Bitcoin",  price:65000, change24h:-0.8, marketCap:1.28e12, fdv:1.28e12, volume24h:3.5e10, sector:"Store of Value",  roi1m:5.3, roi1y:40.1, tags:["DeFi"]},
    {symbol:"ETH", name:"Ethereum", price:3200,  change24h: 2.1, marketCap:3.8e11,  fdv:3.8e11,  volume24h:1.8e10, sector:"Smart Contract", roi1m:6.7, roi1y:55.0, tags:["DeFi","AI"]},
    {symbol:"BNB", name:"BNB",      price:590,   change24h:-1.2, marketCap:9.1e10,  fdv:9.1e10,  volume24h:1.2e10, sector:"Exchange Token", roi1m:2.8, roi1y:25.7, tags:["DeFi"]},
    {symbol:"XAN", name:"Anoma",    price:1.25,  change24h:3.2,  marketCap:1.5e9,   fdv:2.5e9,   volume24h:5.6e8,  sector:"Modular",       roi1m:12.5,roi1y:85.3, tags:["Anoma","ZK","Modular"]}
  ];

  const tryFetch = async (url) => {
    try {
      const res = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  };

  for (const url of candidates) {
    const arr = await tryFetch(url);
    if (Array.isArray(arr) && arr.length) {
      state.data = arr;
      break;
    }
  }
  if (!state.data.length) state.data = fallback;
}

// ------- Filter + Sort -------
function applyFilterSort() {
  const q = (($("searchInput") || $("globalSearch"))?.value || "").toLowerCase();
  let rows = state.data.slice();

  if (q) {
    rows = rows.filter(r =>
      (r.symbol||"").toLowerCase().includes(q) ||
      (r.name||"").toLowerCase().includes(q) ||
      (r.sector||"").toLowerCase().includes(q) ||
      (r.tags||[]).some(t => (t||"").toLowerCase().includes(q))
    );
  }

  const watchOnly = $("watchOnly")?.checked;
  if (watchOnly) rows = rows.filter(r => state.watchlist.has(r.symbol));

  if (state.quick === 'gainers') rows = rows.filter(r => (r.change24h??0) > 0);
  if (state.quick === 'losers')  rows = rows.filter(r => (r.change24h??0) < 0);

  rows.sort((a,b)=>{
    const va=a[state.sortKey], vb=b[state.sortKey];
    if (typeof va === "string" || typeof vb === "string")
      return (state.sortDir==="asc"?1:-1) * String(va).localeCompare(String(vb));
    const na = typeof va === "number" ? va : (va==null? -Infinity : 0);
    const nb = typeof vb === "number" ? vb : (vb==null? -Infinity : 0);
    return (state.sortDir==="asc"?1:-1) * (na - nb);
  });

  state.filtered = rows;
}

// ------- Render -------
function render() {
  applyFilterSort();

  const tbody = $("cryptoTbody");
  const total = state.filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;

  const start = (state.page-1) * state.pageSize;
  const slice = state.filtered.slice(start, start + state.pageSize);

  tbody.innerHTML = "";
  slice.forEach(a=>{
    const tr = document.createElement("tr");
    if (a.symbol === "XAN") tr.classList.add("highlight-xan");

    // star/watch
    const tdStar=document.createElement("td");
    const star=document.createElement("button");
    star.className="star" + (state.watchlist.has(a.symbol) ? " active" : "");
    star.textContent="★";
    star.onclick=(ev)=>{ ev.stopPropagation();
      if (state.watchlist.has(a.symbol)) state.watchlist.delete(a.symbol);
      else state.watchlist.add(a.symbol);
      localStorage.setItem("watchlist", JSON.stringify([...state.watchlist]));
      render();
    };
    tdStar.appendChild(star);

    // symbol
    const tdSym=document.createElement("td"); tdSym.textContent=a.symbol||"-";

    // name (logo + text) — pakai mapping logo
    const tdName=document.createElement("td");
    const wrap=document.createElement("div");
    wrap.style.display="inline-flex"; wrap.style.gap="8px"; wrap.style.alignItems="center";
    const img=new Image();
    img.src = a.logo || getCoinLogo(a.symbol);
    img.alt = a.symbol;
    img.width=18; img.height=18; img.style.borderRadius="4px";
    // fallback kedua jika gagal load
    img.onerror = ()=>{ img.onerror=null; img.src = getCoinLogo(a.symbol); };
    wrap.appendChild(img);
    const nm=document.createElement("span");
    nm.textContent = a.symbol==="XAN" ? "Anoma" : (a.name || "-");
    wrap.appendChild(nm);
    tdName.appendChild(wrap);

    // numerics
    const tdPrice=document.createElement("td"); tdPrice.className="num"; tdPrice.textContent=a.price==null?"-":"$"+(a.price>=1000? new Intl.NumberFormat("en-US").format(a.price):a.price);
    const tdChg=document.createElement("td");   tdChg.className="num";  tdChg.textContent=a.change24h==null?"-":a.change24h.toFixed(2)+"%"; tdChg.style.color=a.change24h==null?"inherit":(a.change24h>=0?"var(--pos)":"var(--neg)");
    const tdMc=document.createElement("td");    tdMc.className="num";   tdMc.textContent=compact(a.marketCap);
    const tdFd=document.createElement("td");    tdFd.className="num";   tdFd.textContent=compact(a.fdv);
    const tdVol=document.createElement("td");   tdVol.className="num";  tdVol.textContent=compact(a.volume24h);

    // text
    const tdSec=document.createElement("td");   tdSec.textContent=a.sector||"-";
    const tdR1m=document.createElement("td");   tdR1m.className="num"; tdR1m.textContent=a.roi1m==null?"-":a.roi1m.toFixed(2)+"%"; tdR1m.style.color=a.roi1m==null?"inherit":(a.roi1m>=0?"var(--pos)":"var(--neg)";
    const tdR1y=document.createElement("td");   tdR1y.className="num"; tdR1y.textContent=a.roi1y==null?"-":a.roi1y.toFixed(2)+"%"; tdR1y.style.color=a.roi1y==null?"inherit":(a.roi1y>=0?"var(--pos)":"var(--neg)";
    const tdTags=document.createElement("td");  tdTags.textContent=(a.tags||[]).join(", ");

    tr.append(tdStar, tdSym, tdName, tdPrice, tdChg, tdMc, tdFd, tdVol, tdSec, tdR1m, tdR1y, tdTags);
    tbody.appendChild(tr);
  });

  $("pageInfo") && ($("pageInfo").textContent = `${slice.length?start+1:0}-${Math.min(start+state.pageSize,total)} of ${total}`);

  // pager buttons (if exist)
  $("pageFirst") && ($("pageFirst").disabled = state.page<=1);
  $("pagePrev")  && ($("pagePrev").disabled  = state.page<=1);
  $("pageNext")  && ($("pageNext").disabled  = state.page>=totalPages);
  $("pageLast")  && ($("pageLast").disabled  = state.page>=totalPages);
}

// ------- Init -------
document.addEventListener("DOMContentLoaded", async () => {
  // theme toggle (optional, kalau ada)
  const themeBtn = $("btnTheme") || $("themeToggle");
  if (themeBtn) {
    const saved = localStorage.getItem("theme") || "dark";
    document.documentElement.classList.toggle("light", saved==="light");
    themeBtn.addEventListener("click", ()=>{
      const next = document.documentElement.classList.contains("light") ? "dark" : "light";
      document.documentElement.classList.toggle("light", next==="light");
      localStorage.setItem("theme", next);
    });
  }

  // sort select (id bisa "sortSelect" atau "sortBy")
  const sortSel = $("sortSelect") || $("sortBy");
  if (sortSel) sortSel.addEventListener("change", ()=>{
    const [k,dir] = sortSel.value.split(/[:|]/);
    state.sortKey=k; state.sortDir=dir; state.page=1; render();
  });

  // search (topbar or toolbar)
  const topSearch = $("topSearch") || $("q") || $("globalSearch");
  const searchInput = $("searchInput") || topSearch;
  if (topSearch) topSearch.addEventListener("input", ()=>{ if (searchInput && searchInput!==topSearch) searchInput.value = topSearch.value; state.page=1; render(); });
  if (searchInput) searchInput.addEventListener("input", ()=>{ if (topSearch && topSearch!==searchInput) topSearch.value = searchInput.value; state.page=1; render(); });

  // watch only
  $("watchOnly") && $("watchOnly").addEventListener("change", ()=>{ state.page=1; render(); });

  // quick chips
  const btnGainers = $("btnGainers") || $("btnTopGainers");
  const btnLosers  = $("btnLosers")  || $("btnTopLosers");
  btnGainers && btnGainers.addEventListener("click", ()=>{ state.quick = state.quick==='gainers'?null:'gainers'; state.page=1; render(); });
  btnLosers  && btnLosers .addEventListener("click", ()=>{ state.quick = state.quick==='losers' ?null:'losers' ; state.page=1; render(); });

  // pager
  $("pageFirst") && ($("pageFirst").onclick = ()=>{ state.page=1; render(); });
  $("pagePrev")  && ($("pagePrev").onclick  = ()=>{ state.page=Math.max(1,state.page-1); render(); });
  $("pageNext")  && ($("pageNext").onclick  = ()=>{ state.page+=1; render(); });
  $("pageLast")  && ($("pageLast").onclick  = ()=>{ const total=Math.max(1,Math.ceil(state.filtered.length/state.pageSize)); state.page=total; render(); });
  $("pageSize")  && $("pageSize").addEventListener("change", (e)=>{ state.pageSize=parseInt(e.target.value,10)||10; state.page=1; render(); });

  await loadData();
  // initial sort/page
  if (sortSel) {
    const [k,dir] = (sortSel.value || "marketCap:desc").split(/[:|]/);
    state.sortKey=k; state.sortDir=dir;
  }
  const pageSizeSel = $("pageSize");
  if (pageSizeSel) state.pageSize = parseInt(pageSizeSel.value,10) || 10;

  render();
});
