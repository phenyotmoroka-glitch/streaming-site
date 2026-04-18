const params = new URLSearchParams(window.location.search);
const animeId = params.get('id');
const container = document.getElementById('watchContainer');

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
    } catch {
      openingVideoUrl = null;
    }

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

  const mainChars = characters
    .filter(c => c.role === 'Main')
    .slice(0, 10);

  container.innerHTML = `
    <!-- PLAYER -->
    <div class="player-wrap" id="playerWrap">
      <img class="player-still" id="playerStill" src="${image}" alt="${anime.title}" />
      ${openingVideoUrl ? `
        <div class="player-play-btn" id="playBtn">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
        <video class="player-iframe" id="playerVideo"
          src="${openingVideoUrl}"
          controls
          preload="none">
        </video>
      ` : `<div class="no-trailer">No opening available</div>`}
    </div>

    <!-- INFO -->
    <div class="watch-info">
      <div class="watch-poster">
        <img src="${image}" alt="${anime.title}" />
      </div>
      <div class="watch-details">
        <div class="watch-title">${anime.title}</div>
        ${jaTitle ? `<div class="watch-title-jp">${jaTitle}</div>` : ''}
        <div class="watch-score">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          ${score}
        </div>
        <div class="watch-genres">
          ${genres.map(g => `<span class="genre-tag">${g.name}</span>`).join('')}
        </div>
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

    <!-- SYNOPSIS -->
    <div class="watch-section-title">Synopsis</div>
    <div class="watch-synopsis">${synopsis}</div>

    <!-- CHARACTERS -->
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
              </div>
            ` : ''}
          </div>`;
      }).join('')}
    </div>

    <!-- RECOMMENDED -->
    <div class="watch-section-title">Recommended</div>
    <div class="rec-carousel-wrap">
      <div class="rec-carousel" id="recCarousel">
        ${recommendations.slice(0, 16).map(r => {
          const a = r.entry;
          return `
            <a class="rec-card" href="/src/html/watch.html?id=${a.mal_id}">
              <img src="${a.images?.jpg?.large_image_url || a.images?.jpg?.image_url}" alt="${a.title}" />
              <div class="rec-card-title">${a.title}</div>
            </a>`;
        }).join('')}
      </div>
    </div>
  `;

  if (openingVideoUrl) {
    const playBtn = document.getElementById('playBtn');
    const still = document.getElementById('playerStill');
    const video = document.getElementById('playerVideo');

    playBtn.addEventListener('click', () => {
      still.style.display = 'none';
      playBtn.style.display = 'none';
      video.style.display = 'block';
      video.play();
    });
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}