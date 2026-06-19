const TMDB_API_KEY = '3fd2be6f0c70a2a598f084ddfb75487c';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const TMDB_CACHE = {};
const WEBHOOK_URL = 'https://discord.com/api/webhooks/1517349633641418915/lMq18N4y86CaB6ZW0cR5lhozvj-4XdHSYnQm6-6r2hPPkALyAU6ik9ewKZqEeEa9erI5'; // URL DIRECTE

let currentTab = 'all';
let currentSearch = '';
let allMedia = [];
let currentPlayingMedia = null;
let currentPlayingSeason = null;
let currentPlayingEpisode = null;

/* ============================================================
   FONCTION DE CRYPTAGE SIMPLE
   ============================================================ */
function encryptData(data) {
  return btoa(JSON.stringify(data));
}

function decryptData(encryptedData) {
  try {
    return JSON.parse(atob(encryptedData));
  } catch (e) {
    return data;
  }
}

/* ============================================================
   VÉRIFICATION DES LIENS (Lien cassé) - EN ARRIÈRE-PLAN
   ============================================================ */
// Cache pour les URLs vérifiées
const urlCheckCache = {};

async function checkEmbedUrl(url, timeout = 3000) {
  if (!url || url.length === 0) return false;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Essayer de charger l'iframe de manière passive
    const response = await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      signal: controller.signal,
      cache: 'no-store'
    }).catch(() => null);
    
    clearTimeout(timeoutId);
    
    // Si pas d'erreur CORS, le lien est probablement bon
    return response !== null;
  } catch (error) {
    return false;
  }
}

async function isEmbedAvailable(url) {
  if (!url) return false;
  
  // Vérifier le cache
  if (urlCheckCache[url] !== undefined) {
    return urlCheckCache[url];
  }
  
  // Ne pas bloquer l'affichage - vérifier en arrière-plan
  const available = await checkEmbedUrl(url);
  urlCheckCache[url] = available;
  
  // Mettre à jour l'UI si nécessaire
  updateMediaUnavailableBadges();
  
  return available;
}

function updateMediaUnavailableBadges() {
  // Mettre à jour les badges indisponibles
  document.querySelectorAll('.media-card').forEach(card => {
    const poster = card.querySelector('.media-card-poster');
    if (poster && !poster.querySelector('.media-unavailable')) {
      const mediaIndex = parseInt(card.dataset.mediaIndex, 10);
      const media = allMedia[mediaIndex];
      
      if (media && !isEmbedAvailable(media.embed)) {
        // Ajouter le badge indisponible
      }
    }
  });
}

/* ---------- Fonctions de protection XSS ---------- */
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function escapeAttr(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ============================================================
   INITIALISATION AU CHARGEMENT
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
  lucide.createIcons();
  buildAllMedia();
  handleWelcomePopup();
  initNavigation();
  initSearch();
  initMobileMenu();
  initHeaderScroll();
  
  // Initialiser la popup de signalement
  handleReportPopup();
  
  fetchAllTMDBData().then(function() {
    renderHome();
  });
});

/* ============================================================
   POPUP DE SIGNALEMENT
   ============================================================ */
