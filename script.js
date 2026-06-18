/* =========================================================
   YOPFLIX — script.js
   - Lit les médias depuis films.js, series.js et animes.js
   - Récupère les métadonnées via l'API TheMovieDB
   - Gère la navigation, la recherche, le lecteur vidéo
   ========================================================= */

// ---------- CONFIG API TMDB ----------
const TMDB_API_KEY = '3fd2be6f0c70a2a598f084ddfb75487c';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const LANG = 'fr-FR';

// ---------- LIBELLÉS SECTIONS ----------
const SECTION_LABELS = {
    'a-ne-pas-manquer': 'A ne pas manquer',
    'tendances':        'Tendances actuelles',
    'mieux-notes':      'Les mieux notés',
    'nouveautes':       'Nouveautés',
};

const CATEGORY_LABELS = {
    'film':  'Films',
    'serie': 'Séries',
    'anime': 'Animés',
};

// ---------- STATE ----------
let MEDIAS = []; 

// ---------- DOM ----------
const $main = document.getElementById('mainContent');
const $searchBar = document.getElementById('searchBar');
const $searchToggle = document.getElementById('searchToggle');
const $searchClose = document.getElementById('searchClose');
const $searchInput = document.getElementById('searchInput');
const $navLinks = document.querySelectorAll('.nav-link');

// =========================================================
// 1) CHARGEMENT DES MÉDIAS DEPUIS LES FICHIERS JS
// =========================================================
function loadMediasFromJS() {
    let list = [];
    let idCounter = 0;

    if (typeof FILMS_DATA !== 'undefined') {
        FILMS_DATA.forEach(item => {
            list.push({ id: idCounter++, category: 'film', ...item, poster: null, rating: null, releaseYear: null, overview: '', runtime: null, seasons: null, tmdbType: null, loaded: false });
        });
    }
    if (typeof SERIES_DATA !== 'undefined') {
        SERIES_DATA.forEach(item => {
            list.push({ id: idCounter++, category: 'serie', ...item, poster: null, rating: null, releaseYear: null, overview: '', runtime: null, seasons: null, tmdbType: null, loaded: false });
        });
    }
    if (typeof ANIMES_DATA !== 'undefined') {
        ANIMES_DATA.forEach(item => {
            list.push({ id: idCounter++, category: 'anime', ...item, poster: null, rating: null, releaseYear: null, overview: '', runtime: null, seasons: null, tmdbType: null, loaded: false });
        });
    }
    return list;
}

// =========================================================
// 2) APPEL TMDB
// =========================================================
async function fetchTMDB(media) {
    const isMovie = media.category === 'film';
    const endpoint = isMovie ? 'search/movie' : 'search/tv';
    const yearParam = media.year
        ? (isMovie ? `&year=${media.year}` : `&first_air_date_year=${media.year}`)
        : '';

    try {
        const url = `${TMDB_BASE}/${endpoint}?api_key=${TMDB_API_KEY}&language=${LANG}&query=${encodeURIComponent(media.title)}${yearParam}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('TMDB search failed');
        const data = await res.json();
        const hit = (data.results || [])[0];
        if (!hit) return;

        media.poster      = hit.poster_path ? `${TMDB_IMG}${hit.poster_path}` : null;
        media.rating      = hit.vote_average ? Number(hit.vote_average).toFixed(1) : null;
        media.releaseYear = (hit.release_date || hit.first_air_date || '').slice(0, 4) || media.year;
        media.overview    = hit.overview || '';
        media.tmdbId      = hit.id;
        media.tmdbType    = isMovie ? 'movie' : 'tv';
        media.backdrop    = hit.backdrop_path ? `https://image.tmdb.org/t/p/w1280${hit.backdrop_path}` : null;

        try {
            const detailUrl = `${TMDB_BASE}/${media.tmdbType}/${media.tmdbId}?api_key=${TMDB_API_KEY}&language=${LANG}`;
            const detailRes = await fetch(detailUrl);
            if (detailRes.ok) {
                const detail = await detailRes.json();
                if (isMovie) {
                    media.runtime = detail.runtime || null;
                } else {
                    media.seasons = detail.number_of_seasons || null;
                }
            }
        } catch (_) {}

    } catch (err) {
        console.warn(`[TMDB] Échec pour "${media.title}"`, err);
    } finally {
        media.loaded = true;
    }
}

async function loadAllTMDB() {
    await Promise.all(MEDIAS.map(fetchTMDB));
}

