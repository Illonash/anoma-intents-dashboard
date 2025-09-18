/* =============================
   State & constants
============================= */
const PATHS = {
  assets: "assets/data/assets.json",
  sectors: "assets/data/sectors.json",
  fundraising: "assets/data/fundraising.json",
};

let RAW = [];           // semua rows
let VIEW = [];          // hasil filter/sort
let page = 1;
let pageSize = 10;
let sortKey = "marketCap";
let sortDir = "desc";
const watchlist = new Set();

/* ===== Logo map & helper ===== */
const LOGO_MAP = {
  BTC: "assets/logo-btc.png",
  ETH: "assets/logo-eth.png",
  BNB: "assets/logo-bnb.png",
  XAN: "assets/logo-xan.png",
};
function getLogoSrc(a){
  if (a && typeof a.logo === "string" && a.logo.trim() !== "") return a.logo;
  const m = a?.symbol ? LOGO_MAP[a.symbol.toUpperCase()] : null;
  return m || "assets/logo-xan.png";
}

/* ===== DOM ===== */
const cryptoTBody = document.getElementById("cryptoTBody");
const cryptoEmpty = document.getElementById("cryptoEmpty");
const pageInfo     = document.getElementById("pageInfo");
const pageSizeSel  = document.getElementById("pageSize");
const sortCapBtn   = document.getElementById("sortCap");
const qInput       = document.getElementById("q");
const watchOnlyBox = document.getElementById("watchOnly");

const pgFirst = document.getElementById("pgFirst");
const pgPrev  = document.getElementById("pgPrev");
const pgNext  = document.getElementById("pgNext");
const pgLast  = document.getElementById("pgLast");

document.getElementById("btnGainers").addEventListener("click", ()=>{ sortKey="change24h"; sortDir="desc"; page=1; renderAll();});
document.getElementById("btnLosers").addEventListener("click",  ()=>{ sortKey="change24h"; sortDir="asc";  page=1; renderAll();});
sortCapBtn.addEventListener("click", ()=>{ sortKey="marketCap"; sortDir = (sortDir==="desc" ? "asc":"desc"); page=1; renderAll();});

pageSizeSel.addEventListener("change", ()=>{ pageSize = +pageSizeSel.value || 10; page=1; renderAll(); });
pgFirst.addEventListener("click", ()=>{ page=1; renderAll();});
pgPrev .addEventListener("click", ()=>{ page=Math.max(1,page-1); renderAll();});
pgNext .addEventListener("click", ()=>{ page=Math.min(totalPages(),page+1); renderAll();});
pgLast .addEventListener("click", ()=>{ page=totalPages(); renderAll();});

qInput.addEventListener("input", ()=>{ page=1; renderAll(); });
watchOnlyBox.addEventListener("change", ()=>{ page=1; renderAll(); });

/* ===== Theme toggle ===== */
document.getElementById("themeBtn").addEventListener("click", ()=>{
  const root = document.querySelector(".root");
  root.classList.toggle("dark");
  // swap x-logo di footer agar kontras
  const x = document.querySelector(".xlogo");
  if (!x) return;
  x.src = root.classList.contains("dark") ? "assets/x-logo-light.png" : "assets/x-logo-dark.png";
});

/* =============================
   Data load
============================= */
(async function init(){
  try{
    RAW = await fetchJson(PATHS.assets);
  }catch(e){
    console.error("Load assets failed:", e);
    RAW = [];
  }
  // normalize
  RAW = (RAW||[]).map(x => ({
    symbol: x.symbol,
    name: (x.name || x.symbol || "").replace(/ Token$/i,""), // hapus "Token"
    price: num(x.price),
    change24h: num(x.change24h),
    marketCap: num(x.marketCap),
    fdv: num(x.fdv),
    volume24h: num(x.volume24h),
    sector: x.sector || "",
    roi1m: num(x.roi1m),
    roi1y: num(x.roi1y),
    tags: x.tags || [],
    logo: x.logo || "",        // biarkan jika ada di JSON
    badge: x.badge || "",      // opsional
  }));

  renderAll();
})();

