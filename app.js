// ---- Config ----
const SPOTLIGHT_TAGS = ["Anoma","ZK","Modular","AI","RWA","DeFi","Meme"];
const DATA={assets:"data/assets.json",fundraising:"data/fundraising.json",sectors:"data/sectors.json"};
const LS_WATCHLIST_KEY="anoma_demo_watchlist";
const THEME_KEY="anoma_theme";

// ---- State ----
let assets=[],fundraising=[];
let activeTab="crypto",query="",activeChip=null,sortKey="marketCap",sortDir="desc",onlyWatchlist=false;
let watchlist=new Set(JSON.parse(localStorage.getItem(LS_WATCHLIST_KEY)||"[]"));

// ---- DOM ----
const globalSearch=document.getElementById("globalSearch");
const chipsWrap=document.getElementById("spotlightChips");
const cryptoTbody=document.getElementById("cryptoTbody");
const cryptoEmpty=document.getElementById("cryptoEmpty");
const sortSelect=document.getElementById("sortSelect");
const onlyWatchlistCb=document.getElementById("onlyWatchlist");
const fundraisingList=document.getElementById("fundraisingList");
const fundraisingEmpty=document.getElementById("fundraisingEmpty");
const loginBtn=document.getElementById("loginBtn");
const themeToggle=document.getElementById("themeToggle");
const btnTopGainers=document.getElementById("btnTopGainers");
const btnTopLosers=document.getElementById("btnTopLosers");

// Modal DOM
const coinModal=document.getElementById("coinModal");
const coinModalClose=document.getElementById("coinModalClose");
const coinModalTitle=document.getElementById("coinModalTitle");
const coinModalMeta=document.getElementById("coinModalMeta");
const coinModalChart=document.getElementById("coinModalChart");
const coinModalNews=document.getElementById("coinModalNews");
const coinModalSwap=document.getElementById("coinModalSwap");

// ---- Utils ----
function formatNum(n){if(n==null||isNaN(n))return"-";if(Math.abs(n)>=1e12)return(n/1e12).toFixed(2)+"T";if(Math.abs(n)>=1e9)return(n/1e9).toFixed(2)+"B";if(Math.abs(n)>=1e6)return(n/1e6).toFixed(2)+"M";if(Math.abs(n)>=1e3)return(n/1e3).toFixed(2)+"K";return Number(n).toLocaleString();}
function pctClass(v){return v>0?"up":v<0?"down":"";}
function saveWatchlist(){localStorage.setItem(LS_WATCHLIST_KEY,JSON.stringify(Array.from(watchlist)));}
function applyTheme(m){document.documentElement.classList.toggle("light",m==="light");localStorage.setItem(THEME_KEY,m);}
applyTheme(localStorage.getItem(THEME_KEY)||"dark");

// ---- Events ----
themeToggle?.addEventListener("click",()=>{const next=document.documentElement.classList.contains("light")?"dark":"light";applyTheme(next);});
document.getElementById("tabs").addEventListener("click",e=>{const btn=e.target.closest(".tab");if(!btn)return;document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));btn.classList.add("active");activeTab=btn.dataset.tab;document.getElementById("cryptoSection").classList.toggle("hidden",activeTab!=="crypto");document.getElementById("fundraisingSection").classList.toggle("hidden",activeTab!=="fundraising");});
loginBtn?.addEventListener("click",()=>alert("Demo mode — login disabled."));

// Chips
function renderChips(){chipsWrap.innerHTML="";SPOTLIGHT_TAGS.forEach(tag=>{const btn=document.createElement("button");btn.className="chip"+(activeChip===tag?" active":"");btn.textContent=tag;btn.addEventListener("click",()=>{activeChip=activeChip===tag?null:tag;renderChips();renderCrypto();renderFundraising();});chipsWrap.appendChild(btn);});}

// Search
globalSearch?.addEventListener("input",e=>{query=e.target.value.trim().toLowerCase();renderCrypto();renderFundraising();});

// Sorting + filters
sortSelect?.addEventListener("change",e=>{[sortKey,sortDir]=e.target.value.split(":");renderCrypto();});
onlyWatchlistCb?.addEventListener("change",e=>{onlyWatchlist=e.target.checked;renderCrypto();});
btnTopGainers?.addEventListener("click",()=>{sortKey="change24h";sortDir="desc";sortSelect.value="change24h:desc";renderCrypto();});
btnTopLosers?.addEventListener("click",()=>{sortKey="change24h";sortDir="asc";sortSelect.value="change24h:asc";renderCrypto();});

// Modal helpers (same as before)...
function openCoinModal(asset){/* truncated for brevity: same modal code as previous version */}
// ... keep modal functions and renderSparkline unchanged ...

// ---- Renderers ----
function renderCrypto(){
  let rows=assets.slice();
  if(query)rows=rows.filter(a=>a.symbol.toLowerCase().includes(query)||(a.name||"").toLowerCase().includes(query)||(a.tags||[]).some(t=>(t||"").toLowerCase().includes(query)));
  if(activeChip)rows=rows.filter(a=>(a.tags||[]).includes(activeChip)||a.sector===activeChip);
  if(onlyWatchlist)rows=rows.filter(a=>watchlist.has(a.symbol));
  rows.sort((a,b)=>{const va=a[sortKey]??0;const vb=b[sortKey]??0;return sortDir==="desc"?(vb-va):(va-vb);});

  cryptoTbody.innerHTML="";
  if(rows.length===0){cryptoEmpty.classList.remove("hidden");return;}else cryptoEmpty.classList.add("hidden");

  rows.forEach(a=>{
    const tr=document.createElement("tr");
    if(a.symbol==="XAN")tr.classList.add("highlight-xan
