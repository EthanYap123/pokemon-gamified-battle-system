const shopModel = require('../models/shopModel');
const idToNameMap = require('../data/idToNameMap');

// Gacha system
function rollPokemon(ballType) {
    const odds = {
        pokeball: { common: 0.7, uncommon: 0.25, rare: 0.05 },
        greatball: { common: 0.5, uncommon: 0.4, rare: 0.09, ultraRare: 0.01 },
        ultraball: { common: 0.3, uncommon: 0.5, rare: 0.18, ultraRare: 0.02 }
    };

    const pool = {
        common: [
            10, 11, 13, 14, 16, 17, 19, 20, 21, 23, 27,
            29, 30, 32, 33, 41, 42, 43, 44, 45, 46, 47,
            48, 49, 50, 51, 60, 61, 62, 66, 69, 70, 71,
            72, 74, 77, 79, 80, 81, 84, 85, 86, 87, 88,
            89, 90, 92, 93, 94, 95, 96, 97, 98, 99, 100,
            101, 102, 103, 104, 105, 109, 110, 111, 112,
            116, 117, 118, 119, 120, 129, 147
        ],
        uncommon: [
            1, 2, 4, 5, 7, 8, 12, 15, 18, 22, 24, 25, 28,
            35, 36, 37, 38, 39, 40,
            52, 53, 54, 55, 56, 57, 58, 59,
            63, 64, 67, 68, 73, 75, 78, 82, 83,
            91, 106, 107, 108,
            113, 114, 115, 121, 122, 123, 124, 125, 126, 127, 128,
            133
        ],
        rare: [
            3, 6, 9, 26, 31, 34, 65, 76,
            130, 131, 132,
            134, 135, 136, 137,
            138, 139, 140, 141, 142, 143,
            148, 149
        ],
        ultraRare: [
            144, 145, 146
        ]
        // Legendary not included in pool, 150, 151
    };

    const rand = Math.random();
    let rarity;
    if (rand < odds[ballType].common) rarity = "common";
    else if (rand < odds[ballType].common + odds[ballType].uncommon) rarity = "uncommon";
    else if (rand < odds[ballType].common + odds[ballType].uncommon + odds[ballType].rare) rarity = "rare";
    else rarity = "ultraRare";

    const chosenId = pool[rarity][Math.floor(Math.random() * pool[rarity].length)];
    const chosenName = idToNameMap[chosenId] || "Unknown";

    return {
        pokemon_id: chosenId,
        name: chosenName,
        rarity
    };
}

// Get all shop items
module.exports.getItems = (req, res) => {
    shopModel.getAllItems((err, results) => {
        if (err) return res.status(500).json({ message: "Internal server error." });
        return res.status(200).json(results);
    });
};

// Purchase item by ID
module.exports.purchaseItem = (req, res) => {
    const { item_id } = req.body;
    const user_id = req.params.user_id;

    console.log("DEBUG purchaseItem called:", { user_id, item_id });

    if (!item_id) {
        return res.status(400).json({ message: "Error: item_id missing" });
    }

    shopModel.getItemById(item_id, (err, itemResults) => {
        if (err) return res.status(500).json({ message: "Internal server error." });
        if (itemResults.length === 0) return res.status(404).json({ message: "Item not found." });

        const item = itemResults[0];
        const { item_name, price } = item;

        // First get coins
        shopModel.getUserCoins(user_id, (err2, coinResults) => {
            if (err2) return res.status(500).json({ message: "Internal server error." });
            if (coinResults.length === 0) return res.status(404).json({ message: "User not found." });

            const coinsBefore = coinResults[0].coins;

            // Then get amulet coins
            shopModel.getAmuletCoins(user_id, (err3, amuletResults) => {
                if (err3) return res.status(500).json({ message: "Internal server error." });

                const amuletsBefore = amuletResults[0].count;
                console.log("DEBUG balances before purchase:", { coinsBefore, amuletsBefore });

                if (coinsBefore < price) {
                    return res.status(403).json({ message: "Not enough coins." });
                }

                // Amulet Coin logic
                if (item_name.toLowerCase() === "amulet coin") {
                    if (amuletsBefore >= 10) {
                        return res.status(403).json({ message: "Amulet coin limit reached (10)." });
                    }

                    shopModel.updateCoins({ user_id, coins: -price }, (err4) => {
                        if (err4) return res.status(500).json({ message: "Internal server error." });

                        shopModel.addAmuletCoin(user_id, (err5) => {
                            if (err5) return res.status(500).json({ message: "Internal server error." });

                            const responsePayload = {
                                user_id,
                                item: item_name,
                                coins_spent: price,
                                coins_before: coinsBefore,
                                coins_after: coinsBefore - price,
                                amulet_coins_before: amuletsBefore,
                                amulet_coins_after: amuletsBefore + 1
                            };
                            console.log("DEBUG response payload (amulet):", responsePayload);

                            return res.status(201).json(responsePayload);
                        });
                    });
                } else {
                    // Ball logic → roll Pokémon
                    let rolled;
                    try {
                        rolled = rollPokemon(item_name.toLowerCase().replace(" ", ""));
                    } catch (e) {
                        return res.status(500).json({ message: "Gacha roll failed." });
                    }

                    shopModel.updateCoins({ user_id, coins: -price }, (err6) => {
                        if (err6) return res.status(500).json({ message: "Internal server error." });

                        shopModel.checkUserPokemon({ user_id, pokemon_id: rolled.pokemon_id }, (errCheck, resultsCheck) => {
                            if (errCheck) return res.status(500).json({ message: "Internal server error." });

                            if (resultsCheck.length > 0) {
                                const refund = price / 2;
                                shopModel.updateCoins({ user_id, coins: refund }, (errRefund) => {
                                    if (errRefund) return res.status(500).json({ message: "Internal server error." });

                                    const responsePayload = {
                                        user_id,
                                        item: item_name,
                                        coins_spent: price,
                                        coins_before: coinsBefore,
                                        coins_after: coinsBefore - price + refund,
                                        refund,
                                        duplicate: true,
                                        pokemon_awarded: rolled,
                                        amulet_coins_before: amuletsBefore,
                                        amulet_coins_after: amuletsBefore
                                    };
                                    return res.status(200).json(responsePayload);
                                });
                            } else {
                                shopModel.insertPokemon({ user_id, pokemon_id: rolled.pokemon_id }, (err7) => {
                                    if (err7) return res.status(500).json({ message: "Internal server error." });

                                    shopModel.updatePokedex({ user_id, pokemon_id: rolled.pokemon_id }, (err8) => {
                                        if (err8) return res.status(500).json({ message: "Internal server error." });

                                        const responsePayload = {
                                            user_id,
                                            item: item_name,
                                            coins_spent: price,
                                            coins_before: coinsBefore,
                                            coins_after: coinsBefore - price,
                                            duplicate: false,
                                            pokemon_awarded: rolled,
                                            amulet_coins_before: amuletsBefore,
                                            amulet_coins_after: amuletsBefore
                                        };
                                        return res.status(201).json(responsePayload);
                                    });
                                });
                            }
                        });
                    });
                }
            });
        });
    });
};