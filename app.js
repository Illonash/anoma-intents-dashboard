/* Anoma Intents Dashboard – app.js (final) */

/* -------------------------
   DOM hooks
------------------------- */
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];

const cryptoTable = $("#cryptoTable");
const cryptoHead = $("#cryptoThead");
const cryptoBody = $("#cryptoTbody");
const cryptoEmpty = $("#cryptoEmpty");

const searchBox = $("#searchBox");
const sortSelect = $("#sortSelect");
const filterWatchlist = $("#filterWatchlist");
const btnTopGainers = $("#btnTopGainers");
const btnTopLosers = $("#btnTopLosers");

const pager = {
  root: $("#pager"),
  info: $("#pageInfo"),
  first: $("#btnFirst"),
  prev: $("#btnPrev"),
  next: $("#btnNext"),
  last: $("#btnLast"),
  size: $("#pageSize"),
};

/* -------------------------
   State
------------------------- */
let allAssets = [];     // full dataset
let viewAssets = [];    // filtered+sorted
let page = 1;
let pageSize = 10;
const watchlist = new Set(JSON.parse(localStorage.getItem("watchlist") || "[]"));

/* -------------------------
   Helpers
------------------------- */

// logo mapping (pakai nama file yang sudah kamu upload di /assets)
const logoMap = {
  BTC: "assets/logo-btc.png",
  ETH: "assets/logo-eth.png",
  BNB: "assets/logo-bnb.png",
  XAN: "assets/logo-xan.png",
};

const fmt = {
  num(n) {
    if (n == null || isNaN(n)) return "-";
    if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + "T";
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + "K";
    return String(Math.round(n));
  },
  usd(n) {
    if (n == null || isNaN(n)) return "-";
    if (n >= 1000) return "$" + this.num(n);
    return "$" + n.toLocaleString();
  },
  pct(n) {
    if (n == null || isNaN(n)) return "-";
    const sign = n > 0 ? "+" : "";
    return sign + n.toFixed(2) + "%";
  },
};

function persistWatchlist() {
  localStorage.setItem("watchlist", JSON.stringify([...watchlist]));
}

function applyFilters() {
  const q = (searchBox.value || "").trim().toLowerCase();

  viewAssets = allAssets.filter(a => {
    if (filterWatchlist.checked && !watchlist.has(a.symbol)) return false;
    if (!q) return true;
    // cari di symbol, name, sector, tags
    const hay = `${a.symbol} ${a.name} ${a.sector} ${(a.tags || []).join(" ")}`.toLowerCase();
    return hay.includes(q);
  });

  // top gainers/losers quick filter (optional; only when button toggled)
  if (btnTopGainers?.dataset.active === "1") {
    viewAssets = [...viewAssets].sort((a, b) => (b.change24h ?? -Infinity) - (a.change24h ?? -Infinity)).slice(0, 10);
  }
  if (btnTopLosers?.dataset.active === "1") {
    viewAssets = [...viewAssets].sort((a, b) => (a.change24h ?? Infinity) - (b.change24h ?? Infinity)).slice(0, 10);
  }

  // sorting
  const key = sortSelect.value;
  const desc = key.endsWith("(desc)");
  const sortKey = key.replace(" (desc)", "").replace(" (asc)", "");

  const getter = (a) => {
    switch (sortKey) {
      case "Market Cap": return a.marketCap;
      case "Price": return a.price;
      case "24h": return a.change24h;
      case "FDV": return a.fdv;
      case "Vol 24h": return a.volume24h;
      case "ROI 1M": return a.roi1m;
      case "ROI 1Y": return a.roi1y;
      default: return a.marketCap;
    }
  };

  viewAssets.sort((a, b) => {
    const av = getter(a) ?? -Infinity;
    const bv = getter(b) ?? -Infinity;
    return desc ? (bv - av) : (av - bv);
  });

  // reset halaman jika perlu
  page = 1;
}

function getSlice() {
  const start = (page - 1) * pageSize;
  return viewAssets.slice(start, start + pageSize);
}

/* -------------------------
   Render
------------------------- */
function renderEmpty(msg = "No results found.") {
  cryptoBody.innerHTML = "";
  cryptoEmpty.textContent = msg;
  cryptoEmpty.removeAttribute("hidden");
  pager.info.textContent = "0 of 0";
}

function renderPager() {
  const totalPages = Math.max(1, Math.ceil(viewAssets.length / pageSize));
  page = Math.min(page, totalPages);

  pager.info.textContent = `${(viewAssets.length ? ( (page-1)*pageSize + 1 ) : 0)}–${Math.min(page*pageSize, viewAssets.length)} of ${viewAssets.length}`;
  pager.first.disabled = page <= 1;
  pager.prev.disabled  = page <= 1;
  pager.next.disabled  = page >= totalPages;
  pager.last.disabled  = page >= totalPages;
}

