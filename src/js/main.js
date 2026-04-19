/* ─────────────────── BASE PATH ─────────────────── */
const BASE = window.location.hostname === 'localhost' ||
             window.location.hostname === '127.0.0.1'
             ? ''
             : '/streaming-site';

/* ─────────────────── PROFILE DROPDOWN ─────────────────── */
const profileIcon = document.getElementById('profileIcon');
profileIcon.addEventListener('click', e => {
  e.stopPropagation();
  profileIcon.classList.toggle('open');
});
document.addEventListener('click', () => {
  profileIcon.classList.remove('open');
});

/* ─────────────────── BROWSE DROPDOWN ─────────────────── */
const browseItem = document.getElementById('browseItem');
browseItem.addEventListener('click', e => {
  e.stopPropagation();
  browseItem.classList.toggle('open');
});
document.addEventListener('click', () => {
  browseItem.classList.remove('open');
});

/* ─────────────────── SEARCH ICON ─────────────────── */
document.querySelector('.icons svg').addEventListener('click', () => {
  window.location.href = `${BASE}/src/html/search.html`;
});

/* ─────────────────── SEARCH FUNCTIONALITY ─────────────────── */
if (document.getElementById('searchInput')) {
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  const params = new URLSearchParams(window.location.search);
  const query = params.get('q');
  if (query) {
    searchInput.value = query;
    searchClear.classList.add('visible');
  }
  searchInput.addEventListener('input', () => {
    const val = searchInput.value.trim();
    searchClear.classList.toggle('visible', val.length > 0);
    const url = new URL(window.location);
    val ? url.searchParams.set('q', val) : url.searchParams.delete('q');
    window.history.replaceState({}, '', url);
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.remove('visible');
    const url = new URL(window.location);
    url.searchParams.delete('q');
    window.history.replaceState({}, '', url);
    searchInput.focus();
  });
}