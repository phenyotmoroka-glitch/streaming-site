
const params = new URLSearchParams(window.location.search);
let activeType = params.get('type') || '';
let activeQuery = params.get('q') || '';
let currentPage = 1;
let isLoading = false;
let hasMore = true;

const grid = document.getElementById('browseGrid');
const loadMoreBtn = document.getElementById('browseLoadMore');
const searchInput = document.getElementById('browseSearch');
const titleEl = document.getElementById('browseTitle');
const tabs = document.querySelectorAll('.browse-tab');

if (activeQuery) searchInput.value = activeQuery;
setActiveTab(activeType);
updateTitle();

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    activeType = tab.dataset.type;
    activeQuery = searchInput.value.trim();
    currentPage = 1;
    hasMore = true;
    grid.innerHTML = '';
    setActiveTab(activeType);
    updateTitle();
    loadBrowse(true);
  });
});

let searchTimer = null;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    activeQuery = searchInput.value.trim();
    currentPage = 1;
    hasMore = true;
    grid.innerHTML = '';
    updateTitle();
    loadBrowse(true);
  }, 500);
});

loadMoreBtn.addEventListener('click', () => {
  if (!isLoading && hasMore) loadBrowse(false);
});

function setActiveTab(type) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.type === type));
}

function updateTitle() {
  if (activeQuery) {
    titleEl.textContent = activeType === 'tv'
      ? `Series: "${activeQuery}"`
      : activeType === 'movie'
      ? `Films: "${activeQuery}"`
      : `Results: "${activeQuery}"`;
  } else {
    titleEl.textContent = activeType === 'tv'
      ? 'Series'
      : activeType === 'movie'
      ? 'Films'
      : 'Browse';
  }
}

function buildUrl() {
  let url = 'https://api.jikan.moe/v4/';
  if (activeQuery) {
    url += `anime?q=${encodeURIComponent(activeQuery)}&limit=24&page=${currentPage}&order_by=popularity&sort=asc`;
    if (activeType) url += `&type=${activeType}`;
  } else {
    url += `top/anime?limit=24&page=${currentPage}`;
    if (activeType) url += `&type=${activeType}`;
  }
  return url;
}

function showSkeletons() {
  grid.innerHTML = Array(24).fill(`
    <div class="browse-skeleton">
      <div class="browse-skeleton-img"></div>
      <div class="browse-skeleton-text"></div>
      <div class="browse-skeleton-text short"></div>
    </div>`).join('');
}

async function loadBrowse(fresh) {
  if (isLoading) return;
  isLoading = true;
  loadMoreBtn.disabled = true;
  if (fresh) showSkeletons();
  try {
    const res = await fetch(buildUrl());
    const json = await res.json();
    const data = json.data || [];
    if (fresh) grid.innerHTML = '';
    if (data.length === 0 && fresh) {
      grid.innerHTML = '<div class="browse-empty">No results found.</div>';
      loadMoreBtn.style.display = 'none';
      isLoading = false;
      return;
    }
    data.forEach(a => {
      const card = document.createElement('a');
      card.className = 'browse-card';
      card.href = `${BASE}/src/html/watch.html?id=${a.mal_id}`;
      card.innerHTML = `
        <img src="${a.images?.jpg?.large_image_url || a.images?.jpg?.image_url}" alt="${a.title}" loading="lazy" />
        <div class="browse-card-title">${a.title}</div>
        <div class="browse-card-type">${a.type || ''}</div>`;
      grid.appendChild(card);
    });
    hasMore = json.pagination?.has_next_page || false;
    loadMoreBtn.style.display = hasMore ? 'block' : 'none';
    currentPage++;
  } catch (err) {
    console.error(err);
    if (fresh) grid.innerHTML = '<div class="browse-empty">Failed to load. Please try again.</div>';
  }
  isLoading = false;
  loadMoreBtn.disabled = false;
}

loadBrowse(true);