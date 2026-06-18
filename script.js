/* =========================================================
   MonoFly — script.js
   ========================================================= */

const TMDB_API_KEY = '3fd2be6f0c70a2a598f084ddfb75487c';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const LANG = 'fr-FR';

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

let MEDIAS = []; 

const $main = document.getElementById('mainContent');
const $searchBar = document.getElementById('searchBar');
const $searchToggle = document.getElementById('searchToggle');
const $searchClose = document.getElementById('searchClose');
const $searchInput = document.getElementById('searchInput');
const $navLinks = document.querySelectorAll('.nav-link');

// =========================================================
// POPUP DE BIENVENUE STYLÉ (LIENS ET CHOIX D'AFFICHAGE)
// =========================================================
function showWelcomePopup() {
    // Si l'utilisateur a choisi de ne plus l'afficher, on stoppe direct
    if (localStorage.getItem('hideAdblockPopup') === 'true') {
        return;
    }

    const popupOverlay = document.createElement('div');
    popupOverlay.style.position = 'fixed';
    popupOverlay.style.top = '0';
    popupOverlay.style.left = '0';
    popupOverlay.style.width = '100%';
    popupOverlay.style.height = '100%';
    popupOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    popupOverlay.style.display = 'flex';
    popupOverlay.style.justifyContent = 'center';
    popupOverlay.style.alignItems = 'center';
    popupOverlay.style.zIndex = '99999';
    popupOverlay.style.backdropFilter = 'blur(8px)';
    popupOverlay.style.padding = '20px';

    popupOverlay.innerHTML = `
        <div style="background: linear-gradient(135deg, #1e1e1e 0%, #141414 100%); border: 2px solid #e50914; border-radius: 16px; padding: 35px; max-width: 500px; width: 100%; text-align: center; box-shadow: 0 10px 30px rgba(229, 9, 20, 0.3); font-family: 'Inter', sans-serif; color: #fff;">
            <div style="background: rgba(229, 9, 20, 0.1); width: 70px; height: 70px; border-radius: 50%; display: flex; justify-content: center; align-items: center; margin: 0 auto 20px;">
                <i class="fa-solid fa-shield-halved" style="color: #e50914; font-size: 32px;"></i>
            </div>
            <h2 style="font-family: 'Bebas Neue', sans-serif; font-size: 36px; letter-spacing: 1px; margin-bottom: 10px; color: #fff;">Attention aux publicités !</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #cccccc; margin-bottom: 25px;">
                Le lecteur externe contient des pubs. Pour regarder vos vidéos tranquillement, cliquez sur l'un de ces bloqueurs gratuits pour l'installer :
            </p>
            
            <div style="text-align: left; margin-bottom: 30px; display: flex; flex-direction: column; gap: 12px;">
                <a href="https://ublockorigin.com/" target="_blank" style="color: #fff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid transparent; transition: all 0.2s;"><span><i class="fa-solid fa-download" style="color: #e50914; margin-right: 10px;"></i> uBlock Origin</span> <span style="font-size: 11px; color: #2ecc71; background: rgba(46,204,113,0.1); padding: 2px 8px; border-radius: 4px;">Top Recommandé</span></a>
                <a href="https://adguard.com/" target="_blank" style="color: #fff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; display: flex; align-items: center; transition: all 0.2s;"><i class="fa-solid fa-download" style="color: #e50914; margin-right: 10px;"></i> AdGuard</a>
                <a href="https://brave.com/" target="_blank" style="color: #fff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; display: flex; align-items: center; transition: all 0.2s;"><i class="fa-solid fa-download" style="color: #e50914; margin-right: 10px;"></i> Brave Browser (Navigateur anti-pub)</a>
                <a href="https://adblockplus.org/" target="_blank" style="color: #fff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; display: flex; align-items: center; transition: all 0.2s;"><i class="fa-solid fa-download" style="color: #e50914; margin-right: 10px;"></i> Adblock Plus</a>
                <a href="https://www.ghostery.com/" target="_blank" style="color: #fff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; display: flex; align-items: center; transition: all 0.2s;"><i class="fa-solid fa-download" style="color: #e50914; margin-right: 10px;"></i> Ghostery</a>
            </div>

            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="btnNextTime" style="background-color: transparent; color: #aaa; border: 1px solid #444; padding: 12px 20px; font-size: 14px; font-weight: 600; border-radius: 30px; cursor: pointer; flex: 1; transition: all 0.2s;">Voir la prochaine fois</button>
                <button id="btnClosePopup" style="background-color: #e50914; color: #fff; border: none; padding: 12px 20px; font-size: 14px; font-weight: 700; border-radius: 30px; cursor: pointer; flex: 1; transition: all 0.2s; text-transform: uppercase;">Ne plus afficher</button>
            </div>
        </div>
    `;

    document.body.appendChild(popupOverlay);

    // Effet hover sur les liens de téléchargement
    popupOverlay.querySelectorAll('a').forEach(link => {
        link.onmouseover = () => { link.style.background = 'rgba(255,255,255,0.1)'; link.style.borderColor = '#e50914'; };
        link.onmouseout = () => { link.style.background = 'rgba(255,255,255,0.05)'; link.style.borderColor = 'transparent'; };
    });

    const btnClose = document.getElementById('btnClosePopup');
    const btnNext = document.getElementById('btnNextTime');

    btnClose.onmouseover = () => btnClose.style.backgroundColor = '#b80710';
    btnClose.onmouseout = () => btnClose.style.backgroundColor = '#e50914';
    btnNext.onmouseover = () => { btnNext.style.color = '#fff'; btnNext.style.borderColor = '#aaa'; };
    btnNext.onmouseout = () => { btnNext.style.color = '#aaa'; btnNext.style.borderColor = '#444'; };

    // Fonction pour fermer proprement avec animation
    const fadeOut = () => {
        popupOverlay.style.opacity = '0';
        popupOverlay.style.transition = 'opacity 0.3s ease';
        setTimeout(() => popupOverlay.remove(), 300);
    };

    // BOUTON "Ne plus afficher" -> On enregistre dans la mémoire et on ferme
    btnClose.addEventListener('click', () => {
        localStorage.setItem('hideAdblockPopup', 'true');
        fadeOut();
    });

    // BOUTON "Voir la prochaine fois" -> On ferme juste pour cette session
    btnNext.addEventListener('click', () => {
        fadeOut();
    });
}

