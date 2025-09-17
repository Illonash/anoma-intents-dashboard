/* =========================
   Anoma Intents Dashboard - app.js (FINAL)
   - Logo mapping BTC/ETH/BNB/XAN → /assets/logo-*.png
   - Note pindah di bawah pager
   ========================= */

/* ---------- Helper DOM ---------- */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

/* ---------- Data sources ---------- */
const PATH_ASSETS_JSON = 'assets/data/assets.json';        // coins
const PATH_SECTORS_JSON = 'assets/data/sectors.json';      // optional
const PATH_FUND_JSON    = 'assets/data/fundraising.json';  // optional

// Fallback demo data (kalau fetch JSON gagal)
const FALLBACK_COINS = [
  { symbol:'BTC', name:'Bitcoin',  price:65000, change24h:-0.8,  marketCap:1.28e12, fdv:1.28e12, volume24h:3.5e10, sector:'Store of Value', roi1m:5.3, roi1y:40.1, tags:['DeFi'] },
  { symbol:'ETH', name:'Ethereum', price:3200,  change24h:2.10,  marketCap:3.8e11, fdv:3.8e11, volume24h:1.8e10, sector:'Smart Contract', roi1m:6.7, roi1y:55.0, tags:['DeFi','AI'] },
  { symbol:'BNB', name:'BNB',      price:590,   change24h:-1.20, marketCap:9.1e10, fdv:9.1e10, volume24h:1.2e10, sector:'Exchange Token', roi1m:2.8, roi1y:25.7, tags:['DeFi'] },
  { symbol:'XAN', name:'Anoma',    price:1.25,  change24h:3.20,  marketCap:1.5e9,  fdv:2.5e9,  volume24h:5.6e8,  sector:'Modular',       roi1m:12.5, roi1y:85.3, tags:['Anoma','ZK','Modular'] }
];

/* ---------- LOGO MAPPING (sesuai repo kamu) ---------- */
const COIN_LOGO = {
  BTC: 'assets/logo-btc.png',
  ETH: 'assets/logo-eth.png',
  BNB: 'assets/logo-bnb.png',
  XAN: 'assets/logo-xan.png'
};

/* ---------- State ---------- */
const state = {
  coins: [],
  filtered: [],
  pageSize: 10,
  page: 1,
  sortKey: 'marketCap',
  sortDir: 'desc',
  search: '',
  watchlistOnly: false,
  watchlist: new Set(JSON.parse(localStorage.getItem('watchlist') || '[]'))
};

/* ---------- Fetch JSON (aman untuk GitHub Pages) ---------- */
async function fetchJSON(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${url} ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn('[Demo Warning] fetch gagal:', e.message);
    return null;
  }
}

async function loadData() {
  const assets = await fetchJSON(PATH_ASSETS_JSON);
  state.coins = Array.isArray(assets) && assets.length ? assets : FALLBACK_COINS;
  applyFilters();
  renderAll();
}

