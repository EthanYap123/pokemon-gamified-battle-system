const pool = require('../services/db');

// Functions taking `conn` run inside the purchase transaction
// (a connection from pool.promise().getConnection()).

// The daily ball resets at midnight Singapore time
const TODAY = `(NOW() AT TIME ZONE 'Asia/Singapore')::date`;

// Get all shop items
module.exports.getAllItems = (callback) => {
    const SQL = `SELECT item_id, item_name, price, effect FROM Shop;`;
    pool.query(SQL, callback);
};

// Get single shop item by ID
module.exports.getItemById = async (item_id) => {
    const SQL = `SELECT item_id, item_name, price, effect FROM Shop WHERE item_id = ?;`;
    const [rows] = await pool.promise().query(SQL, [item_id]);
    return rows[0] || null;
};

// Gacha pool: every catchable Pokémon grouped by its Pokédex rarity
module.exports.getCatchablePokemon = async () => {
    const SQL = `
        SELECT pokemon_id, name, rarity
        FROM Pokemon
        WHERE pokemon_id BETWEEN 1 AND 151 AND rarity <> 'legendary';
    `;
    const [rows] = await pool.promise().query(SQL);
    return rows;
};

// Lock the user's row for this purchase
module.exports.getUserForUpdate = async (conn, user_id) => {
    const SQL = `
        SELECT coins, amulet_coins, pity_count,
               (last_free_pull IS NULL OR last_free_pull < ${TODAY}) AS daily_available
        FROM Users WHERE user_id = ? FOR UPDATE;
    `;
    const [rows] = await conn.query(SQL, [user_id]);
    return rows[0] || null;
};

module.exports.updateUserAfterPurchase = async (conn, data) => {
    const SQL = `
        UPDATE Users
        SET coins = coins + ?, amulet_coins = amulet_coins + ?, pity_count = ?
        WHERE user_id = ?;
    `;
    await conn.query(SQL, [data.coinChange, data.amuletChange || 0, data.pity_count, data.user_id]);
};

module.exports.useDailyPull = async (conn, user_id) => {
    const SQL = `UPDATE Users SET last_free_pull = ${TODAY} WHERE user_id = ?;`;
    await conn.query(SQL, [user_id]);
};

module.exports.getOwnedPokemonIds = async (conn, user_id) => {
    const [rows] = await conn.query(`SELECT DISTINCT pokemon_id FROM UserPokemon WHERE user_id = ?;`, [user_id]);
    return new Set(rows.map(r => r.pokemon_id));
};

// Insert Pokémon into UserPokemon with its species rarity, and mark it in the Pokédex
module.exports.addCaughtPokemon = async (conn, user_id, pokemon_id) => {
    await conn.query(
        `INSERT INTO UserPokemon (user_id, pokemon_id, rarity)
         SELECT ?::int, pokemon_id, rarity FROM Pokemon WHERE pokemon_id = ?;`,
        [user_id, pokemon_id]
    );
    await conn.query(
        `INSERT INTO UserPokedex (user_id, pokemon_id, obtained)
         VALUES (?, ?, TRUE)
         ON CONFLICT (user_id, pokemon_id) DO UPDATE SET obtained = TRUE;`,
        [user_id, pokemon_id]
    );
};

module.exports.addPullHistory = async (conn, user_id, item_name, pulls) => {
    if (pulls.length === 0) return;
    const values = pulls.map(p => [user_id, item_name, p.pokemon_id, p.rarity, p.duplicate]);
    await conn.query(
        `INSERT INTO PullHistory (user_id, item_name, pokemon_id, rarity, duplicate) VALUES ?;`,
        [values]
    );
};

// Pity counter and daily ball status for the shop page
module.exports.getStatus = async (user_id) => {
    const SQL = `
        SELECT pity_count, (last_free_pull IS NULL OR last_free_pull < ${TODAY}) AS daily_available
        FROM Users WHERE user_id = ?;
    `;
    const [rows] = await pool.promise().query(SQL, [user_id]);
    return rows[0] || null;
};

// Latest pulls, newest first
module.exports.getHistory = async (user_id, limit) => {
    const SQL = `
        SELECT ph.pull_id, ph.item_name, ph.pokemon_id, p.name, ph.rarity, ph.duplicate, ph.pulled_at
        FROM PullHistory ph
        JOIN Pokemon p ON ph.pokemon_id = p.pokemon_id
        WHERE ph.user_id = ?
        ORDER BY ph.pull_id DESC
        LIMIT ?;
    `;
    const [rows] = await pool.promise().query(SQL, [user_id, limit]);
    return rows;
};
