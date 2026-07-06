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
        SELECT * FROM UserPokemon WHERE JSON_CONTAINS(types, ?);
    `;
    const VALUES = [JSON.stringify(type)];
    pool.query(SQLSTATEMENT, VALUES, callback);
};

// Task - Insert New Pokémon (reference data)
module.exports.insertSingle = (data, callback) => {
    const SQLSTATEMENT = `
        INSERT INTO UserPokemon (name, rarity, types)
        VALUES (?, ?, ?);
    `;
    const VALUES = [
        data.name,
        data.rarity,
        JSON.stringify(data.types)
    ];
    pool.query(SQLSTATEMENT, VALUES, callback);
};