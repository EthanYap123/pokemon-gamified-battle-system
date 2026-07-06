const pool = require('../services/db');
const userCompletionModel = require('../models/userCompletionModel');
const challengeModel = require('../models/challengeModel');
const userModel = require('../models/userModel');

// Task 9 - Post: Create completion
module.exports.createCompletion = (req, res, next) => {
    console.log("➡️ Entered createCompletion with body:", req.body, "params:", req.params);

    if (!req.body.user_id) {
        console.warn("⚠️ Missing user_id");
        return res.status(400).json({ message: "Error: user_id or details missing" });
    }

    const data = {
        user_id: req.body.user_id,
        gym_id: req.params.gym_id,
        details: req.body.details || null
    };

    // Check gym exists
    challengeModel.selectById({ gym_id: data.gym_id }, (err, challengeResults) => {
        if (err) {
            console.error("❌ DB error selecting gym:", err);
            return res.status(500).json({ message: "Internal server error." });
        }
        if (challengeResults.length === 0) {
            console.warn("⚠️ Gym not found:", data.gym_id);
            return res.status(404).json({ message: "Gym not found." });
        }

        const gym = challengeResults[0];

        // Progression check
        if (gym.order_index > 1) {
            userCompletionModel.checkCompletion(
                { user_id: data.user_id, order_index: gym.order_index - 1 },
                (errCheck, prevResults) => {
                    if (errCheck) return res.status(500).json({ message: "Internal server error." });
                    if (prevResults.length === 0) return res.status(403).json({ message: "Previous gym not cleared yet." });
                    proceedInsert();
                }
            );
        } else {
            proceedInsert();
        }

        function proceedInsert() {
            userModel.selectById({ user_id: data.user_id }, (err2, userResults) => {
                if (err2) return res.status(500).json({ message: "Internal server error." });
                if (userResults.length === 0) return res.status(404).json({ message: "User not found." });

                // Check if user already completed this gym
                userCompletionModel.selectByUserAndGym(data, (errCheck, existing) => {
                    if (errCheck) return res.status(500).json({ message: "Internal server error." });

                    const isFirstClear = existing.length === 0;
                    const baseCoins = isFirstClear ? gym.reward_first_clear : gym.reward_replay;

                    // 🔍 Apply amulet coin boost
                    const ownedAmulets = userResults[0].amulet_coins || 0;
                    const boostMultiplier = 1 + (0.1 * Math.min(ownedAmulets, 10));
                    const boostedCoins = Math.floor(baseCoins * boostMultiplier);

                    req.boostMultiplier = boostMultiplier;   // 👈 save multiplier
                    req.coinsAwarded = boostedCoins;         // boosted coins

                    console.log(`✨ Amulet boost: owned=${ownedAmulets}, multiplier=${boostMultiplier}, boostedCoins=${boostedCoins}`);

                    // Insert completion with boosted coins
                    userCompletionModel.insertSingle({
                        user_id: data.user_id,
                        gym_id: data.gym_id,
                        details: data.details,
                        first_clear: isFirstClear,
                        coins_awarded: boostedCoins
                    }, (err3, results) => {
                        if (err3) return res.status(500).json({ message: "Internal server error." });

                        // Update user coins
                        userCompletionModel.awardCoins({ user_id: data.user_id, coins: boostedCoins }, (err4) => {
                            if (err4) return res.status(500).json({ message: "Internal server error." });

                            req.completion_id = results.insertId;
                            req.completionData = data;
                            req.coinsAwarded = boostedCoins;   // 👈 boosted value
                            req.isFirstClear = isFirstClear;
                            next(); // hand off to badge awarding
                        });
                    });
                });
            });
        }
    });
};

