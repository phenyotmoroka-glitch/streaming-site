/* ─────────────────── BASE PATH ─────────────────── */
const BASE = window.location.pathname.includes('/streaming-site')
  ? '/streaming-site'
  : '';

/* ─────────────────── SEARCH ICON ─────────────────── */
document.querySelector('.icons svg').addEventListener('click', () => {
  window.location.href = `${BASE}/src/search.html`;
});

/* ─────────────────── HOMEPAGE ─────────────────── */
if (document.getElementById('heroCarousel')) {

  const track = document.getElementById('heroTrack');
  const dots = document.getElementById('heroDots');
  const slides = track.querySelectorAll('.hero-slide');
  const total = slides.length;
  let current = 0;
  let autoTimer = null;
  let paused = false;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => { goTo(i); pause(); });
    dots.appendChild(dot);
  });

  function updateDots() {
    dots.querySelectorAll('.hero-dot').forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });
  }

  function goTo(index) {
    current = (index + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    updateDots();
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function startAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => {
      if (!paused) next();
    }, 5000);
  }

  function pause() {
    paused = true;
    clearInterval(autoTimer);
  }

  document.getElementById('heroCarousel').addEventListener('click', e => {
    if (e.target.closest('.hero-play-btn')) return;
    if (e.target.closest('.hero-dot')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    if (ratio < 0.25) { prev(); pause(); }
    else if (ratio > 0.75) { next(); pause(); }
  });

  let touchStartX = 0;
  const hero = document.getElementById('heroCarousel');

  hero.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  hero.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
      pause();
    }
  }, { passive: true });

  startAuto();

  const seeMoreSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;

  const carouselConfigs = [
    { title: 'Top Airing', url: 'https://api.jikan.moe/v4/top/anime?filter=airing&limit=10', seeMore: null },
    { title: 'Series', url: 'https://api.jikan.moe/v4/top/anime?type=tv&limit=10', seeMore: `${BASE}/src/browse.html?type=tv` },
    { title: 'Films', url: 'https://api.jikan.moe/v4/top/anime?type=movie&limit=10', seeMore: `${BASE}/src/browse.html?type=movie` },
    { title: 'Shonen', url: 'https://api.jikan.moe/v4/anime?genres=27&order_by=popularity&sort=asc&limit=10', seeMore: null },
    { title: 'Seinen', url: 'https://api.jikan.moe/v4/anime?genres=42&order_by=popularity&sort=asc&limit=10', seeMore: null },
    { title: 'Recommended', url: 'https://api.jikan.moe/v4/top/anime?order_by=score&sort=desc&limit=25', seeMore: null, random: true }
  ];

  function skeletonCarousel() {
    return Array(10).fill(`
      <div class="carousel-skeleton-card">
        <div class="carousel-skeleton-img"></div>
        <div class="carousel-skeleton-text"></div>
        <div class="carousel-skeleton-text short"></div>
      </div>`).join('');
  }

  function renderCarouselBlock(config, data) {
    const section = document.getElementById(`carousel-${config.title.replace(/\s/g, '-')}`);
    if (!section) return;
    const trackEl = section.querySelector('.carousel-track');
    trackEl.innerHTML = data.map(a => `
      <a class="carousel-card" href="${BASE}/src/watch.html?id=${a.mal_id}">
        <img src="${a.images?.jpg?.large_image_url || a.images?.jpg?.image_url}" alt="${a.title}" loading="lazy" />
        <div class="carousel-card-title">${a.title}</div>
        <div class="carousel-card-type">${a.type || ''}</div>
      </a>`).join('');
  }

  function buildCarouselShells() {
    const section = document.getElementById('carouselsSection');
    carouselConfigs.forEach(config => {
      const id = `carousel-${config.title.replace(/\s/g, '-')}`;
      section.innerHTML += `
        <div class="carousel-block" id="${id}">
          <div class="carousel-header">
            <span class="carousel-title">${config.title}</span>
            ${config.seeMore ? `<a class="carousel-see-more" href="${config.seeMore}">See more ${seeMoreSvg}</a>` : ''}
          </div>
          <div class="carousel-track">${skeletonCarousel()}</div>
        </div>`;
    });
  }

  async function fetchWithRetry(url, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url);
        const json = await res.json();
        if (json.data) return json;
      } catch (err) {}
      await new Promise(r => setTimeout(r, delay));
    }
    return null;
  }

  async function loadCarousels() {
    buildCarouselShells();
    for (const config of carouselConfigs) {
      await new Promise(r => setTimeout(r, 400));
      const json = await fetchWithRetry(config.url);
      if (!json) { console.error(`Failed to load ${config.title}`); continue; }
      let data = json.data || [];
      if (config.random) data = data.sort(() => Math.random() - 0.5).slice(0, 10);
      renderCarouselBlock(config, data);
    }
  }

  loadCarousels();
}