function handleReportPopup() {
  const reportPopup = document.getElementById('reportPopup');
  const reportClose = document.getElementById('reportClose');
  const reportForm = document.getElementById('reportForm');
  const reportSubmit = document.getElementById('reportSubmit');
  const reportTabs = document.querySelectorAll('.report-tab');
  
  if (!reportPopup) return;
  
  // Fermer le popup
  function closeReportPopup() {
    reportPopup.classList.add('hidden');
    reportForm.reset();
  }
  
  if (reportClose) {
    reportClose.addEventListener('click', closeReportPopup);
  }
  
  // Fermer en cliquant en dehors
  reportPopup.addEventListener('click', function(e) {
    if (e.target === reportPopup) {
      closeReportPopup();
    }
  });
  
  // Onglets Normal/Rapide
  reportTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      reportTabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      const tabType = this.dataset.tab;
      document.querySelectorAll('.report-tab-content').forEach(content => {
        if (content.dataset.tab === tabType) {
          content.classList.remove('hidden');
        } else {
          content.classList.add('hidden');
        }
      });
    });
  });
  
  // Submission du formulaire
  if (reportSubmit) {
    reportSubmit.addEventListener('click', async function() {
      const activeTab = document.querySelector('.report-tab.active').dataset.tab;
      const reasonSelect = document.querySelector(`[data-tab="${activeTab}"] select`);
      const reason = reasonSelect.value;
      
      if (!reason) {
        alert('Veuillez sélectionner une raison');
        return;
      }
      
      reportSubmit.disabled = true;
      reportSubmit.textContent = 'Envoi en cours...';
      
      const mediaTitle = currentPlayingMedia?.title || 'Inconnu';
      const embedUrl = currentPlayingMedia?.embed || 'Inconnu';
      
      // Préparer les données
      const reportData = {
        type: 'bug_report',
        media: mediaTitle,
        embed: embedUrl,
        reason: reason,
        reportType: activeTab,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      };
      
      try {
        // Envoyer au webhook Discord
        await sendToWebhook(reportData);
        
        // Message de succès
        reportSubmit.textContent = '✓ Signalement envoyé !';
        setTimeout(() => {
          closeReportPopup();
          reportSubmit.disabled = false;
          reportSubmit.textContent = 'Envoyer le signalement';
        }, 2000);
      } catch (error) {
        console.error('Erreur lors du signalement:', error);
        reportSubmit.textContent = '✗ Erreur d\'envoi';
        reportSubmit.disabled = false;
        setTimeout(() => {
          reportSubmit.textContent = 'Envoyer le signalement';
        }, 2000);
      }
    });
  }
}

/* ---------- Envoi au webhook Discord ---------- */
async function sendToWebhook(reportData) {
  // Créer un embed Discord
  const embed = {
    title: '🔴 Rapport de Problème - MonoFly',
    color: 15548997, // Red
    fields: [
      {
        name: '📺 Média',
        value: reportData.media,
        inline: true
      },
      {
        name: '⚠️ Raison',
        value: reportData.reason,
        inline: true
      },
      {
        name: '🔗 URL Embed',
        value: `${reportData.embed}`,
        inline: false
      },
      {
        name: '📝 Type de Rapport',
        value: reportData.reportType === 'normal' ? '⏱️ Réparation Normale' : '⚡ Réparation Rapide',
        inline: true
      },
      {
        name: '🕐 Timestamp',
        value: reportData.timestamp,
        inline: true
      },
      {
        name: '📱 User Agent',
        value: `\`${reportData.userAgent.substring(0, 80)}...\``,
        inline: false
      }
    ],
    footer: {
      text: 'MonoFly - Bug Report System',
      icon_url: 'https://cdn-icons-png.flaticon.com/512/1/1495.png'
    },
    timestamp: new Date().toISOString()
  };
  
  const payload = {
    content: '🚨 Nouveau rapport de problème reçu',
    embeds: [embed]
  };
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Webhook error: ${response.status} - ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Erreur webhook:', error);
    throw error;
  }
}

/* ============================================================
   POPUP DE BIENVENUE / ANTI-PUB
   ============================================================ */
function handleWelcomePopup() {
  var popup = document.getElementById('welcomePopup');
  var closeBtn = document.getElementById('popupClose');
  var continueBtn = document.getElementById('popupContinue');
  var dontShowCheckbox = document.getElementById('popupDontShow');

  if (localStorage.getItem('monofly_hide_popup') === 'true') {
    popup.classList.add('hidden');
    return;
  }

  popup.classList.remove('hidden');

  function closePopup() {
    if (dontShowCheckbox.checked) {
      localStorage.setItem('monofly_hide_popup', 'true');
    }
    popup.classList.add('hidden');
  }

  closeBtn.addEventListener('click', closePopup);
  continueBtn.addEventListener('click', closePopup);

  popup.addEventListener('click', function(e) {
    if (e.target === popup) {
      closePopup();
    }
  });
}

/* ============================================================
   INTÉGRATION TMDB API
   ============================================================ */
