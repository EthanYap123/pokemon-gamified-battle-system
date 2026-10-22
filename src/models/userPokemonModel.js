const pool = require('../services/db');

// Task - Get all Pokémon owned by a user
module.exports.findByUser = (user_id, callback) => {
    const SQLSTATEMENT = `
        SELECT up.id, up.pokemon_id, p.name, p.rarity, p.type1, p.type2, up.obtained_at
        FROM UserPokemon up
        JOIN Pokemon p ON up.pokemon_id = p.pokemon_id
        WHERE up.user_id = ?
        ORDER BY up.id ASC;
    `;
    const VALUES = [user_id];
    pool.query(SQLSTATEMENT, VALUES, callback);
};

// Task - Get all Pokémon owned by a user filtered by rarity
module.exports.findByUserAndRarity = (user_id, rarity, callback) => {
    const SQLSTATEMENT = `
        SELECT up.id, p.name, p.rarity, p.type1, p.type2, up.obtained_at
        FROM UserPokemon up
        JOIN Pokemon p ON up.pokemon_id = p.pokemon_id
        WHERE up.user_id = ? AND p.rarity = ?;
    `;
    const VALUES = [user_id, rarity];
    pool.query(SQLSTATEMENT, VALUES, callback);
};

// Task - Insert new Pokémon into UserPokemon
module.exports.insertSingle = (data, callback) => {
    const SQLSTATEMENT = `
        INSERT INTO UserPokemon (user_id, pokemon_id, rarity)
        VALUES (?, ?, ?);
    `;
    const VALUES = [
        data.user_id,
        data.pokemon_id,
        data.rarity
    ];
    pool.query(SQLSTATEMENT, VALUES, callback);
};