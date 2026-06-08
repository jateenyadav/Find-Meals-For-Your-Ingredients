/* ============================================================
   MealFinder — script.js
   TheMealDB-powered recipe explorer with favorites, filters,
   live suggestions, servings scaling, dark mode & toasts.
   ============================================================ */

/* ---------- API layer ----------
   Prefers the bundled Express backend (/api) when it's reachable,
   and transparently falls back to TheMealDB so the app still works
   as a pure static site (e.g. GitHub Pages). */
const MEALDB = 'https://www.themealdb.com/api/json/v1/1';
let API = MEALDB;          // upstream by default
let useBackend = false;    // flipped on if /api/health responds

async function detectBackend() {
  try {
    const res = await fetch('/api/health', { cache: 'no-store' });
    if (res.ok) { useBackend = true; }
  } catch { /* static mode */ }
}

/* Build a request URL for either backend or direct TheMealDB calls. */
function apiUrl(kind, value = '') {
  const v = encodeURIComponent(value);
  if (useBackend) {
    switch (kind) {
      case 'search': return `/api/search?q=${v}`;
      case 'ingredient': return `/api/ingredient?i=${v}`;
      case 'category': return `/api/filter?c=${v}`;
      case 'area': return `/api/filter?a=${v}`;
      case 'lookup': return `/api/lookup/${v}`;
      case 'random': return `/api/random`;
      case 'categories': return `/api/categories`;
      case 'areas': return `/api/areas`;
      default: return '/api/health';
    }
  }
  switch (kind) {
    case 'search': return `${MEALDB}/search.php?s=${v}`;
    case 'ingredient': return `${MEALDB}/filter.php?i=${v}`;
    case 'category': return `${MEALDB}/filter.php?c=${v}`;
    case 'area': return `${MEALDB}/filter.php?a=${v}`;
    case 'lookup': return `${MEALDB}/lookup.php?i=${v}`;
    case 'random': return `${MEALDB}/random.php`;
    case 'categories': return `${MEALDB}/list.php?c=list`;
    case 'areas': return `${MEALDB}/list.php?a=list`;
    default: return `${MEALDB}/random.php`;
  }
}

const els = {
  searchInput: document.getElementById('search-input'),
  searchBtn: document.getElementById('search-btn'),
  clearBtn: document.getElementById('clear-btn'),
  randomBtn: document.getElementById('random-btn'),
  themeToggle: document.getElementById('theme-toggle'),
  meal: document.getElementById('meal'),
  resultHeading: document.getElementById('result-heading'),
  loadingIcon: document.getElementById('loading-icon'),
  categoryChips: document.getElementById('category-chips'),
  resultsCount: document.getElementById('results-count'),
  sortSelect: document.getElementById('sort-select'),
  sortWrap: document.getElementById('sort-wrap'),
  backToTop: document.getElementById('back-to-top'),
  favCount: document.getElementById('fav-count'),
  mealDetails: document.getElementById('meal-details'),
  mealDetailsContent: document.getElementById('meal-details-content'),
  recipeCloseBtn: document.getElementById('recipe-close-btn'),
  modalBackdrop: document.getElementById('modal-backdrop'),
  toastContainer: document.getElementById('toast-container'),
  tabs: document.querySelectorAll('.tab'),
};

const store = {
  favorites: loadJSON('mf_favorites', []),
  recent: loadJSON('mf_recent', []),
  theme: localStorage.getItem('mf_theme') || 'light',
  activeTab: 'results',
  activeFilter: null,
  lastResults: [],
  lastQuery: '',
  sort: 'relevance',
};

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

function debounce(fn, wait = 350) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