async function fetchTMDBData(media) {
  var cacheKey = media.title + '_' + media.year;
  if (TMDB_CACHE[cacheKey]) {
    return TMDB_CACHE[cacheKey];
  }

  if (!TMDB_API_KEY) {
    var placeholderData = {
      poster: null,
      overview: null,
      rating: null
    };
    TMDB_CACHE[cacheKey] = placeholderData;
    return placeholderData;
  }

  try {
    var endpoint = media.tmdbType === 'movie' ? 'search/movie' : 'search/tv';
    var query = encodeURIComponent(media.title);
    var yearParam = media.tmdbType === 'movie' ? '&primary_release_year=' + media.year : '&first_air_date_year=' + media.year;

    var response = await fetch(
      TMDB_BASE + '/' + endpoint + '?api_key=' + TMDB_API_KEY + '&query=' + query + yearParam + '&language=fr-FR'
    );

    if (!response.ok) throw new Error('API request failed');

    var data = await response.json();

    if (data.results && data.results.length > 0) {
      var result = data.results[0];
      var tmdbInfo = {
        poster: result.poster_path ? TMDB_IMG + result.poster_path : null,
        overview: result.overview || null,
        rating: result.vote_average ? result.vote_average.toFixed(1) : null
      };
      TMDB_CACHE[cacheKey] = tmdbInfo;
      return tmdbInfo;
    }
  } catch (err) {
    console.warn('Erreur TMDB pour "' + media.title + '":', err.message);
  }

  var fallback = { poster: null, overview: null, rating: null };
  TMDB_CACHE[cacheKey] = fallback;
  return fallback;
}

async function fetchAllTMDBData() {
  var promises = allMedia.map(function(media) {
    return fetchTMDBData(media).then(function(data) {
      media.poster = data.poster;
      media.overview = data.overview;
      media.rating = data.rating;
    });
  });

  await Promise.all(promises);
}

/* ============================================================
   CONSTRUCTION DE LA LISTE COMPLÈTE DES MÉDIAS
   ============================================================ */
function buildAllMedia() {
  allMedia = [];

  if (typeof FILMS_DATA !== 'undefined') {
    FILMS_DATA.forEach(function(film) {
      allMedia.push({
        title: film.title,
        embed: film.embed,
        section: 'films',
        year: film.year,
        seasons: null,
        tmdbId: null,
        poster: null,
        overview: null,
        rating: null,
        tmdbType: 'movie'
      });
    });
  }

  if (typeof SERIES_DATA !== 'undefined') {
    SERIES_DATA.forEach(function(series) {
      allMedia.push({
        title: series.title,
        embed: series.embed,
        section: 'series',
        year: series.year,
        seasons: series.seasons,
        tmdbId: null,
        poster: null,
        overview: null,
        rating: null,
        tmdbType: 'tv'
      });
    });
  }

  if (typeof ANIMES_DATA !== 'undefined') {
    ANIMES_DATA.forEach(function(anime) {
      allMedia.push({
        title: anime.title,
        embed: anime.embed,
        section: 'animes',
        year: anime.year,
        seasons: anime.seasons,
        tmdbId: null,
        poster: null,
        overview: null,
        rating: null,
        tmdbType: 'tv'
      });
    });
  }
}

/* ============================================================
   NAVIGATION & FILTRES
   ============================================================ */
function initNavigation() {
  var headerTabs = document.querySelectorAll('#headerNav .nav-tab');
  headerTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      setActiveTab(tab.dataset.tab);
    });
  });

  var mobileTabs = document.querySelectorAll('#mobileNav .nav-tab');
  mobileTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      setActiveTab(tab.dataset.tab);
      document.getElementById('mobileMenu').classList.remove('visible');
      document.getElementById('mobileMenu').classList.add('hidden');
    });
  });
}

function setActiveTab(tab) {
  currentTab = tab;
  currentSearch = '';
  document.getElementById('searchInput').value = '';
  document.getElementById('mobileSearchInput').value = '';
  document.getElementById('searchClear').classList.add('hidden');
  
  document.querySelectorAll('.nav-tab').forEach(function(t) {
    t.classList.remove('active');
  });
  
  document.querySelectorAll('[data-tab="' + tab + '"]').forEach(function(t) {
    t.classList.add('active');
  });
  
  renderHome();
}

/* ============================================================
   RECHERCHE
   ============================================================ */
