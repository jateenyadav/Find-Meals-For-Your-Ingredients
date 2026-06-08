# 🍳 MealFinder

A full-stack recipe explorer built with **vanilla JS + Express**, powered by [TheMealDB](https://www.themealdb.com/). Search by recipe name or by an ingredient you have on hand, filter by cuisine and category, save favorites, scale servings, and flip between light/dark themes — all in a fast, animated, accessible UI.

> Designed to work two ways: as a **full-stack app** (Express backend that proxies the API and persists favorites to disk) or as a **pure static site** (GitHub Pages friendly — it auto-falls back to calling TheMealDB directly).

---

## ✨ Features

- **Smart search** — looks up recipes by name *and* by ingredient in parallel, deduped into one result set.
- **Live suggestions** — debounced input gives instant feedback as you type.
- **Filters** — one-tap chips for categories and cuisines, loaded dynamically from the API.
- **Recipe modal** — full instructions, an ingredient/measure table, **servings scaling**, and quick actions (favorite, share, open source video).
- **Favorites & Recents** — tabbed views; persisted in `localStorage`, and synced to the backend REST API when it's running.
- **Random meal** — "Surprise me" button (and `R` shortcut) for discovery.
- **Dark mode** — CSS-variable theming with `localStorage` persistence.
- **Keyboard shortcuts** — `/` or `⌘/Ctrl+K` to search, `R` random, `T` toggle theme, `Esc` to close.
- **Accessible & responsive** — `:focus-visible`, `aria-label`s, `prefers-reduced-motion`, and a mobile-first layout.
- **Animated background** — self-contained CSS gradient + floating particles (no external image dependencies).

---

## 🏗️ Tech Stack

| Layer      | Tech                                             |
| ---------- | ------------------------------------------------ |
| Frontend   | HTML5, CSS3 (custom properties, animations), ES2020+ JavaScript |
| Backend    | Node.js, Express                                 |
| Data       | TheMealDB API (proxied), JSON file persistence   |
| Tooling    | `serve` (static preview), npm scripts            |

---

## 🚀 Getting Started

### Full-stack mode (recommended)

```bash
npm install
npm start
```

Then open **http://localhost:5055**. The Express server:

- serves the frontend,
- proxies TheMealDB under `/api/*` (keeps the upstream URL server-side),
- and exposes a favorites REST API persisted to `server/data/favorites.json`.

### Static mode (no backend)

```bash
npm run static   # serves the folder on http://localhost:3000
```

The app detects that no backend is present (via `/api/health`) and calls TheMealDB directly. Perfect for GitHub Pages.

---

## 🔌 API Reference

All recipe routes proxy TheMealDB and return its native JSON shape.

| Method | Route                   | Description                          |
| ------ | ----------------------- | ------------------------------------ |
| `GET`  | `/api/search?q=`        | Search recipes by name               |
| `GET`  | `/api/ingredient?i=`    | Filter recipes by ingredient         |
| `GET`  | `/api/filter?c=` / `?a=`| Filter by category / area (cuisine)  |
| `GET`  | `/api/lookup/:id`       | Full recipe details by id            |
| `GET`  | `/api/random`           | A random recipe                      |
| `GET`  | `/api/categories`       | List of categories                   |
| `GET`  | `/api/areas`            | List of cuisines                     |
| `GET`  | `/api/health`           | Health check (`{ status: "ok" }`)    |

**Favorites (server-persisted):**

| Method   | Route                  | Body / Notes                         |
| -------- | ---------------------- | ------------------------------------ |
| `GET`    | `/api/favorites`       | List saved favorites                 |
| `POST`   | `/api/favorites`       | `{ idMeal, strMeal, strMealThumb }`  |
| `DELETE` | `/api/favorites/:id`   | Remove by `idMeal`                   |

---

## 📁 Project Structure

```
Find-Meals-For-Your-Ingredients/
├── index.html          # App shell & UI structure
├── style.css           # Theming, animations, responsive layout
├── script.js           # App logic + adaptive API layer
├── package.json
└── server/
    ├── server.js       # Express: static + proxy + favorites API
    └── data/
        └── favorites.json   # Auto-created on first POST
```

---

## ⌨️ Keyboard Shortcuts

| Key            | Action            |
| -------------- | ----------------- |
| `/` or `⌘/Ctrl+K` | Focus search   |
| `R`            | Random meal       |
| `T`            | Toggle theme      |
| `Esc`          | Close modal       |

---

## 📝 License

ISC. Recipe data courtesy of [TheMealDB](https://www.themealdb.com/).
