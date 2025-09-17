// ---------- small utils ----------
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const fmtUSD = n => (n==null?'—':
  (n>=1e12? `$${(n/1e12).toFixed(2)}T`:
   n>=1e9?  `$${(n/1e9).toFixed(2)}B`:
   n>=1e6?  `$${(n/1e6).toFixed(2)}M`:
   `$${Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n)}`));

const pct = n => n==null?'—':`${n.toFixed(2)}%`;

function loadJSON(url){ return fetch(url).then(r=>{ if(!r.ok) throw new Error(r.status); return r.json();}); }

// ---------- state ----------
let ROWS=[], filtered=[], page=1, pageSize=10, sortKey='marketCap', sortDir='desc';
const watch = new Set(JSON.parse(localStorage.getItem('watchlist')||'[]'));

// ---------- theme ----------
const themeBtn = $("#themeToggle");
function applyTheme(cls){
  document.body.classList.remove('theme-dark','theme-light');
  document.body.classList.add(cls);
  localStorage.setItem('theme',cls);
}
applyTheme(localStorage.getItem('theme') || 'theme-dark');
themeBtn.addEventListener('click', ()=>{
  applyTheme(document.body.classList.contains('theme-dark')?'theme-light':'theme-dark');
});

// ---------- data load (with graceful fallback) ----------
async function loadData(){
  try{
    ROWS = await loadJSON('assets/data/assets.json');
  }catch(_){
    // minimal fallback for demo so table tidak kosong
    ROWS = [
      {symbol:"BTC", name:"Bitcoin", price:65000, change24h:-0.8, marketCap:1.28e12, fdv:1.28e12, volume24h:3.5e10, sector:"Store of Value", roi1m:5.3, roi1y:40.1, tags:["DeFi"]},
      {symbol:"ETH", name:"Ethereum", price:3200, change24h:2.1, marketCap:3.8e11, fdv:3.8e11, volume24h:1.8e10, sector:"Smart Contract", roi1m:6.7, roi1y:55.0, tags:["DeFi","AI"]},
      {symbol:"BNB", name:"BNB", price:590, change24h:-1.2, marketCap:9.1e10, fdv:9.1e10, volume24h:1.2e10, sector:"Exchange Token", roi1m:2.8, roi1y:25.7, tags:["DeFi"]},
      {symbol:"XAN", name:"Anoma", price:1.25, change24h:3.2, marketCap:1.5e9, fdv:2.5e9, volume24h:5.6e8, sector:"Modular", roi1m:12.5, roi1y:85.3, tags:["Anoma","ZK","Modular"], badge:"Official · Anoma", logo:"assets/logo-xan.png"}
    ];
  }
}
function saveWatch(){ localStorage.setItem('watchlist', JSON.stringify([...watch])); }

// ---------- sorting/filter/paging ----------
function getFilteredSorted(){
  // search
  const q = $("#globalSearch").value.trim().toLowerCase();
  filtered = ROWS.filter(r=>{
    if($("#watchOnly").checked && !watch.has(r.symbol)) return false;
    if(!q) return true;
    return (r.symbol||'').toLowerCase().includes(q) ||
           (r.name||'').toLowerCase().includes(q) ||
           (r.tags||[]).join(' ').toLowerCase().includes(q);
  });

  // quick filters
  if(window._quick === 'gainers') filtered = filtered.slice().sort((a,b)=>(b.change24h??0)-(a.change24h??0)).slice(0,10);
  else if(window._quick === 'losers') filtered = filtered.slice().sort((a,b)=>(a.change24h??0)-(b.change24h??0)).slice(0,10);

  // sort
  const dir = sortDir==='desc'?-1:1;
  filtered.sort((a,b)=>{
    const va = a[sortKey], vb = b[sortKey];
    if(va==null && vb==null) return 0;
    if(va==null) return 1;
    if(vb==null) return -1;
    if(typeof va === 'string') return va.localeCompare(vb)*dir;
    return (va>vb?1:va<vb?-1:0)*dir;
  });

  // page calc
  const totalPages = Math.max(1, Math.ceil(filtered.length/pageSize));
  if(page>totalPages) page = totalPages;
  const start=(page-1)*pageSize, end=start+pageSize;
  return {slice: filtered.slice(start,end), totalPages};
}

// ---------- table render ----------
function coinLogoURL(sym){
  // pakai lokal dulu
  return `assets/coins/${sym.toLowerCase()}.png`;
}
function coinCDNFallback(sym){
  // cryptologos-ish fallback
  return `https://assets-cdn.trustwallet.com/blockchains/binance/assets/${encodeURIComponent(sym)}/logo.png`;
}