// =========================================================
// 3) FORMATAGE DES DONNÉES
// =========================================================
function formatRuntime(min) {
    if (!min) return null;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`;
}

function formatDuration(media) {
    if (media.category === 'film') return formatRuntime(media.runtime) || '—';
    if (media.seasons) return `${media.seasons} S.`;
    return '—';
}

function categoryBadge(cat) {
    if (cat === 'film')  return 'FILM';
    if (cat === 'serie') return 'SÉRIE';
    if (cat === 'anime') return 'ANIMÉ';
    return cat.toUpperCase();
}

// =========================================================
// 4) RENDU HTML
// =========================================================
function cardHTML(media) {
    const poster = media.poster
        ? `<img src="${media.poster}" alt="${escapeHTML(media.title)}" loading="lazy" />`
        : `<div class="card-poster-placeholder"><i class="fa-solid fa-film"></i></div>`;
    const rating = media.rating || '—';
    const year   = media.releaseYear || media.year || '—';
    const dur    = formatDuration(media);

    return `
      <div class="card" data-id="${media.id}" data-testid="card-${media.id}">
        <div class="card-poster">
          ${poster}
          <span class="badge-category">${categoryBadge(media.category)}</span>
        </div>
        <div class="card-info">
          <h3 class="card-title">${escapeHTML(media.title)}</h3>
          <div class="card-meta">
            <span><i class="fa-solid fa-star"></i> ${rating}</span>
            <span><i class="fa-regular fa-calendar"></i> ${year}</span>
            <span><i class="fa-regular fa-clock"></i> ${dur}</span>
          </div>
        </div>
      </div>
    `;
}

function rowHTML(title, items) {
    if (!items.length) return '';
    return `
      <section class="row" data-testid="row-${slug(title)}">
        <div class="row-header">
          <h2 class="row-title">${escapeHTML(title)}</h2>
          <span class="row-count"># ${items.length} titre${items.length > 1 ? 's' : ''}</span>
        </div>
        <div class="row-grid">
          ${items.map(cardHTML).join('')}
        </div>
      </section>
    `;
}

// =========================================================
// 5) VUES
// =========================================================
function renderHome(filter = 'all') {
    let list = MEDIAS;
    if (filter !== 'all') list = MEDIAS.filter(m => m.category === filter);

    if (!list.length) {
        $main.innerHTML = `
          <div class="empty-state" data-testid="empty-state">
            <i class="fa-solid fa-clapperboard"></i>
            <h3>Aucun média</h3>
            <p>Ajoute des titres dans tes fichiers films.js, series.js ou animes.js pour commencer.</p>
          </div>`;
        return;
    }

    let html = '';
    const sections = Object.keys(SECTION_LABELS);
    sections.forEach(sec => {
        const items = list.filter(m => m.section === sec);
        if (items.length) html += rowHTML(SECTION_LABELS[sec], items);
    });

    if (filter !== 'all') {
        const all = list;
        html = rowHTML(`Tous les ${CATEGORY_LABELS[filter] || ''}`, all) + html;
    }

    $main.innerHTML = html || `<div class="empty-state" data-testid="empty-state"><i class="fa-solid fa-clapperboard"></i><h3>Aucun média dans cette catégorie</h3></div>`;

    attachCardClicks();
}

function renderSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) { renderHome(activeFilter()); return; }

    const results = MEDIAS.filter(m =>
        m.title.toLowerCase().includes(q) ||
        (m.overview || '').toLowerCase().includes(q)
    );

    if (!results.length) {
        $main.innerHTML = `
          <div class="empty-state" data-testid="search-empty">
            <i class="fa-solid fa-magnifying-glass"></i>
            <h3>Aucun résultat pour "${escapeHTML(query)}"</h3>
            <p>Essaie un autre titre.</p>
          </div>`;
        return;
    }

    $main.innerHTML = rowHTML(`Résultats pour "${query}"`, results);
    attachCardClicks();
}

function renderPlayer(media) {
    const poster = media.poster
        ? `<img src="${media.poster}" alt="${escapeHTML(media.title)}" />`
        : `<div class="card-poster-placeholder"><i class="fa-solid fa-film"></i></div>`;
    const rating = media.rating || '—';
    const year   = media.releaseYear || media.year || '—';
    const dur    = formatDuration(media);
    const overview = media.overview || 'Aucun résumé disponible pour ce titre.';

    const similar = MEDIAS
        .filter(m => m.category === media.category && m.id !== media.id)
        .slice(0, 6);

    $main.innerHTML = `
      <div class="player-page" data-testid="player-page">
        <button class="btn-back" id="btnBack" data-testid="btn-back">
          <i class="fa-solid fa-arrow-left"></i> Retour
        </button>

        <div class="player-hero">
          <div class="player-hero-poster">${poster}</div>
          <div class="player-hero-info">
            <h1>${escapeHTML(media.title)}</h1>
            <div class="player-hero-meta">
              <span><i class="fa-solid fa-star"></i> ${rating}</span>
              <span><i class="fa-regular fa-calendar"></i> ${year}</span>
              <span><i class="fa-regular fa-clock"></i> ${dur}</span>
              <span><i class="fa-solid fa-tag"></i> ${categoryBadge(media.category)}</span>
            </div>
            <p class="player-hero-overview">${escapeHTML(overview)}</p>
          </div>
        </div>

        <h2 class="section-title">Lecteur</h2>
        <div class="player-frame" data-testid="player-frame">
          <iframe
            src="${escapeAttr(media.embed)}"
            allowfullscreen
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerpolicy="no-referrer"
            sandbox="allow-same-origin allow-scripts allow-presentation allow-forms"
            data-testid="player-iframe"
          ></iframe>
        </div>

        <div style="background: rgba(229, 9, 20, 0.1); border-left: 4px solid #e50914; padding: 16px; margin: 20px 0; border-radius: 4px; color: #ffffff; font-size: 14px; line-height: 1.5;">
             Cependant, des pubs invisibles restent présentes sur le lecteur — plusieurs clics seront nécessaires pour les fermer avant que la vidéo ne se lance. Pour une expérience sans aucune pub, utilisez un bloqueur de publicités (uBlock Origin, AdBlock, etc.).
        </div>

        ${similar.length ? `
          <h2 class="section-title">Titres similaires</h2>
          <div class="row-grid" data-testid="similar-grid">
            ${similar.map(cardHTML).join('')}
          </div>` : ''
        }
      </div>
    `;

    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.getElementById('btnBack').addEventListener('click', () => {
        history.pushState({}, '', '#');
        renderHome(activeFilter());
    });

    attachCardClicks();
}

// =========================================================
// 6) HANDLERS
// =========================================================
function attachCardClicks() {
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', () => {
            const id = Number(card.dataset.id);
            const media = MEDIAS.find(m => m.id === id);
            if (media) {
                history.pushState({ view: 'player', id }, '', `#play=${id}`);
                renderPlayer(media);
            }
        });
    });
}

