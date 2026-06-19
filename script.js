const TMDB_API_KEY = '3fd2be6f0c70a2a598f084ddfb75487c'; // Remplacez par votre clé API TMDB (gratuite sur themoviedb.org)
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const TMDB_CACHE = {}; // Cache en mémoire pour éviter les requêtes en double

/* ---------- État global de l'application ---------- */
let currentTab = 'all';
let currentSearch = '';
let allMedia = [];
let currentPlayingMedia = null;
let currentPlayingSeason = null;
let currentPlayingEpisode = null;

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
  // Initialiser les icônes Lucide
  lucide.createIcons();

  // Construire la liste complète des médias
  buildAllMedia();

  // Gérer la popup de bienvenue
  handleWelcomePopup();

  // Initialiser la navigation
  initNavigation();

  // Initialiser la recherche
  initSearch();

  // Initialiser le menu mobile
  initMobileMenu();

  // Gérer le scroll du header
  initHeaderScroll();

  // Récupérer les infos TMDB et afficher la page d'accueil
  fetchAllTMDBData().then(function() {
    renderHome();
  });
});

/* ============================================================
   CONSTRUCTION DE LA LISTE COMPLÈTE DES MÉDIAS
   ============================================================ */
function buildAllMedia() {
  allMedia = [];

  // Ajouter les films
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

  // Ajouter les séries
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

  // Ajouter les animés
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
   POPUP DE BIENVENUE / ANTI-PUB
   ============================================================ */
function handleWelcomePopup() {
  var popup = document.getElementById('welcomePopup');
  var closeBtn = document.getElementById('popupClose');
  var continueBtn = document.getElementById('popupContinue');
  var dontShowCheckbox = document.getElementById('popupDontShow');

  // Vérifier si l'utilisateur a déjà cliqué "Ne plus afficher"
  if (localStorage.getItem('monofly_hide_popup') === 'true') {
    popup.classList.add('hidden');
    return;
  }

  // Afficher la popup
  popup.classList.remove('hidden');

  // Fermer la popup
  function closePopup() {
    if (dontShowCheckbox.checked) {
      localStorage.setItem('monofly_hide_popup', 'true');
    }
    popup.classList.add('hidden');
  }

  closeBtn.addEventListener('click', closePopup);
  continueBtn.addEventListener('click', closePopup);

  // Fermer en cliquant en dehors
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
  // Vérifier le cache
  var cacheKey = media.title + '_' + media.year;
  if (TMDB_CACHE[cacheKey]) {
    return TMDB_CACHE[cacheKey];
  }

  // Si pas de clé API, utiliser les placeholders
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
   NAVIGATION & FILTRES
   ============================================================ */
function initNavigation() {
  // Onglets desktop
  var headerTabs = document.querySelectorAll('#headerNav .nav-tab');
  headerTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      setActiveTab(tab.dataset.tab);
    });
  });

  // Onglets mobile
  var mobileTabs = document.querySelectorAll('#mobileNav .nav-tab');
  mobileTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      setActiveTab(tab.dataset.tab);
      // Fermer le menu mobile après sélection
      closeMobileMenu();
    });
  });

  // Logo → retour accueil
  var logoLink = document.getElementById('logoLink');
  logoLink.addEventListener('click', function(e) {
    e.preventDefault();
    currentSearch = '';
    var searchInput = document.getElementById('searchInput');
    var mobileSearchInput = document.getElementById('mobileSearchInput');
    if (searchInput) searchInput.value = '';
    if (mobileSearchInput) mobileSearchInput.value = '';
    updateSearchClearBtn();
    setActiveTab('all');
  });
}

function setActiveTab(tab) {
  currentTab = tab;

  // Mettre à jour l'UI des onglets
  var allTabs = document.querySelectorAll('.nav-tab');
  allTabs.forEach(function(t) {
    if (t.dataset.tab === tab) {
      t.classList.add('active');
    } else {
      t.classList.remove('active');
    }
  });

  // Re-render le contenu
  renderHome();
}

