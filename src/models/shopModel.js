const pool = require('../services/db');

// Get user's current coin balance
module.exports.getUserCoins = (user_id, callback) => {
    const SQL = `SELECT coins FROM User WHERE user_id = ?;`;
    pool.query(SQL, [user_id], callback);
};

// Update user's coin balance (positive or negative adjustment)
module.exports.updateCoins = (data, callback) => {
    const SQL = `UPDATE User SET coins = coins + ? WHERE user_id = ?;`;
    pool.query(SQL, [data.coins, data.user_id], callback);
};

// Get current amulet coin count directly from User table
module.exports.getAmuletCoins = (user_id, callback) => {
    const SQL = `SELECT amulet_coins AS count FROM User WHERE user_id = ?;`;
    pool.query(SQL, [user_id], callback);
};

// Increment amulet coin count for user
module.exports.addAmuletCoin = (user_id, callback) => {
    const SQL = `UPDATE User SET amulet_coins = amulet_coins + 1 WHERE user_id = ?;`;
    pool.query(SQL, [user_id], callback);
};

// Insert Pokémon into UserPokemon
module.exports.insertPokemon = (data, callback) => {
    const SQL = `INSERT INTO UserPokemon (user_id, pokemon_id) VALUES (?, ?);`;
    pool.query(SQL, [data.user_id, data.pokemon_id], callback);
};

// Check if user already owns a Pokémon (for duplicate detection)
module.exports.checkUserPokemon = (data, callback) => {
    const SQL = `SELECT * FROM UserPokemon WHERE user_id = ? AND pokemon_id = ?;`;
    pool.query(SQL, [data.user_id, data.pokemon_id], callback);
};

// Update UserPokedex (mark Pokémon as obtained)
module.exports.updatePokedex = (data, callback) => {
    const SQL = `
        INSERT INTO UserPokedex (user_id, pokemon_id, obtained)
        VALUES (?, ?, TRUE)
        ON DUPLICATE KEY UPDATE obtained = TRUE;
    `;
    pool.query(SQL, [data.user_id, data.pokemon_id], callback);
};

// Get all shop items
module.exports.getAllItems = (callback) => {
    const SQL = `SELECT item_id, item_name, price, effect FROM Shop;`;
    pool.query(SQL, callback);
};

// Get single shop item by ID
module.exports.getItemById = (item_id, callback) => {
    const SQL = `SELECT item_id, item_name, price, effect FROM Shop WHERE item_id = ?;`;
    pool.query(SQL, [item_id], callback);
};