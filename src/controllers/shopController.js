const pool = require('../services/db');
const shopModel = require('../models/shopModel');

//////////////////////////////////////////////////////
// GACHA RULES
//////////////////////////////////////////////////////
const ODDS = {
    pokeball: { common: 0.7, uncommon: 0.25, rare: 0.05, ultra: 0 },
    greatball: { common: 0.5, uncommon: 0.4, rare: 0.09, ultra: 0.01 },
    ultraball: { common: 0.3, uncommon: 0.5, rare: 0.18, ultra: 0.02 },
};
const RARITY_RANK = { common: 0, uncommon: 1, rare: 2, ultra: 3 };
const PITY_THRESHOLD = 30;     // the 30th pull without a rare is a guaranteed rare
const MULTI_PULL_COUNT = 10;
const MULTI_PULL_DISCOUNT = 0.9;
const AMULET_COIN_LIMIT = 10;
const DAILY_ITEM_NAME = "Daily Poke Ball";

// Pool grouped by rarity, loaded once from the Pokémon table
let poolPromise = null;
function getGachaPool() {
    if (!poolPromise) {
        poolPromise = shopModel.getCatchablePokemon().then(rows => {
            const grouped = { common: [], uncommon: [], rare: [], ultra: [] };
            rows.forEach(r => grouped[r.rarity] && grouped[r.rarity].push(r));
            return grouped;
        }).catch(err => {
            poolPromise = null; // try again next time
            throw err;
        });
    }
    return poolPromise;
}

function ballKey(itemName) {
    return String(itemName).toLowerCase().replace(/é/g, "e").replace(/\s+/g, "");
}

function rollRarity(odds) {
    const rand = Math.random();
    let total = 0;
    for (const rarity of ["common", "uncommon", "rare", "ultra"]) {
        total += odds[rarity];
        if (rand < total) return rarity;
    }
    return "common";
}

// Roll `count` pulls, applying pity and the multi-pull guarantee
function rollPulls(odds, count, pityStart) {
    let pity = pityStart;
    const rarities = [];
    for (let i = 0; i < count; i++) {
        let rarity = rollRarity(odds);
        if (pity + 1 >= PITY_THRESHOLD && RARITY_RANK[rarity] < RARITY_RANK.rare) rarity = "rare";
        pity = RARITY_RANK[rarity] >= RARITY_RANK.rare ? 0 : pity + 1;
        rarities.push(rarity);
    }
    // A 10-pull always has at least one uncommon or better
    if (count > 1 && rarities.every(r => r === "common")) rarities[count - 1] = "uncommon";
    return { rarities, pity };
}

function statusPayload(row) {
    return {
        pity_count: row.pity_count,
        pity_threshold: PITY_THRESHOLD,
        pulls_until_rare: Math.max(1, PITY_THRESHOLD - row.pity_count),
        daily_available: Boolean(row.daily_available),
        multi_pull_count: MULTI_PULL_COUNT,
        multi_pull_discount: MULTI_PULL_DISCOUNT,
    };
}

// Catch the rolled Pokémon; duplicates refund half the single-ball price
async function catchPulls(conn, user_id, rarities, singlePrice) {
    const gachaPool = await getGachaPool();
    const owned = await shopModel.getOwnedPokemonIds(conn, user_id);
    const pulls = [];
    let refund = 0;

    for (const rarity of rarities) {
        const choices = gachaPool[rarity].length ? gachaPool[rarity] : gachaPool.common;
        const mon = choices[Math.floor(Math.random() * choices.length)];
        const duplicate = owned.has(mon.pokemon_id);
        if (duplicate) {
            refund += Math.floor(singlePrice / 2);
        } else {
            await shopModel.addCaughtPokemon(conn, user_id, mon.pokemon_id);
            owned.add(mon.pokemon_id);
        }
        pulls.push({ pokemon_id: mon.pokemon_id, name: mon.name, rarity, duplicate });
    }
    return { pulls, refund };
}

