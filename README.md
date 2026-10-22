Overview

DISCLAIMER: I have no wellness challenges from CA1, because they are replaced by gyms. Users will stay as Users, but challenges are not gyms. User Completions will become so beating a gym is the equivilant of completing a challenge. Coins are like points, with an additional Amulet Coin currency, which give a coin multiplier based on the number owned. The goals of this game are to become Champion, and complete the Pokedex, which will unlock two hidden Pokemon. 

This project is a Pokémon-themed web application built with Node.js and MySQL.
It extends the backend from CA1 by adding a frontend interface and gamification features such as:
- Registration & Login with JWT authentication and bcrypt password hashing
- Pokémon Shop where users can spend coins to purchase Poké Balls or Amulet Coins
- Battle System allowing fair, multi-turn fights between Pokémon
- Progression & Rewards including badges, unlockable Pokémon, and coin boosts with Amulet Coins
- Team Management so users can assign owned Pokémon to their team
This project demonstrates backend–frontend integration, secure authentication, and interactive gameplay mechanics.


Game Rules

Battles (src/services/battleEngine.js)
- Your Pokémon are level 50; gym Pokémon range from level 36 (Brock) to 48 (Blue)
- Damage uses the main-series formula: same-type bonus (1.5x), type effectiveness
  including immunities (0x), 1/16 critical hits (1.5x) and a random 85-100% roll
- Move type decides physical or special (Gen 3 style)
- Turn order: switching first, then move priority (Quick Attack is +1), then Speed
- Switch Pokémon mid-battle (uses your turn) or pick the next one after a faint
- Splash does nothing, Transform copies the target, Explosion and Self-Destruct faint the user
- Gym rewards are only paid once per won battle, and gyms must be beaten in order

Shop
- Poké, Great and Ultra Balls roll a rarity, then a Pokémon of that Pokédex rarity
- Duplicates refund half the ball's price
- 10-pull for 10% off, with at least one uncommon or better
- Rare guarantee: the 30th pull in a row without a rare is a rare
- One free Poké Ball per day
- Amulet Coins add +10% gym coins each (max 10)


Folder Structure

BED-CA2-P2523752-DIT1B07/
├── public/
│   ├── css/               # Stylesheets
│   ├── js/                # Client-side scripts (shop.js, battle.js, auth.js)
│   └── html/              # Displays
│
├── src/
│   ├── configs/
|   │   ├── createSchema.js
|   │   └── initTables.js  # Initial data (Pokémon, shop items)
│   ├── controllers/       # Endpoint logic (ShopController, BattleController, etc.)
│   ├── models/            # Database queries (User, Shop, UserPokemon, etc.)
│   ├── routes/            # Express routes (auth, shop, battle, team)
│   ├── services/          # DB connection pool, JWT helpers, bcrypt utilities
│   ├── app.js             # Main Express server
│   └── package.json
│
└── README.md              # Project documentation


Install Dependencies
Run 'npm install' in your terminal


Update the .env file with your MySQL credentials:

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=pokemon_db_ca2
JWT_SECRET_KEY=your-secret-key
JWT_EXPIRES_IN=30m
JWT_ALGORITHM=HS256

Optional: PORT (defaults to 3000) and DB_SSL_REJECT_AUTHORISE=true to enforce the database's SSL certificate.


To start server:
Run 'npm run init_tables' in your terminal
Run 'npm run dev' in your terminal
Then open http://localhost:3000


Deploying

render.yaml describes a Render web service. Create a MySQL database on any host
(for example Aiven or TiDB Cloud), run 'npm run init_tables' once with that
database's details in .env, then create the service on Render from this
repository and fill in the DB_* values it asks for.