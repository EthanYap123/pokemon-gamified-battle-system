# Pokémon Gym & Battle System

A full-stack Pokémon web game: catch Pokémon from a gacha shop, build a team, and fight turn-based battles through eight gyms and Champion Blue. A Node.js and Express REST API over MySQL handles accounts, battles, the shop and progression, with JWT login and bcrypt password hashing.

**Live demo:** https://ethanyap123.github.io/pokemon-gamified-battle-system/ (runs in your browser; see [Live demo](#live-demo-github-pages))

![Node.js](https://img.shields.io/badge/Node.js-Express_5-3c873a) ![MySQL](https://img.shields.io/badge/MySQL-database-00758f) ![JWT](https://img.shields.io/badge/auth-JWT_%2B_bcrypt-555) [![Deploy demo](https://github.com/EthanYap123/pokemon-gamified-battle-system/actions/workflows/deploy.yml/badge.svg)](https://github.com/EthanYap123/pokemon-gamified-battle-system/actions/workflows/deploy.yml)

![Battle screen](docs/battle-screen.jpg)

Built for the Back-End Development (BED) module at Singapore Polytechnic, extending my earlier REST API assignment with a front end and game features, then revamped in Year 2.

## Features

- **Accounts:** register and log in with bcrypt-hashed passwords and JWT tokens. Every player route checks that the token owns the `user_id` it changes.
- **Battles:** turn-based fights against eight gym leaders and the Champion, with switching, priority moves, critical hits, type effectiveness and PP.
- **Shop:** Poké, Great and Ultra Balls, 10-pulls, a rare-pity counter, a free daily ball and pull history. Each purchase runs as a single database transaction.
- **Progression:** badges, coins, Amulet Coin boosts, a Pokédex to complete (finishing it unlocks two hidden Pokémon) and a leaderboard.
- **Team management:** search and filter your Pokémon, drag to reorder, and swap team members.

## Game rules

**Battles** (`src/services/battleEngine.js`)
- Your Pokémon are level 50; gym Pokémon range from level 36 (Brock) to 48 (Blue).
- Damage uses the main-series formula: same-type bonus (1.5x), type effectiveness including immunities (0x), 1/16 critical hits (1.5x) and a random 85–100% roll.
- Move type decides physical or special (Gen 3 style).
- Turn order: switching first, then move priority (Quick Attack is +1), then Speed.
- Switch Pokémon mid-battle (uses your turn) or pick the next one after a faint.
- Splash does nothing, Transform copies the target, Explosion and Self-Destruct faint the user.
- Gym rewards are only paid once per won battle, and gyms must be beaten in order.

**Shop**
- Poké, Great and Ultra Balls roll a rarity, then a Pokémon of that Pokédex rarity.
- Duplicates refund half the ball's price.
- A 10-pull costs 10% less and includes at least one uncommon or better.
- Rare guarantee: the 30th pull in a row without a rare is a rare.
- One free Poké Ball per day.
- Amulet Coins add +10% gym coins each (max 10).

## Tech stack

| Layer | Tools |
| --- | --- |
| Back end | Node.js, Express 5, mysql2 |
| Database | MySQL |
| Auth | JSON Web Tokens, bcrypt |
| Front end | HTML, CSS, vanilla JavaScript |
| Deployment | GitHub Actions + GitHub Pages (demo), Render (full version) |

## API

All routes are under `/api`. Player routes need an `Authorization: Bearer <token>` header.

| Resource | Examples |
| --- | --- |
| `/register`, `/login` | create an account and get a JWT |
| `/users` | profile, account settings, `GET /leaderboard`, `GET /:user_id/stats` |
| `/battle` | `POST /start`, `POST /:battle_id/turn` (move or switch), `POST /:battle_id/end`, `GET /:battle_id` |
| `/shop` | `GET /items`, `POST /:user_id/purchase`, `POST /:user_id/daily`, `GET /:user_id/history` |
| `/team` | `GET /:user_id`, `POST /:user_id/add`, `DELETE /:user_id/remove/:slot`, `PUT /:user_id/reorder` |
| `/pokemon`, `/pokedex`, `/userpokemon`, `/userpokedex` | species data, details and what each player owns |
| `/badges`, `/userbadges` | gym badges and who has earned them |

## Project structure

```
pokemon-gamified-battle-system/
├── index.js               # Starts the server
├── public/                # Front end: html/, css/, js/, images/
├── src/
│   ├── app.js             # Express app, static files, error handling
│   ├── routes/            # One router per resource
│   ├── controllers/       # Request handling and validation
│   ├── models/            # SQL queries
│   ├── middleware/        # JWT and bcrypt middleware
│   ├── services/          # Battle engine, database pool
│   ├── data/              # Base stats, movesets, type chart
│   └── configs/           # Schema and seed data
├── demo/                  # Browser-only build for GitHub Pages
└── render.yaml            # Render deployment
```

## Run it locally

You need Node.js and a MySQL server.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file with your MySQL details:
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=password
   DB_NAME=pokemon_db_ca2
   JWT_SECRET_KEY=your-secret-key
   JWT_EXPIRES_IN=30m
   JWT_ALGORITHM=HS256
   ```
   Optional: `PORT` (defaults to 3000) and `DB_SSL_REJECT_AUTHORISE=true` to enforce the database's SSL certificate.
3. Create the tables and seed data, then start the server:
   ```bash
   npm run init_tables
   npm run dev
   ```
4. Open http://localhost:3000.

## Live demo (GitHub Pages)

GitHub Pages only serves static files, so the demo is a browser-only build. `npm run build:demo` copies `public/` into `_site/` and adds `demo/mock-api.js`, which answers the same `/api` routes in the browser using the real battle engine and the starting data from `initTables.js`. Progress is saved in the visitor's browser. `.github/workflows/deploy.yml` builds and publishes it on every push to `main`.

## Deploying the full version

`render.yaml` describes a Render web service. Create a MySQL database on any host (for example Aiven or TiDB Cloud), run `npm run init_tables` once with that database's details in `.env`, then create the service on Render from this repository and fill in the `DB_*` values it asks for.

## What I learned

- **Logging in isn't the same as being allowed.** My Year 1 version checked that a token was valid, but not that it belonged to the `user_id` in the URL, so one player could spend another player's coins. Adding ownership checks on every player route taught me the difference between authentication and authorisation.
- **Money-like actions need transactions.** A shop purchase deducts coins, rolls a Pokémon and records it. If any step fails halfway, everything has to roll back, so each purchase runs as one database transaction.
- **Players find exploits fast.** Gym rewards could be claimed more than once. Now rewards need a won, unclaimed battle, and gyms must be beaten in order.
- **Simulate before you balance.** I tuned gym levels by simulating thousands of battles, so any starter can beat the first gym.

## Author

Ethan Yap ([@EthanYap123](https://github.com/EthanYap123)) · [Portfolio](https://ethanyap123.github.io/portfolio/)

Pokémon and its characters are trademarks of Nintendo, Game Freak and The Pokémon Company. This is a non-commercial student project.

## License

[MIT](LICENSE) for the code.
