/* =========================
   Anoma Intents Dashboard - app.js (FINAL)
   ========================= */

/* ---------- Helpers ---------- */
const $  = (sel, root=document) => root.querySelector(sel);

/* ---------- Data & State ---------- */
const PATH_ASSETS_JSON = 'assets/data/assets.json';

const FALLBACK_COINS = [
  { symbol:'BTC', name:'Bitcoin',  price:65000, change24h:-0.8,  marketCap:1.28e12, fdv:1.28e12, volume24h:3.5e10, sector:'Store of Value', roi1m:5.3, roi1y:40.1, tags:['DeFi'] },
  { symbol:'ETH', name:'Ethereum', price:3200,  change24h:2.10,  marketCap:3.8e11,  fdv:3.8e11,  volume24h:1.8e10, sector:'Smart Contract', roi1m:6.7, roi1y:55.0, tags:['DeFi','AI'] },
  { symbol:'BNB', name:'BNB',      price:590,   change24h:-1.20, marketCap:9.1e10,  fdv:9.1e10,  volume24h:1.2e10, sector:'Exchange Token', roi1m:2.8, roi1y:25.7, tags:['DeFi'] },
  { symbol:'XAN', name:'Anoma',    price:1.25,  change24h:3.20,  marketCap:1.5e9,   fdv:2.5e9,   volume24h:5.6e8,  sector:'Modular',       roi1m:12.5,roi1y:85.3, tags:['Anoma','ZK','Modular'] }
];

const COIN_LOGO = {
  BTC: 'assets/logo-btc.png',
  ETH: 'assets/logo-eth.png',
  BNB: 'assets/logo-bnb.png',
  XAN: 'assets/logo-xan.png'
};

const state = {
  coins: [],
  filtered: [],
  pageSize: 10,
  page: 1,
  sortKey: 'marketCap',
  sortDir: 'desc',
  search: ''
};

/* ---------- Fetch ---------- */
async function fetchJSON(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch { return null; }
}

async function loadData() {
  const data = await fetchJSON(PATH_ASSETS_JSON);
  state.coins = Array.isArray(data) && data.length ? data : FALLBACK_COINS;
  applyFilters();
  renderAll();
}

/* ---------- Filter & Sort ---------- */
function applyFilters() {
  let rows = [...state.coins];

  if (state.search.trim()) {
    const q = state.search.toLowerCase();
    rows = rows.filter(c =>
      c.symbol.toLowerCase().includes(q) ||
      (c.name||'').toLowerCase().includes(q) ||
      (Array.isArray(c.tags) && c.tags.join(' ').toLowerCase().includes(q))
    );
  }

  const dir = state.sortDir === 'asc' ? 1 : -1;
  rows.sort((a,b)=>{
    const av=a[state.sortKey]??0, bv=b[state.sortKey]??0;
    if (typeof av==='string') return av.localeCompare(bv)*dir;
    return (av-bv)*dir;
  });

  state.filtered = rows;
  const totalPages = Math.max(1, Math.ceil(rows.length/state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
}

/* ---------- Render Table ---------- */
function renderTable() {
  const tbody = $('#cryptoTbody');
  const table = $('#cryptoTable');
  tbody.innerHTML = '';

  const start = (state.page-1)*state.pageSize;
  const slice = state.filtered.slice(start, start+state.pageSize);

  slice.forEach(coin=>{
    const tr = document.createElement('tr');

    // symbol
    const tdSym = document.createElement('td');
    tdSym.textContent = coin.symbol;

    // name + logo
    const tdName = document.createElement('td');
    const wrap = document.createElement('div');
    wrap.style.display='flex'; wrap.style.alignItems='center'; wrap.style.gap='8px';

    if (COIN_LOGO[coin.symbol]) {
      const img = document.createElement('img');
      img.src = COIN_LOGO[coin.symbol];
      img.alt = coin.symbol;
      img.className = 'coin-logo';
      wrap.appendChild(img);
    }
    const sp = document.createElement('span');
    sp.textContent = coin.name;
    wrap.appendChild(sp);
    tdName.appendChild(wrap);

    // price
    const tdPrice = document.createElement('td');
    tdPrice.className='num';
    tdPrice.textContent = `$${coin.price}`;

    tr.append(tdSym, tdName, tdPrice);
    tbody.appendChild(tr);
  });

  renderPagerAndNote(table);
}

/* ---------- Pager + Note ---------- */
function renderPagerAndNote(tableEl) {
  const holder = tableEl.parentElement;

  let pager = $('#cryptoPager', holder);
  if (!pager) {
    pager = document.createElement('div');
    pager.id='cryptoPager';
    pager.className='pager';
    holder.appendChild(pager);
  }
  pager.innerHTML='';

  const total = state.filtered.length;
  const totalPages = Math.max(1, Math.ceil(total/state.pageSize));

  const info = document.createElement('span');
  info.textContent = `${(state.page-1)*state.pageSize+1}-${Math.min(state.page*state.pageSize,total)} of ${total}`;
  pager.appendChild(info);

  // note di bawah pager
  let note = $('#demoNote', holder);
  if (!note) {
    note = document.createElement('div');
    note.id='demoNote';
    note.className='note-text';
    holder.appendChild(note);
  }
  note.textContent = 'note: demo only, data is simulated for the Anoma intents dashboard.';
}

/* ---------- Render All ---------- */
function renderAll(){ renderTable(); }

/* ---------- Init ---------- */
window.addEventListener('DOMContentLoaded', async ()=>{
  const search = $('#globalSearch');
  if (search) search.addEventListener('input', e=>{
    state.search = e.target.value;
    state.page=1; applyFilters(); renderAll();
  });

  await loadData();
});
