/* =========================================================
   Anoma Intents Dashboard — minimal demo data renderer
   + Mini Apps: Token Swap & NFT Swap (simulated)
   ========================================================= */

(function(){
  const state = {
    data: [],         // crypto list
    page: 1,
    pageSize: 10,
    sortKey: 'marketCap',
    sortDir: 'desc',
    quick: '',        // 'gainers' | 'losers' | ''
    watchOnly: false,
    watch: new Set(JSON.parse(localStorage.getItem('watchlist')||'[]')),
    theme: localStorage.getItem('theme') || 'dark'
  };

  /* ---------- utils ---------- */
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const fmtNum = n => n==null ? '-' :
      (Math.abs(n)>=1e12? (n/1e12).toFixed(2)+'T':
      Math.abs(n)>=1e9? (n/1e9).toFixed(2)+'B':
      Math.abs(n)>=1e6? (n/1e6).toFixed(2)+'M':
      Math.abs(n)>=1e3? (n/1e3).toFixed(2)+'K':
      (''+n));
  const fmtPrice = n => n==null?'-' : (n>=1000? '$'+fmtNum(n) : '$'+Number(n).toLocaleString());
  const pct = n => n==null?'-' : (n>=0? '+' : '') + Number(n).toFixed(2) + '%';

  function saveWatch(){
    localStorage.setItem('watchlist', JSON.stringify(Array.from(state.watch)));
  }
  function setTheme(t){
    state.theme = t;
    document.documentElement.classList.toggle('light', t==='light');
    document.documentElement.classList.toggle('dark', t!=='light');
    localStorage.setItem('theme', t);
  }

  /* ---------- data loading ---------- */
  async function loadData(){
    // data demo
    // kamu bisa tambahkan item lain ke assets/data/assets.json
    // format: symbol, name, price, change24h, marketCap, fdv, volume24h, sector, roi1m, roi1y, tags[], logo
    const url = 'assets/data/assets.json';
    try{
      const res = await fetch(url, {cache:'no-store'});
      if(!res.ok) throw new Error(res.status+' '+res.statusText);
      const arr = await res.json();
      state.data = arr;
    }catch(e){
      // fallback minimal (kalau fetch 404)
      state.data = [
        {symbol:'BTC', name:'Bitcoin', price:65000, change24h:-0.8, marketCap:1.28e12, fdv:1.28e12, volume24h:3.5e10, sector:'Store of Value', roi1m:5.3, roi1y:40.1, tags:['DeFi'], logo:'assets/coins/btc.png'},
        {symbol:'ETH', name:'Ethereum', price:3200, change24h:2.1, marketCap:3.8e11, fdv:3.8e11, volume24h:1.8e10, sector:'Smart Contract', roi1m:6.7, roi1y:55.0, tags:['DeFi','AI'], logo:'assets/coins/eth.png'},
        {symbol:'BNB', name:'BNB', price:590, change24h:-1.2, marketCap:9.1e10, fdv:9.1e10, volume24h:1.2e10, sector:'Exchange Token', roi1m:2.8, roi1y:25.7, tags:['DeFi'], logo:'assets/coins/bnb.png'},
        {symbol:'XAN', name:'Anoma', price:1.25, change24h:3.2, marketCap:1.5e9, fdv:2.5e9, volume24h:5.6e8, sector:'Modular', roi1m:12.5, roi1y:85.3, tags:['Anoma','ZK','Modular'], logo:'assets/logo-xan.png'}
      ];
    }
  }

  /* ---------- filtering & sorting ---------- */
  function filtered(){
    let rows = state.data.slice();

    // search
    const q = ($('#q').value||'').trim().toLowerCase();
    if(q){
      rows = rows.filter(a =>
        a.symbol.toLowerCase().includes(q) ||
        (a.name||'').toLowerCase().includes(q) ||
        (a.tags||[]).join(' ').toLowerCase().includes(q)
      );
    }

    // chip
    if(state.quick==='gainers'){ rows.sort((a,b)=>(b.change24h||0)-(a.change24h||0)); }
    else if(state.quick==='losers'){ rows.sort((a,b)=>(a.change24h||0)-(b.change24h||0)); }

    // watch only
    if(state.watchOnly){ rows = rows.filter(a=>state.watch.has(a.symbol)); }

    // sort
    const k = state.sortKey, dir = state.sortDir==='desc'? -1: 1;
    rows.sort((a,b)=>{
      const x = a[k], y = b[k];
      if(x==null && y==null) return 0;
      if(x==null) return 1;
      if(y==null) return -1;
      if(typeof x==='string') return x.localeCompare(y)*dir;
      return (x>y?1:x<y?-1:0)*dir;
    });
    return rows;
  }

  /* ---------- render table ---------- */
  function render(){
    const rows = filtered();

    // pagination
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / state.pageSize));
    state.page = Math.min(Math.max(1, state.page), pages);
    const start = (state.page-1)*state.pageSize;
    const slice = rows.slice(start, start+state.pageSize);

    const tb = $('#cryptoTbody');
    tb.innerHTML = '';

    slice.forEach(a=>{
      const tr = document.createElement('tr');

      // star
      const tdStar = document.createElement('td');
      const btn = document.createElement('button');
      btn.className = 'btn mini';
      btn.textContent = state.watch.has(a.symbol)? '－' : '＋';
      btn.addEventListener('click', ev=>{
        ev.stopPropagation();
        if(state.watch.has(a.symbol)) state.watch.delete(a.symbol); else state.watch.add(a.symbol);
        saveWatch(); render();
      });
      tdStar.appendChild(btn);

      // symbol
      const tdSym = document.createElement('td'); tdSym.textContent = a.symbol;

      // name (logo + text)
      const tdName = document.createElement('td');
      const wrap = document.createElement('div');
      if(a.logo){ const img = new Image(); img.src = a.logo; img.width=18; img.height=18; img.style.borderRadius='4px'; wrap.appendChild(img); }
      const nm = document.createElement('span'); nm.textContent = a.symbol==='XAN' ? 'Anoma' : (a.name||'-'); wrap.appendChild(nm);
      tdName.appendChild(wrap);

      // numerics
      const tdPrice = document.createElement('td'); tdPrice.className = 'num'; tdPrice.textContent = fmtPrice(a.price);
      const tdChg   = document.createElement('td'); tdChg.className = 'num'; tdChg.textContent = pct(a.change24h);
      tdChg.style.color = (a.change24h||0) >= 0 ? 'var(--green)' : '#f87171';
      const tdMc    = document.createElement('td'); tdMc.className = 'num'; tdMc.textContent = fmtNum(a.marketCap);
      const tdFdv   = document.createElement('td'); tdFdv.className = 'num'; tdFdv.textContent = fmtNum(a.fdv);
      const tdVol   = document.createElement('td'); tdVol.className = 'num'; tdVol.textContent = fmtNum(a.volume24h);

      // sector
      const tdSec   = document.createElement('td'); tdSec.textContent = a.sector || '-';

      // ROI
      const tdR1m = document.createElement('td'); tdR1m.className='num'; tdR1m.textContent = pct(a.roi1m);
      const tdR1y = document.createElement('td'); tdR1y.className='num'; tdR1y.textContent = pct(a.roi1y);

      // tags
      const tdTags = document.createElement('td'); tdTags.textContent = (a.tags||[]).join(', ');

      tr.append(tdStar, tdSym, tdName, tdPrice, tdChg, tdMc, tdFdv, tdVol, tdSec, tdR1m, tdR1y, tdTags);

      tr.addEventListener('click', ()=> {
  
    // pager text
    $('#pageInfo').textContent = `${total? (start+1):0}–${Math.min(start+state.pageSize,total)} of ${total}`;
  }

  /* ---------- events ---------- */
  function bindEvents(){
    // search
    $('#q').addEventListener('input', ()=>{ state.page=1; render(); });

    // watch only
    $('#onlyWatch').addEventListener('change', (e)=>{ state.watchOnly = e.target.checked; state.page=1; render(); });

    // sort select
    $('#sorter').addEventListener('change', (e)=>{
      const [k, dir] = e.target.value.split('-');
      state.sortKey = k; state.sortDir = dir; state.page=1; render();
    });

    // chips
    $$('.chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const v = btn.dataset.chip;
        state.quick = (state.quick===v)? '' : v;
        $$('.chip').forEach(c=>c.classList.toggle('active', c.dataset.chip===state.quick));
        state.page=1; render();
      });
    });

    // pager
    $('#first').onclick = ()=>{ state.page=1; render(); };
    $('#prev').onclick  = ()=>{ state.page=Math.max(1,state.page-1); render(); };
    $('#next').onclick  = ()=>{ state.page=state.page+1; render(); };
    $('#last').onclick  = ()=>{ state.page=9999; render(); };
    $('#pageSize').addEventListener('change', e=>{ state.pageSize=+e.target.value; state.page=1; render(); });

    // theme
    $('#btnTheme').addEventListener('click', ()=> setTheme(state.theme==='dark' ? 'light' : 'dark'));
  }

  /* ---------- mini apps ---------- */
  function allSymbols(){
    return state.data.map(x=>x.symbol);
  }
  function getPrice(sym){
    const f = state.data.find(x=>x.symbol===sym);
    return f? (f.price||0) : 0;
  }
  function fillTokenSelects(){
    const opts = allSymbols();
    const fill = (sel, def) => {
      sel.innerHTML = opts.map(s=>`<option ${s===def?'selected':''}>${s}</option>`).join('');
    };
    fill($('#swapFrom'),'USDC' in opts ? 'USDC' : (opts[1]||opts[0]));
    fill($('#swapTo'),  'ETH'  in opts ? 'ETH'  : (opts[0]||''));
  }

  function parseIntentText(txt){
    // sangat sederhana: "convert 100 usdc to eth"
    const m = /(\d+(\.\d+)?)\s*([a-z0-9]+)\s*(to|→)\s*([a-z0-9]+)/i.exec(txt||'');
    if(!m) return null;
    return { amount: parseFloat(m[1]), from:m[3].toUpperCase(), to:m[5].toUpperCase() };
  }

  function bindSwap(){
    fillTokenSelects();

    $('#swapForm').addEventListener('submit', (e)=>{
      e.preventDefault();

      // parse intent text jika ada
      const parsed = parseIntentText($('#swapIntent').value);
      let amount = +$('#swapAmount').value;
      let from = $('#swapFrom').value;
      let to   = $('#swapTo').value;

      if(parsed){
        amount = parsed.amount || amount;
        from = parsed.from || from;
        to   = parsed.to   || to;
        $('#swapAmount').value = amount;
        $('#swapFrom').value = from;
        $('#swapTo').value = to;
      }

      const pFrom = getPrice(from) || 1;
      const pTo   = getPrice(to)   || 1;
      const out = (amount * pFrom) / pTo;

      $('#swapResult').textContent =
        `Simulated: ${amount} ${from} ≈ ${out.toFixed(6)} ${to}  (px: ${fmtPrice(pFrom)} → ${fmtPrice(pTo)})`;
    });

    $('#swapForm').addEventListener('reset', ()=>{
      $('#swapResult').textContent = '';
    });
  }

  function bindNFT(){
    $('#nftForm').addEventListener('submit', (e)=>{
      e.preventDefault();
      const col = $('#nftCollection').value || 'Unknown';
      const id  = $('#nftId').value || '#0';
      const tgt = $('#nftTarget').value || '-';
      const fc  = $('#nftFromChain').value;
      const tc  = $('#nftToChain').value;

      $('#nftResult').textContent =
        `Simulated: Swap NFT ${col} ${id} on ${fc} → ${tc} for ${tgt}.`;
    });
    $('#nftForm').addEventListener('reset', ()=> $('#nftResult').textContent='');
  }

  /* ---------- init ---------- */
  (async function init(){
    // theme
    setTheme(state.theme);

    // load + render
    await loadData();
    bindEvents();
    render();

    // mini apps
    bindSwap();
    bindNFT();

    // sync UI default
    $('#onlyWatch').checked = state.watchOnly;
    $('#sorter').value = `${state.sortKey}-${state.sortDir}`;
    $('#pageSize').value = state.pageSize;
  })();

})();
