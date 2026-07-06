let battleId = null;
let currentGymId = null;   // global gymId
const userId = localStorage.getItem("userId");

// Render battle state
function renderBattleState(data) {
    // If battle is finished, skip rendering Pokémon state
    if (data.result === "win" || data.result === "lose") {
        return;
    }

    const state = data.state || data;

    const userTeam = data.userTeam || [];
    const gymTeam = data.gymTeam || [];

    // Pick the first alive Pokémon from each team
    const activeUserPokemonId = userTeam.find(id => state.hp[id] > 0);
    const activeGymPokemonId = gymTeam.find(id => state.hp[id] > 0);

    if (!activeUserPokemonId || !activeGymPokemonId) {
        console.error("No active Pokémon found:", data);
        return;
    }

    // Opponent
    document.getElementById("opponentName").textContent = "Gym Leader";
    document.getElementById("opponentSprite").src =
        getPokemonSprite(state.speciesMap[activeGymPokemonId]);
    document.getElementById("opponentHp").style.width =
        `${Math.round((state.hp[activeGymPokemonId] / (state.maxHp?.[activeGymPokemonId] || state.hp[activeGymPokemonId])) * 100)}%`;

    // User
    document.getElementById("userSprite").src =
        getPokemonSprite(state.speciesMap[activeUserPokemonId]);
    document.getElementById("userHp").style.width =
        `${Math.round((state.hp[activeUserPokemonId] / (state.maxHp?.[activeUserPokemonId] || state.hp[activeUserPokemonId])) * 100)}%`;

    // Moves (always rebuild for current active Pokémon)
    const moveButtons = document.getElementById("moveButtons");
    moveButtons.innerHTML = "";

    // Use species ID to get moves
    const activeUserSpeciesId = state.speciesMap[activeUserPokemonId];
    (state.moves[activeUserSpeciesId] || []).forEach(move => {
        const btn = document.createElement("button");
        btn.className = "move-btn";
        btn.textContent = move.name;
        btn.onclick = () => takeTurn(move.name); // send exact name
        moveButtons.appendChild(btn);
    });

    // Log (replace only attacker/defender IDs, not damage numbers)
    const battleLog = document.getElementById("battleLog");
    battleLog.innerHTML = (state.log || [])
        .map(entry => {
            entry = entry.replace(/^(\d+)/, id => idToNameMap[id] || id);
            entry = entry.replace(/ on (\d+)/, (_, id) => " on " + (idToNameMap[id] || id));
            return entry;
        })
        .map(entry => `<p>${entry}</p>`)
        .join("");

    if (!data.result) {
        battleLog.innerHTML += `<p><em>Pick your next move...</em></p>`;
    }

    battleLog.scrollTop = battleLog.scrollHeight;
}

// Start battle
function startBattle(gymId) {
    currentGymId = gymId;
    fetchMethod(currentUrl + "/api/battle/start", (status, data) => {
        console.log("DEBUG startBattle:", status, data);
        if (status === 201 || status === 200) {
            battleId = data.battle_id;
            renderBattleState(data);
        } else {
            alert("Failed to start battle.");
        }
    }, "POST", { gym_id: gymId, user_id: userId });
}

// Take turn
function takeTurn(moveName) {
    fetchMethod(currentUrl + `/api/battle/${battleId}/turn`, (status, data) => {
        console.log("DEBUG takeTurn:", status, data);
        if (status === 200) {
            renderBattleState(data);
            if (data.result === "win" || data.result === "lose") {
                endBattle(data.result);
            }
        }
    }, "POST", { move_name: moveName, user_id: userId, gym_id: currentGymId });
}

// End battle
function endBattle(result) {
    fetchMethod(
        currentUrl + `/api/battle/${battleId}/end`,
        (status, data) => {
            console.log("DEBUG endBattle:", status, data);
            if (status === 200 || status === 201) {
                if (result === "win") {
                    postCompletion(data);
                } else {
                    showBattlePopup({ result: "lose" });
                }
            }
        },
        "POST",
        { result, user_id: userId, gym_id: currentGymId }
    );
}

// Post completion
function postCompletion(battleData) {
    fetchMethod(
        currentUrl + `/api/challenges/${currentGymId}/completions`,
        (status, completionData) => {
            console.log("DEBUG postCompletion:", status, completionData);
            if (status === 200 || status === 201) {
                completionData.result = "win";
                showBattlePopup(completionData);
            } else {
                alert("Error posting completion.");
            }
        },
        "POST",
        { user_id: userId, battle_id: battleData.battle_id }
    );
}

// Show popup
function showBattlePopup(data) {
    const popup = document.getElementById("battlePopup");
    const resultEl = document.getElementById("popupResult");
    const rewardsEl = document.getElementById("popupRewards");

    resultEl.textContent = `Battle Result: ${data.result ? data.result.toUpperCase() : "UNKNOWN"}`;

    let rewardsText = "";
    if (data.rewards) {
        rewardsText = `Coins earned: ${data.rewards.coins}`;
        if (data.rewards.amuletBoost) {
            rewardsText += ` (Amulet Coin boost applied!)`;
        }
        if (data.rewards.newAmuletCoin) {
            rewardsText += ` You obtained a new Amulet Coin!`;
        }
        if (data.rewards.badge) {
            rewardsText += `<br>Badge earned: ${data.rewards.badge}`;
        }
    } else {
        if (data.coins_awarded) {
            rewardsText = `Coins awarded: ${data.coins_awarded}`;
            if (data.boost_multiplier && data.boost_multiplier > 1) {
                rewardsText += ` (Boost x${data.boost_multiplier})`;
            }
        }
        if (data.amulet_awarded) {
            rewardsText += ` You obtained a new Amulet Coin!`;
        }
        if (data.badge_awarded) {
            rewardsText += `<br>Badge earned!`;
        }
        if (data.mewtwo_awarded) {
            const spriteURL = getPokemonSprite(150); // 150 = Mewtwo
            rewardsText += `
        <div style="margin-top:10px; text-align:center;">
            <img src="${spriteURL}" alt="Mewtwo" style="width:96px;height:96px;" />
            <p>✨ Mewtwo has joined your party!</p>
        </div>
    `;
        }
    }

    rewardsEl.innerHTML = rewardsText || "No rewards earned.";
    popup.style.display = "flex";

    const closeBtn = popup.querySelector("button");
    if (closeBtn) {
        closeBtn.onclick = () => {
            popup.style.display = "none";
            window.location.href = "gym.html";
        };
    }
}

// Surrender
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("surrenderBtn").onclick = () => endBattle("lose");

    const params = new URLSearchParams(window.location.search);
    const gymId = params.get("gym_id");
    if (gymId) startBattle(gymId);
});