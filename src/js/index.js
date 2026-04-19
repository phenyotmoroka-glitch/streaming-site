/* ─────────────────── HERO CAROUSEL ─────────────────── */
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
  }, 10000);
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

/* ─────────────────── JIKAN CAROUSELS ─────────────────── */
const seeMoreSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;

const carouselConfigs = [
  {
    title: 'Top Airing',
    url: 'https://api.jikan.moe/v4/top/anime?filter=airing&limit=10',
    seeMore: null
  },
  {
    title: 'Series',
    url: 'https://api.jikan.moe/v4/top/anime?type=tv&limit=10',
    seeMore: `${BASE}/src/html/series.html`
  },
  {
    title: 'Films',
    url: 'https://api.jikan.moe/v4/top/anime?type=movie&limit=10',
    seeMore: `${BASE}/src/html/films.html`
  },
  {
    title: 'Shonen',
    url: 'https://api.jikan.moe/v4/anime?genres=27&order_by=popularity&sort=asc&limit=10',
    seeMore: null
  },
 
 
  {
    title: 'Seinen',
    url: 'https://api.jikan.moe/v4/anime?genres=42&order_by=popularity&sort=asc&limit=10',
    seeMore: null
  },
 
  {
    title: 'Recommended',
    url: 'https://api.jikan.moe/v4/top/anime?order_by=score&sort=desc&limit=25',
    seeMore: null,
    random: true
  }
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
    <a class="carousel-card" href="${BASE}/src/html/watch.html?id=${a.mal_id}">
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
    } catch (err) {
      // failed, will retry
    }
    await new Promise(r => setTimeout(r, delay));
  }
  return null;
}

async function loadCarousels() {
  buildCarouselShells();
  for (const config of carouselConfigs) {
    await new Promise(r => setTimeout(r, 400));
    const json = await fetchWithRetry(config.url);
    if (!json) {
      console.error(`Failed to load ${config.title} after retries`);
      continue;
    }
    let data = json.data || [];
    if (config.random) {
      data = data.sort(() => Math.random() - 0.5).slice(0, 10);
    }
    renderCarouselBlock(config, data);
  }
}

loadCarousels();