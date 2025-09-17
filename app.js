// ===== State & helpers
const state = {
  data: [],
  filtered: [],
  watchlist: new Set(JSON.parse(localStorage.getItem("watchlist")||"[]")),
  sortKey: "marketCap",
  sortDir: "desc",
  page: 1,
  pageSize: 10,
  quick: null, // 'gainers' | 'losers' | null
};
const nf = new Intl.NumberFormat("en-US",{ maximumFractionDigits:2 });
const compact = v => (v==null||isNaN(v)) ? "-" :
  v>=1e12 ? nf.format(v/1e12)+"T" :
  v>=1e9  ? nf.format(v/1e9 )+"B" :
  v>=1e6  ? nf.format(v/1e6 )+"M" : nf.format(v);

// ===== DOM refs (diisi saat DOMContentLoaded)
let tbody, pageInfo, searchInput, watchOnly, sortSelect, pageSizeSel;
let btnFirst, btnPrev, btnNext, btnLast, btnGainers, btnLosers;

// ===== Data loader (multi-path + fallback + footer log)
async function loadData() {
  const isGh = location.hostname.endsWith("github.io");
  const repo = isGh ? `/${location.pathname.split("/")[1]}` : "";
  const candidates = [
    `${location.origin}${repo}/assets/data/assets.json`,
    `${location.origin}/assets/data/assets.json`,
    new URL("assets/data/assets.json", location.href).href,
  ];
  const fallback = [
    {symbol:"BTC", name:"Bitcoin",  price:65000, change24h:-0.8, marketCap:1.28e12, fdv:1.28e12, volume24h:3.5e10, sector:"Store of Value",  roi1m:5.3, roi1y:40.1, tags:["DeFi"],          logo:`${repo}/assets/logo-btc.png`},
    {symbol:"ETH", name:"Ethereum", price:3200,  change24h: 2.1, marketCap:3.8e11,  fdv:3.8e11,  volume24h:1.8e10, sector:"Smart Contract", roi1m:6.7, roi1y:55.0, tags:["DeFi","AI"],  logo:`${repo}/assets/logo-eth.png`},
    {symbol:"BNB", name:"BNB",      price:590,   change24h:-1.2, marketCap:9.1e10,  fdv:9.1e10,  volume24h:1.2e10, sector:"Exchange Token", roi1m:2.8, roi1y:25.7, tags:["DeFi"],       logo:`${repo}/assets/logo-bnb.png`},
    {symbol:"XAN", name:"Anoma Token", price:1.25, change24h:3.2, marketCap:1.5e9,  fdv:2.5e9,   volume24h:5.6e8,  sector:"Modular",        roi1m:12.5,roi1y:85.3, tags:["Anoma","ZK","Modular"], logo:`${repo}/assets/logo-xan.png`},
  ];
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
    if (Array.isArray(arr) && arr.length) { state.data = arr; usedUrl = url; break; }
  }
  if (!state.data.length) state.data = fallback;

  const log = document.getElementById("dataSourceLog");
  if (log) log.textContent = usedUrl ? `data source: ${usedUrl.replace(location.origin,"")}` : `data source: fallback`;
}

// ===== Filter & Sort
function applyFilterSort(){
  const q = (searchInput.value || "").toLowerCase();
  let rows = state.data;

  if (q) {
    rows = rows.filter(r =>
      (r.symbol||"").toLowerCase().includes(q) ||
      (r.name||"").toLowerCase().includes(q)   ||
      (r.sector||"").toLowerCase().includes(q) ||
      (r.tags||[]).some(t => (t||"").toLowerCase().includes(q))
    );
  }
  if (watchOnly.checked) rows = rows.filter(r => state.watchlist.has(r.symbol));
  if (state.quick === 'gainers') rows = rows.filter(r => (r.change24h??0) > 0);
  if (state.quick === 'losers')  rows = rows.filter(r => (r.change24h??0) < 0);

  const {sortKey, sortDir} = state;
  rows.sort((a,b)=>{
    const va=a[sortKey], vb=b[sortKey];
    if (typeof va === "string" || typeof vb === "string")
      return (sortDir==="asc"?1:-1) * String(va).localeCompare(String(vb));
    const na = (typeof va === "number") ? va : (va==null? -Infinity : 0);
    const nb = (typeof vb === "number") ? vb : (vb==null? -Infinity : 0);
    return (sortDir==="asc"?1:-1) * (na - nb);
  });

  state.filtered = rows;
}

  // topbar controls
  const topSearch = document.getElementById("topSearch");
  const themeBtn  = document.getElementById("themeBtn");

  if (topSearch) {
    // sinkronkan dengan search utama di toolbar
    topSearch.addEventListener("input", ()=>{
      searchInput.value = topSearch.value;
      state.page = 1; render();
    });
    // kalau user ketik di toolbar, ikutkan ke top bar juga
    searchInput.addEventListener("input", ()=>{
      if (topSearch.value !== searchInput.value) topSearch.value = searchInput.value;
    });
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", ()=>{
      document.documentElement.classList.toggle("light");
      // (opsional) kalau kamu punya stylesheet tema terang,
      // di sini tinggal switch variable CSS. Default kita cukup toggle class.
    });
  }