/* ---------- Filtering & Sorting ---------- */
function applyFilters() {
  let rows = [...state.coins];

  // Search
  if (state.search && state.search.trim()) {
    const q = state.search.trim().toLowerCase();
    rows = rows.filter(c =>
      c.symbol.toLowerCase().includes(q) ||
      (c.name||'').toLowerCase().includes(q) ||
      (Array.isArray(c.tags) && c.tags.join(' ').toLowerCase().includes(q))
    );
  }

  // Watchlist only
  if (state.watchlistOnly) {
    rows = rows.filter(c => state.watchlist.has(c.symbol));
  }

  // Sort
  const dir = state.sortDir === 'asc' ? 1 : -1;
  const key = state.sortKey;
  rows.sort((a,b) => {
    const av = a[key] ?? 0;
    const bv = b[key] ?? 0;
    if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
    return (av - bv) * dir;
  });

  state.filtered = rows;
  // jaga-jaga agar current page valid
  const totalPages = Math.max(1, Math.ceil(rows.length / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
}

/* ---------- Formatters ---------- */
const nf0 = new Intl.NumberFormat('en-US');
const nf2 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const nfK = (n) => {
  if (n == null || isNaN(n)) return '-';
  if (n >= 1e12) return `${nf2.format(n/1e12)}T`;
  if (n >= 1e9)  return `${nf2.format(n/1e9)}B`;
  if (n >= 1e6)  return `${nf2.format(n/1e6)}M`;
  if (n >= 1e3)  return `${nf2.format(n/1e3)}K`;
  return nf2.format(n);
};
const pct = (v) => (v==null || isNaN(v)) ? '-' : `${v>=0?'+':''}${nf2.format(v)}%`;

/* ---------- Render: Table ---------- */
function renderTable() {
  const tbody = $('#cryptoTbody');
  const table = $('#cryptoTable');
  if (!tbody || !table) return;

  tbody.innerHTML = '';

  // slicing by page
  const start = (state.page - 1) * state.pageSize;
  const slice = state.filtered.slice(start, start + state.pageSize);

  if (!slice.length) {
    // kalau kosong, tetap bersihkan dan render pager + note
    renderPagerAndNote(table);
    return;
  }

  slice.forEach(coin => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    if (coin.symbol === 'XAN') tr.classList.add('highlight-xan');

    // star / watchlist cell
    const tdStar = document.createElement('td');
    const b = document.createElement('button');
    b.className = `star ${state.watchlist.has(coin.symbol) ? 'active' : ''}`;
    b.textContent = '★';
    b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (state.watchlist.has(coin.symbol)) state.watchlist.delete(coin.symbol);
      else state.watchlist.add(coin.symbol);
      localStorage.setItem('watchlist', JSON.stringify([...state.watchlist]));
      applyFilters();
      renderAll();
    });
    tdStar.appendChild(b);

    // symbol
    const tdSym = document.createElement('td');
    tdSym.textContent = coin.symbol;

    // name (+ logo)
    const tdName = document.createElement('td');
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '8px';

    const logoSrc = COIN_LOGO[coin.symbol] || '';
    if (logoSrc) {
      const img = document.createElement('img');
      img.src = logoSrc;
      img.alt = `${coin.symbol} logo`;
      img.className = 'coin-logo';
      wrap.appendChild(img);
    }
    const sp = document.createElement('span');
    sp.textContent = coin.name || '';
    wrap.appendChild(sp);
    tdName.appendChild(wrap);

    // price
    const tdPrice = document.createElement('td');
    tdPrice.className = 'num';
    tdPrice.textContent = `$${nfK(coin.price)}`;

    // 24h
    const td24 = document.createElement('td');
    td24.className = 'num pctClass';
    td24.textContent = pct(coin.change24h);

    // mcap
    const tdMc = document.createElement('td');
    tdMc.className = 'num';
    tdMc.textContent = nfK(coin.marketCap);

    // fdv
    const tdFdv = document.createElement('td');
    tdFdv.className = 'num';
    tdFdv.textContent = nfK(coin.fdv);

    // vol24h
    const tdVol = document.createElement('td');
    tdVol.className = 'num';
    tdVol.textContent = nfK(coin.volume24h);

    // sector (teks pendek supaya gak tabrakan)
    const tdSector = document.createElement('td');
    tdSector.className = 'ellipsis';
    tdSector.textContent = coin.sector || '-';
    tdSector.title = coin.sector || '';

    // roi 1m
    const tdR1m = document.createElement('td');
    tdR1m.className = 'num pctClass';
    tdR1m.textContent = pct(coin.roi1m);

    // roi 1y
    const tdR1y = document.createElement('td');
    tdR1y.className = 'num pctClass';
    tdR1y.textContent = pct(coin.roi1y);

    // tags
    const tdTags = document.createElement('td');
    const tags = Array.isArray(coin.tags) ? coin.tags : [];
    tdTags.className = 'ellipsis';
    tdTags.textContent = tags.join(', ') || '-';
    tdTags.title = tags.join(', ') || '';

    // append
    tr.append(tdStar, tdSym, tdName, tdPrice, td24, tdMc, tdFdv, tdVol, tdSector, tdR1m, tdR1y, tdTags);

    // click row → (kalau ada detail handler kamu)
    tr.addEventListener('click', () => {
      // openAssetDetail(coin)  // kalau kamu sudah punya
    });

    tbody.appendChild(tr);
  });

  // setelah tbody diisi → render pager + note (note DI BAWAH pager)
  renderPagerAndNote(table);
}