function escapeHTML(str = '') {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* ---------- Toasts ---------- */
function toast(message, type = 'info') {
  const icons = { info: 'fa-circle-info', success: 'fa-circle-check', error: 'fa-triangle-exclamation' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${escapeHTML(message)}</span>`;
  els.toastContainer.appendChild(el);
  setTimeout(() => {
    el.classList.add('hide');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, 2800);
}

/* ---------- Animated background particles ---------- */
function createAnimatedBackground() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const emojis = ['🍅', '🥕', '🧄', '🥦', '🍋', '🌶️', '🧅', '🥔', '🍆', '🫑', '🍄', '🥬'];
  const wrap = document.createElement('div');
  wrap.className = 'food-particles';
  wrap.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 14; i++) {
    const p = document.createElement('span');
    p.className = 'food-particle';
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    p.style.left = `${Math.random() * 100}%`;
    p.style.fontSize = `${1.2 + Math.random() * 1.8}rem`;
    p.style.animationDuration = `${12 + Math.random() * 14}s`;
    p.style.animationDelay = `${Math.random() * -20}s`;
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
}

/* ---------- Loading skeleton ---------- */
function showSkeletons(count = 8) {
  els.meal.classList.remove('notFound');
  let html = '<div class="skeleton-grid">';
  for (let i = 0; i < count; i++) {
    html += `<div class="skeleton-card">
      <div class="skeleton-shimmer sk-img"></div>
      <div class="skeleton-shimmer sk-line"></div>
      <div class="skeleton-shimmer sk-line short"></div>
    </div>`;
  }
  html += '</div>';
  els.meal.innerHTML = html;
}

/* ---------- State rendering (empty / error) ---------- */
function showState(icon, title, sub) {
  els.meal.classList.add('notFound');
  els.meal.innerHTML = `<div class="state">
    <i class="fas ${icon}"></i>
    <h3>${escapeHTML(title)}</h3>
    <p>${escapeHTML(sub || '')}</p>
  </div>`;
}

function setLoading(on) {
  els.loadingIcon.hidden = !on;
  if (on) showSkeletons();
}

/* ---------- Fetch helpers ---------- */
async function fetchJSON(url, signal) {
  const res = await fetch(url, signal ? { signal } : undefined);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

// Tracks the in-flight search so stale responses can't overwrite newer ones.
let searchController = null;

async function searchMeals(query) {
  const q = query.trim();
  if (!q) { showState('fa-bowl-food', 'Type something to cook', 'Search by ingredient, name or category.'); return; }
  store.activeFilter = null;
  syncChips();
  setLoading(true);
  els.resultHeading.textContent = `Results for “${q}”`;

  // Cancel any previous in-flight search before starting a new one.
  if (searchController) searchController.abort();
  searchController = new AbortController();
  const { signal } = searchController;

  try {
    // Search by name and by ingredient concurrently, then merge unique meals.
    const [byName, byIngredient] = await Promise.all([
      fetchJSON(apiUrl('search', q), signal).catch(() => ({ meals: null })),
      fetchJSON(apiUrl('ingredient', q), signal).catch(() => ({ meals: null })),
    ]);
    if (signal.aborted) return;
    const merged = mergeMeals(byName.meals, byIngredient.meals);
    setLoading(false);
    if (!merged.length) {
      showState('fa-face-frown', 'No meals found', `We couldn't find anything for “${q}”. Try another keyword.`);
      els.resultsCount.textContent = '0';
      store.lastResults = [];
      return;
    }
    store.lastResults = merged;
    store.lastQuery = q;
    renderMeals(merged);
    switchTab('results');
  } catch (err) {
    if (err.name === 'AbortError' || signal.aborted) return;
    setLoading(false);
    showState('fa-wifi', 'Something went wrong', err.message);
    toast('Network error — please try again.', 'error');
  } finally {
    if (searchController && searchController.signal === signal) searchController = null;
  }
}

function mergeMeals(a, b) {
  const map = new Map();
  (a || []).forEach((m) => map.set(m.idMeal, m));
  (b || []).forEach((m) => { if (!map.has(m.idMeal)) map.set(m.idMeal, m); });
  return [...map.values()];
}