// Task 9 - Award badge + amulet coin (final response)
module.exports.awardBadge = (req, res) => {
    console.log("➡️ Entered awardBadge for user:", req.completionData.user_id, "gym:", req.completionData.gym_id);
    const data = req.completionData;
    const isFirstClear = req.isFirstClear;
    let badgeAwarded = false;

    const awardBadgeIfNeeded = (callback) => {
        if (isFirstClear) {
            console.log("🔍 Awarding badge for first clear");
            const SQL = `
                INSERT INTO UserBadge (user_id, badge_id)
                SELECT ?, badge_id FROM Badge WHERE gym_id = ?;
            `;
            pool.query(SQL, [data.user_id, data.gym_id], (err, resultsBadge) => {
                if (err) {
                    console.error("❌ DB error awarding badge:", err);
                    return callback(err, false);
                }
                badgeAwarded = resultsBadge.affectedRows > 0;
                console.log("✅ Badge awarded:", badgeAwarded);
                callback(null, badgeAwarded);
            });
        } else {
            console.log("ℹ️ Not first clear, skipping badge");
            callback(null, false);
        }
    };

    awardBadgeIfNeeded((err3) => {
        if (err3) {
            console.error("❌ Error in awardBadgeIfNeeded:", err3);
            return res.status(500).json({ message: "Internal server error." });
        }

        // Roll for amulet coin (permanent chance, cap 10)
        const chance = Math.random();
        console.log("🎲 Amulet coin roll:", chance);
        if (chance <= 0.1) {
            userCompletionModel.getAmuletCount(data.user_id, (err4, resultsAmulet) => {
                if (err4 || resultsAmulet.length === 0) {
                    console.error("❌ DB error getting amulet count:", err4);
                    return checkChampionAndFinalize(false);
                }
                const owned = resultsAmulet[0].amulet_coins;
                console.log("ℹ️ User currently owns amulet coins:", owned);
                if (owned < 10) {
                    userCompletionModel.awardAmuletCoin(data.user_id, (err5) => {
                        if (err5) {
                            console.error("❌ DB error awarding amulet coin:", err5);
                            return checkChampionAndFinalize(false);
                        }
                        console.log("✅ Amulet coin awarded");
                        checkChampionAndFinalize(true);
                    });
                } else {
                    console.log("ℹ️ User already has max amulet coins");
                    checkChampionAndFinalize(false);
                }
            });
        } else {
            console.log("ℹ️ Amulet coin roll failed, no award");
            checkChampionAndFinalize(false);
        }

        // Champion check + Mewtwo unlock
        function checkChampionAndFinalize(amuletAwarded) {
            const SQLChampion = `
        SELECT COUNT(*) AS badgeCount FROM UserBadge WHERE user_id = ?;
    `;
            pool.query(SQLChampion, [data.user_id], (errCount, resultsCount) => {
                if (errCount) {
                    console.error("❌ DB error counting badges:", errCount);
                    return finalize(amuletAwarded, false);
                }

                const badgeCount = resultsCount[0].badgeCount;
                const TOTAL_GYMS = 9; // adjust to your actual number of gyms

                if (badgeCount === TOTAL_GYMS) {
                    console.log("🏆 User is Champion! Checking Mewtwo ownership...");

                    const SQLHasMewtwo = `
                SELECT id FROM UserPokemon
                WHERE user_id = ? AND pokemon_id = 150;
            `;
                    pool.query(SQLHasMewtwo, [data.user_id], (errHas, resultsHas) => {
                        if (errHas) {
                            console.error("❌ DB error checking Mewtwo:", errHas);
                            return finalize(amuletAwarded, false);
                        }

                        const alreadyHasMewtwo = resultsHas.length > 0;

                        if (!alreadyHasMewtwo) {
                            console.log("Awarding Mewtwo...");

                            const SQLMewtwo = `
                        INSERT INTO UserPokemon (user_id, pokemon_id, rarity)
                        VALUES (?, 150, 'legendary');
                    `;
                            pool.query(SQLMewtwo, [data.user_id], (errInsert) => {
                                if (errInsert) {
                                    console.error("❌ DB error awarding Mewtwo:", errInsert);
                                    return finalize(amuletAwarded, false);
                                }

                                const SQLDex = `
                            INSERT INTO UserPokedex (user_id, pokemon_id, obtained)
                            VALUES (?, 150, TRUE)
                            ON DUPLICATE KEY UPDATE obtained = TRUE;
                        `;
                                pool.query(SQLDex, [data.user_id], (errDex) => {
                                    if (errDex) {
                                        console.error("❌ DB error updating Pokédex with Mewtwo:", errDex);
                                    }
                                    console.log("✅ Mewtwo registered in Pokédex!");
                                    finalize(amuletAwarded, true);
                                });
                            });
                        } else {
                            console.log("ℹ️ User already owns Mewtwo. Skipping award.");
                            finalize(amuletAwarded, false);
                        }
                    });
                } else {
                    finalize(amuletAwarded, false);
                }
            });
        }

        function finalize(amuletAwarded, mewtwoAwarded) {
            console.log("➡️ Finalizing response for completion:", req.completion_id);
            return res.status(201).json({
                completion_id: req.completion_id,
                user_id: data.user_id,
                gym_id: data.gym_id,
                coins_awarded: req.coinsAwarded,
                boost_multiplier: req.boostMultiplier,
                badge_awarded: badgeAwarded,
                amulet_awarded: amuletAwarded,
                mewtwo_awarded: mewtwoAwarded, // 👈 new field
                message: mewtwoAwarded
                    ? "Gym completed, rewards granted. Mewtwo has joined your party!"
                    : "Gym completed, rewards granted."
            });
        }
    });
};

// Task 10 - Get all completions for a gym
module.exports.readCompletionsByGym = (req, res) => {
    const gym_id = req.params.gym_id;

    userCompletionModel.selectByGym(gym_id, (error, results) => {
        if (error) return res.status(500).json({ message: "Internal server error." });
        if (results.length === 0) return res.status(404).json({ message: "No completions found for this gym." });
        return res.status(200).json(results);  // return all rows
    });
};