function fetchJson(url){
  return fetch(url, {cache:"no-store"}).then(r=>{
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
}
function num(v){ const n=Number(v); return isFinite(n)? n : null; }

/* =============================
   Filter/sort/paging
============================= */
function applyFilter(){
  const q = (qInput.value||"").trim().toLowerCase();
  let arr = RAW.slice();

  if (watchOnlyBox.checked){
    arr = arr.filter(a => watchlist.has(a.symbol));
  }
  if (q){
    arr = arr.filter(a =>
      (a.symbol||"").toLowerCase().includes(q) ||
      (a.name||"").toLowerCase().includes(q) ||
      (a.sector||"").toLowerCase().includes(q) ||
      (Array.isArray(a.tags) ? a.tags.join(",") : "").toLowerCase().includes(q)
    );
  }
  return arr;
}
function applySort(arr){
  const key = sortKey;
  const dir = sortDir === "desc" ? -1 : 1;
  return arr.sort((a,b)=>{
    const va = a[key]; const vb = b[key];
    if (va==null && vb==null) return 0;
    if (va==null) return 1;
    if (vb==null) return -1;
    if (va>vb) return 1*dir;
    if (va<vb) return -1*dir;
    return 0;
  });
}
function totalPages(){ return Math.max(1, Math.ceil(VIEW.length / pageSize)); }
function pageInfoText(){
  const t = VIEW.length;
  if (!t) return "0–0 of 0";
  const s = (page-1)*pageSize + 1;
  const e = Math.min(page*pageSize, t);
  return `${s}–${e} of ${t}`;
}
function getSlice(){
  const s = (page-1)*pageSize;
  return VIEW.slice(s, s+pageSize);
}

/* =============================
   Render ALL
============================= */
function renderCrypto(){
  cryptoTBody.innerHTML = "";
  cryptoEmpty.classList.add("hidden");

  const slice = getSlice();
  if (!slice.length){
    cryptoEmpty.classList.remove("hidden");
    pageInfo.textContent = "0–0 of 0";
    return;
  }
  pageInfo.textContent = pageInfoText();

  slice.forEach(a=>{
    const tr = document.createElement("tr");

    // watchlist star
    const tdStar = document.createElement("td");
    tdStar.innerHTML = `<button class="star ${watchlist.has(a.symbol)?"active":""}"></button>`;

    // symbol
    const tdSym = document.createElement("td");
    tdSym.textContent = a.symbol;

    // name + logo
    const tdName = document.createElement("td");
    tdName.innerHTML = `
      <span class="name-cell">
        <img class="coin-logo" src="${getLogoSrc(a)}" alt="${a.name}" onerror="this.style.display='none'"/>
        <span>${a.name}</span>
      </span>`;

    // numeric cols
    const tdPrice = tdNum(formatMoney(a.price));
    const td24    = tdNum(a.change24h!=null? a.change24h.toFixed(2)+"%":"-");
    if (a.change24h!=null) td24.classList.add(a.change24h>=0?"pos":"neg");

    const tdMcap  = tdNum(formatAbbr(a.marketCap));
    const tdFdv   = tdNum(formatAbbr(a.fdv));
    const tdVol   = tdNum(formatAbbr(a.volume24h));

    const tdSec   = document.createElement("td");
    tdSec.textContent = a.sector||"-";

    const tdRoiM  = tdNum(a.roi1m!=null? a.roi1m.toFixed(2)+"%":"-");
    if (a.roi1m!=null) tdRoiM.classList.add(a.roi1m>=0?"pos":"neg");
    const tdRoiY  = tdNum(a.roi1y!=null? a.roi1y.toFixed(2)+"%":"-");
    if (a.roi1y!=null) tdRoiY.classList.add(a.roi1y>=0?"pos":"neg");

    const tdTags  = document.createElement("td");
    tdTags.textContent = Array.isArray(a.tags)? a.tags.join(", "): (a.tags||"-");

    tr.append(tdStar, tdSym, tdName, tdPrice, td24, tdMcap, tdFdv, tdVol, tdSec, tdRoiM, tdRoiY, tdTags);
    cryptoTBody.appendChild(tr);
  });
}
}

/* =============================
   Swap & NFT demo hooks
============================= */
document.getElementById("btnProcess")?.addEventListener("click", ()=>{
  alert("Swap intent processed (demo).");
});
document.getElementById("btnResetSwap")?.addEventListener("click", ()=>{
  document.getElementById("swapIntent").value="";
  document.getElementById("amt").value=100;
  document.getElementById("fromToken").value="ETH";
  document.getElementById("toToken").value="BTC";
  document.getElementById("fromChain").value="Ethereum";
  document.getElementById("toChain").value="Ethereum";
  document.getElementById("maxFee").value="";
  document.getElementById("deadline").value=30;
});

document.getElementById("btnStartNft")?.addEventListener("click", ()=>{
  alert("NFT swap started (demo).");
});
document.getElementById("btnResetNft")?.addEventListener("click", ()=>{
  document.getElementById("nftCollection").value="";
  document.getElementById("nftId").value="";
  document.getElementById("nftTarget").value="";
  document.getElementById("nftFrom").value="Ethereum";
  document.getElementById("nftTo").value="Polygon";
});