// Run fn inside a transaction on one connection
async function withTransaction(fn) {
    const conn = await pool.promise().getConnection();
    try {
        await conn.beginTransaction();
        const result = await fn(conn);
        await conn.commit();
        return result;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

class ShopError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function sendError(res, err, where) {
    if (err instanceof ShopError) return res.status(err.status).json({ message: err.message });
    console.error(`Error ${where}:`, err);
    return res.status(500).json({ message: "Internal server error." });
}

//////////////////////////////////////////////////////
// ROUTES
//////////////////////////////////////////////////////

// Get all shop items
module.exports.getItems = (req, res) => {
    shopModel.getAllItems((err, results) => {
        if (err) return res.status(500).json({ message: "Internal server error." });
        return res.status(200).json(results);
    });
};

// Purchase item by ID. Balls accept quantity 1 or 10.
module.exports.purchaseItem = async (req, res) => {
    const { item_id } = req.body;
    const user_id = req.params.user_id;
    const quantity = Number(req.body.quantity) === MULTI_PULL_COUNT ? MULTI_PULL_COUNT : 1;

    if (!item_id) {
        return res.status(400).json({ message: "Error: item_id missing" });
    }

    try {
        const item = await shopModel.getItemById(item_id);
        if (!item) return res.status(404).json({ message: "Item not found." });

        const isAmulet = item.item_name.toLowerCase() === "amulet coin";
        const odds = ODDS[ballKey(item.item_name)];
        if (!isAmulet && !odds) return res.status(400).json({ message: "This item cannot be bought." });

        const payload = await withTransaction(async (conn) => {
            const user = await shopModel.getUserForUpdate(conn, user_id);
            if (!user) throw new ShopError(404, "User not found.");

            // Amulet Coin logic
            if (isAmulet) {
                if (user.amulet_coins >= AMULET_COIN_LIMIT) {
                    throw new ShopError(403, `Amulet coin limit reached (${AMULET_COIN_LIMIT}).`);
                }
                if (user.coins < item.price) throw new ShopError(403, "Not enough coins.");
                await shopModel.updateUserAfterPurchase(conn, {
                    user_id, coinChange: -item.price, amuletChange: 1, pity_count: user.pity_count,
                });
                return {
                    user_id,
                    item: item.item_name,
                    coins_spent: item.price,
                    coins_before: user.coins,
                    coins_after: user.coins - item.price,
                    amulet_coins_before: user.amulet_coins,
                    amulet_coins_after: user.amulet_coins + 1,
                };
            }

            // Ball logic → roll Pokémon
            const cost = quantity === 1 ? item.price : Math.round(item.price * quantity * MULTI_PULL_DISCOUNT);
            if (user.coins < cost) throw new ShopError(403, "Not enough coins.");

            const { rarities, pity } = rollPulls(odds, quantity, user.pity_count);
            const { pulls, refund } = await catchPulls(conn, user_id, rarities, item.price);
            await shopModel.addPullHistory(conn, user_id, item.item_name, pulls);
            await shopModel.updateUserAfterPurchase(conn, {
                user_id, coinChange: refund - cost, pity_count: pity,
            });

            return {
                user_id,
                item: item.item_name,
                quantity,
                coins_spent: cost,
                coins_before: user.coins,
                coins_after: user.coins - cost + refund,
                refund,
                duplicate: pulls[0].duplicate,
                pokemon_awarded: pulls[0],
                pulls,
                amulet_coins_before: user.amulet_coins,
                amulet_coins_after: user.amulet_coins,
                ...statusPayload({ pity_count: pity, daily_available: user.daily_available }),
            };
        });

        return res.status(201).json(payload);
    } catch (err) {
        return sendError(res, err, "purchaseItem");
    }
};

// Free Poké Ball once a day
module.exports.claimDaily = async (req, res) => {
    const user_id = req.params.user_id;

    try {
        const payload = await withTransaction(async (conn) => {
            const user = await shopModel.getUserForUpdate(conn, user_id);
            if (!user) throw new ShopError(404, "User not found.");
            if (!user.daily_available) throw new ShopError(403, "You already used today's free Poké Ball. Come back tomorrow!");

            await shopModel.useDailyPull(conn, user_id);
            const { rarities, pity } = rollPulls(ODDS.pokeball, 1, user.pity_count);
            const { pulls, refund } = await catchPulls(conn, user_id, rarities, 100);
            await shopModel.addPullHistory(conn, user_id, DAILY_ITEM_NAME, pulls);
            await shopModel.updateUserAfterPurchase(conn, { user_id, coinChange: refund, pity_count: pity });

            return {
                user_id,
                item: DAILY_ITEM_NAME,
                quantity: 1,
                coins_spent: 0,
                coins_before: user.coins,
                coins_after: user.coins + refund,
                refund,
                duplicate: pulls[0].duplicate,
                pokemon_awarded: pulls[0],
                pulls,
                ...statusPayload({ pity_count: pity, daily_available: false }),
            };
        });
        return res.status(201).json(payload);
    } catch (err) {
        return sendError(res, err, "claimDaily");
    }
};

// Pity counter + daily ball availability
module.exports.getStatus = async (req, res) => {
    try {
        const row = await shopModel.getStatus(req.params.user_id);
        if (!row) return res.status(404).json({ message: "User not found." });
        return res.status(200).json(statusPayload(row));
    } catch (err) {
        return sendError(res, err, "getStatus");
    }
};

// Recent pulls
module.exports.getHistory = async (req, res) => {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    try {
        const rows = await shopModel.getHistory(req.params.user_id, limit);
        return res.status(200).json(rows.map(r => ({ ...r, duplicate: Boolean(r.duplicate) })));
    } catch (err) {
        return sendError(res, err, "getHistory");
    }
};