/* ============================================================
   MOTEUR DE RECHERCHE AVEC DEBOUNCE
   ============================================================ */
function initSearch() {
  var searchInput = document.getElementById('searchInput');
  var mobileSearchInput = document.getElementById('mobileSearchInput');
  var searchClear = document.getElementById('searchClear');

  // Debounce de 200ms
  var debounceTimer = null;

  function handleSearch(value) {
    currentSearch = value.trim().toLowerCase();
    updateSearchClearBtn();
    renderHome();
  }

  searchInput.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    var value = this.value;
    debounceTimer = setTimeout(function() {
      handleSearch(value);
      // Synchroniser la recherche mobile
      if (mobileSearchInput) mobileSearchInput.value = value;
    }, 200);
  });

  mobileSearchInput.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    var value = this.value;
    debounceTimer = setTimeout(function() {
      handleSearch(value);
      // Synchroniser la recherche desktop
      if (searchInput) searchInput.value = value;
    }, 200);
  });

  searchClear.addEventListener('click', function() {
    currentSearch = '';
    searchInput.value = '';
    mobileSearchInput.value = '';
    updateSearchClearBtn();
    renderHome();
  });
}

function updateSearchClearBtn() {
  var searchClear = document.getElementById('searchClear');
  if (currentSearch.length > 0) {
    searchClear.classList.remove('hidden');
  } else {
    searchClear.classList.add('hidden');
  }
}

/* ============================================================
   MENU MOBILE
   ============================================================ */
function initMobileMenu() {
  var menuBtn = document.getElementById('mobileMenuBtn');
  var mobileMenu = document.getElementById('mobileMenu');

  menuBtn.addEventListener('click', function() {
    mobileMenu.classList.toggle('hidden');
    mobileMenu.classList.toggle('visible');
  });
}

function closeMobileMenu() {
  var mobileMenu = document.getElementById('mobileMenu');
  mobileMenu.classList.remove('visible');
  mobileMenu.classList.add('hidden');
}

/* ============================================================
   SCROLL DU HEADER
   ============================================================ */
function initHeaderScroll() {
  var header = document.getElementById('mainHeader');
  var lastScroll = 0;

  window.addEventListener('scroll', function() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    lastScroll = scrollTop;
  });
}

/* ============================================================
   RENDU DE LA PAGE D'ACCUEIL
   ============================================================ */
function renderHome() {
  var mainContent = document.getElementById('mainContent');
  var filtered = getFilteredMedia();

  var html = '';

  // Titre de section
  var sectionLabel = currentTab === 'all' ? 'Tous les médias' :
                     currentTab === 'films' ? 'Films' :
                     currentTab === 'series' ? 'Séries' : 'Animés';

  html += '<div class="section-title"><span class="accent-dot"></span>' + escapeHTML(sectionLabel);
  if (currentSearch) {
    html += ' <span style="color: var(--accent-light); font-weight: 400; font-size: 0.9rem;">— Résultats pour "' + escapeHTML(currentSearch) + '"</span>';
  }
  html += '</div>';

  if (filtered.length === 0) {
    html += '<div class="empty-state">';
    html += '<div class="empty-state-icon"><i data-lucide="search-x" style="width:48px;height:48px;"></i></div>';
    html += '<h3>Aucun résultat trouvé</h3>';
    html += '<p>Essayez de modifier vos filtres ou votre recherche.</p>';
    html += '</div>';
  } else {
    html += '<div class="media-grid">';
    filtered.forEach(function(media, index) {
      html += renderMediaCard(media, index);
    });
    html += '</div>';
  }

  mainContent.innerHTML = html;
  lucide.createIcons();
  initCardClickHandlers();
}