// ===== Render
function render(){
  applyFilterSort();

  const total = state.filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;

  const start = (state.page-1) * state.pageSize;
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
      if (a.symbol==="XAN") tr.classList.add("highlight-xan");

      const tdStar=document.createElement("td");
      const star=document.createElement("button");
      star.className="star"+(state.watchlist.has(a.symbol)?" active":"");
      star.textContent="★";
      star.addEventListener("click",(ev)=>{
        ev.stopPropagation();
        if (state.watchlist.has(a.symbol)) state.watchlist.delete(a.symbol);
        else state.watchlist.add(a.symbol);
        localStorage.setItem("watchlist", JSON.stringify([...state.watchlist]));
        render();
      });
      tdStar.appendChild(star);

      const tdSym=document.createElement("td"); tdSym.textContent=a.symbol||"-";

      const tdName=document.createElement("td");
      const wrap=document.createElement("div");
      wrap.style.display="inline-flex"; wrap.style.gap="8px"; wrap.style.alignItems="center";
      if (a.logo){ const img=new Image(); img.src=a.logo; img.width=18; img.height=18; img.style.borderRadius="4px"; wrap.appendChild(img); }
      const nm=document.createElement("span"); nm.textContent=a.name||"-"; wrap.appendChild(nm);
      tdName.appendChild(wrap);

      const tdPrice=document.createElement("td"); tdPrice.className="num"; tdPrice.textContent=a.price==null?"-":("$"+(a.price>=1000? new Intl.NumberFormat("en-US").format(a.price):a.price));
      const tdChg=document.createElement("td");   tdChg.className="num";  tdChg.textContent=a.change24h==null?"-":a.change24h.toFixed(2)+"%"; tdChg.style.color=a.change24h==null?"inherit":(a.change24h>=0?"var(--pos)":"var(--neg)");
      const tdMc=document.createElement("td");    tdMc.className="num";   tdMc.textContent=compact(a.marketCap);
      const tdFd=document.createElement("td");    tdFd.className="num";   tdFd.textContent=compact(a.fdv);
      const tdVol=document.createElement("td");   tdVol.className="num";  tdVol.textContent=compact(a.volume24h);

      const tdSec=document.createElement("td");   tdSec.textContent=a.sector||"-"; tdSec.title=a.sector||"";
      const tdR1m=document.createElement("td");   tdR1m.className="num"; tdR1m.textContent=a.roi1m==null?"-":a.roi1m.toFixed(2)+"%"; tdR1m.style.color=a.roi1m==null?"inherit":(a.roi1m>=0?"var(--pos)":"var(--neg)");
      const tdR1y=document.createElement("td");   tdR1y.className="num"; tdR1y.textContent=a.roi1y==null?"-":a.roi1y.toFixed(2)+"%"; tdR1y.style.color=a.roi1y==null?"inherit":(a.roi1y>=0?"var(--pos)":"var(--neg)");
      const tdTags=document.createElement("td");  tdTags.textContent=(a.tags||[]).join(", "); tdTags.title=tdTags.textContent;

      tr.append(tdStar, tdSym, tdName, tdPrice, tdChg, tdMc, tdFd, tdVol, tdSec, tdR1m, tdR1y, tdTags);
      tr.addEventListener("click", ()=> openDetail(a));
      tbody.appendChild(tr);
    });
  }

  pageInfo.textContent = ` ${slice.length? (start+1):0}-${Math.min(start+state.pageSize,total)} of ${total}`;
}

