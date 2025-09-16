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

// Detail view refs
const assetDetail=document.getElementById("assetDetail");
const detailBack=document.getElementById("detailBack");
const detailTitle=document.getElementById("detailTitle");
const tvFrame=document.getElementById("tvFrame");
const paneNews=document.getElementById("paneNews");
const paneOpinion=document.getElementById("paneOpinion");
const paneResearch=document.getElementById("paneResearch");
const swapInp=document.getElementById("dSwapAmount");
const swapBtn=document.getElementById("dSwapSim");
const swapRes=document.getElementById("dSwapResult");
const swapFromTxt=document.getElementById("dSwapFrom");

// ---- Utils ----
function formatNum(n){if(n==null||isNaN(n))return"-";if(Math.abs(n)>=1e12)return(n/1e12).toFixed(2)+"T";if(Math.abs(n)>=1e9)return(n/1e9).toFixed(2)+"B";if(Math.abs(n)>=1e6)return(n/1e6).toFixed(2)+"M";if(Math.abs(n)>=1e3)return(n/1e3).toFixed(2)+"K";return Number(n).toLocaleString();}
function pctClass(v){return v>0?"up":v<0?"down":"";}
function saveWatchlist(){localStorage.setItem(LS_WATCHLIST_KEY,JSON.stringify(Array.from(watchlist)));}
function applyTheme(m){document.documentElement.classList.toggle("light",m==="light");localStorage.setItem(THEME_KEY,m);}

// ---- Theme init + toggle ----
applyTheme(localStorage.getItem(THEME_KEY)||"dark");
themeToggle?.addEventListener("click",()=>{const next=document.documentElement.classList.contains("light")?"dark":"light";applyTheme(next);});

// ---- Tabs ----
document.getElementById("tabs").addEventListener("click",e=>{
  const btn=e.target.closest(".tab"); if(!btn)return;
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  btn.classList.add("active"); activeTab=btn.dataset.tab;
  document.getElementById("cryptoSection").classList.toggle("hidden",activeTab!=="crypto");
  document.getElementById("fundraisingSection").classList.toggle("hidden",activeTab!=="fundraising");
  assetDetail.classList.add("hidden");
});

// ---- Demo login ----
loginBtn?.addEventListener("click",()=>alert("Demo mode — login disabled."));

// ---- Chips ----
function renderChips(){
  chipsWrap.innerHTML="";
  SPOTLIGHT_TAGS.forEach(tag=>{
    const b=document.createElement("button");
    b.className="chip"+(activeChip===tag?" active":"");
    b.textContent=tag;
    b.addEventListener("click",()=>{activeChip=activeChip===tag?null:tag;renderChips();renderCrypto();renderFundraising();});
    chipsWrap.appendChild(b);
  });
}

// ---- Search ----
globalSearch?.addEventListener("input",e=>{query=e.target.value.trim().toLowerCase();renderCrypto();renderFundraising();});

// ---- Sorting + filters ----
sortSelect?.addEventListener("change",e=>{[sortKey,sortDir]=e.target.value.split(":");renderCrypto();});
onlyWatchlistCb?.addEventListener("change",e=>{onlyWatchlist=e.target.checked;renderCrypto();});
btnTopGainers?.addEventListener("click",()=>{sortKey="change24h";sortDir="desc";if(sortSelect)sortSelect.value="change24h:desc";renderCrypto();});
btnTopLosers?.addEventListener("click",()=>{sortKey="change24h";sortDir="asc";if(sortSelect)sortSelect.value="change24h:asc";renderCrypto();});

// ---- Detail mini-tabs ----
document.querySelectorAll(".tabs-mini .mini").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".tabs-mini .mini").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const pane=btn.dataset.pane;
    [paneNews,paneOpinion,paneResearch].forEach(p=>p.classList.add("hidden"));
    ({news:paneNews,opinion:paneOpinion,research:paneResearch})[pane].classList.remove("hidden");
  });
});