function renderCrypto() {
  const slice = getSlice();

  if (!slice.length) {
    renderEmpty(viewAssets.length ? "No items on this page." : "No results found.");
    return;
  }
  cryptoEmpty.setAttribute("hidden", "");

  cryptoBody.innerHTML = "";
  slice.forEach(a => {
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";

    // star (watchlist)
    const tdStar = document.createElement("td");
    const star = document.createElement("button");
    star.className = "star" + (watchlist.has(a.symbol) ? " active" : "");
    star.type = "button";
    star.title = "Watchlist";
    star.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (watchlist.has(a.symbol)) watchlist.delete(a.symbol); else watchlist.add(a.symbol);
      persistWatchlist();
      renderCrypto();
    });
    tdStar.appendChild(star);

    // symbol
    const tdSymbol = document.createElement("td");
    tdSymbol.textContent = a.symbol;

    // name + logo
    const tdName = document.createElement("td");
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.gap = "8px";

    if (logoMap[a.symbol]) {
      const img = document.createElement("img");
      img.src = logoMap[a.symbol];
      img.alt = a.symbol;
      img.className = "token-logo";
      wrap.appendChild(img);
    }
    const nm = document.createElement("span");
    nm.textContent = a.name;
    wrap.appendChild(nm);
    tdName.appendChild(wrap);

    // numeric cols
    const tdPrice = document.createElement("td");
    tdPrice.className = "num";
    tdPrice.textContent = fmt.usd(a.price);

    const tdCh24 = document.createElement("td");
    tdCh24.className = "num" + (a.change24h > 0 ? " up" : a.change24h < 0 ? " down" : "");
    tdCh24.textContent = fmt.pct(a.change24h);

    const tdMcap = document.createElement("td");
    tdMcap.className = "num";
    tdMcap.textContent = fmt.num(a.marketCap);

    const tdFdv = document.createElement("td");
    tdFdv.className = "num";
    tdFdv.textContent = fmt.num(a.fdv);

    const tdVol = document.createElement("td");
    tdVol.className = "num";
    tdVol.textContent = fmt.num(a.volume24h);

    // sector
    const tdSector = document.createElement("td");
    tdSector.textContent = a.sector || "-";
    tdSector.title = a.sector || "";

    // ROI
    const tdR1m = document.createElement("td");
    tdR1m.className = "num " + (a.roi1m > 0 ? "up" : a.roi1m < 0 ? "down" : "");
    tdR1m.textContent = a.roi1m != null ? fmt.pct(a.roi1m) : "-";

    const tdR1y = document.createElement("td");
    tdR1y.className = "num " + (a.roi1y > 0 ? "up" : a.roi1y < 0 ? "down" : "");
    tdR1y.textContent = a.roi1y != null ? fmt.pct(a.roi1y) : "-";

    // tags
    const tdTags = document.createElement("td");
    const t = (a.tags || []).join(", ");
    tdTags.textContent = t || "-";
    tdTags.title = t;

    tr.append(tdStar, tdSymbol, tdName, tdPrice, tdCh24, tdMcap, tdFdv, tdVol, tdSector, tdR1m, tdR1y, tdTags);

    // (optional) detail click
    tr.addEventListener("click", () => {
      // openAssetDetail(a) — kalau kamu sudah punya handler detail
      // untuk demo, biarkan kosong.
    });

    cryptoBody.appendChild(tr);
  });

  renderPager();
}

/* -------------------------
   Events
------------------------- */
searchBox?.addEventListener("input", () => { applyFilters(); renderCrypto(); });
sortSelect?.addEventListener("change", () => { applyFilters(); renderCrypto(); });
filterWatchlist?.addEventListener("change", () => { applyFilters(); renderCrypto(); });

pager.size?.addEventListener("change", () => {
  pageSize = Number(pager.size.value || 10);
  page = 1;
  renderCrypto();
});
pager.first?.addEventListener("click", () => { page = 1; renderCrypto(); });
pager.prev ?.addEventListener("click", () => { page = Math.max(1, page - 1); renderCrypto(); });
pager.next ?.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(viewAssets.length / pageSize));
  page = Math.min(totalPages, page + 1);
  renderCrypto();
});
pager.last ?.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(viewAssets.length / pageSize));
  page = totalPages; renderCrypto();
});

btnTopGainers?.addEventListener("click", () => {
  btnTopGainers.dataset.active = btnTopGainers.dataset.active === "1" ? "0" : "1";
  btnTopLosers.dataset.active = "0";
  applyFilters(); renderCrypto();
});
btnTopLosers?.addEventListener("click", () => {
  btnTopLosers.dataset.active = btnTopLosers.dataset.active === "1" ? "0" : "1";
  btnTopGainers.dataset.active = "0";
  applyFilters(); renderCrypto();
});

/* -------------------------
   Boot
------------------------- */
async function loadData() {
  // path data dummy (sudah kamu pakai sebelumnya)
  const url = "assets/data/assets.json";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Cannot load assets.json");
  const rows = await res.json();

  // normalisasi minimal field yang dipakai
  allAssets = rows.map(r => ({
    symbol: r.symbol,
    name: r.name,
    price: r.price,
    change24h: r.change24h,
    marketCap: r.marketCap,
    fdv: r.fdv,
    volume24h: r.volume24h,
    sector: r.sector,
    roi1m: r.roi1m,
    roi1y: r.roi1y,
    tags: r.tags || [],
  }));

  applyFilters();
  renderCrypto();
}

loadData().catch(err => {
  console.error(err);
  renderEmpty("Demo Error: assets/data/assets.json not found (cek path atau nama file).");
});