function renderTable(){
  const {slice,totalPages} = getFilteredSorted();
  const tb = $("#cryptoTbody"); tb.innerHTML="";

  slice.forEach(r=>{
    const tr = document.createElement('tr');
    if(r.symbol==="XAN") tr.classList.add('highlight-xan');

    // star
    const tdStar = document.createElement('td');
    const bt = document.createElement('button');
    bt.className = 'btn-outline';
    bt.textContent = watch.has(r.symbol) ? '−' : '+';
    bt.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      if(watch.has(r.symbol)) watch.delete(r.symbol); else watch.add(r.symbol);
      saveWatch(); renderTable();
    });
    tdStar.appendChild(bt);

    // symbol
    const tdSym = document.createElement('td');
    tdSym.textContent = r.symbol;

    // name + logo
    const tdName = document.createElement('td');
    const wrap = document.createElement('div'); wrap.className = 'coin';
    const img = document.createElement('img');
    img.alt = r.symbol;
    img.src = r.logo || coinLogoURL(r.symbol);
    img.onerror = ()=>{ img.onerror=null; img.src = r.logo || coinCDNFallback(r.symbol); };
    const nm = document.createElement('span');
    nm.textContent = r.name || r.symbol;
    wrap.append(img,nm);
    tdName.appendChild(wrap);

    // nums
    const tdPrice = document.createElement('td'); tdPrice.className='num'; tdPrice.textContent = fmtUSD(r.price);
    const tdCh    = document.createElement('td'); tdCh.className   ='num'; tdCh.textContent = r.change24h!=null?pct(r.change24h):'—'; tdCh.style.color = r.change24h>0?'var(--success)':r.change24h<0?'var(--danger)':'';
    const tdMcap  = document.createElement('td'); tdMcap.className ='num'; tdMcap.textContent = fmtUSD(r.marketCap);
    const tdFdv   = document.createElement('td'); tdFdv.className  ='num'; tdFdv.textContent  = fmtUSD(r.fdv);
    const tdVol   = document.createElement('td'); tdVol.className  ='num'; tdVol.textContent  = fmtUSD(r.volume24h);

    // texts (these were misaligned -> keep brief text)
    const tdSector = document.createElement('td'); tdSector.textContent = r.sector || '—';
    const tdR1m    = document.createElement('td'); tdR1m.className='num'; tdR1m.textContent   = r.roi1m!=null?pct(r.roi1m):'—';
    const tdR1y    = document.createElement('td'); tdR1y.className='num'; tdR1y.textContent   = r.roi1y!=null?pct(r.roi1y):'—';

    const tdTags   = document.createElement('td'); tdTags.textContent = (r.tags||[]).join(', ');

    tr.append(tdStar, tdSym, tdName, tdPrice, tdCh, tdMcap, tdFdv, tdVol, tdSector, tdR1m, tdR1y, tdTags);
    tb.appendChild(tr);

    // row click -> detail (demo: scroll to panels)
    tr.addEventListener('click', ()=>{ window.scrollTo({top:document.querySelector('.grid-panels').offsetTop-20,behavior:'smooth'}); });
  });

  // header sort arrows
  $$('#cryptoThead th.sortable').forEach(th=>{
    const key = th.dataset.key;
    th.innerHTML = th.textContent.replace(/[▲▼]$/,''); // clear
    if(key===sortKey){ th.innerHTML += (sortDir==='desc'?' ▼':' ▲'); }
  });

  // pager
  $("#pageInfo").textContent = `${filtered.length?((page-1)*pageSize+1):0}–${Math.min(page*pageSize,filtered.length)} of ${filtered.length}`;
  $("#pageFirst").disabled = page<=1;
  $("#pagePrev").disabled  = page<=1;
  $("#pageNext").disabled  = page>=totalPages;
  $("#pageLast").disabled  = page>=totalPages;
}

// ---------- events ----------
$("#globalSearch").addEventListener('input', ()=>{ page=1; renderTable(); });
$("#watchOnly").addEventListener('change', ()=>{ page=1; renderTable(); });

$("#sortBy").addEventListener('change', e=>{
  const [k,dir] = e.target.value.split(':'); sortKey=k; sortDir=dir; renderTable();
});
$$('#cryptoThead th.sortable').forEach(th=>{
  th.addEventListener('click', ()=>{
    const k = th.dataset.key;
    if(sortKey===k) sortDir = (sortDir==='desc')?'asc':'desc'; else { sortKey=k; sortDir='desc'; }
    renderTable();
  });
});

$("#pageFirst").onclick=()=>{ page=1; renderTable(); };
$("#pagePrev").onclick =()=>{ if(page>1) page--; renderTable(); };
$("#pageNext").onclick =()=>{ page++; renderTable(); };
$("#pageLast").onclick =()=>{ page= Math.max(1,Math.ceil(filtered.length/pageSize)); renderTable(); };
$("#pageSize").addEventListener('change', e=>{ pageSize=parseInt(e.target.value,10); page=1; renderTable(); });

$("#btnTopGainers").onclick=()=>{ window._quick='gainers'; page=1; renderTable(); };
$("#btnTopLosers").onclick =()=>{ window._quick='losers';  page=1; renderTable(); };

// ---------- panels demo handlers ----------
$("#btnProcessIntent").onclick = ()=> alert('Intent processed (simulated)');
$("#btnResetIntent").onclick   = ()=> { $("#intentDesc").value=''; $("#swapAmount").value=100; };

$("#btnStartNft").onclick = ()=> alert('NFT swap started (simulated)');
$("#btnResetNft").onclick = ()=> { $("#nftColl").value=''; $("#nftId").value=''; $("#nftTarget").value=''; };

// ---------- boot ----------
(async function init(){
  await loadData();
  // ensure X logo source by theme
  const x = $("#xLogo");
  x.src = getComputedStyle(document.body).getPropertyValue('--bg') ? (document.body.classList.contains('theme-light')?'assets/x-logo-light.png':'assets/x-logo-dark.png') : 'assets/x-logo-dark.png';

  renderTable();
})();