// ===== Modal detail + swap demo
function openDetail(a){
  const m = document.getElementById("detailModal");
  const b = document.getElementById("detailBody");
  b.innerHTML = `
    <div class="detail-head">
      ${a.logo?`<img src="${a.logo}" alt="${a.symbol}" />`:''}
      <div><h3>${a.name} <small>(${a.symbol})</small></h3>
      <div class="muted">${a.sector || '-'}</div></div>
    </div>
    <div class="grid2">
      <div class="card">
        <div class="card-title">Overview</div>
        <div class="kv"><span>Price</span><b>$${a.price??'-'}</b></div>
        <div class="kv"><span>24h</span><b style="color:${(a.change24h??0)>=0?'var(--pos)':'var(--neg)'}">${a.change24h??'-'}%</b></div>
        <div class="kv"><span>Market Cap</span><b>${compact(a.marketCap)}</b></div>
        <div class="kv"><span>FDV</span><b>${compact(a.fdv)}</b></div>
        <div class="kv"><span>Vol 24h</span><b>${compact(a.volume24h)}</b></div>
      </div>
      <div class="card">
        <div class="card-title">Swap demo (→ XAN)</div>
        <div class="swap-row">
          <input id="swapAmt" type="number" min="0" placeholder="amount">
          <button class="btn-red" id="btnSim">Simulate</button>
        </div>
        <div id="swapOut" class="muted" style="margin-top:6px"></div>
      </div>
    </div>
  `;
  m.classList.add("show");
  document.getElementById("btnCloseDetail").onclick = ()=> m.classList.remove("show");
  document.getElementById("btnSim").onclick = ()=>{
    const amt = parseFloat(document.getElementById("swapAmt").value||"0");
    const rateXAN = 1.25; // asumsi harga XAN $1.25 (demo)
    if (isNaN(amt) || amt<=0){ document.getElementById("swapOut").textContent="Enter a valid amount"; return; }
    const out = a.price ? (amt*a.price/rateXAN) : amt;
    document.getElementById("swapOut").textContent = `${amt} ${a.symbol} ≈ ${out.toFixed(2)} XAN (demo)`;
  };
}

// ===== Init setelah DOM siap
document.addEventListener("DOMContentLoaded", async ()=> {
  // ambil ref DOM
  tbody       = document.getElementById("cryptoTbody");
  pageInfo    = document.getElementById("pageInfo");
  searchInput = document.getElementById("searchInput");
  watchOnly   = document.getElementById("watchOnly");
  sortSelect  = document.getElementById("sortSelect");
  pageSizeSel = document.getElementById("pageSize");
  btnFirst    = document.getElementById("btnFirst");
  btnPrev     = document.getElementById("btnPrev");
  btnNext     = document.getElementById("btnNext");
  btnLast     = document.getElementById("btnLast");
  btnGainers  = document.getElementById("btnGainers");
  btnLosers   = document.getElementById("btnLosers");

  await loadData();

  // listeners
  searchInput.addEventListener("input", ()=>{ state.page=1; render(); });
  watchOnly.addEventListener("change", ()=>{ state.page=1; render(); });
  sortSelect.addEventListener("change", ()=>{
    const [k,dir] = sortSelect.value.split("|");
    state.sortKey=k; state.sortDir=dir; state.page=1; render();
  });
  pageSizeSel.addEventListener("change", ()=>{ state.pageSize=parseInt(pageSizeSel.value,10)||10; state.page=1; render(); });
  btnFirst.addEventListener("click", ()=>{ state.page=1; render(); });
  btnPrev .addEventListener("click", ()=>{ state.page=Math.max(1, state.page-1); render(); });
  btnNext .addEventListener("click", ()=>{ state.page += 1; render(); });
  btnLast .addEventListener("click", ()=>{ const total=Math.max(1, Math.ceil(state.filtered.length/state.pageSize)); state.page=total; render(); });

  btnGainers.addEventListener("click", ()=>{
    state.quick = (state.quick==='gainers'? null : 'gainers');
    btnGainers.classList.toggle("chip-red", state.quick==='gainers');
    btnLosers.classList.remove("chip-red");
    state.page=1; render();
  });
  btnLosers.addEventListener("click", ()=>{
    state.quick = (state.quick==='losers'? null : 'losers');
    btnLosers.classList.toggle("chip-red", state.quick==='losers');
    btnGainers.classList.remove("chip-red");
    state.page=1; render();
  });

  // set default sort/page
  const [k,dir] = (sortSelect.value || "marketCap|desc").split("|");
  state.sortKey=k; state.sortDir=dir;
  state.pageSize=parseInt(pageSizeSel.value,10)||10;

  render();
});
