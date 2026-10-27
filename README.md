# Pokémon Gym & Battle System

A full-stack Pokémon web game: catch Pokémon from a gacha shop, build a team, and fight turn-based battles through eight gyms and Champion Blue. A Node.js and Express REST API over PostgreSQL handles accounts, battles, the shop and progression, with JWT login and bcrypt password hashing.

**Live app:** https://pokemon-gamified-battle-system.vercel.app (real accounts on a shared server; see [Deployment](#deployment))
**Browser demo:** https://ethanyap123.github.io/pokemon-gamified-battle-system/ (no sign-up needed, progress stays in your browser)

![Node.js](https://img.shields.io/badge/Node.js-Express_5-3c873a) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791) ![Vercel](https://img.shields.io/badge/hosted_on-Vercel-000) ![JWT](https://img.shields.io/badge/auth-JWT_%2B_bcrypt-555) [![Deploy demo](https://github.com/EthanYap123/pokemon-gamified-battle-system/actions/workflows/deploy.yml/badge.svg)](https://github.com/EthanYap123/pokemon-gamified-battle-system/actions/workflows/deploy.yml)

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
| Back end | Node.js, Express 5, node-postgres (`pg`) |
| Database | PostgreSQL (Neon) |
| Auth | JSON Web Tokens, bcrypt |
| Front end | HTML, CSS, vanilla JavaScript |
| Deployment | Vercel serverless function + Neon (live app), GitHub Actions + GitHub Pages (browser demo) |

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
├── index.js               # Starts the server locally
├── api/index.js           # The same app as a Vercel serverless function
├── public/                # Front end: html/, css/, js/, images/
├── src/
│   ├── app.js             # Express app, static files, error handling
│   ├── routes/            # One router per resource
│   ├── controllers/       # Request handling and validation
│   ├── models/            # SQL queries
│   ├── middleware/        # JWT, bcrypt and rate-limit middleware
│   ├── services/          # Battle engine, database pool
│   ├── data/              # Base stats, movesets, type chart
│   └── configs/           # Schema and seed data
├── demo/                  # Browser-only build for GitHub Pages
└── vercel.json            # Vercel build, routing and region
```

## Run it locally

You need Node.js and a PostgreSQL database: a local Postgres server, or a free [Neon](https://neon.tech) database.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file:
   ```
   DATABASE_URL=postgres://user:password@localhost:5432/pokemon
   JWT_SECRET_KEY=your-secret-key
   ```
   Optional: `PORT` (defaults to 3000), `JWT_EXPIRES_IN` (defaults to 30m), `ADMIN_USER_IDS` (comma-separated user ids allowed to change gyms, badges and Pokémon) and `SEED_PASSWORD` (password for the seed trainers, `1234` locally).
3. Create the tables and seed data, then start the server:
   ```bash
   npm run init_tables
   npm run dev
   ```
   `init_tables` only creates missing tables and only seeds an empty database, so it is safe to run again. `npm run init_tables -- --reset` wipes everything and starts over.
4. Open http://localhost:3000.

## Deployment

**Live app (Vercel + Neon).** `vercel.json` turns the Express app into one serverless function (`api/index.js`) in Singapore (`sin1`). Vercel serves `public/` from its CDN and sends every `/api` request to the function. The database is a free Neon Postgres database connected through Vercel's Storage tab, which sets `DATABASE_URL`. Every deploy runs `npm run init_tables` as its build step, so new tables appear automatically and players keep their progress.

Because the live app is shared by strangers on free plans, it has a few guards:
- Sign-ups: 5 per visitor per hour and 300 per day in total. Logins: 20 attempts per 15 minutes. Changes (battle turns, shop, team): 120 a minute. The counts live in a `RateLimit` table, so every server instance shares them.
- Routes that change shared game data (creating or deleting gyms, badges and Pokémon) are admin-only (`ADMIN_USER_IDS`).
- The seed trainers get a random password on Vercel, so nobody can log in as them.

**Browser demo (GitHub Pages).** GitHub Pages only serves static files, so the demo is a browser-only build. `npm run build:demo` copies `public/` into `_site/` and adds `demo/mock-api.js`, which answers the same `/api` routes in the browser using the real battle engine and the starting data from `initTables.js`. Progress is saved in the visitor's browser. `.github/workflows/deploy.yml` builds and publishes it on every push to `main`.

## What I learned

- **Logging in isn't the same as being allowed.** My Year 1 version checked that a token was valid, but not that it belonged to the `user_id` in the URL, so one player could spend another player's coins. Adding ownership checks on every player route taught me the difference between authentication and authorisation.
- **Money-like actions need transactions.** A shop purchase deducts coins, rolls a Pokémon and records it. If any step fails halfway, everything has to roll back, so each purchase runs as one database transaction.
- **Players find exploits fast.** Gym rewards could be claimed more than once. Now rewards need a won, unclaimed battle, and gyms must be beaten in order.
- **Moving databases means more than swapping the driver.** Porting from MySQL to Postgres meant replacing `ON DUPLICATE KEY` with `ON CONFLICT`, `insertId` with `RETURNING`, MySQL variables with `ROW_NUMBER()`, and making usernames case-insensitive myself. It also exposed a shop transaction that waited on a second connection, which could stall a small serverless pool.
- **Simulate before you balance.** I tuned gym levels by simulating thousands of battles, so any starter can beat the first gym.

## Author

Ethan Yap ([@EthanYap123](https://github.com/EthanYap123)) · [Portfolio](https://ethanyap123.github.io/portfolio/)

Pokémon and its characters are trademarks of Nintendo, Game Freak and The Pokémon Company. This is a non-commercial student project.

## License

[MIT](LICENSE) for the code.