async function filterBy(type, value) {
  setLoading(true);
  els.resultHeading.textContent = `${value} meals`;
  try {
    const data = await fetchJSON(apiUrl(type === 'category' ? 'category' : 'area', value));
    setLoading(false);
    if (!data.meals) { showState('fa-face-frown', 'No meals found', ''); return; }
    store.lastResults = data.meals;
    renderMeals(data.meals);
    switchTab('results');
  } catch (err) {
    setLoading(false);
    showState('fa-wifi', 'Something went wrong', err.message);
  }
}

async function showRandomMeal() {
  setLoading(true);
  try {
    const data = await fetchJSON(apiUrl('random'));
    setLoading(false);
    const meal = data.meals?.[0];
    if (meal) { openRecipe(meal.idMeal); }
  } catch {
    setLoading(false);
    toast('Could not fetch a random meal.', 'error');
  }
}

/* ---------- Render meal grid ---------- */
function sortMeals(meals) {
  const arr = meals.slice();
  if (store.sort === 'az') arr.sort((a, b) => a.strMeal.localeCompare(b.strMeal));
  else if (store.sort === 'za') arr.sort((a, b) => b.strMeal.localeCompare(a.strMeal));
  return arr; // 'relevance' keeps the original merged order
}

function renderMeals(meals, { context = 'results' } = {}) {
  els.meal.classList.remove('notFound');
  if (context === 'results') els.resultsCount.textContent = String(meals.length);
  // Show the sort control only when there are results to sort.
  if (els.sortWrap) els.sortWrap.hidden = !(context === 'results' && meals.length >= 2);
  if (!meals.length) {
    if (context === 'favorites') showState('fa-heart', 'No favorites yet', 'Tap the heart on any recipe to save it here.');
    else if (context === 'recent') showState('fa-clock-rotate-left', 'No recent recipes', 'Recipes you open will appear here.');
    else showState('fa-face-frown', 'No meals found', '');
    return;
  }
  const ordered = context === 'results' ? sortMeals(meals) : meals;
  els.meal.innerHTML = ordered.map((m, i) => {
    const faved = isFavorite(m.idMeal);
    // Stagger the fade-in so cards appear in a gentle cascade.
    const delay = Math.min(i * 35, 420);
    return `<article class="meal-item fade-in" data-id="${m.idMeal}" style="animation-delay:${delay}ms">
      <div class="meal-img">
        <img src="${m.strMealThumb}" alt="${escapeHTML(m.strMeal)}" loading="lazy" />
        <button class="fav-toggle ${faved ? 'active' : ''}" data-id="${m.idMeal}"
                aria-label="${faved ? 'Remove from favorites' : 'Add to favorites'}" title="Favorite">
          <i class="${faved ? 'fas' : 'far'} fa-heart"></i>
        </button>
      </div>
      <div class="meal-name">
        <h3>${escapeHTML(m.strMeal)}</h3>
        <button class="recipe-btn" data-id="${m.idMeal}">View Recipe <i class="fas fa-arrow-right"></i></button>
      </div>
    </article>`;
  }).join('');
}

/* ---------- Favorites ---------- */
function isFavorite(id) { return store.favorites.some((f) => f.idMeal === id); }

function toggleFavorite(meal) {
  const idx = store.favorites.findIndex((f) => f.idMeal === meal.idMeal);
  if (idx >= 0) {
    store.favorites.splice(idx, 1);
    toast(`Removed “${meal.strMeal}” from favorites`, 'info');
  } else {
    store.favorites.unshift({ idMeal: meal.idMeal, strMeal: meal.strMeal, strMealThumb: meal.strMealThumb });
    toast(`Saved “${meal.strMeal}” to favorites`, 'success');
  }
  saveJSON('mf_favorites', store.favorites);
  els.favCount.textContent = String(store.favorites.length);
  // update heart icons in place
  document.querySelectorAll(`.fav-toggle[data-id="${meal.idMeal}"]`).forEach((btn) => {
    const faved = isFavorite(meal.idMeal);
    btn.classList.toggle('active', faved);
    btn.querySelector('i').className = `${faved ? 'fas' : 'far'} fa-heart`;
  });
  if (store.activeTab === 'favorites') renderMeals(store.favorites, { context: 'favorites' });
}

