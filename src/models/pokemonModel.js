const pool = require('../services/db');

// Task - Get All User-owned Pokémon with username and Pokémon name
module.exports.findAll = (callback) => {
  const SQLSTATEMENT = `
    SELECT 
      up.*, 
      u.username, 
      p.name AS pokemon_name
    FROM UserPokemon up
    INNER JOIN User u ON up.user_id = u.user_id
    INNER JOIN Pokemon p ON up.pokemon_id = p.pokemon_id;
  `;
  pool.query(SQLSTATEMENT, callback);
};

// Task - Get Pokémon by ID
module.exports.findById = (id, callback) => {
    const SQLSTATEMENT = `
        SELECT * FROM UserPokemon WHERE pokemon_id = ?;
    `;
    const VALUES = [id];
    pool.query(SQLSTATEMENT, VALUES, callback);
};

// Task - Get Pokémon by Type
module.exports.findByType = (type, callback) => {
    const SQLSTATEMENT = `
        SELECT pokemon_id, name, rarity, type1, type2
        FROM Pokemon
        WHERE type1 = ? OR type2 = ?
        ORDER BY pokemon_id ASC;
    `;
    const VALUES = [type, type];
    pool.query(SQLSTATEMENT, VALUES, callback);
};

// Task - Insert New Pokémon (reference data)
module.exports.insertSingle = (data, callback) => {
    const SQLSTATEMENT = `
        INSERT INTO Pokemon (name, rarity, type1, type2)
        VALUES (?, ?, ?, ?);
    `;
    const types = Array.isArray(data.types) ? data.types : [data.types];
    const VALUES = [
        data.name,
        data.rarity,
        types[0],
        types[1] || null
    ];
    pool.query(SQLSTATEMENT, VALUES, callback);
};