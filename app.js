const state = {
  data: [],
  filtered: [],
  watchlist: new Set(JSON.parse(localStorage.getItem("watchlist")||"[]")),
  sortKey:"marketCap", sortDir:"desc",
  page:1, pageSize:10,
  quick:null
};

const el = id=>document.getElementById(id);
const tbody=el("cryptoTbody"), thead=el("cryptoThead");
const searchInput=el("searchInput"), sortSelect=el("sortSelect");
const pageInfo=el("pageInfo"), pageSizeSel=el("pageSize");
const btnFirst=el("btnFirst"), btnPrev=el("btnPrev"), btnNext=el("btnNext"), btnLast=el("btnLast");
const watchOnly=el("watchOnly"), btnGainers=el("btnGainers"), btnLosers=el("btnLosers");

const nf=new Intl.NumberFormat("en-US",{maximumFractionDigits:2});
const compactNumber=v=>{
  if(v==null||isNaN(v)) return "-";
  if(v>=1e12) return nf.format(v/1e12)+"T";
  if(v>=1e9) return nf.format(v/1e9)+"B";
  if(v>=1e6) return nf.format(v/1e6)+"M";
  return nf.format(v);
};

async function loadData(){
  const isGh=location.hostname.endsWith("github.io");
  const repo=isGh?`/${location.pathname.split("/")[1]}`:"";
  const candidates=[
    `${location.origin}${repo}/assets/data/assets.json`,
    `${location.origin}/assets/data/assets.json`,
    new URL("assets/data/assets.json",location.href).href
  ];
  const fallback=[
    {symbol:"BTC",name:"Bitcoin",price:65000,change24h:-0.8,marketCap:1.28e12,fdv:1.28e12,volume24h:3.5e10,sector:"Store of Value",roi1m:5.3,roi1y:40.1,tags:["DeFi"],logo:`${repo}/assets/logo-btc.png`},
    {symbol:"ETH",name:"Ethereum",price:3200,change24h:2.1,marketCap:3.8e11,fdv:3.8e11,volume24h:1.8e10,sector:"Smart Contract",roi1m:6.7,roi1y:55.0,tags:["DeFi","AI"],logo:`${repo}/assets/logo-eth.png`},
    {symbol:"BNB",name:"BNB",price:590,change24h:-1.2,marketCap:9.1e10,fdv:9.1e10,volume24h:1.2e10,sector:"Exchange Token",roi1m:2.8,roi1y:25.7,tags:["DeFi"],logo:`${repo}/assets/logo-bnb.png`},
    {symbol:"XAN",name:"Anoma Token",price:1.25,change24h:3.2,marketCap:1.5e9,fdv:2.5e9,volume24h:5.6e8,sector:"Modular",roi1m:12.5,roi1y:85.3,tags:["Anoma","ZK","Modular"],logo:`${repo}/assets/logo-xan.png`}
  ];
  const tryFetch=async url=>{
    try{const res=await fetch(`${url}?v=${Date.now()}`,{cache:"no-store"});if(!res.ok)return null;return await res.json();}catch{return null;}
  };
  let usedUrl=null;
  for(const url of candidates){
    const arr=await tryFetch(url);
    if(Array.isArray(arr)&&arr.length){usedUrl=url;state.data=arr;break;}
  }
  if(!state.data||!state.data.length) state.data=fallback;
  const log=el("dataSourceLog");
  if(log) log.textContent=usedUrl?`data source: ${usedUrl.replace(location.origin,"")}`:`data source: fallback`;
}

function applyFilterSort(){
  const q=(searchInput.value||"").toLowerCase();
  let rows=state.data;
  if(q){rows=rows.filter(r=>(r.symbol||"").toLowerCase().includes(q)||(r.name||"").toLowerCase().includes(q));}
  if(watchOnly.checked) rows=rows.filter(r=>state.watchlist.has(r.symbol));
  if(state.quick==="gainers") rows=rows.filter(r=>(r.change24h??0)>0);
  if(state.quick==="losers") rows=rows.filter(r=>(r.change24h??0)<0);
  rows.sort((a,b)=>{const va=a[state.sortKey],vb=b[state.sortKey];if(typeof va==="string")return(state.sortDir==="asc"?1:-1)*String(va).localeCompare(String(vb));return(state.sortDir==="asc"?1:-1)*((va??-Infinity)-(vb??-Infinity));});
  state.filtered=rows;
}

