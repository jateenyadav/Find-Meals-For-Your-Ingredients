/* ============================================================
   MealFinder — Express backend
   - Serves the static frontend
   - Proxies TheMealDB (keeps the upstream URL server-side)
   - Exposes a small REST API for favorites, persisted to disk
   ============================================================ */

const express = require('express');
const path = require('path');
const fs = require('fs/promises');

const app = express();
const PORT = process.env.PORT || 5055;
const MEALDB = 'https://www.themealdb.com/api/json/v1/1';
const DATA_FILE = path.join(__dirname, 'data', 'favorites.json');
const PUBLIC_DIR = path.join(__dirname, '..');

app.use(express.json());

/* ---------- Tiny request logger ---------- */
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.url}`);
  next();
});

/* ---------- Favorites persistence helpers ---------- */
async function readFavorites() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeFavorites(list) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

/* ---------- Proxy helper for TheMealDB ---------- */
async function proxy(res, endpoint) {
  try {
    const upstream = await fetch(`${MEALDB}/${endpoint}`);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream error (${upstream.status})` });
    }
    const data = await upstream.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach recipe service', detail: err.message });
  }
}

/* ---------- API: proxied recipe routes ---------- */
app.get('/api/search', (req, res) => {
  const q = encodeURIComponent(req.query.q || '');
  proxy(res, `search.php?s=${q}`);
});

app.get('/api/ingredient', (req, res) => {
  const i = encodeURIComponent(req.query.i || '');
  proxy(res, `filter.php?i=${i}`);
});

app.get('/api/filter', (req, res) => {
  if (req.query.c) return proxy(res, `filter.php?c=${encodeURIComponent(req.query.c)}`);
  if (req.query.a) return proxy(res, `filter.php?a=${encodeURIComponent(req.query.a)}`);
  res.status(400).json({ error: 'Provide a category (c) or area (a)' });
});

app.get('/api/lookup/:id', (req, res) => {
  proxy(res, `lookup.php?i=${encodeURIComponent(req.params.id)}`);
});

app.get('/api/random', (_req, res) => proxy(res, 'random.php'));

app.get('/api/categories', (_req, res) => proxy(res, 'list.php?c=list'));
app.get('/api/areas', (_req, res) => proxy(res, 'list.php?a=list'));

/* ---------- API: favorites CRUD ---------- */
app.get('/api/favorites', async (_req, res) => {
  try {
    res.json(await readFavorites());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/favorites', async (req, res) => {
  const { idMeal, strMeal, strMealThumb } = req.body || {};
  if (!idMeal || !strMeal) {
    return res.status(400).json({ error: 'idMeal and strMeal are required' });
  }
  try {
    const list = await readFavorites();
    if (list.some((m) => m.idMeal === idMeal)) {
      return res.status(409).json({ error: 'Already favorited' });
    }
    const meal = { idMeal, strMeal, strMealThumb: strMealThumb || '' };
    list.unshift(meal);
    await writeFavorites(list);
    res.status(201).json(meal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/favorites/:id', async (req, res) => {
  try {
    const list = await readFavorites();
    const next = list.filter((m) => m.idMeal !== req.params.id);
    if (next.length === list.length) {
      return res.status(404).json({ error: 'Not found' });
    }
    await writeFavorites(next);
    res.json({ removed: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Health check ---------- */
app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

/* ---------- Static frontend ---------- */
app.use(express.static(PUBLIC_DIR));

/* ---------- Fallback to index.html for the root ---------- */
app.get('/', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

app.listen(PORT, () => {
  console.log(`\n🍳 MealFinder running at http://localhost:${PORT}\n`);
});