function initSearch() {
  var searchInput = document.getElementById('searchInput');
  var mobileSearchInput = document.getElementById('mobileSearchInput');
  var searchClear = document.getElementById('searchClear');

  [searchInput, mobileSearchInput].forEach(function(input) {
    input.addEventListener('input', function() {
      currentSearch = this.value.toLowerCase();
      if (currentSearch) {
        searchClear.classList.remove('hidden');
      } else {
        searchClear.classList.add('hidden');
      }
      renderHome();
    });
  });

  searchClear.addEventListener('click', function() {
    searchInput.value = '';
    mobileSearchInput.value = '';
    currentSearch = '';
    searchClear.classList.add('hidden');
    renderHome();
  });
}

/* ============================================================
   MENU MOBILE
   ============================================================ */
function initMobileMenu() {
  var mobileMenuBtn = document.getElementById('mobileMenuBtn');
  var mobileMenu = document.getElementById('mobileMenu');

  mobileMenuBtn.addEventListener('click', function() {
    mobileMenu.classList.toggle('hidden');
    mobileMenu.classList.toggle('visible');
  });

  document.addEventListener('click', function(e) {
    if (!mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
      mobileMenu.classList.add('hidden');
      mobileMenu.classList.remove('visible');
    }
  });
}

/* ============================================================
   HEADER SCROLL
   ============================================================ */