function pushRecent(meal) {
  store.recent = store.recent.filter((r) => r.idMeal !== meal.idMeal);
  store.recent.unshift({ idMeal: meal.idMeal, strMeal: meal.strMeal, strMealThumb: meal.strMealThumb });
  store.recent = store.recent.slice(0, 12);
  saveJSON('mf_recent', store.recent);
}

/* ---------- Recipe modal ---------- */
let currentMeal = null;
let currentServings = 1;

async function openRecipe(id) {
  try {
    els.mealDetailsContent.innerHTML = '<div class="modal-loading"><div class="spinner"></div><p>Plating your recipe…</p></div>';
    openModal();
    const data = await fetchJSON(apiUrl('lookup', id));
    const meal = data.meals?.[0];
    if (!meal) { els.mealDetailsContent.innerHTML = '<p class="state">Recipe not found.</p>'; return; }
    currentMeal = meal;
    currentServings = 1;
    pushRecent(meal);
    renderRecipe();
  } catch (err) {
    els.mealDetailsContent.innerHTML = `<p class="state">Could not load recipe: ${escapeHTML(err.message)}</p>`;
  }
}

function getIngredients(meal) {
  const list = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ing && ing.trim()) list.push({ ing: ing.trim(), measure: (measure || '').trim() });
  }
  return list;
}

function scaleMeasure(measure, factor) {
  if (factor === 1) return measure;
  // Scale leading numbers (incl. fractions like 1/2) in the measure string.
  return measure.replace(/(\d+\s*\/\s*\d+|\d*\.?\d+)/g, (m) => {
    let val;
    if (m.includes('/')) { const [a, b] = m.split('/').map(Number); val = a / b; }
    else val = parseFloat(m);
    const scaled = val * factor;
    return Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(2).replace(/\.?0+$/, '');
  });
}