// ---- Open/Close Detail ----
function openAssetDetail(asset){
  detailTitle.textContent=`${asset.symbol} — ${asset.name}`;
  swapFromTxt.textContent=asset.symbol;

  // TradingView embed (tema mengikuti UI)
  const theme=document.documentElement.classList.contains("light")?"Light":"Dark";
  tvFrame.src=`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(asset.symbol)}USD&interval=60&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=0&saveimage=0&theme=${theme}`;

  // News list (link out; aman untuk demo)
  const q=encodeURIComponent(`${asset.name} ${asset.symbol} crypto`);
  paneNews.innerHTML=[
    {t:`Google News for ${asset.symbol}`,u:`https://news.google.com/search?q=${q}`},
    {t:`Search web news`,u:`https://www.google.com/search?q=${q}`},
    {t:`On Twitter/X`,u:`https://twitter.com/search?q=${q}&src=typed_query&f=live`}
  ].map(n=>`<div class="news-item"><a target="_blank" rel="noopener" href="${n.u}">${n.t}</a></div>`).join("");
  paneOpinion.innerHTML=`<div class="news-item">No opinion items — add curated threads or posts here.</div>`;
  paneResearch.innerHTML=`<div class="news-item">No research items — add PDF links or deep dives here.</div>`;

  // swap simulate → XAN
  swapRes.textContent="—";
  swapBtn.onclick=()=>{
    const amt=Number(swapInp.value||0);
    const fromPrice=Number(asset.price||0);
    const xan=assets.find(a=>a.symbol==="XAN");
    const toPrice=Number(xan?.price||1);
    const gross=(amt*fromPrice)/toPrice;
    const net=gross*(1-0.003);
    swapRes.textContent=isFinite(net)?`≈ ${net.toFixed(4)} XAN (fee 0.3%)`:"—";
  };

  // Show detail, hide lists
  document.getElementById("cryptoSection").classList.add("hidden");
  document.getElementById("fundraisingSection").classList.add("hidden");
  assetDetail.classList.remove("hidden");
  window.scrollTo({top:0,behavior:"smooth"});
}
detailBack?.addEventListener("click",()=>{
  assetDetail.classList.add("hidden");
  document.getElementById("cryptoSection").classList.toggle("hidden",activeTab!=="crypto");
  document.getElementById("fundraisingSection").classList.toggle("hidden",activeTab!=="fundraising");
});

// ---- Renderers ----
function renderCrypto(){
  let rows=assets.slice();
  if(query) rows=rows.filter(a=>a.symbol.toLowerCase().includes(query)||(a.name||"").toLowerCase().includes(query)||(a.tags||[]).some(t=>(t||"").toLowerCase().includes(query)));
  if(activeChip) rows=rows.filter(a=>(a.tags||[]).includes(activeChip)||a.sector===activeChip);
  if(onlyWatchlist) rows=rows.filter(a=>watchlist.has(a.symbol));
  rows.sort((a,b)=>{const va=a[sortKey]??0;const vb=b[sortKey]??0;return sortDir==="desc"?(vb-va):(va-vb);});

  cryptoTbody.innerHTML="";
  if(rows.length===0){cryptoEmpty.classList.remove("hidden");return;} else cryptoEmpty.classList.add("hidden");

  rows.forEach(a=>{
    const tr=document.createElement("tr");
    tr.style.cursor="pointer";
    if(a.symbol==="XAN") tr.classList.add("highlight-xan");

    // star
    const tdStar=document.createElement("td");
    const star=document.createElement("button");
    star.className="star"+(watchlist.has(a.symbol)?" active":"");
    star.textContent="★";
    star.addEventListener("click",(ev)=>{ev.stopPropagation(); if(watchlist.has(a.symbol))watchlist.delete(a.symbol); else watchlist.add(a.symbol); saveWatchlist(); renderCrypto();});
    tdStar.appendChild(star);

    // symbol + badge
    const tdSymbol=document.createElement("td");
    tdSymbol.textContent=a.symbol;
    if(a.badge){const b=document.createElement("span"); b.textContent=a.badge; b.className="badge-small primary"; b.style.marginLeft="8px"; tdSymbol.appendChild(b);}

    // name + logo (POINT 4)
    const tdName=document.createElement("td");
    const wrap=document.createElement("div"); wrap.style.display="flex"; wrap.style.alignItems="center"; wrap.style.gap="8px";
    if(a.logo){const img=document.createElement("img"); img.src=a.logo; img.alt=a.symbol; img.width=18; img.height=18; img.style.borderRadius="4px"; wrap.appendChild(img);}
    const nm=document.createElement("span"); nm.textContent=a.name||""; wrap.appendChild(nm); tdName.appendChild(wrap);

    const tdPrice=document.createElement("td"); tdPrice.className="num"; tdPrice.textContent=a.price!=null?`$${formatNum(a.price)}`:"-";
    const tdChg=document.createElement("td"); tdChg.className="num "+pctClass(a.change24h); tdChg.textContent=a.change24h!=null?`${a.change24h.toFixed(2)}%`:"-";
    const tdMc=document.createElement("td"); tdMc.className="num"; tdMc.textContent=formatNum(a.marketCap);
    const tdFd=document.createElement("td"); tdFd.className="num"; tdFd.textContent=formatNum(a.fdv);
    const tdVol=document.createElement("td"); tdVol.className="num"; tdVol.textContent=formatNum(a.volume24h);
    const tdSec=document.createElement("td"); tdSec.textContent=a.sector||"-";
    const tdR1m=document.createElement("td"); tdR1m.className="num "+pctClass(a.roi1m); tdR1m.textContent=a.roi1m!=null?`${a.roi1m.toFixed(2)}%`:"-";
    const tdR1y=document.createElement("td"); tdR1y.className="num "+pctClass(a.roi1y); tdR1y.textContent=a.roi1y!=null?`${a.roi1y.toFixed(2)}%`:"-";
    const tdTags=document.createElement("td"); tdTags.textContent=(a.tags||[]).join(", ");

    tr.append(tdStar,tdSymbol,tdName,tdPrice,tdChg,tdMc,tdFd,tdVol,tdSec,tdR1m,tdR1y,tdTags);
    tr.addEventListener("click",()=>openAssetDetail(a));
    cryptoTbody.appendChild(tr);
  });
}