/* ---------- Filtrer les médias ---------- */
function getFilteredMedia() {
  return allMedia.filter(function(media) {
    // Filtre par onglet
    if (currentTab !== 'all' && media.section !== currentTab) {
      return false;
    }
    // Filtre par recherche
    if (currentSearch) {
      var searchInTitle = media.title.toLowerCase().indexOf(currentSearch) !== -1;
      var searchInOverview = media.overview && media.overview.toLowerCase().indexOf(currentSearch) !== -1;
      return searchInTitle || searchInOverview;
    }
    return true;
  });
}

/* ---------- Rendu d'une carte média ---------- */
function renderMediaCard(media, index) {
  var typeLabel = media.section === 'films' ? 'Film' :
                  media.section === 'series' ? 'Série' : 'Animé';

  var posterHtml = '';
  if (media.poster) {
    posterHtml = '<img src="' + escapeAttr(media.poster) + '" alt="' + escapeAttr(media.title) + '" loading="lazy" />';
  } else {
    // Placeholder basé sur la catégorie
    var placeholderCategory = media.section === 'films' ? 'film' :
                               media.section === 'series' ? 'technology' : 'abstract';
    var seed = media.title.length + media.year;
    posterHtml = '<img src="http://static.photos/' + placeholderCategory + '/200x200/' + seed + '" alt="' + escapeAttr(media.title) + '" loading="lazy" onerror="this.parentElement.innerHTML=\'<div class=poster-placeholder><i data-lucide=film style=width:2rem;height:2rem></i></div>\'" />';
  }

  var ratingHtml = '';
  if (media.rating) {
    ratingHtml = '<span class="media-card-rating"><i data-lucide="star" style="width:12px;height:12px;"></i>' + escapeHTML(media.rating) + '</span>';
  }

  var delay = Math.min(index * 0.05, 0.5);

  var html = '';
  html += '<div class="media-card" data-media-index="' + index + '" style="animation-delay: ' + delay + 's">';
  html += '  <div class="media-card-poster">';
  html += '    ' + posterHtml;
  html += '    ' + ratingHtml;
  html += '    <span class="media-card-type">' + escapeHTML(typeLabel) + '</span>';
  html += '    <div class="media-card-overlay">';
  html += '      <div class="media-card-play"><i data-lucide="play" style="width:24px;height:24px;"></i></div>';
  html += '    </div>';
  html += '  </div>';
  html += '  <div class="media-card-info">';
  html += '    <div class="media-card-title">' + escapeHTML(media.title) + '</div>';
  html += '    <div class="media-card-meta">';
  html += '      <span>' + escapeHTML(String(media.year)) + '</span>';
  if (media.seasons) {
    var totalEpisodes = 0;
    media.seasons.forEach(function(s) { totalEpisodes += s.episodes.length; });
    html += '      <span>•</span>';
    html += '      <span>' + media.seasons.length + ' saison' + (media.seasons.length > 1 ? 's' : '') + '</span>';
    html += '      <span>•</span>';
    html += '      <span>' + totalEpisodes + ' épisodes</span>';
  }
  html += '    </div>';
  html += '  </div>';
  html += '</div>';

  return html;
}

/* ---------- Gestion des clics sur les cartes ---------- */
function initCardClickHandlers() {
  var cards = document.querySelectorAll('.media-card');
  cards.forEach(function(card) {
    card.addEventListener('click', function() {
      var index = parseInt(card.dataset.mediaIndex, 10);
      var filtered = getFilteredMedia();
      if (filtered[index]) {
        renderPlayer(filtered[index]);
      }
    });
  });
}

/* ============================================================
   RENDU DE LA VUE PLAYER
   ============================================================ */