// =========================================================
// LOGIQUE FLUX DE DONNÉES
// =========================================================
function readMediasFromJS() {
    let combined = [];

    if (typeof FILMS_DATA !== 'undefined' && Array.isArray(FILMS_DATA)) {
        FILMS_DATA.forEach(item => combined.push({ ...item, category: 'film' }));
    }
    if (typeof SERIES_DATA !== 'undefined' && Array.isArray(SERIES_DATA)) {
        SERIES_DATA.forEach(item => combined.push({ ...item, category: 'serie' }));
    }
    if (typeof ANIMES_DATA !== 'undefined' && Array.isArray(ANIMES_DATA)) {
        ANIMES_DATA.forEach(item => combined.push({ ...item, category: 'anime' }));
    }

    return combined.map((item, idx) => ({
        id: idx,
        title:    item.title || '',
        embed:    item.embed || '',
        category: item.category,
        section:  item.section || 'a-ne-pas-manquer',
        year:     item.year || null,
        poster: null, rating: null, releaseYear: null,
        overview: '', runtime: null, seasons: null, tmdbType: null,
        loaded: false,
    }));
}

async function fetchTMDB(media) {
    const isMovie = media.category === 'film';
    const endpoint = isMovie ? 'search/movie' : 'search/tv';
    const yearParam = media.year ? (isMovie ? `&year=${media.year}` : `&first_air_date_year=${media.year}`) : '';

    try {
        const url = `${TMDB_BASE}/${endpoint}?api_key=${TMDB_API_KEY}&language=${LANG}&query=${encodeURIComponent(media.title)}${yearParam}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('TMDB error');
        const data = await res.json();
        const hit = (data.results || [])[0];
        if (!hit) return;

        media.poster      = hit.poster_path ? `${TMDB_IMG}${hit.poster_path}` : null;
        media.rating      = hit.vote_average ? Number(hit.vote_average).toFixed(1) : null;
        media.releaseYear = (hit.release_date || hit.first_air_date || '').slice(0, 4) || media.year;
        media.overview    = hit.overview || '';
        media.tmdbId      = hit.id;
        media.tmdbType    = isMovie ? 'movie' : 'tv';

        try {
            const detailUrl = `${TMDB_BASE}/${media.tmdbType}/${media.tmdbId}?api_key=${TMDB_API_KEY}&language=${LANG}`;
            const detailRes = await fetch(detailUrl);
            if (detailRes.ok) {
                const detail = await detailRes.json();
                if (isMovie) media.runtime = detail.runtime || null;
                else media.seasons = detail.number_of_seasons || null;
            }
        } catch (_) {}
    } catch (err) {
        console.warn(err);
    } finally {
        media.loaded = true;
    }
}

async function loadAllTMDB() {
    await Promise.all(MEDIAS.map(fetchTMDB));
}

function formatDuration(media) {
    if (media.category === 'film') {
        if (!media.runtime) return '—';
        const h = Math.floor(media.runtime / 60);
        const m = media.runtime % 60;
        return h ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`;
    }
    return media.seasons ? `${media.seasons} S.` : '—';
}

function categoryBadge(cat) {
    return cat === 'film' ? 'FILM' : cat === 'serie' ? 'SÉRIE' : 'ANIMÉ';
}

