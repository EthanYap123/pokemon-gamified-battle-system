const pool = require('../services/db');

// 1. Get full Pokédex with user status (all 151, obtained true/false)
module.exports.findByUser = (user_id, callback) => {
  const SQL = `
    SELECT 
      p.pokemon_id,
      p.name,
      p.rarity,
      p.type1,
      p.type2,
      COALESCE(up.obtained, false) AS obtained
    FROM Pokemon p
    LEFT JOIN UserPokedex up 
      ON p.pokemon_id = up.pokemon_id AND up.user_id = ?
    ORDER BY p.pokemon_id;
  `;
  pool.query(SQL, [user_id], callback);
};

// 2. Get Pokédex entries for a user filtered by obtained status
module.exports.findByUserAndObtained = (user_id, obtained, callback) => {
  const SQL = `
    SELECT 
      p.pokemon_id,
      p.name,
      p.rarity,
      p.type1,
      p.type2,
      up.obtained
    FROM UserPokedex up
    JOIN Pokemon p ON up.pokemon_id = p.pokemon_id
    WHERE up.user_id = ? AND up.obtained = ?;
  `;
  pool.query(SQL, [user_id, obtained], callback);
};

// 3. Get Pokédex entries for a user filtered by type/rarity
module.exports.findByUserWithFilter = (user_id, type, rarity, type1, type2, callback) => {
  let SQL = `
    SELECT 
      p.pokemon_id,
      p.name,
      p.rarity,
      p.type1,
      p.type2,
      up.obtained
    FROM UserPokedex up
    JOIN Pokemon p ON up.pokemon_id = p.pokemon_id
    WHERE up.user_id = ? AND up.obtained = TRUE
  `;
  const VALUES = [user_id];

  if (type) {
    SQL += " AND (p.type1 = ? OR p.type2 = ?)";
    VALUES.push(type, type);
  }

  if (type1 && type2) {
    SQL += " AND ((p.type1 = ? AND p.type2 = ?) OR (p.type1 = ? AND p.type2 = ?))";
    VALUES.push(type1, type2, type2, type1);
  }

  if (rarity) {
    SQL += " AND p.rarity = ?";
    VALUES.push(rarity);
  }

  SQL += " ORDER BY p.pokemon_id ASC;";
  pool.query(SQL, VALUES, callback);
};

// 4. Insert or update a Pokédex entry for a user
module.exports.upsertEntry = (data, callback) => {
  const SQL = `
    INSERT INTO UserPokedex (user_id, pokemon_id, obtained)
    VALUES (?, ?, TRUE)
    ON CONFLICT (user_id, pokemon_id) DO UPDATE SET obtained = TRUE;
  `;
  pool.query(SQL, [data.user_id, data.pokemon_id], callback);
};