function renderPlayer(media) {
  var mainContent = document.getElementById('mainContent');

  // Mettre à jour l'état du média en cours
  currentPlayingMedia = media;
  currentPlayingSeason = null;
  currentPlayingEpisode = null;

  // Déterminer l'embed initial
  var initialEmbed = media.embed;

  // Type du média
  var typeLabel = media.section === 'films' ? 'Film' :
                  media.section === 'series' ? 'Série' : 'Animé';

  // Synopsis
  var overviewText = media.overview || 'Synopsis non disponible.';

  // Poster
  var posterSrc = media.poster;
  if (!posterSrc) {
    var placeholderCategory = media.section === 'films' ? 'film' :
                               media.section === 'series' ? 'technology' : 'abstract';
    var seed = media.title.length + media.year;
    posterSrc = 'http://static.photos/' + placeholderCategory + '/320x240/' + seed;
  }

  var html = '';
  html += '<div class="player-view">';
  html += '  <button class="player-back" id="playerBack">';
  html += '    <i data-lucide="arrow-left" style="width:18px;height:18px;"></i>';
  html += '    Retour';
  html += '  </button>';

  // Bannière
  html += '  <div class="player-banner">';
  html += '    <div class="player-banner-poster">';
  html += '      <img src="' + escapeAttr(posterSrc) + '" alt="' + escapeAttr(media.title) + '" />';
  html += '    </div>';
  html += '    <div class="player-banner-info">';
  html += '      <h1 class="player-banner-title">' + escapeHTML(media.title) + '</h1>';
  html += '      <div class="player-banner-meta">';
  html += '        <span>' + escapeHTML(String(media.year)) + '</span>';
  html += '        <span>•</span>';
  html += '        <span>' + escapeHTML(typeLabel) + '</span>';
  if (media.rating) {
    html += '        <span class="badge-rating"><i data-lucide="star" style="width:14px;height:14px;"></i>' + escapeHTML(media.rating) + '</span>';
  }
  if (media.seasons) {
    var totalEp = 0;
    media.seasons.forEach(function(s) { totalEp += s.episodes.length; });
    html += '        <span>•</span>';
    html += '        <span>' + media.seasons.length + ' saison' + (media.seasons.length > 1 ? 's' : '') + '</span>';
  }
  html += '      </div>';
  html += '      <p class="player-banner-overview">' + escapeHTML(overviewText) + '</p>';
  html += '      <div class="player-banner-actions">';
  if (media.seasons && media.seasons.length > 0) {
    // Séries / Animés : bouton pour lancer le premier épisode
    html += '        <button class="btn-watch" id="btnWatchFirst"><i data-lucide="play" style="width:18px;height:18px;"></i>Regarder S1 E1</button>';
  } else {
    // Films : bouton Regarder
    html += '        <button class="btn-watch" id="btnWatchFilm"><i data-lucide="play" style="width:18px;height:18px;"></i>Regarder</button>';
  }
  html += '      </div>';
  html += '    </div>';
  html += '  </div>';

  // Iframe du lecteur
  html += '  <div class="player-iframe-wrapper" id="playerIframeWrapper">';
  html += '    <iframe id="videoPlayer" src="' + escapeAttr(initialEmbed) + '" allowfullscreen allow="autoplay; encrypted-media; fullscreen"></iframe>';
  html += '  </div>';

  // Saisons & Épisodes (pour les séries et animés)
  if (media.seasons && media.seasons.length > 0) {
    html += renderSeasonsAndEpisodes(media);
  }

  // Médias similaires
  html += renderSimilarSection(media);

  html += '</div>';

  mainContent.innerHTML = html;
  lucide.createIcons();

  // Scroll en haut
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Initialiser les handlers du player
  initPlayerHandlers(media);
}

