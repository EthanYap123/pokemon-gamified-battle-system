const userPokedexModel = require('../models/userPokedexModel');
const pool = require('../services/db');


// 1. Get all Pokédex entries for a user (with optional filters)
module.exports.getUserPokedex = (req, res) => {
  const { user_id } = req.params;
  const { type, rarity, type1, type2 } = req.query;

  const handleResults = (results) => {
    // After fetching results, check completion excluding Mew
    const SQLCount = `
      SELECT COUNT(*) AS obtainedCount
      FROM UserPokedex
      WHERE user_id = ? AND obtained = TRUE AND pokemon_id != 151;
    `;
    pool.query(SQLCount, [user_id], (errCount, resultsCount) => {
      if (errCount) {
        console.error("❌ DB error counting Pokédex:", errCount);
        return res.status(200).json({ pokedex: results });
      }

      const obtainedCount = resultsCount[0].obtainedCount;
      const TOTAL_POKEMON = 150; // all except Mew

      // Check if user already has Mew
      const SQLHasMew = `
        SELECT obtained FROM UserPokedex
        WHERE user_id = ? AND pokemon_id = 151;
      `;
      pool.query(SQLHasMew, [user_id], (errHas, resultsHas) => {
        if (errHas) {
          console.error("❌ DB error checking Mew:", errHas);
          return res.status(200).json({ pokedex: results });
        }

        const alreadyHasMew = resultsHas.length > 0 && resultsHas[0].obtained === 1;

        if (!alreadyHasMew && obtainedCount === TOTAL_POKEMON) {
          console.log("🌟 Pokédex complete! Awarding Mew...");

          const SQLMew = `
            INSERT INTO UserPokemon (user_id, pokemon_id, rarity)
            VALUES (?, 151, 'legendary');
          `;
          pool.query(SQLMew, [user_id], (errInsert) => {
            if (errInsert) {
              console.error("❌ DB error awarding Mew:", errInsert);
              return res.status(200).json({ pokedex: results });
            }

            const SQLDex = `
              INSERT INTO UserPokedex (user_id, pokemon_id, obtained)
              VALUES (?, 151, TRUE)
              ON DUPLICATE KEY UPDATE obtained = TRUE;
            `;
            pool.query(SQLDex, [user_id], (errDex) => {
              if (errDex) {
                console.error("❌ DB error updating Pokédex with Mew:", errDex);
              }
              console.log("✅ Mew awarded to Pokédex completionist!");
              return res.status(200).json({
                pokedex: results,
                mew_awarded: true,
                message: "A mysterious Pokémon has joined your party..."
              });
            });
          });
        } else {
          return res.status(200).json({ pokedex: results });
        }
      });
    });
  };

  if (type || rarity || (type1 && type2)) {
    userPokedexModel.findByUserWithFilter(user_id, type, rarity, type1, type2, (error, results) => {
      if (error) {
        console.error("Error getUserPokedex (filter):", error);
        return res.status(500).json({ message: "Internal server error." });
      }
      handleResults(results);
    });
  } else {
    userPokedexModel.findByUser(user_id, (error, results) => {
      if (error) {
        console.error("Error getUserPokedex:", error);
        return res.status(500).json({ message: "Internal server error." });
      }
      handleResults(results);
    });
  }
};

// 2. Mark a Pokédex entry as obtained (insert or update)
module.exports.addUserPokedexEntry = (req, res) => {
  const data = {
    user_id: req.params.user_id,
    pokemon_id: req.body.pokemon_id
  };

  try {
    userPokedexModel.upsertEntry(data, (error, results) => {
      if (error) {
        console.error("Error addUserPokedexEntry:", error);
        return res.status(500).json({ message: "Internal server error." });
      }

      return res.status(201).json({
        id: results.insertId || null,
        ...data,
        obtained: true
      });
    });
  } catch (err) {
    console.error("Unexpected addUserPokedexEntry error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};