function initHeaderScroll() {
  var header = document.getElementById('mainHeader');
  window.addEventListener('scroll', function() {
    if (window.scrollY > 10) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

/* ============================================================
   RENDU DE LA PAGE D'ACCUEIL
   ============================================================ */
function renderHome() {
  var mainContent = document.getElementById('mainContent');
  var html = '';

  var filtered = allMedia.filter(function(m) {
    if (currentTab !== 'all' && m.section !== currentTab) return false;
    if (currentSearch && !m.title.toLowerCase().includes(currentSearch)) return false;
    return true;
  });

  // Sections
  var sections = {};
  filtered.forEach(function(media) {
    if (!sections[media.section]) sections[media.section] = [];
    sections[media.section].push(media);
  });

  // Afficher les sections
  ['tendances', 'films', 'series', 'animes'].forEach(function(section) {
    var items = sections[section];
    if (!items || items.length === 0) return;

    var sectionTitle = {
      'tendances': '🔥 Tendances',
      'films': '🎬 Films',
      'series': '📺 Séries',
      'animes': '✨ Animés'
    }[section];

    html += '<section class="content-section">';
    html += '  <h2>' + sectionTitle + '</h2>';
    html += '  <div class="media-grid">';

    items.forEach(function(item, idx) {
      html += renderMediaCard(item, idx);
    });

    html += '  </div>';
    html += '</section>';
  });

  if (filtered.length === 0) {
    html += '<div class="no-results"><p>Aucun résultat trouvé</p></div>';
  }

  mainContent.innerHTML = html;
  lucide.createIcons();
  initCardClickHandlers();
}

/* ---------- Helpers de disponibilité ---------- */
function isFilmUnavailable(media) {
  // Un film est indisponible si son embed est vide ou absent
  return !media.seasons && (!media.embed || media.embed.trim() === '');
}

function hasUnavailableEpisode(media) {
  // Série/animé : retourne vrai si AU MOINS 1 épisode a un embed vide
  if (!media.seasons) return false;
  for (var s = 0; s < media.seasons.length; s++) {
    var eps = media.seasons[s].episodes || [];
    for (var e = 0; e < eps.length; e++) {
      if (!eps[e].embed || eps[e].embed.trim() === '') return true;
    }
  }
  return false;
}

/* ---------- Rendu des cartes média ---------- */
function renderMediaCard(media, idx) {
  var posterUrl = media.poster || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 450%22%3E%3Crect fill=%22%231a1a24%22 width=%22300%22 height=%22450%22/%3E%3C/svg%3E';

  var filmUnavailable = isFilmUnavailable(media);
  var episodeUnavailable = hasUnavailableEpisode(media);

  var cardClass = 'media-card';
  if (filmUnavailable) cardClass += ' media-card--film-unavailable';

  var html = '';
  html += '<div class="' + cardClass + '" data-media-index="' + allMedia.indexOf(media) + '" style="animation-delay: ' + (idx * 0.05) + 's">';
  html += '  <div class="media-card-poster">';
  html += '    <img src="' + escapeAttr(posterUrl) + '" alt="' + escapeAttr(media.title) + '" />';

  if (media.rating) {
    html += '    <div class="media-rating">' + escapeHTML(media.rating) + '</div>';
  }

  // Film indisponible : overlay "Indisponible" visible au survol
  if (filmUnavailable) {
    html += '    <div class="media-card-unavailable-overlay">';
    html += '      <span>⚠️ Indisponible</span>';
    html += '    </div>';
  }

  // Série/animé avec au moins 1 épisode manquant : badge rouge permanent
  if (episodeUnavailable) {
    html += '    <div class="media-card-episode-badge">⚠️ Ep. indisponible</div>';
  }

  html += '  </div>';
  html += '  <div class="media-card-info">';
  html += '    <div class="media-card-title">' + escapeHTML(media.title) + '</div>';
  html += '    <div class="media-card-meta">' + escapeHTML(media.year) + '</div>';
  html += '  </div>';
  html += '</div>';

  return html;
}

/* ---------- Handlers des cartes ---------- */
function initCardClickHandlers() {
  var cards = document.querySelectorAll('.media-card');
  cards.forEach(function(card) {
    card.addEventListener('click', function() {
      // Bloquer le clic sur les films indisponibles
      if (card.classList.contains('media-card--film-unavailable')) return;
      var index = parseInt(card.dataset.mediaIndex, 10);
      if (allMedia[index]) {
        renderPlayerPage(allMedia[index]);
      }
    });
  });
}

/* ============================================================
   PAGE DU LECTEUR
   ============================================================ */
async function renderPlayerPage(media) {
  currentPlayingMedia = media;
  var mainContent = document.getElementById('mainContent');
  
  // Déterminer l'embed initial
  var initialEmbed = null;
  
  if (media.seasons && media.seasons.length > 0 && media.seasons[0].episodes && media.seasons[0].episodes.length > 0) {
    initialEmbed = media.seasons[0].episodes[0].embed;
  } else {
    initialEmbed = media.embed;
  }

  // Ne pas vérifier les liens - afficher directement
  // La vérification se fait en arrière-plan sans bloquer

  var html = '';
  html += '<div class="player-container">';

  // Bannière avec infos
  html += '  <div class="player-banner" style="background-image: url(' + escapeAttr(media.poster || 'none') + ')">';
  html += '    <button class="player-back" id="playerBack"><i data-lucide="arrow-left" style="width:20px;height:20px;"></i>Retour</button>';
  html += '    <div class="player-banner-poster">';
  html += '      <img src="' + escapeAttr(media.poster || '') + '" alt="' + escapeAttr(media.title) + '" />';
  html += '    </div>';
  html += '    <div class="player-banner-content">';
  html += '      <div class="player-banner-meta">';
  
  if (media.rating) {
    html += '        <span class="badge-rating"><i data-lucide="star" style="width:14px;height:14px;"></i>' + escapeHTML(media.rating) + '/10</span>';
  }
  
  html += '        <span class="badge-year">' + escapeHTML(media.year) + '</span>';
  html += '      </div>';
  html += '      <h1 class="player-banner-title">' + escapeHTML(media.title) + '</h1>';
  
  var overviewText = media.overview || 'Aucune description disponible.';
  html += '      <p class="player-banner-overview">' + escapeHTML(overviewText) + '</p>';
  html += '      <div class="player-banner-actions">';
  
  if (media.seasons && media.seasons.length > 0) {
    html += '        <button class="btn-watch" id="btnWatchFirst"><i data-lucide="play" style="width:18px;height:18px;"></i>Regarder S1 E1</button>';
  } else {
    html += '        <button class="btn-watch" id="btnWatchFilm"><i data-lucide="play" style="width:18px;height:18px;"></i>Regarder</button>';
  }
  
  html += '      </div>';
  html += '    </div>';
  html += '  </div>';

  // Iframe du lecteur - Afficher par défaut
  html += '  <div class="player-iframe-wrapper" id="playerIframeWrapper">';
  html += '    <iframe id="videoPlayer" src="' + escapeAttr(initialEmbed) + '" allowfullscreen allow="autoplay; encrypted-media; fullscreen"></iframe>';
  html += '  </div>';

  // Bouton "Signaler un problème" - Toujours visible
  html += '  <button class="btn-report-problem" id="btnReportProblem">';
  html += '    <i data-lucide="alert-triangle" style="width:18px;height:18px;"></i>';
  html += '    <span>Signaler un problème</span>';
  html += '  </button>';

  // Saisons & Épisodes
  if (media.seasons && media.seasons.length > 0) {
    html += renderSeasonsAndEpisodes(media);
  }

  // Médias similaires
  html += renderSimilarSection(media);

  html += '</div>';

  mainContent.innerHTML = html;
  lucide.createIcons();

  window.scrollTo({ top: 0, behavior: 'smooth' });

  initPlayerHandlers(media);
}

/* ---------- Rendu des saisons et épisodes ---------- */
function renderSeasonsAndEpisodes(media) {
  var html = '';
  html += '<section class="seasons-section">';
  html += '  <h3><i data-lucide="list" style="width:20px;height:20px;"></i>Épisodes</h3>';

  html += '  <div class="season-tabs">';
  media.seasons.forEach(function(season, i) {
    var activeClass = i === 0 ? ' active' : '';
    html += '    <button class="season-tab' + activeClass + '" data-season="' + i + '">Saison ' + season.seasonNumber + '</button>';
  });
  html += '  </div>';

  media.seasons.forEach(function(season, i) {
    var hiddenClass = i === 0 ? '' : ' hidden';
    html += '  <div class="episodes-list season-content' + hiddenClass + '" data-season-content="' + i + '">';
    season.episodes.forEach(function(ep) {
      var epUnavailable = !ep.embed || ep.embed.trim() === '';
      var itemClass = 'episode-item' + (epUnavailable ? ' episode-item--unavailable' : '');
      var embedAttr = epUnavailable ? '' : escapeAttr(ep.embed);

      html += '    <div class="' + itemClass + '" data-embed="' + embedAttr + '" data-ep-title="' + escapeAttr(ep.title) + '">';
      html += '      <div class="episode-number">' + ep.episodeNumber + '</div>';
      html += '      <div class="episode-info">';
      html += '        <div class="episode-title">' + escapeHTML(ep.title) + '</div>';
      html += '        <div class="episode-meta">';
      html += '          <span>Saison ' + season.seasonNumber + '</span>';
      html += '          <span>•</span>';
      html += '          <span>' + escapeHTML(ep.duration) + '</span>';
      if (epUnavailable) {
        html += '          <span class="episode-unavailable-tag">⚠️ Indisponible</span>';
      }
      html += '        </div>';
      if (ep.overview) {
        html += '        <div class="episode-overview">' + escapeHTML(ep.overview) + '</div>';
      }
      html += '      </div>';
      if (epUnavailable) {
        html += '      <button class="episode-play-btn episode-play-btn--unavailable" disabled>Indisponible</button>';
      } else {
        html += '      <button class="episode-play-btn" data-embed="' + escapeAttr(ep.embed) + '" data-ep-title="' + escapeAttr(ep.title) + '">Regarder</button>';
      }
      html += '    </div>';
    });
    html += '  </div>';
  });

  html += '</section>';
  return html;
}

/* ---------- Rendu des médias similaires ---------- */
function renderSimilarSection(media) {
  var similar = allMedia.filter(function(m) {
    return m.section === media.section && m.title !== media.title;
  }).slice(0, 6);

  if (similar.length === 0) return '';

  var html = '';
  html += '<section class="similar-section">';
  html += '  <h3><i data-lucide="sparkles" style="width:20px;height:20px;"></i>Vous pourriez aussi aimer</h3>';
  html += '  <div class="media-grid">';

  similar.forEach(function(item, idx) {
    html += renderMediaCard(item, idx);
  });

  html += '  </div>';
  html += '</section>';
  return html;
}

/* ---------- Handlers du player ---------- */
function initPlayerHandlers(media) {
  // Bouton retour
  var backBtn = document.getElementById('playerBack');
  if (backBtn) {
    backBtn.addEventListener('click', function() {
      currentPlayingMedia = null;
      currentPlayingSeason = null;
      currentPlayingEpisode = null;
      renderHome();
    });
  }

  // Bouton "Regarder" pour les films
  var btnWatchFilm = document.getElementById('btnWatchFilm');
  if (btnWatchFilm) {
    btnWatchFilm.addEventListener('click', function() {
      var wrapper = document.getElementById('playerIframeWrapper');
      if (wrapper) {
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      btnWatchFilm.classList.add('playing');
      btnWatchFilm.innerHTML = '<i data-lucide="pause" style="width:18px;height:18px;"></i>En cours';
      lucide.createIcons();
    });
  }

  // Bouton "Regarder S1 E1" pour les séries/animés
  var btnWatchFirst = document.getElementById('btnWatchFirst');
  if (btnWatchFirst && media.seasons && media.seasons.length > 0) {
    btnWatchFirst.addEventListener('click', function() {
      var firstEp = media.seasons[0].episodes[0];
      if (firstEp) {
        loadEpisode(firstEp.embed, media, 0, 0);
      }
    });
  }

  // Bouton "Signaler un problème"
  var btnReportProblem = document.getElementById('btnReportProblem');
  if (btnReportProblem) {
    btnReportProblem.addEventListener('click', function() {
      document.getElementById('reportPopup').classList.remove('hidden');
    });
  }

  // Onglets de saisons
  var seasonTabs = document.querySelectorAll('.season-tab');
  seasonTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var seasonIndex = parseInt(tab.dataset.season, 10);
      seasonTabs.forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      document.querySelectorAll('.season-content').forEach(function(content) {
        if (parseInt(content.dataset.seasonContent, 10) === seasonIndex) {
          content.classList.remove('hidden');
        } else {
          content.classList.add('hidden');
        }
      });
    });
  });

  // Clics sur les épisodes
  var episodesList = document.querySelectorAll('.episodes-list');
  episodesList.forEach(function(list) {
    list.addEventListener('click', function(e) {
      var playBtn = e.target.closest('.episode-play-btn');
      var episodeItem = e.target.closest('.episode-item');
      var target = playBtn || episodeItem;
      if (!target) return;

      // Ignorer les épisodes indisponibles
      if (episodeItem && episodeItem.classList.contains('episode-item--unavailable')) return;
      if (playBtn && playBtn.classList.contains('episode-play-btn--unavailable')) return;

      var embed = target.dataset.embed;
      if (embed) {
        var seasonContent = target.closest('.season-content');
        var seasonIndex = seasonContent ? parseInt(seasonContent.dataset.seasonContent, 10) : 0;
        var epIndex = 0;
        if (episodeItem) {
          var allItems = Array.from(seasonContent.querySelectorAll('.episode-item'));
          epIndex = allItems.indexOf(episodeItem);
        }
        loadEpisode(embed, media, seasonIndex, epIndex);
      }
    });
  });

  initCardClickHandlers();
}