function render(){
  applyFilterSort();
  const total=state.filtered.length,totalPages=Math.max(1,Math.ceil(total/state.pageSize));
  if(state.page>totalPages) state.page=totalPages;
  const start=(state.page-1)*state.pageSize;
  const slice=state.filtered.slice(start,start+state.pageSize);
  tbody.innerHTML="";
  if(!slice.length){el("cryptoEmpty").classList.remove("hidden");return;}
  el("cryptoEmpty").classList.add("hidden");
  slice.forEach(a=>{
    const tr=document.createElement("tr"); if(a.symbol==="XAN") tr.classList.add("highlight-xan");
    const tdStar=document.createElement("td");const star=document.createElement("button");star.className="star"+(state.watchlist.has(a.symbol)?" active":"");star.textContent="★";star.onclick=(ev)=>{ev.stopPropagation();if(state.watchlist.has(a.symbol))state.watchlist.delete(a.symbol);else state.watchlist.add(a.symbol);localStorage.setItem("watchlist",JSON.stringify([...state.watchlist]));render();};tdStar.appendChild(star);
    const tdSym=document.createElement("td");tdSym.textContent=a.symbol;
    const tdName=document.createElement("td");const wrap=document.createElement("div");if(a.logo){const img=new Image();img.src=a.logo;img.width=18;img.height=18;wrap.appendChild(img);}const nm=document.createElement("span");nm.textContent=a.name;wrap.appendChild(nm);tdName.appendChild(wrap);
    const tdPrice=document.createElement("td");tdPrice.className="num";tdPrice.textContent=a.price?`$${a.price}`:"-";
    const tdChg=document.createElement("td");tdChg.className="num";tdChg.textContent=a.change24h?`${a.change24h}%`:"-";tdChg.style.color=(a.change24h??0)>=0?"var(--pos)":"var(--neg)";
    const tdMc=document.createElement("td");tdMc.className="num";tdMc.textContent=compactNumber(a.marketCap);
    const tdFd=document.createElement("td");tdFd.className="num";tdFd.textContent=compactNumber(a.fdv);
    const tdVol=document.createElement("td");tdVol.className="num";tdVol.textContent=compactNumber(a.volume24h);
    const tdSec=document.createElement("td");tdSec.textContent=a.sector;
    const tdR1m=document.createElement("td");tdR1m.className="num";tdR1m.textContent=a.roi1m?`${a.roi1m}%`:"-";tdR1m.style.color=(a.roi1m??0)>=0?"var(--pos)":"var(--neg)";
    const tdR1y=document.createElement("td");tdR1y.className="num";tdR1y.textContent=a.roi1y?`${a.roi1y}%`:"-";tdR1y.style.color=(a.roi1y??0)>=0?"var(--pos)":"var(--neg)";
    const tdTags=document.createElement("td");tdTags.textContent=(a.tags||[]).join(", ");
    tr.append(tdStar,tdSym,tdName,tdPrice,tdChg,tdMc,tdFd,tdVol,tdSec,tdR1m,tdR1y,tdTags);
    tr.onclick=()=>openDetail(a);
    tbody.appendChild(tr);
  });
  pageInfo.textContent=`${slice.length?start+1:0}-${Math.min(start+state.pageSize,total)} of ${total}`;
}

function openDetail(a){
  const m=el("detailModal"),b=el("detailBody");
  b.innerHTML=`<div class="detail-head">${a.logo?`<img src="${a.logo}">`:""}<div><h3>${a.name} <small>(${a.symbol})</small></h3><div class="muted">${a.sector}</div></div></div>
  <div class="grid2"><div class="card"><div class="card-title">Overview</div>
  <div class="kv"><span>Price</span><b>$${a.price}</b></div>
  <div class="kv"><span>24h</span><b style="color:${