function cardHTML(media) {
    const poster = media.poster ? `<img src="${media.poster}" alt="${escapeHTML(media.title)}" loading="lazy" />` : `<div class="card-poster-placeholder"><i class="fa-solid fa-film"></i></div>`;
    return `
      <div class="card" data-id="${media.id}">
        <div class="card-poster">
          ${poster}
          <span class="badge-category">${categoryBadge(media.category)}</span>
        </div>
        <div class="card-info">
          <h3 class="card-title">${escapeHTML(media.title)}</h3>
          <div class="card-meta">
            <span><i class="fa-solid fa-star"></i> ${media.rating || '—'}</span>
            <span><i class="fa-regular fa-calendar"></i> ${media.releaseYear || media.year || '—'}</span>
            <span><i class="fa-regular fa-clock"></i> ${formatDuration(media)}</span>
          </div>
        </div>
      </div>
    `;
}

function rowHTML(title, items) {
    if (!items.length) return '';
    return `
      <section class="row">
        <div class="row-header">
          <h2 class="row-title">${escapeHTML(title)}</h2>
          <span class="row-count"># ${items.length} titre${items.length > 1 ? 's' : ''}</span>
        </div>
        <div class="row-grid">${items.map(cardHTML).join('')}</div>
      </section>
    `;
}

function renderHome(filter = 'all') {
    let list = MEDIAS;
    if (filter !== 'all') list = MEDIAS.filter(m => m.category === filter);

    if (!list.length) {
        $main.innerHTML = `<div class="empty-state"><i class="fa-solid fa-clapperboard"></i><h3>Aucun média</h3></div>`;
        return;
    }

    let html = '';
    Object.keys(SECTION_LABELS).forEach(sec => {
        const items = list.filter(m => m.section === sec);
        if (items.length) html += rowHTML(SECTION_LABELS[sec], items);
    });

    if (filter !== 'all') {
        html = rowHTML(`Tous les ${CATEGORY_LABELS[filter]}`, list) + html;
    }

    $main.innerHTML = html;
    attachCardClicks();
}

function renderSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) { renderHome(); return; }

    const results = MEDIAS.filter(m => m.title.toLowerCase().includes(q) || (m.overview || '').toLowerCase().includes(q));
    if (!results.length) {
        $main.innerHTML = `<div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i><h3>Aucun résultat</h3></div>`;
        return;
    }
    $main.innerHTML = rowHTML(`Résultats pour "${query}"`, results);
    attachCardClicks();
}

function renderPlayer(media) {
    const poster = media.poster ? `<img src="${media.poster}" alt="${escapeHTML(media.title)}" />` : `<div class="card-poster-placeholder"><i class="fa-solid fa-film"></i></div>`;
    const similar = MEDIAS.filter(m => m.category === media.category && m.id !== media.id).slice(0, 6);

    $main.innerHTML = `
      <div class="player-page">
        <button class="btn-back" id="btnBack"><i class="fa-solid fa-arrow-left"></i> Retour à l'accueil</button>

        <div class="player-hero">
          <div class="player-hero-poster">${poster}</div>
          <div class="player-hero-info">
            <h1>${escapeHTML(media.title)}</h1>
            <div class="player-hero-meta">
              <span><i class="fa-solid fa-star"></i> ${media.rating || '—'}</span>
              <span><i class="fa-regular fa-calendar"></i> ${media.releaseYear || media.year || '—'}</span>
              <span><i class="fa-regular fa-clock"></i> ${formatDuration(media)}</span>
            </div>
            <p class="player-hero-overview">${escapeHTML(media.overview || 'Aucun résumé disponible pour ce titre.')}</p>
          </div>
        </div>

        <h2 class="section-title"><i class="fa-solid fa-circle-play"></i> Visionnage</h2>

        <div class="player-frame">
          <iframe id="videoIframe" src="${escapeAttr(media.embed)}" allowfullscreen></iframe>
        </div>

        ${similar.length ? `<h2 class="section-title">Titres similaires</h2><div class="row-grid">${similar.map(cardHTML).join('')}</div>` : ''}
      </div>
    `;

    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.getElementById('btnBack').addEventListener('click', () => {
        history.pushState({}, '', '#');
        renderHome(activeFilter());
    });

    attachCardClicks();
}

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
            $navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            renderHome(link.dataset.filter);
        });
    });
}

function setupSearch() {
    $searchToggle.addEventListener('click', () => { $searchBar.classList.add('active'); setTimeout(() => $searchInput.focus(), 50); });
    $searchClose.addEventListener('click', () => { $searchBar.classList.remove('active'); $searchInput.value = ''; renderHome(activeFilter()); });
    let timer;
    $searchInput.addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(() => renderSearch(e.target.value), 200); });
}

function escapeHTML(str) { return String(str || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function escapeAttr(str) { return String(str || '').replace(/"/g, '&quot;'); }

async function boot() {
    // Déclenchement automatique du popup d'avertissement au chargement
    showWelcomePopup();
    
    MEDIAS = readMediasFromJS();
    setupNav();
    setupSearch();
    await loadAllTMDB();
    renderHome();
}

document.addEventListener('DOMContentLoaded', boot);