/* ─────────────────── BROWSE ─────────────────── */
if (document.getElementById('browseGrid')) {

  const browseParams = new URLSearchParams(window.location.search);
  let activeType = browseParams.get('type') || '';
  let activeQuery = browseParams.get('q') || '';
  let currentPage = 1;
  let isLoading = false;
  let hasMore = true;

  const grid = document.getElementById('browseGrid');
  const loadMoreBtn = document.getElementById('browseLoadMore');
  const browseSearch = document.getElementById('browseSearch');
  const titleEl = document.getElementById('browseTitle');
  const tabs = document.querySelectorAll('.browse-tab');

  if (activeQuery) browseSearch.value = activeQuery;
  setActiveTab(activeType);
  updateTitle();

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      activeType = tab.dataset.type;
      activeQuery = browseSearch.value.trim();
      currentPage = 1;
      hasMore = true;
      grid.innerHTML = '';
      setActiveTab(activeType);
      updateTitle();
      loadBrowse(true);
    });
  });

  let browseTimer = null;
  browseSearch.addEventListener('input', () => {
    clearTimeout(browseTimer);
    browseTimer = setTimeout(() => {
      activeQuery = browseSearch.value.trim();
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
      titleEl.textContent = activeType === 'tv' ? 'Series'
        : activeType === 'movie' ? 'Films' : 'Browse';
    }
  }

  function buildUrl() {
    let url = 'https://api.jikan.moe/v4/';
    if (activeQuery) {
      url += `anime?q=${encodeURIComponent(activeQuery)}&limit=24&page=${currentPage}&order_by=popularity&sort=asc`;
      if (activeType) url += `&type=${activeType}`;
    } else if (activeType) {
      url += `top/anime?limit=24&page=${currentPage}&type=${activeType}`;
    } else {
      url += `top/anime?limit=24&page=${currentPage}`;
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
        card.href = `${BASE}/src/watch.html?id=${a.mal_id}`;
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
}







/* ─────────────────── SEARCH ─────────────────── */
if (document.getElementById('searchResults')) {

  const searchResults = document.getElementById('searchResults');
  let searchTimer = null;

  const initialQuery = new URLSearchParams(window.location.search).get('q');
  if (initialQuery && document.getElementById('searchInput')) {
    runSearch(initialQuery);
  }

  if (document.getElementById('searchInput')) {
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    const searchParams = new URLSearchParams(window.location.search);
    const query = searchParams.get('q');

    if (query) {
      searchInput.value = query;
      searchClear.classList.add('visible');
    }

    searchInput.addEventListener('input', () => {
      const val = searchInput.value.trim();
      clearTimeout(searchTimer);
      searchClear.classList.toggle('visible', val.length > 0);
      const url = new URL(window.location);
      val ? url.searchParams.set('q', val) : url.searchParams.delete('q');
      window.history.replaceState({}, '', url);
      if (val.length < 2) { showEmpty(); return; }
      showSkeleton();
      searchTimer = setTimeout(() => runSearch(val), 500);
    });

    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.classList.remove('visible');
      const url = new URL(window.location);
      url.searchParams.delete('q');
      window.history.replaceState({}, '', url);
      showEmpty();
      searchInput.focus();
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
        <div class="top-results-grid">${Array(5).fill(skeletonCard(200, 300)).join('')}</div>
      </div>
      <div class="search-section">
        <div class="search-section-header">
          <div class="skeleton" style="width:80px;height:16px;border-radius:4px;"></div>
        </div>
        <div class="search-carousel">${Array(10).fill(skeletonCard(150, 225)).join('')}</div>
      </div>
      <div class="search-section">
        <div class="search-section-header">
          <div class="skeleton" style="width:80px;height:16px;border-radius:4px;"></div>
        </div>
        <div class="search-carousel">${Array(10).fill(skeletonCard(150, 225)).join('')}</div>
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
        searchResults.innerHTML = `<div class="search-empty"><span style="color:var(--text-muted)">No results found for "<strong style="color:var(--text)">${q}</strong>"</span></div>`;
        return;
      }

      const seeMoreSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;

      searchResults.innerHTML = `
        ${topData.length > 0 ? `
          <div class="search-section">
            <div class="search-section-header">
              <span class="search-section-title">Top Results</span>
            </div>
            <div class="top-results-grid">
              ${topData.map(a => `
                <a class="top-result-card" href="${BASE}/src/watch.html?id=${a.mal_id}">
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
              <a class="search-see-more" href="${BASE}/src/html/browse.html?type=tv&q=${encodeURIComponent(q)}">See more ${seeMoreSvg}</a>
            </div>
            <div class="search-carousel">
              ${seriesData.map(a => `
                <a class="search-carousel-card" href="${BASE}/src/watch.html?id=${a.mal_id}">
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
              <a class="search-see-more" href="${BASE}/src/html/browse.html?type=movie&q=${encodeURIComponent(q)}">See more ${seeMoreSvg}</a>
            </div>
            <div class="search-carousel">
              ${filmsData.map(a => `
                <a class="search-carousel-card" href="${BASE}/src/watch.html?id=${a.mal_id}">
                  <img src="${a.images?.jpg?.large_image_url || a.images?.jpg?.image_url}" alt="${a.title}" />
                  <div class="card-title">${a.title}</div>
                  <div class="card-type">${a.type || ''}</div>
                </a>`).join('')}
            </div>
          </div>` : ''}`;
    } catch (err) {
      console.error(err);
      searchResults.innerHTML = `<div class="search-empty"><span style="color:var(--text-muted)">Search failed. Please try again.</span></div>`;
    }
  }
}








/* ─────────────────── WATCH ─────────────────── */
if (document.getElementById('watchContainer')) {

  const loadingMessages = [
    "Still better than Microslop updates...",
    "We're just testing your patience...",
    "Locating the Internet...",
    
    "Loading screens are paid actors...",
    "خلاص، يلا...",
    "Bribing the servers...",
    "Asking Zoro for directions...",
    "This is taking longer than One Piece's runtime...",
  ];

  const randomMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
  const watchParams = new URLSearchParams(window.location.search);
  const animeId = watchParams.get('id');
  const container = document.getElementById('watchContainer');

  container.innerHTML = `<div class="watch-loading">${randomMessage}</div>`;

  if (!animeId) {
    container.innerHTML = '<div class="watch-loading">No anime ID provided.</div>';
  } else {
    loadWatch(animeId);
  }

  async function loadWatch(id) {
    try {
      const fullRes = await fetch(`https://api.jikan.moe/v4/anime/${id}/full`);
      const full = await fullRes.json();
      await new Promise(r => setTimeout(r, 400));
      const charsRes = await fetch(`https://api.jikan.moe/v4/anime/${id}/characters`);
      const chars = await charsRes.json();
      await new Promise(r => setTimeout(r, 400));
      const recRes = await fetch(`https://api.jikan.moe/v4/anime/${id}/recommendations`);
      const recs = await recRes.json();
      const anime = full.data;
      await new Promise(r => setTimeout(r, 400));
      const themesRes = await fetch(
        `https://api.animethemes.moe/search?q=${encodeURIComponent(anime.title)}&fields[search]=anime&include[anime]=animethemes.animethemeentries.videos`
      );
      const themes = await themesRes.json();
      let openingVideoUrl = null;
      try {
        const animeEntry = themes.search?.anime?.[0];
        const op = animeEntry?.animethemes?.find(t => t.type === 'OP');
        const video = op?.animethemeentries?.[0]?.videos?.[0];
        if (video?.link) openingVideoUrl = video.link;
      } catch { openingVideoUrl = null; }
      const characters = chars.data || [];
      const recommendations = recs.data || [];
      document.title = `${anime.title} — Streamly`;
      renderWatch(anime, characters, recommendations, openingVideoUrl);
    } catch (err) {
      console.error(err);
      container.innerHTML = '<div class="watch-loading">Failed to load. Please try again.</div>';
    }
  }

  function renderWatch(anime, characters, recommendations, openingVideoUrl) {
    const image = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;
    const jaTitle = anime.title_japanese || '';
    const genres = anime.genres || [];
    const score = anime.score || 'N/A';
    const status = anime.status || 'N/A';
    const type = anime.type || 'N/A';
    const episodes = anime.episodes || 'N/A';
    const duration = anime.duration || 'N/A';
    const studio = anime.studios?.[0]?.name || 'N/A';
    const season = anime.season ? `${capitalize(anime.season)} ${anime.year}` : (anime.year || 'N/A');
    const rating = anime.rating || 'N/A';
    const synopsis = anime.synopsis || 'No synopsis available.';
    const mainChars = characters.filter(c => c.role === 'Main').slice(0, 10);

    container.innerHTML = `
      <div class="player-wrap" id="playerWrap">
        <img class="player-still" id="playerStill" src="${image}" alt="${anime.title}" />
        ${openingVideoUrl ? `
          <div class="player-play-btn" id="playBtn">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <video class="player-iframe" id="playerVideo" src="${openingVideoUrl}" controls preload="none"></video>
        ` : `<div class="no-trailer">No opening available</div>`}
      </div>
      <div class="watch-info">
        <div class="watch-poster"><img src="${image}" alt="${anime.title}" /></div>
        <div class="watch-details">
          <div class="watch-title">${anime.title}</div>
          ${jaTitle ? `<div class="watch-title-jp">${jaTitle}</div>` : ''}
          <div class="watch-score">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            ${score}
          </div>
          <div class="watch-genres">${genres.map(g => `<span class="genre-tag">${g.name}</span>`).join('')}</div>
          <div class="watch-meta-grid">
            <div class="meta-item">Status: <span>${status}</span></div>
            <div class="meta-item">Type: <span>${type}</span></div>
            <div class="meta-item">Episodes: <span>${episodes}</span></div>
            <div class="meta-item">Duration: <span>${duration}</span></div>
            <div class="meta-item">Studio: <span>${studio}</span></div>
            <div class="meta-item">Season: <span>${season}</span></div>
            <div class="meta-item">Rating: <span>${rating}</span></div>
          </div>
        </div>
      </div>
      <div class="watch-section-title">Synopsis</div>
      <div class="watch-synopsis">${synopsis}</div>
      <div class="watch-section-title">Characters & Voice Actors</div>
      <div class="characters-grid">
        ${mainChars.map(c => {
          const jaVA = c.voice_actors?.find(v => v.language === 'Japanese');
          return `
            <div class="char-card">
              <div class="char-left">
                <img src="${c.character.images?.jpg?.image_url || ''}" alt="${c.character.name}" />
                <div>
                  <div class="char-name">${c.character.name}</div>
                  <div class="char-role">${c.role}</div>
                </div>
              </div>
              ${jaVA ? `
                <div class="char-right">
                  <img src="${jaVA.person.images?.jpg?.image_url || ''}" alt="${jaVA.person.name}" />
                  <div class="char-va">
                    <div class="char-va-name">${jaVA.person.name}</div>
                    <div class="char-va-lang">Japanese</div>
                  </div>
                </div>` : ''}
            </div>`;
        }).join('')}
      </div>
      <div class="watch-section-title">Recommended</div>
      <div class="rec-carousel-wrap">
        <div class="rec-carousel" id="recCarousel">
          ${recommendations.slice(0, 16).map(r => {
            const a = r.entry;
            return `
              <a class="rec-card" href="${BASE}/src/watch.html?id=${a.mal_id}">
                <img src="${a.images?.jpg?.large_image_url || a.images?.jpg?.image_url}" alt="${a.title}" />
                <div class="rec-card-title">${a.title}</div>
              </a>`;
          }).join('')}
        </div>
      </div>`;

    if (openingVideoUrl) {
      document.getElementById('playBtn').addEventListener('click', () => {
        document.getElementById('playerStill').style.display = 'none';
        document.getElementById('playBtn').style.display = 'none';
        const video = document.getElementById('playerVideo');
        video.style.display = 'block';
        video.play();
      });
    }
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}