function renderFundraising(){
  let items=fundraising.slice();
  if(query) items=items.filter(f=>(f.project||"").toLowerCase().includes(query)||(f.round||"").toLowerCase().includes(query)||(f.tags||[]).some(t=>(t||"").toLowerCase().includes(query)));
  if(activeChip) items=items.filter(f=>(f.tags||[]).includes(activeChip));

  fundraisingList.innerHTML="";
  if(items.length===0){fundraisingEmpty.classList.remove("hidden");return;} else fundraisingEmpty.classList.add("hidden");

  items.forEach(f=>{
    const li=document.createElement("li"); li.className="fund-item";
    const left=document.createElement("div");
    const title=document.createElement("div"); title.innerHTML=`<strong>${f.project}</strong> • ${f.round}`;
    const meta=document.createElement("div"); meta.className="fund-meta"; meta.textContent=`${f.amount} • ${f.date}`;
    left.append(title,meta);
    const right=document.createElement("div");
    (f.tags||[]).forEach(t=>{const s=document.createElement("span"); s.className="tag"; s.textContent=t; right.appendChild(s);});
    li.append(left,right); fundraisingList.appendChild(li);
  });
}

// ---- Boot ----
async function boot(){
  renderChips();
  try{
    const [assetsRes,fundRes]=await Promise.all([fetch(DATA.assets),fetch(DATA.fundraising)]);
    if(!assetsRes.ok) throw new Error("Assets JSON not found: "+assetsRes.status);
    if(!fundRes.ok) throw new Error("Fundraising JSON not found: "+fundRes.status);

    assets=await assetsRes.json();
    fundraising=await fundRes.json();

    // ensure XAN badge/logo
    assets=assets.map(a=>a.symbol==="XAN"?{...a,badge:a.badge||"Official · Anoma",logo:a.logo||"assets/logo-xan.png"}:a);

    renderCrypto();
    renderFundraising();
  }catch(e){
    console.error(e);
    document.body.insertAdjacentHTML("beforeend",
      `<pre style="color:#f88;background:#220;padding:8px;border:1px solid #400;border-radius:8px;max-width:90vw;overflow:auto">[Demo Error] ${String(e)}</pre>`);
  }
}
boot();