/* ---------- Rendu des saisons et épisodes ---------- */
function renderSeasonsAndEpisodes(media) {
  var html = '';
  html += '<section class="seasons-section">';
  html += '  <h3><i data-lucide="list" style="width:20px;height:20px;"></i>Épisodes</h3>';

  // Onglets de saisons
  html += '  <div class="season-tabs">';
  media.seasons.forEach(function(season, i) {
    var activeClass = i === 0 ? ' active' : '';
    html += '    <button class="season-tab' + activeClass + '" data-season="' + i + '">Saison ' + season.seasonNumber + '</button>';
  });
  html += '  </div>';

  // Listes d'épisodes (seule la saison active est visible)
  media.seasons.forEach(function(season, i) {
    var hiddenClass = i === 0 ? '' : ' hidden';
    html += '  <div class="episodes-list season-content' + hiddenClass + '" data-season-content="' + i + '">';
    season.episodes.forEach(function(ep) {
      html += '    <div class="episode-item" data-embed="' + escapeAttr(ep.embed) + '" data-ep-title="' + escapeAttr(ep.title) + '">';
      html += '      <div class="episode-number">' + ep.episodeNumber + '</div>';
      html += '      <div class="episode-info">';
      html += '        <div class="episode-title">' + escapeHTML(ep.title) + '</div>';
      html += '        <div class="episode-meta">';
      html += '          <span>Saison ' + season.seasonNumber + '</span>';
      html += '          <span>•</span>';
      html += '          <span>' + escapeHTML(ep.duration) + '</span>';
      html += '        </div>';
      if (ep.overview) {
        html += '        <div class="episode-overview">' + escapeHTML(ep.overview) + '</div>';
      }
      html += '      </div>';
      html += '      <button class="episode-play-btn" data-embed="' + escapeAttr(ep.embed) + '" data-ep-title="' + escapeAttr(ep.title) + '">Regarder</button>';
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
      // Scroll vers le lecteur
      var wrapper = document.getElementById('playerIframeWrapper');
      if (wrapper) {
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // Marquer comme "En cours"
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

  // Onglets de saisons
  var seasonTabs = document.querySelectorAll('.season-tab');
  seasonTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var seasonIndex = parseInt(tab.dataset.season, 10);
      // Mettre à jour l'onglet actif
      seasonTabs.forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      // Afficher la bonne saison
      document.querySelectorAll('.season-content').forEach(function(content) {
        if (parseInt(content.dataset.seasonContent, 10) === seasonIndex) {
          content.classList.remove('hidden');
        } else {
          content.classList.add('hidden');
        }
      });
    });
  });

  // Clics sur les épisodes (délégation d'événement)
  var episodesList = document.querySelectorAll('.episodes-list');
  episodesList.forEach(function(list) {
    list.addEventListener('click', function(e) {
      // Trouver le bouton ou l'item cliqué
      var playBtn = e.target.closest('.episode-play-btn');
      var episodeItem = e.target.closest('.episode-item');
      var target = playBtn || episodeItem;
      if (!target) return;

      var embed = target.dataset.embed;
      if (embed) {
        // Déterminer la saison et l'épisode
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

  // Gestion des clics sur les cartes similaires
  initCardClickHandlers();
}

/* ---------- Charger un épisode dans l'iframe ---------- */
function loadEpisode(embedUrl, media, seasonIdx, epIdx) {
  var videoPlayer = document.getElementById('videoPlayer');
  if (!videoPlayer) return;

  // Mettre à jour l'iframe
  videoPlayer.src = embedUrl;

  // Scroll vers le lecteur
  var wrapper = document.getElementById('playerIframeWrapper');
  if (wrapper) {
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Retirer la classe .playing de tous les boutons d'épisode
  document.querySelectorAll('.episode-play-btn').forEach(function(btn) {
    btn.classList.remove('playing');
    btn.innerHTML = 'Regarder';
  });

  // Ajouter la classe .playing au bouton de l'épisode en cours
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

  // Mettre à jour le bouton principal "Regarder"
  var mainWatchBtn = document.getElementById('btnWatchFirst');
  if (mainWatchBtn) {
    mainWatchBtn.classList.add('playing');
    var seasonNum = media.seasons[seasonIdx] ? media.seasons[seasonIdx].seasonNumber : 1;
    var epNum = epIdx + 1;
    mainWatchBtn.innerHTML = '<i data-lucide="pause" style="width:18px;height:18px;"></i>En cours — S' + seasonNum + ' E' + epNum;
    lucide.createIcons();
  }

  // Mettre à jour l'état global
  currentPlayingSeason = seasonIdx;
  currentPlayingEpisode = epIdx;
}
