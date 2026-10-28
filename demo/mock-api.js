//////////////////////////////////////////////////////
// IN-BROWSER API (GitHub Pages demo only)
// Answers the same /api routes as the Express server, using the real battle
// engine and the starting data from initTables.js. Everything is saved in
// this browser's localStorage, so each visitor has their own world.
//////////////////////////////////////////////////////
(function () {
    const STORE_KEY = "pokebattle-demo-v1";
    const engine = window.PokemonEngine;
    const { baseStats, movesets } = window.PokemonData;
    const SEED = window.DEMO_DATA;

    // Same rules as the server
    const ODDS = {
        pokeball: { common: 0.7, uncommon: 0.25, rare: 0.05, ultra: 0 },
        greatball: { common: 0.5, uncommon: 0.4, rare: 0.09, ultra: 0.01 },
        ultraball: { common: 0.3, uncommon: 0.5, rare: 0.18, ultra: 0.02 },
    };
    const RARITY_RANK = { common: 0, uncommon: 1, rare: 2, ultra: 3 };
    const PITY_THRESHOLD = 30;
    const MULTI_PULL_COUNT = 10;
    const MULTI_PULL_DISCOUNT = 0.9;
    const AMULET_COIN_LIMIT = 10;
    const TOTAL_GYMS = 9;
    const DAILY_ITEM_NAME = "Daily Poke Ball";

    //////////////////////////////////////////////////////
    // Storage
    //////////////////////////////////////////////////////
    const pad = n => String(n).padStart(2, "0");
    const now = () => {
        const d = new Date();
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    const today = () => now().slice(0, 10);

    async function sha256(text) {
        const bytes = new TextEncoder().encode(String(text));
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
    }

    async function freshDb() {
        const seedHash = await sha256("1234");
        const db = {
            User: [], Pokemon: [], Gym: [], Badge: [], Shop: [], UserBadge: [], UserPokemon: [],
            UserPokedex: [], Team: [], UserCompletion: [], Battles: [], PullHistory: [], tokens: {},
        };
        const add = (table, row) => insert(db, table, row);

        (SEED.Users || []).forEach(u => add("User", { ...u, password: seedHash, pity_count: 0, last_free_pull: null }));
        (SEED.Pokemon || []).forEach(p => db.Pokemon.push({ ...p }));
        (SEED.Gym || []).forEach(g => add("Gym", { ...g }));
        (SEED.Badge || []).forEach(b => add("Badge", { ...b }));
        (SEED.Shop || []).forEach(s => add("Shop", { ...s }));
        (SEED.UserBadge || []).forEach(b => add("UserBadge", { ...b, obtained_at: now() }));
        (SEED.UserPokemon || []).forEach(p => add("UserPokemon", { ...p, obtained_at: now() }));
        (SEED.UserPokedex || []).forEach(p => add("UserPokedex", { ...p }));
        (SEED.Team || []).forEach(t => add("Team", { ...t }));
        (SEED.UserCompletion || []).forEach(c => add("UserCompletion", { details: null, ...c, completed_at: now() }));
        return db;
    }

    const ID_FIELD = {
        User: "user_id", Gym: "gym_id", Badge: "badge_id", Shop: "item_id", UserBadge: "id", UserPokemon: "id",
        UserPokedex: "id", Team: "id", UserCompletion: "completion_id", Battles: "battle_id", PullHistory: "pull_id",
    };

    function insert(db, table, row) {
        const field = ID_FIELD[table];
        if (field && row[field] === undefined) {
            row[field] = db[table].reduce((max, r) => Math.max(max, r[field] || 0), 0) + 1;
        }
        db[table].push(row);
        return row;
    }

    let dbPromise = null;
    function loadDb() {
        if (!dbPromise) {
            dbPromise = (async () => {
                try {
                    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
                    if (saved && saved.User) return saved;
                } catch (e) { /* start fresh */ }
                const db = await freshDb();
                saveDb(db);
                return db;
            })();
        }
        return dbPromise;
    }

    function saveDb(db) {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(db));
        } catch (e) {
            console.error("Could not save demo data:", e);
        }
    }

    //////////////////////////////////////////////////////
    // Helpers
    //////////////////////////////////////////////////////
    class ApiError extends Error {
        constructor(status, message) {
            super(message);
            this.status = status;
        }
    }

    const pokemonById = (db, id) => db.Pokemon.find(p => p.pokemon_id === Number(id));
    const userById = (db, id) => db.User.find(u => u.user_id === Number(id));
    const publicUser = u => ({ user_id: u.user_id, username: u.username, email: u.email, coins: u.coins, amulet_coins: u.amulet_coins });

    function requireAuth(db, req) {
        const token = (req.headers.authorization || "").replace(/^Bearer /, "");
        const userId = db.tokens[token];
        if (!userId) throw new ApiError(401, "Invalid token");
        return userId;
    }

    function requireOwner(db, req, ownerId) {
        const userId = requireAuth(db, req);
        if (Number(ownerId) !== userId) throw new ApiError(403, "Forbidden: Not your account");
        return userId;
    }

    function newToken(db, userId) {
        const token = "demo." + crypto.getRandomValues(new Uint32Array(4)).join("");
        db.tokens[token] = userId;
        return token;
    }

    function gymTeamIds(gym) {
        try {
            const parsed = JSON.parse(gym.pokemon_team);
            return (Array.isArray(parsed) ? parsed : [parsed]).map(Number);
        } catch (e) {
            return [];
        }
    }

    function markObtained(db, userId, pokemonId) {
        const entry = db.UserPokedex.find(e => e.user_id === userId && e.pokemon_id === pokemonId);
        if (entry) entry.obtained = true;
        else insert(db, "UserPokedex", { user_id: userId, pokemon_id: pokemonId, obtained: true });
    }

    function addCaught(db, userId, pokemonId) {
        const mon = pokemonById(db, pokemonId);
        const row = insert(db, "UserPokemon", { user_id: userId, pokemon_id: pokemonId, rarity: mon.rarity, obtained_at: now() });
        markObtained(db, userId, pokemonId);
        return row;
    }

    function hasCleared(db, userId, orderIndex) {
        return db.UserCompletion.some(c => c.user_id === userId &&
            db.Gym.find(g => g.gym_id === c.gym_id)?.order_index === orderIndex);
    }

    function filterPokemon(list, query) {
        const { type, rarity, type1, type2 } = query;
        return list.filter(p =>
            (!type || p.type1 === type || p.type2 === type) &&
            (!(type1 && type2) || (p.type1 === type1 && p.type2 === type2) || (p.type1 === type2 && p.type2 === type1)) &&
            (!rarity || p.rarity === rarity)
        );
    }

    //////////////////////////////////////////////////////
    // Shop
    //////////////////////////////////////////////////////
    function rollRarity(odds) {
        const rand = Math.random();
        let total = 0;
        for (const rarity of ["common", "uncommon", "rare", "ultra"]) {
            total += odds[rarity];
            if (rand < total) return rarity;
        }
        return "common";
    }

    function rollPulls(odds, count, pityStart) {
        let pity = pityStart;
        const rarities = [];
        for (let i = 0; i < count; i++) {
            let rarity = rollRarity(odds);
            if (pity + 1 >= PITY_THRESHOLD && RARITY_RANK[rarity] < RARITY_RANK.rare) rarity = "rare";
            pity = RARITY_RANK[rarity] >= RARITY_RANK.rare ? 0 : pity + 1;
            rarities.push(rarity);
        }
        if (count > 1 && rarities.every(r => r === "common")) rarities[count - 1] = "uncommon";
        return { rarities, pity };
    }

    function catchPulls(db, userId, rarities, singlePrice) {
        const pool = { common: [], uncommon: [], rare: [], ultra: [] };
        db.Pokemon.filter(p => p.pokemon_id <= 151 && p.rarity !== "legendary")
            .forEach(p => pool[p.rarity] && pool[p.rarity].push(p));
        const owned = new Set(db.UserPokemon.filter(p => p.user_id === userId).map(p => p.pokemon_id));
        const pulls = [];
        let refund = 0;
        for (const rarity of rarities) {
            const choices = pool[rarity].length ? pool[rarity] : pool.common;
            const mon = choices[Math.floor(Math.random() * choices.length)];
            const duplicate = owned.has(mon.pokemon_id);
            if (duplicate) refund += Math.floor(singlePrice / 2);
            else {
                addCaught(db, userId, mon.pokemon_id);
                owned.add(mon.pokemon_id);
            }
            pulls.push({ pokemon_id: mon.pokemon_id, name: mon.name, rarity, duplicate });
        }
        return { pulls, refund };
    }

    function shopStatus(user) {
        return {
            pity_count: user.pity_count,
            pity_threshold: PITY_THRESHOLD,
            pulls_until_rare: Math.max(1, PITY_THRESHOLD - user.pity_count),
            daily_available: user.last_free_pull !== today(),
            multi_pull_count: MULTI_PULL_COUNT,
            multi_pull_discount: MULTI_PULL_DISCOUNT,
        };
    }

    function recordPulls(db, userId, itemName, pulls) {
        pulls.forEach(p => insert(db, "PullHistory", {
            user_id: userId, item_name: itemName, pokemon_id: p.pokemon_id, rarity: p.rarity, duplicate: p.duplicate, pulled_at: now(),
        }));
    }

    //////////////////////////////////////////////////////
    // Routes: [method, pattern, handler(db, req, params)]
    //////////////////////////////////////////////////////
    const routes = [
        // Auth
        ["POST", /^\/api\/register$/, async (db, req) => {
            const { username, email, password } = req.body;
            if (!username || !email) throw new ApiError(400, "username or email is undefined or empty");
            if (!password) throw new ApiError(400, "Password is required");
            if (db.User.some(u => u.username === username || u.email === email)) throw new ApiError(409, "Username or email already exists");
            const user = insert(db, "User", {
                username, email, password: await sha256(password), coins: 0, amulet_coins: 0, pity_count: 0, last_free_pull: null,
            });
            return [200, { message: undefined, token: newToken(db, user.user_id), userId: user.user_id }];
        }],
        ["POST", /^\/api\/demo$/, async (db) => {
            const suffix = Math.random().toString(16).slice(2, 8);
            const user = insert(db, "User", {
                username: `demo-${suffix}`, email: `demo-${suffix}@demo.invalid`, password: await sha256(String(Math.random())),
                coins: 500, amulet_coins: 0, pity_count: 0, last_free_pull: null,
            });
            return [200, { message: `Welcome, ${user.username}! This is a demo account with 500 coins.`, token: newToken(db, user.user_id), userId: user.user_id }];
        }],
        ["POST", /^\/api\/login$/, async (db, req) => {
            const { username, password } = req.body;
            if (!username) throw new ApiError(400, "username is undefined or empty");
            if (!password) throw new ApiError(400, "Password is required");
            const user = db.User.find(u => u.username === username);
            if (!user) throw new ApiError(404, "User not found");
            if (user.password !== await sha256(password)) throw new ApiError(401, "Wrong password");
            return [200, { token: newToken(db, user.user_id), userId: user.user_id }];
        }],

        // Users
        ["GET", /^\/api\/users$/, db => [200, db.User.map(u => ({ user_id: u.user_id, username: u.username, coins: u.coins, amulet_coins: u.amulet_coins }))]],
        ["GET", /^\/api\/users\/leaderboard$/, db => [200, db.User.map(u => ({
            user_id: u.user_id, username: u.username, coins: u.coins, amulet_coins: u.amulet_coins,
            badges: db.UserBadge.filter(b => b.user_id === u.user_id).length,
            caught: new Set(db.UserPokemon.filter(p => p.user_id === u.user_id).map(p => p.pokemon_id)).size,
        }))]],
        ["GET", /^\/api\/users\/(\d+)\/stats$/, (db, req, [id]) => {
            const userId = requireOwner(db, req, id);
            const battles = db.Battles.filter(b => b.user_id === userId && b.result);
            const wins = battles.filter(b => b.result === "win").length;
            return [200, {
                battles: battles.length, wins, losses: battles.length - wins,
                win_rate: battles.length ? Math.round((wins / battles.length) * 100) : 0,
                coins_earned: db.UserCompletion.filter(c => c.user_id === userId).reduce((s, c) => s + c.coins_awarded, 0),
                pulls: db.PullHistory.filter(p => p.user_id === userId).length,
                badges: db.UserBadge.filter(b => b.user_id === userId).length,
                caught: new Set(db.UserPokemon.filter(p => p.user_id === userId).map(p => p.pokemon_id)).size,
            }];
        }],
        ["GET", /^\/api\/users\/(\d+)$/, (db, req, [id]) => {
            requireOwner(db, req, id);
            const user = userById(db, id);
            if (!user) throw new ApiError(404, "User not found");
            return [200, publicUser(user)];
        }],
        ["PUT", /^\/api\/users\/(\d+)$/, async (db, req, [id]) => {
            const userId = requireOwner(db, req, id);
            const { username, email, password, currentPassword } = req.body;
            if (!username || !String(username).trim() || !email || !String(email).trim()) throw new ApiError(400, "Username and email are required.");
            if (!currentPassword) throw new ApiError(400, "Enter your current password to save changes.");
            const user = userById(db, userId);
            if (user.password !== await sha256(currentPassword)) throw new ApiError(403, "Current password is incorrect.");
            const name = String(username).trim(), mail = String(email).trim();
            if (db.User.some(u => u.user_id !== userId && (u.username === name || u.email === mail))) {
                throw new ApiError(409, "That username or email is already taken.");
            }
            user.username = name;
            user.email = mail;
            if (password) user.password = await sha256(password);
            return [200, { user_id: userId, username: name, email: mail, message: "Account updated." }];
        }],

        // Team
        ["GET", /^\/api\/team\/(\d+)$/, (db, req, [id]) => {
            const userId = requireAuth(db, req) && Number(id);
            const team = db.Team.filter(t => t.user_id === userId).sort((a, b) => a.slot - b.slot).map(t => ({
                slot: t.slot, user_pokemon_id: t.user_pokemon_id,
                pokemon_id: db.UserPokemon.find(p => p.id === t.user_pokemon_id)?.pokemon_id,
            }));
            const owned = db.UserPokemon.filter(p => p.user_id === userId).map(p => ({ user_pokemon_id: p.id, pokemon_id: p.pokemon_id }));
            return [200, { user_id: String(id), team, owned_pokemon: owned }];
        }],
        ["POST", /^\/api\/team\/(\d+)\/starter$/, (db, req, [id]) => {
            const userId = requireOwner(db, req, id);
            const starterId = req.body.starter_id;
            if (![1, 4, 7].includes(starterId)) throw new ApiError(400, "Invalid starter choice.");
            const row = addCaught(db, userId, starterId);
            insert(db, "Team", { user_id: userId, slot: 1, user_pokemon_id: row.id });
            return [201, { user_id: String(id), starter_pokemon: starterId, message: "Starter chosen successfully!" }];
        }],
        ["POST", /^\/api\/team\/(\d+)\/add$/, (db, req, [id]) => {
            const userId = requireOwner(db, req, id);
            const upId = Number(req.body.user_pokemon_id);
            const team = db.Team.filter(t => t.user_id === userId);
            if (team.length >= 6) throw new ApiError(403, "Team already has 6 Pokémon.");
            if (!db.UserPokemon.some(p => p.user_id === userId && p.id === upId)) throw new ApiError(403, "User does not own this Pokémon.");
            if (team.some(t => t.user_pokemon_id === upId)) throw new ApiError(409, "That Pokémon is already in your team.");
            insert(db, "Team", { user_id: userId, slot: team.reduce((m, t) => Math.max(m, t.slot), 0) + 1, user_pokemon_id: upId });
            return [201, { user_id: String(id), user_pokemon_id: upId, message: "Pokémon added to team." }];
        }],
        ["DELETE", /^\/api\/team\/(\d+)\/remove\/(\d+)$/, (db, req, [id, slot]) => {
            const userId = requireOwner(db, req, id);
            const team = db.Team.filter(t => t.user_id === userId);
            if (team.length <= 1) throw new ApiError(403, "Team must have at least 1 Pokémon.");
            db.Team = db.Team.filter(t => !(t.user_id === userId && t.slot === Number(slot)));
            db.Team.filter(t => t.user_id === userId).sort((a, b) => a.slot - b.slot).forEach((t, i) => { t.slot = i + 1; });
            return [200, { user_id: String(id), slot, message: "Pokémon removed from team." }];
        }],
        ["PUT", /^\/api\/team\/(\d+)\/reorder$/, (db, req, [id]) => {
            const userId = requireOwner(db, req, id);
            const order = (req.body.order || []).map(Number);
            if (order.length === 0 || order.length > 6) throw new ApiError(400, "A team needs 1 to 6 Pokémon.");
            if (new Set(order).size !== order.length) throw new ApiError(400, "A Pokémon can only be in the team once.");
            if (!order.every(upId => db.UserPokemon.some(p => p.user_id === userId && p.id === upId))) {
                throw new ApiError(403, "You can only use your own Pokémon.");
            }
            db.Team = db.Team.filter(t => t.user_id !== userId);
            order.forEach((upId, i) => insert(db, "Team", { user_id: userId, slot: i + 1, user_pokemon_id: upId }));
            return [200, { user_id: String(id), new_order: order, message: "Team reordered successfully." }];
        }],

        // Pokémon
        ["GET", /^\/api\/userpokemon\/(\d+)$/, (db, req, [id]) => {
            requireAuth(db, req);
            let rows = db.UserPokemon.filter(p => p.user_id === Number(id)).map(p => {
                const mon = pokemonById(db, p.pokemon_id);
                return { id: p.id, pokemon_id: p.pokemon_id, name: mon.name, rarity: mon.rarity, type1: mon.type1, type2: mon.type2, obtained_at: p.obtained_at };
            });
            if (req.query.rarity) rows = rows.filter(r => r.rarity === req.query.rarity);
            return [200, rows];
        }],
        ["GET", /^\/api\/pokemon$/, db => [200, db.UserPokemon.map(p => ({
            ...p, username: userById(db, p.user_id)?.username, pokemon_name: pokemonById(db, p.pokemon_id)?.name,
        }))]],

        // Pokédex
        ["GET", /^\/api\/pokedex$/, (db, req) => [200, filterPokemon(db.Pokemon, req.query)
            .map(({ pokemon_id, name, type1, type2, rarity }) => ({ pokemon_id, name, type1, type2, rarity }))]],
        ["GET", /^\/api\/pokedex\/(\d+)\/details$/, (db, req, [id]) => {
            const mon = pokemonById(db, id);
            if (!mon) throw new ApiError(404, "Pokédex entry not found");
            const base = baseStats[mon.pokemon_id] || null;
            return [200, {
                ...mon,
                base_stats: base,
                level: engine.PLAYER_LEVEL,
                stats: base ? engine.calcStats(mon.pokemon_id, engine.PLAYER_LEVEL) : null,
                moves: (movesets[mon.pokemon_id] || []).map(m => ({ name: m.name, type: m.type, power: m.power || 0, pp: m.pp, priority: m.priority || 0 })),
            }];
        }],
        ["GET", /^\/api\/userpokedex\/(\d+)$/, (db, req, [id]) => {
            const userId = Number(id);
            const obtained = new Set(db.UserPokedex.filter(e => e.user_id === userId && e.obtained).map(e => e.pokemon_id));
            const { type, rarity, type1, type2 } = req.query;
            let pokedex;
            if (type || rarity || (type1 && type2)) {
                pokedex = filterPokemon(db.Pokemon.filter(p => obtained.has(p.pokemon_id)), req.query).map(p => ({ ...p, obtained: 1 }));
            } else {
                pokedex = db.Pokemon.map(p => ({ ...p, obtained: obtained.has(p.pokemon_id) ? 1 : 0 }));
            }
            // Completing the Pokédex (all but Mew) unlocks Mew
            const count = [...obtained].filter(pid => pid !== 151).length;
            if (!obtained.has(151) && count === 150) {
                insert(db, "UserPokemon", { user_id: userId, pokemon_id: 151, rarity: "legendary", obtained_at: now() });
                markObtained(db, userId, 151);
                return [200, { pokedex, mew_awarded: true, message: "A mysterious Pokémon has joined your party..." }];
            }
            return [200, { pokedex }];
        }],

        // Shop
        ["GET", /^\/api\/shop\/items$/, db => [200, db.Shop]],
        ["GET", /^\/api\/shop\/(\d+)\/status$/, (db, req, [id]) => {
            const userId = requireOwner(db, req, id);
            return [200, shopStatus(userById(db, userId))];
        }],
        ["GET", /^\/api\/shop\/(\d+)\/history$/, (db, req, [id]) => {
            const userId = requireOwner(db, req, id);
            const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
            return [200, db.PullHistory.filter(p => p.user_id === userId).sort((a, b) => b.pull_id - a.pull_id).slice(0, limit)
                .map(p => ({ ...p, name: pokemonById(db, p.pokemon_id).name }))];
        }],
        ["POST", /^\/api\/shop\/(\d+)\/purchase$/, (db, req, [id]) => {
            const userId = requireOwner(db, req, id);
            const user = userById(db, userId);
            const item = db.Shop.find(s => s.item_id === Number(req.body.item_id));
            if (!req.body.item_id) throw new ApiError(400, "Error: item_id missing");
            if (!item) throw new ApiError(404, "Item not found.");
            const quantity = Number(req.body.quantity) === MULTI_PULL_COUNT ? MULTI_PULL_COUNT : 1;

            if (item.item_name.toLowerCase() === "amulet coin") {
                if (user.amulet_coins >= AMULET_COIN_LIMIT) throw new ApiError(403, `Amulet coin limit reached (${AMULET_COIN_LIMIT}).`);
                if (user.coins < item.price) throw new ApiError(403, "Not enough coins.");
                const before = { coins: user.coins, amulets: user.amulet_coins };
                user.coins -= item.price;
                user.amulet_coins += 1;
                return [201, {
                    user_id: String(id), item: item.item_name, coins_spent: item.price, coins_before: before.coins,
                    coins_after: user.coins, amulet_coins_before: before.amulets, amulet_coins_after: user.amulet_coins,
                }];
            }

            const odds = ODDS[item.item_name.toLowerCase().replace(/\s+/g, "")];
            if (!odds) throw new ApiError(400, "This item cannot be bought.");
            const cost = quantity === 1 ? item.price : Math.round(item.price * quantity * MULTI_PULL_DISCOUNT);
            if (user.coins < cost) throw new ApiError(403, "Not enough coins.");

            const coinsBefore = user.coins;
            const { rarities, pity } = rollPulls(odds, quantity, user.pity_count);
            const { pulls, refund } = catchPulls(db, userId, rarities, item.price);
            recordPulls(db, userId, item.item_name, pulls);
            user.coins = user.coins - cost + refund;
            user.pity_count = pity;
            return [201, {
                user_id: String(id), item: item.item_name, quantity, coins_spent: cost, coins_before: coinsBefore,
                coins_after: user.coins, refund, duplicate: pulls[0].duplicate, pokemon_awarded: pulls[0], pulls,
                amulet_coins_before: user.amulet_coins, amulet_coins_after: user.amulet_coins, ...shopStatus(user),
            }];
        }],
        ["POST", /^\/api\/shop\/(\d+)\/daily$/, (db, req, [id]) => {
            const userId = requireOwner(db, req, id);
            const user = userById(db, userId);
            if (user.last_free_pull === today()) throw new ApiError(403, "You already used today's free Poké Ball. Come back tomorrow!");
            user.last_free_pull = today();
            const coinsBefore = user.coins;
            const { rarities, pity } = rollPulls(ODDS.pokeball, 1, user.pity_count);
            const { pulls, refund } = catchPulls(db, userId, rarities, 100);
            recordPulls(db, userId, DAILY_ITEM_NAME, pulls);
            user.coins += refund;
            user.pity_count = pity;
            return [201, {
                user_id: String(id), item: DAILY_ITEM_NAME, quantity: 1, coins_spent: 0, coins_before: coinsBefore,
                coins_after: user.coins, refund, duplicate: pulls[0].duplicate, pokemon_awarded: pulls[0], pulls, ...shopStatus(user),
            }];
        }],

        // Gyms and badges
        ["GET", /^\/api\/challenges$/, (db, req) => {
            requireAuth(db, req);
            return [200, [...db.Gym].sort((a, b) => a.order_index - b.order_index).map(g => {
                const ids = gymTeamIds(g);
                return {
                    gym_id: g.gym_id, name: g.name, leader: g.leader, reward_first_clear: g.reward_first_clear,
                    reward_replay: g.reward_replay, pokemon_team_ids: ids,
                    pokemon_team_names: ids.map(pid => pokemonById(db, pid)?.name.toLowerCase()), order_index: g.order_index,
                };
            })];
        }],
        ["GET", /^\/api\/badges$/, db => [200, db.Badge.map(({ badge_id, name, gym_id }) => ({ badge_id, name, gym_id }))]],
        ["GET", /^\/api\/userbadges\/users\/(\d+)\/badges$/, (db, req, [id]) => {
            requireAuth(db, req);
            return [200, db.UserBadge.filter(b => b.user_id === Number(id)).map(ub => {
                const badge = db.Badge.find(b => b.badge_id === ub.badge_id);
                return { badge_id: badge.badge_id, name: badge.name, gym_id: badge.gym_id, obtained_at: ub.obtained_at };
            })];
        }],
        ["POST", /^\/api\/challenges\/(\d+)\/completions$/, (db, req, [gymId]) => {
            const userId = requireOwner(db, req, req.body.user_id);
            if (!req.body.battle_id) throw new ApiError(400, "Error: user_id or battle_id missing");
            const gym = db.Gym.find(g => g.gym_id === Number(gymId));
            if (!gym) throw new ApiError(404, "Gym not found.");
            if (gym.order_index > 1 && !hasCleared(db, userId, gym.order_index - 1)) throw new ApiError(403, "Previous gym not cleared yet.");

            const battle = db.Battles.find(b => b.battle_id === Number(req.body.battle_id));
            if (!battle || battle.user_id !== userId || battle.gym_id !== gym.gym_id || battle.result !== "win" || battle.claimed) {
                throw new ApiError(403, "Win a battle against this gym to claim its rewards.");
            }
            battle.claimed = true;

            const user = userById(db, userId);
            const isFirstClear = !db.UserCompletion.some(c => c.user_id === userId && c.gym_id === gym.gym_id);
            const baseCoins = isFirstClear ? gym.reward_first_clear : gym.reward_replay;
            const boost = 1 + 0.1 * Math.min(user.amulet_coins || 0, 10);
            const coins = Math.floor(baseCoins * boost);
            const completion = insert(db, "UserCompletion", {
                user_id: userId, gym_id: gym.gym_id, details: null, first_clear: isFirstClear, coins_awarded: coins, completed_at: now(),
            });
            user.coins += coins;

            let badgeAwarded = false;
            if (isFirstClear) {
                db.Badge.filter(b => b.gym_id === gym.gym_id).forEach(b => {
                    insert(db, "UserBadge", { user_id: userId, badge_id: b.badge_id, obtained_at: now() });
                    badgeAwarded = true;
                });
            }

            let amuletAwarded = false;
            if (Math.random() <= 0.1 && user.amulet_coins < AMULET_COIN_LIMIT) {
                user.amulet_coins += 1;
                amuletAwarded = true;
            }

            // Becoming Champion unlocks Mewtwo
            let mewtwoAwarded = false;
            const badgeCount = db.UserBadge.filter(b => b.user_id === userId).length;
            if (badgeCount === TOTAL_GYMS && !db.UserPokemon.some(p => p.user_id === userId && p.pokemon_id === 150)) {
                insert(db, "UserPokemon", { user_id: userId, pokemon_id: 150, rarity: "legendary", obtained_at: now() });
                markObtained(db, userId, 150);
                mewtwoAwarded = true;
            }

            return [201, {
                completion_id: completion.completion_id, user_id: String(userId), gym_id: gymId, coins_awarded: coins,
                boost_multiplier: boost, badge_awarded: badgeAwarded, amulet_awarded: amuletAwarded, mewtwo_awarded: mewtwoAwarded,
                message: mewtwoAwarded ? "Gym completed, rewards granted. Mewtwo has joined your party!" : "Gym completed, rewards granted.",
            }];
        }],

        // Battles
        ["POST", /^\/api\/battle\/start$/, (db, req) => {
            const userId = requireOwner(db, req, req.body.user_id);
            const gym = db.Gym.find(g => g.gym_id === Number(req.body.gym_id));
            if (!gym) throw new ApiError(404, "Gym not found.");
            if (gym.order_index > 1 && !hasCleared(db, userId, gym.order_index - 1)) throw new ApiError(403, "Beat the previous gym first.");

            const userRows = db.Team.filter(t => t.user_id === userId).sort((a, b) => a.slot - b.slot).map(t => {
                const up = db.UserPokemon.find(p => p.id === t.user_pokemon_id);
                const mon = pokemonById(db, up.pokemon_id);
                return { user_pokemon_id: up.id, pokemon_id: mon.pokemon_id, name: mon.name, type1: mon.type1, type2: mon.type2 };
            });
            if (userRows.length === 0) throw new ApiError(404, "Choose a starter on the Team page first.");
            const gymRows = gymTeamIds(gym).map(pid => pokemonById(db, pid)).filter(Boolean);

            const state = engine.createBattleState({ userRows, gymRows, leader: gym.leader, orderIndex: gym.order_index });
            const battle = insert(db, "Battles", { user_id: userId, gym_id: gym.gym_id, state, result: null, claimed: false, created_at: now() });
            return [201, { battle_id: battle.battle_id, state, result: null, events: [], message: "Battle started!" }];
        }],
        ["POST", /^\/api\/battle\/(\d+)\/turn$/, (db, req, [battleId]) => {
            const userId = requireAuth(db, req);
            const battle = db.Battles.find(b => b.battle_id === Number(battleId));
            if (!battle) throw new ApiError(404, "Battle not found");
            if (battle.user_id !== userId) throw new ApiError(403, "Forbidden: Not your battle");
            if (battle.result) throw new ApiError(400, "This battle has already finished.");
            const { action = "move", move_name, target } = req.body;
            let outcome;
            try {
                outcome = engine.resolveTurn(battle.state, action === "switch" ? { type: "switch", target } : { type: "move", move: move_name });
            } catch (err) {
                if (err instanceof engine.BattleError) throw new ApiError(err.status, err.message);
                throw err;
            }
            battle.result = outcome.result;
            return [200, {
                battle_id: String(battleId), state: battle.state, events: outcome.events, result: outcome.result,
                message: outcome.result === "win" ? "Victory! Challenge completed." : outcome.result === "lose" ? "Defeat..." : "Turn completed.",
            }];
        }],
        ["POST", /^\/api\/battle\/(\d+)\/end$/, (db, req, [battleId]) => {
            const userId = requireAuth(db, req);
            const battle = db.Battles.find(b => b.battle_id === Number(battleId));
            if (!battle) throw new ApiError(404, "Battle not found");
            if (battle.user_id !== userId) throw new ApiError(403, "Forbidden: Not your battle");
            if (battle.result) return [200, { battle_id: battle.battle_id, result: battle.result, message: "Battle already finished." }];
            engine.surrender(battle.state);
            battle.result = "lose";
            return [200, { battle_id: battle.battle_id, result: "lose", message: "Defeat..." }];
        }],
    ];

    //////////////////////////////////////////////////////
    // fetch() hook
    //////////////////////////////////////////////////////
    const realFetch = window.fetch.bind(window);

    async function handle(url, options) {
        const db = await loadDb();
        const method = (options.method || "GET").toUpperCase();
        const headers = {};
        new Headers(options.headers || {}).forEach((v, k) => { headers[k.toLowerCase()] = v; });
        let body = {};
        try { body = options.body ? JSON.parse(options.body) : {}; } catch (e) { body = {}; }
        const req = { method, headers, body, query: Object.fromEntries(url.searchParams) };
        const routePath = url.pathname.slice(url.pathname.indexOf("/api/"));

        for (const [m, pattern, handler] of routes) {
            if (m !== method) continue;
            const match = routePath.match(pattern);
            if (!match) continue;
            try {
                const [status, data] = await handler(db, req, match.slice(1));
                saveDb(db);
                return [status, data];
            } catch (err) {
                if (err instanceof ApiError) return [err.status, { message: err.message }];
                console.error("Demo API error:", err);
                return [500, { message: "Internal server error." }];
            }
        }
        return [404, { message: "Route not found" }];
    }

    window.fetch = async function (input, options = {}) {
        const url = new URL(typeof input === "string" ? input : input.url, window.location.href);
        if (!url.pathname.includes("/api/")) return realFetch(input, options);
        const [status, data] = await handle(url, options);
        return new Response(JSON.stringify(data ?? {}), { status, headers: { "Content-Type": "application/json" } });
    };

    // Small banner so visitors know progress is saved in their browser
    document.addEventListener("DOMContentLoaded", () => {
        if (sessionStorage.getItem("pokebattle-demo-banner-hidden")) return;
        const style = document.createElement("style");
        style.textContent = `
            .demo-banner { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 1500;
              display: flex; align-items: center; gap: 12px; width: max-content; max-width: calc(100% - 32px);
              padding: 10px 10px 10px 16px; border-radius: 12px; background: var(--ink, #161925); color: #fff;
              font-size: 0.85rem; box-shadow: 0 18px 40px rgba(22, 25, 37, 0.3); }
            .demo-banner button { flex: none; width: 30px; height: 30px; padding: 0; border-radius: 8px;
              background: rgba(255, 255, 255, 0.12); color: #fff; font-size: 1.1rem; }`;
        document.head.appendChild(style);
        const bar = document.createElement("div");
        bar.className = "demo-banner";
        bar.innerHTML = `<span><strong>Demo version:</strong> this copy runs fully in your browser, and your progress is saved on this device.</span>
            <button type="button" aria-label="Hide this message">×</button>`;
        bar.querySelector("button").addEventListener("click", () => {
            bar.remove();
            try { sessionStorage.setItem("pokebattle-demo-banner-hidden", "1"); } catch (e) { /* ignore */ }
        });
        document.body.appendChild(bar);
    });
})();