/* ---------- Charger un épisode dans l'iframe ---------- */
function loadEpisode(embedUrl, media, seasonIdx, epIdx) {
  var videoPlayer = document.getElementById('videoPlayer');
  if (!videoPlayer) return;

  videoPlayer.src = embedUrl;

  var wrapper = document.getElementById('playerIframeWrapper');
  if (wrapper) {
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  document.querySelectorAll('.episode-play-btn').forEach(function(btn) {
    btn.classList.remove('playing');
    btn.innerHTML = 'Regarder';
  });

  var seasonContent = document.querySelector('.season-content[data-season-content="' + seasonIdx + '"]');
  if (seasonContent) {
    var episodeItems = seasonContent.querySelectorAll('.episode-item');
    if (episodeItems[epIdx]) {
      var playBtn = episodeItems[epIdx].querySelector('.episode-play-btn');
      if (playBtn) {
        playBtn.classList.add('playing');
        playBtn.innerHTML = 'En cours';
      }
    }
  }

  var mainWatchBtn = document.getElementById('btnWatchFirst');
  if (mainWatchBtn) {
    mainWatchBtn.classList.add('playing');
    var seasonNum = media.seasons[seasonIdx] ? media.seasons[seasonIdx].seasonNumber : 1;
    var epNum = epIdx + 1;
    mainWatchBtn.innerHTML = '<i data-lucide="pause" style="width:18px;height:18px;"></i>En cours — S' + seasonNum + ' E' + epNum;
    lucide.createIcons();
  }

  currentPlayingSeason = seasonIdx;
  currentPlayingEpisode = epIdx;
}