function renderRecipe() {
  const meal = currentMeal;
  const faved = isFavorite(meal.idMeal);
  const ingredients = getIngredients(meal);
  const tags = (meal.strTags || '').split(',').filter(Boolean);
  els.mealDetailsContent.innerHTML = `
    <div class="recipe-hero">
      <img src="${meal.strMealThumb}" alt="${escapeHTML(meal.strMeal)}" />
      <div class="recipe-hero-overlay">
        <h2 id="modal-title">${escapeHTML(meal.strMeal)}</h2>
        <div class="recipe-meta">
          ${meal.strCategory ? `<span><i class="fas fa-layer-group"></i> ${escapeHTML(meal.strCategory)}</span>` : ''}
          ${meal.strArea ? `<span><i class="fas fa-globe"></i> ${escapeHTML(meal.strArea)}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="recipe-body">
      ${tags.length ? `<div class="recipe-tags">${tags.map((t) => `<span class="tag">#${escapeHTML(t.trim())}</span>`).join('')}</div>` : ''}
      <div class="servings">
        <span><i class="fas fa-utensils"></i> Servings</span>
        <div class="servings-control">
          <button class="step-btn" id="serv-minus" aria-label="Decrease servings">−</button>
          <span id="serv-value">${currentServings}</span>
          <button class="step-btn" id="serv-plus" aria-label="Increase servings">+</button>
        </div>
      </div>
      <h3 class="section-title"><i class="fas fa-carrot"></i> Ingredients</h3>
      <ul class="ingredient-list">
        ${ingredients.map((x) => `<li><span class="ing-name">${escapeHTML(x.ing)}</span><span class="ing-measure">${escapeHTML(scaleMeasure(x.measure, currentServings))}</span></li>`).join('')}
      </ul>
      <h3 class="section-title"><i class="fas fa-list-ol"></i> Instructions</h3>
      <div class="instructions">${escapeHTML(meal.strInstructions || '').split('\n').filter((p) => p.trim()).map((p) => `<p>${p}</p>`).join('')}</div>
    </div>
    <div class="recipe-actions">
      <button class="btn" id="modal-fav-btn"><i class="${faved ? 'fas' : 'far'} fa-heart"></i> ${faved ? 'Saved' : 'Save'}</button>
      ${meal.strYoutube ? `<a class="btn ghost" href="${meal.strYoutube}" target="_blank" rel="noopener"><i class="fab fa-youtube"></i> Watch</a>` : ''}
      ${meal.strSource ? `<a class="btn ghost" href="${meal.strSource}" target="_blank" rel="noopener"><i class="fas fa-link"></i> Source</a>` : ''}
      <button class="btn ghost" id="print-btn"><i class="fas fa-print"></i> Print</button>
      <button class="btn ghost" id="share-btn"><i class="fas fa-share-nodes"></i> Share</button>
    </div>`;
  wireRecipeActions();
}

function wireRecipeActions() {
  document.getElementById('serv-minus')?.addEventListener('click', () => { if (currentServings > 1) { currentServings--; renderRecipe(); } });
  document.getElementById('serv-plus')?.addEventListener('click', () => { if (currentServings < 12) { currentServings++; renderRecipe(); } });
  document.getElementById('modal-fav-btn')?.addEventListener('click', () => { toggleFavorite(currentMeal); renderRecipe(); });
  document.getElementById('print-btn')?.addEventListener('click', () => window.print());
  document.getElementById('share-btn')?.addEventListener('click', shareRecipe);
}

async function shareRecipe() {
  const url = currentMeal.strSource || currentMeal.strYoutube || location.href;
  const shareData = { title: currentMeal.strMeal, text: `Check out this recipe: ${currentMeal.strMeal}`, url };
  if (navigator.share) {
    try { await navigator.share(shareData); } catch { /* cancelled */ }
  } else {
    try { await navigator.clipboard.writeText(`${shareData.text} — ${url}`); toast('Link copied to clipboard', 'success'); }
    catch { toast('Could not share recipe', 'error'); }
  }
}

/* ---------- Modal open/close ---------- */
function openModal() {
  els.modalBackdrop.hidden = false;
  document.body.style.overflow = 'hidden';
  // Force the browser to commit the closed (opacity:0) state before
  // adding .open, so the opacity/transform transition runs reliably.
  void els.mealDetails.offsetWidth;
  els.mealDetails.classList.add('open');
  // Defer focus until after the transition has started to avoid
  // interrupting the compositor mid-transition.
  requestAnimationFrame(() => els.recipeCloseBtn?.focus());
}
function closeModal() {
  els.mealDetails.classList.remove('open');
  els.modalBackdrop.hidden = true;
  document.body.style.overflow = '';
  currentMeal = null;
}

/* ---------- Tabs ---------- */
function switchTab(name) {
  store.activeTab = name;
  els.tabs.forEach((t) => {
    const active = t.dataset.tab === name;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', String(active));
  });
  if (name === 'favorites') {
    els.resultHeading.textContent = 'Your favorites';
    renderMeals(store.favorites, { context: 'favorites' });
  } else if (name === 'recent') {
    els.resultHeading.textContent = 'Recently viewed';
    renderMeals(store.recent, { context: 'recent' });
  } else {
    els.resultHeading.textContent = store.lastResults.length ? 'Results' : 'Discover recipes';
    if (store.lastResults.length) renderMeals(store.lastResults);
    else showState('fa-bowl-food', 'Discover recipes', 'Search by ingredient, name, category or cuisine.');
  }
}

/* ---------- Filter chips ---------- */
async function loadFilters() {
  try {
    const cats = await fetchJSON(apiUrl('categories')).catch(() => ({ meals: [] }));
    (cats.meals || []).slice(0, 14).forEach((c) => addChip(els.categoryChips, c.strCategory, 'category'));
  } catch { /* non-critical */ }
}

function addChip(container, label, type) {
  if (!label) return;
  const chip = document.createElement('button');
  chip.className = 'chip';
  chip.textContent = label;
  chip.dataset.type = type;
  chip.dataset.value = label;
  chip.addEventListener('click', () => {
    const wasActive = chip.classList.contains('active');
    syncChips();
    if (!wasActive) {
      chip.classList.add('active');
      store.activeFilter = { type, value: label };
      filterBy(type, label);
    } else {
      store.activeFilter = null;
    }
  });
  container.appendChild(chip);
}

function syncChips() {
  document.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
}

/* ---------- Live suggestions ---------- */
const liveSearch = debounce(async (q) => {
  if (q.trim().length < 2) return;
  searchMeals(q);
}, 450);

/* ---------- Theme ---------- */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  store.theme = theme;
  localStorage.setItem('mf_theme', theme);
  const icon = els.themeToggle?.querySelector('i');
  if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}
function toggleTheme() { applyTheme(store.theme === 'dark' ? 'light' : 'dark'); }

/* ---------- Event delegation for meal grid ---------- */
function onMealClick(e) {
  const favBtn = e.target.closest('.fav-toggle');
  if (favBtn) {
    const id = favBtn.dataset.id;
    const meal = [...store.lastResults, ...store.favorites, ...store.recent].find((m) => m.idMeal === id);
    if (meal) toggleFavorite(meal);
    return;
  }
  const recipeBtn = e.target.closest('.recipe-btn');
  const card = e.target.closest('.meal-item');
  if (recipeBtn || (card && !favBtn)) {
    const id = (recipeBtn || card).dataset.id;
    if (id) openRecipe(id);
  }
}

/* ---------- Init ---------- */
function init() {
  applyTheme(store.theme);
  createAnimatedBackground();
  detectBackend().finally(loadFilters);
  els.favCount.textContent = String(store.favorites.length);
  showState('fa-bowl-food', 'Discover recipes', 'Search by ingredient, name or category.');

  // Search
  els.searchBtn?.addEventListener('click', (e) => { e.preventDefault(); searchMeals(els.searchInput.value); });
  els.searchInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); searchMeals(els.searchInput.value); } });
  els.searchInput?.addEventListener('input', () => {
    els.clearBtn.hidden = !els.searchInput.value;
    liveSearch(els.searchInput.value);
  });
  els.clearBtn?.addEventListener('click', () => {
    els.searchInput.value = '';
    els.clearBtn.hidden = true;
    els.searchInput.focus();
      store.lastResults = [];
      store.lastQuery = '';
      if (els.sortWrap) els.sortWrap.hidden = true;
    showState('fa-bowl-food', 'Discover recipes', 'Search by ingredient, name or category.');
    els.resultsCount.textContent = '0';
  });

  els.randomBtn?.addEventListener('click', showRandomMeal);
  els.themeToggle?.addEventListener('click', toggleTheme);

  // Sort control — re-render the current results in the chosen order.
  els.sortSelect?.addEventListener('change', () => {
    store.sort = els.sortSelect.value;
    if (store.lastResults.length) renderMeals(store.lastResults, { context: 'results' });
  });

  // Back-to-top button — visible after scrolling down.
  const onScroll = () => {
    if (!els.backToTop) return;
    els.backToTop.classList.toggle('show', window.scrollY > 400);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  els.backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Tabs
  els.tabs.forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));

  // Meal grid delegation
  els.meal?.addEventListener('click', onMealClick);

  // Modal
  els.recipeCloseBtn?.addEventListener('click', closeModal);
  els.modalBackdrop?.addEventListener('click', closeModal);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && els.mealDetails.classList.contains('open')) closeModal();
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
    if (typing) return;
    if (e.key === '/') { e.preventDefault(); els.searchInput.focus(); }
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); els.searchInput.focus(); }
    if (e.key === 'r' || e.key === 'R') showRandomMeal();
    if (e.key === 't' || e.key === 'T') toggleTheme();
  });
}

document.addEventListener('DOMContentLoaded', init);
