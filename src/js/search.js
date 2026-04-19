const searchResults = document.getElementById('searchResults');
let searchTimer = null;

// Run search on page load if ?q= param exists
const initialQuery = new URLSearchParams(window.location.search).get('q');
if (initialQuery && document.getElementById('searchInput')) {
  runSearch(initialQuery);
}

// Listen for input
if (document.getElementById('searchInput')) {
  document.getElementById('searchInput').addEventListener('input', () => {
    const val = document.getElementById('searchInput').value.trim();
    clearTimeout(searchTimer);
    if (val.length < 2) {
      showEmpty();
      return;
    }
    showSkeleton();
    searchTimer = setTimeout(() => runSearch(val), 500);
  });
}

function showEmpty() {
  searchResults.innerHTML = `
    <div class="search-empty">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>
      <span>Start typing to search anime</span>
    </div>`;
}

function showSkeleton() {
  const skeletonCard = (width, height) => `
    <div class="skeleton-card" style="flex-shrink:0;width:${width}px;">
      <div class="skeleton-poster skeleton" style="width:${width}px;height:${height}px;"></div>
      <div class="skeleton-text skeleton"></div>
      <div class="skeleton-text skeleton short"></div>
    </div>`;

  searchResults.innerHTML = `
    <div class="search-section">
      <div class="search-section-header">
        <div class="skeleton" style="width:120px;height:18px;border-radius:4px;"></div>
      </div>
      <div class="top-results-grid">
        ${Array(5).fill(skeletonCard(200, 300)).join('')}
      </div>
    </div>
    <div class="search-section">
      <div class="search-section-header">
        <div class="skeleton" style="width:80px;height:16px;border-radius:4px;"></div>
      </div>
      <div class="search-carousel">
        ${Array(10).fill(skeletonCard(150, 225)).join('')}
      </div>
    </div>
    <div class="search-section">
      <div class="search-section-header">
        <div class="skeleton" style="width:80px;height:16px;border-radius:4px;"></div>
      </div>
      <div class="search-carousel">
        ${Array(10).fill(skeletonCard(150, 225)).join('')}
      </div>
    </div>`;
}

async function runSearch(q) {
  try {
    const [topRes, seriesRes, filmsRes] = await Promise.all([
      fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=5&order_by=popularity&sort=asc`),
      fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=10&type=tv&order_by=popularity&sort=asc`),
      fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=10&type=movie&order_by=popularity&sort=asc`)
    ]);

    const top = await topRes.json();
    const series = await seriesRes.json();
    const films = await filmsRes.json();

    const topData = top.data || [];
    const seriesData = series.data || [];
    const filmsData = films.data || [];

    if (topData.length === 0 && seriesData.length === 0 && filmsData.length === 0) {
      searchResults.innerHTML = `
        <div class="search-empty">
          <span style="color:var(--text-muted)">No results found for "<strong style="color:var(--text)">${q}</strong>"</span>
        </div>`;
      return;
    }

    const seeMoreSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;

    searchResults.innerHTML = `
      ${topData.length > 0 ? `
        <div class="search-section">
          <div class="search-section-header">
            <span class="search-section-title">Top Results</span>
          </div>
          <div class="top-results-grid">
            ${topData.map(a => `
              <a class="top-result-card" href="${BASE}/src/html/watch.html?id=${a.mal_id}">
                <img src="${a.images?.jpg?.large_image_url || a.images?.jpg?.image_url}" alt="${a.title}" />
                <div class="card-title">${a.title}</div>
                <div class="card-type">${a.type || ''}</div>
              </a>`).join('')}
          </div>
        </div>` : ''}

      ${seriesData.length > 0 ? `
        <div class="search-section">
          <div class="search-section-header">
            <span class="search-section-title">Series</span>
            <a class="search-see-more" href="${BASE}/src/html/series.html?q=${encodeURIComponent(q)}">See more ${seeMoreSvg}</a>
          </div>
          <div class="search-carousel">
            ${seriesData.map(a => `
              <a class="search-carousel-card" href="${BASE}/src/html/watch.html?id=${a.mal_id}">
                <img src="${a.images?.jpg?.large_image_url || a.images?.jpg?.image_url}" alt="${a.title}" />
                <div class="card-title">${a.title}</div>
                <div class="card-type">${a.type || ''}</div>
              </a>`).join('')}
          </div>
        </div>` : ''}

      ${filmsData.length > 0 ? `
        <div class="search-section">
          <div class="search-section-header">
            <span class="search-section-title">Films</span>
            <a class="search-see-more" href="${BASE}/src/html/films.html?q=${encodeURIComponent(q)}">See more ${seeMoreSvg}</a>
          </div>
          <div class="search-carousel">
            ${filmsData.map(a => `
              <a class="search-carousel-card" href="${BASE}/src/html/watch.html?id=${a.mal_id}">
                <img src="${a.images?.jpg?.large_image_url || a.images?.jpg?.image_url}" alt="${a.title}" />
                <div class="card-title">${a.title}</div>
                <div class="card-type">${a.type || ''}</div>
              </a>`).join('')}
          </div>
        </div>` : ''}
    `;
  } catch (err) {
    console.error(err);
    searchResults.innerHTML = `<div class="search-empty"><span style="color:var(--text-muted)">Search failed. Please try again.</span></div>`;
  }
}