/* ---------- Render: Pager + Note (note di bawah pager) ---------- */
function renderPagerAndNote(tableEl) {
  // container yang menampung table → taruh pager & note di sesudahnya
  const holder = tableEl.parentElement;

  // ----- pager -----
  let pager = $('#cryptoPager', holder);
  if (!pager) {
    pager = document.createElement('div');
    pager.id = 'cryptoPager';
    pager.className = 'pager';
    holder.appendChild(pager);
  }
  pager.innerHTML = '';

  // tombol pager
  const totalRows = state.filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / state.pageSize));

  const mkBtn = (label, disabled, onClick) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.disabled = !!disabled;
    b.addEventListener('click', onClick);
    return b;
  };

  pager.appendChild( mkBtn('« First', state.page===1, ()=>{ state.page=1; renderAll(); }) );
  pager.appendChild( mkBtn('‹ Prev',  state.page===1, ()=>{ state.page=Math.max(1, state.page-1); renderAll(); }) );
  const info = document.createElement('span');
  info.textContent = ` ${Math.min(totalRows, (state.page-1)*state.pageSize+1)}–${Math.min(totalRows, state.page*state.pageSize)} of ${totalRows} `;
  info.style.margin = '0 6px';
  pager.appendChild(info);
  pager.appendChild( mkBtn('Next ›',  state.page===totalPages, ()=>{ state.page=Math.min(totalPages, state.page+1); renderAll(); }) );
  pager.appendChild( mkBtn('Last »',  state.page===totalPages, ()=>{ state.page=totalPages; renderAll(); }) );

  // page size select
  const sel = document.createElement('select');
  [10,20,50].forEach(n=>{
    const opt=document.createElement('option');
    opt.value=n; opt.textContent=n;
    if (n===state.pageSize) opt.selected=true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', ()=>{
    state.pageSize = +sel.value;
    state.page = 1;
    renderAll();
  });
  sel.style.marginLeft='8px';
  pager.appendChild(sel);

  // ----- note (DIBAWAH pager) -----
  let note = $('#demoNote', holder);
  if (!note) {
    note = document.createElement('div');
    note.id = 'demoNote';
    note.className = 'note-text';
    holder.appendChild(note);
  }
  note.textContent = 'note: demo only, data is simulated for the Anoma intents dashboard.';
}

/* ---------- Render: Topbar Controls (search, watchlist, sort dll) ---------- */
function bindTopbar() {
  const search = $('#globalSearch');
  if (search) {
    search.addEventListener('input', (e)=>{
      state.search = e.target.value;
      state.page = 1;
      applyFilters();
      renderAll();
    });
  }

  const chk = $('#watchOnly');
  if (chk) {
    chk.addEventListener('change', ()=>{
      state.watchlistOnly = chk.checked;
      state.page = 1;
      applyFilters();
      renderAll();
    });
  }

  const sortSel = $('#sortSelect');
  if (sortSel) {
    sortSel.addEventListener('change', ()=>{
      // value contoh: "marketCap:desc"
      const [k,dir] = sortSel.value.split(':');
      state.sortKey = k || 'marketCap';
      state.sortDir = dir || 'desc';
      state.page = 1;
      applyFilters();
      renderAll();
    });
  }

  // tombol Top Gainers / Top Losers bila ada
  const btnG = $('#btnTopGainers');
  const btnL = $('#btnTopLosers');
  if (btnG) btnG.addEventListener('click', ()=>{
    state.search=''; if (search) search.value='';
    state.sortKey='change24h'; state.sortDir='desc'; state.page=1;
    applyFilters(); renderAll();
  });
  if (btnL) btnL.addEventListener('click', ()=>{
    state.search=''; if (search) search.value='';
    state.sortKey='change24h'; state.sortDir='asc'; state.page=1;
    applyFilters(); renderAll();
  });
}

/* ---------- Theme (opsional) ---------- */
function bindThemeToggle() {
  const btn = $('#themeToggle');
  if (!btn) return;
  const root = document.documentElement;
  const apply = (mode) => {
    root.classList.toggle('light', mode==='light');
    localStorage.setItem('themeMode', mode);
    btn.textContent = 'Theme';
  };
  let saved = localStorage.getItem('themeMode') || 'dark';
  apply(saved);
  btn.addEventListener('click', ()=>{
    saved = (saved==='dark') ? 'light' : 'dark';
    apply(saved);
  });
}

/* ---------- Render All ---------- */
function renderAll() {
  renderTable();
}

/* ---------- INIT ---------- */
window.addEventListener('DOMContentLoaded', async ()=>{
  bindTopbar();
  bindThemeToggle();
  await loadData();
});
