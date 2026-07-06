const pool = require('../services/db');

// Get all Pokédex entries
module.exports.findAll = (callback) => {
    const SQL = `
        SELECT pokemon_id, name, type1, type2, rarity
        FROM Pokemon
        ORDER BY pokemon_id ASC;
    `;
    pool.query(SQL, callback);
};

// Get Pokédex entry by ID
module.exports.findById = (id, callback) => {
    const SQL = `
        SELECT pokemon_id, name, type1, type2, rarity
        FROM Pokemon
        WHERE pokemon_id = ?;
    `;
    pool.query(SQL, [id], callback);
};

// Filter by type(s) and/or rarity
module.exports.findByFilter = (type, rarity, type1, type2, callback) => {
    let SQL = `
        SELECT pokemon_id, name, type1, type2, rarity
        FROM Pokemon
        WHERE 1=1
    `;
    const VALUES = [];

    // Single type filter (matches either type1 or type2)
    if (type) {
        SQL += " AND (type1 = ? OR type2 = ?)";
        VALUES.push(type, type);
    }

    // Dual type filter (must match both type1 and type2)
    if (type1 && type2) {
        SQL += " AND ((type1 = ? AND type2 = ?) OR (type1 = ? AND type2 = ?))";
        VALUES.push(type1, type2, type2, type1);
    }

    // Rarity filter
    if (rarity) {
        SQL += " AND rarity = ?";
        VALUES.push(rarity);
    }

    SQL += " ORDER BY pokemon_id ASC;";
    pool.query(SQL, VALUES, callback);
};