const pool = require('../services/db');

// 1. Add Starter (insert into UserPokemon, UserPokedex, Team slot 1)
module.exports.addStarter = (data, callback) => {
    const { user_id, pokemon_id } = data;

    const SQL1 = `
        INSERT INTO UserPokemon (user_id, pokemon_id, rarity)
        SELECT ?, pokemon_id, rarity FROM Pokemon WHERE pokemon_id = ?;
    `;
    pool.query(SQL1, [user_id, pokemon_id], (err1, result1) => {
        if (err1) {
            console.error("SQL1 failed (UserPokemon insert):", err1);
            return callback(err1);
        }

        const userPokemonId = result1.insertId;

        const SQL2 = `
        INSERT INTO UserPokedex (user_id, pokemon_id, obtained)
        VALUES (?, ?, TRUE)
        ON DUPLICATE KEY UPDATE obtained = TRUE;
        `;
        pool.query(SQL2, [user_id, pokemon_id], (err2, result2) => {
            if (err2) {
                console.error("SQL2 failed (UserPokedex insert/update):", err2);
                return callback(err2);
            }

            const SQL3 = `INSERT INTO Team (user_id, slot, user_pokemon_id) VALUES (?, 1, ?);`;
            pool.query(SQL3, [user_id, userPokemonId], (err3, result3) => {
                if (err3) {
                    console.error("SQL3 failed (Team insert):", err3);
                    return callback(err3);
                }
                callback(null, result3);
            });
        });
    });
};

// 2. Get Team
module.exports.getTeam = (user_id, callback) => {
    const SQL = `
    SELECT T.slot, T.user_pokemon_id, U.pokemon_id
    FROM Team T
    JOIN UserPokemon U ON T.user_pokemon_id = U.id
    WHERE T.user_id = ?
    ORDER BY T.slot ASC;
  `;
    pool.query(SQL, [user_id], callback);
};

// 3. Get Owned Pokémon
module.exports.getOwnedPokemon = (user_id, callback) => {
    const SQL = `SELECT id AS user_pokemon_id, pokemon_id FROM UserPokemon WHERE user_id = ?;`;
    pool.query(SQL, [user_id], callback);
};

// 4. Add Pokémon to Team
module.exports.addPokemonToTeam = (data, callback) => {
    const { user_id, user_pokemon_id } = data;

    // Check team size
    const SQL1 = `SELECT COUNT(*) AS count FROM Team WHERE user_id = ?;`;
    pool.query(SQL1, [user_id], (err1, results1) => {
        if (err1) return callback(err1);
        if (results1[0].count >= 6) return callback({ code: "TEAM_FULL" });

        // Check ownership
        const SQL2 = `SELECT id FROM UserPokemon WHERE user_id = ? AND id = ?;`;
        pool.query(SQL2, [user_id, user_pokemon_id], (err2, results2) => {
            if (err2) return callback(err2);
            if (results2.length === 0) return callback({ code: "NOT_OWNED" });

            // Check duplicate
            const SQL3 = `SELECT * FROM Team WHERE user_id = ? AND user_pokemon_id = ?;`;
            pool.query(SQL3, [user_id, user_pokemon_id], (err3, results3) => {
                if (err3) return callback(err3);
                if (results3.length > 0) return callback({ code: "ALREADY_IN_TEAM" });

                // Get next slot
                const SQL4 = `SELECT COALESCE(MAX(slot), 0) + 1 AS nextSlot FROM Team WHERE user_id = ?;`;
                pool.query(SQL4, [user_id], (err4, results4) => {
                    if (err4) return callback(err4);

                    const nextSlot = results4[0].nextSlot;
                    const SQL5 = `INSERT INTO Team (user_id, slot, user_pokemon_id) VALUES (?, ?, ?);`;
                    pool.query(SQL5, [user_id, nextSlot, user_pokemon_id], callback);
                });
            });
        });
    });
};

// 5. Remove Pokémon from Team
module.exports.removePokemonFromTeam = (data, callback) => {
    const { user_id, slot } = data;

    const SQL1 = `SELECT COUNT(*) AS count FROM Team WHERE user_id = ?;`;
    pool.query(SQL1, [user_id], (err1, results1) => {
        if (err1) return callback(err1);
        if (results1[0].count <= 1) return callback({ code: "TEAM_MIN" });

        const SQL2 = `DELETE FROM Team WHERE user_id = ? AND slot = ?;`;
        pool.query(SQL2, [user_id, slot], (err2) => {
            if (err2) return callback(err2);

            // Renumber slots
            const SQL3 = `
        SET @rownum := 0;
        UPDATE Team
        SET slot = (@rownum := @rownum + 1)
        WHERE user_id = ?
        ORDER BY slot;
      `;
            pool.query(SQL3, [user_id], callback);
        });
    });
};

// 6. Reorder Team
module.exports.reorderTeam = (data, callback) => {
    const { user_id, order } = data;

    const SQL1 = `DELETE FROM Team WHERE user_id = ?;`;
    pool.query(SQL1, [user_id], (err1) => {
        if (err1) return callback(err1);

        let values = order.map((userPokemonId, index) => [user_id, index + 1, userPokemonId]);
        const SQL2 = `INSERT INTO Team (user_id, slot, user_pokemon_id) VALUES ?;`;
        pool.query(SQL2, [values], callback);
    });
};