function activeFilter() {
    const active = document.querySelector('.nav-link.active');
    return active ? active.dataset.filter : 'all';
}

function setupNav() {
    $navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const filter = link.dataset.filter;
            $navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            if (filter === 'reseaux') {
                $main.innerHTML = `
                  <div class="empty-state" data-testid="empty-reseaux">
                    <i class="fa-solid fa-share-nodes"></i>
                    <h3>Réseaux</h3>
                    <p>Section bientôt disponible.</p>
                  </div>`;
                return;
            }
            renderHome(filter);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

function setupSearch() {
    $searchToggle.addEventListener('click', () => {
        $searchBar.classList.add('active');
        setTimeout(() => $searchInput.focus(), 50);
    });
    $searchClose.addEventListener('click', () => {
        $searchBar.classList.remove('active');
        $searchInput.value = '';
        renderHome(activeFilter());
    });
    let timer;
    $searchInput.addEventListener('input', (e) => {
        clearTimeout(timer);
        timer = setTimeout(() => renderSearch(e.target.value), 200);
    });
    $searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') $searchClose.click();
    });
}

function setupHeaderScroll() {
    const header = document.getElementById('mainHeader');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) header.style.background = 'rgba(10,10,10,0.95)';
        else header.style.background = 'rgba(10,10,10,0.85)';
    });
}

// =========================================================
// 7) UTILS
// =========================================================
function escapeHTML(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
}
function escapeAttr(str) {
    return String(str || '').replace(/"/g, '&quot;');
}
function slug(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-');
}

// =========================================================
// 8) BOOT
// =========================================================
async function boot() {
    MEDIAS = loadMediasFromJS();

    $main.innerHTML = `
      <div class="loading" data-testid="loading">
        <div class="spinner"></div>
        <p>Chargement des médias depuis TheMovieDB...</p>
      </div>`;

    setupNav();
    setupSearch();
    setupHeaderScroll();

    await loadAllTMDB();

    const hash = window.location.hash;
    const m = hash.match(/^#play=(\d+)$/);
    if (m) {
        const media = MEDIAS.find(x => x.id === Number(m[1]));
        if (media) { renderPlayer(media); return; }
    }
    renderHome(activeFilter());
}

window.addEventListener('popstate', () => {
    const hash = window.location.hash;
    const m = hash.match(/^#play=(\d+)$/);
    if (m) {
        const media = MEDIAS.find(x => x.id === Number(m[1]));
        if (media) { renderPlayer(media); return; }
    }
    renderHome(activeFilter());
});

document.addEventListener('DOMContentLoaded', boot);