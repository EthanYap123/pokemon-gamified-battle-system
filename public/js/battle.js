let battleId = null;
let currentGymId = null;   // global gymId
const userId = localStorage.getItem("userId");

// Display-only memory of the previous render, used for animations
let lastActive = { user: null, gym: null };
let lastHp = {};
let lastLogLength = 0;
let busy = false;

function speciesName(state, battlerId) {
    return displayPokemonName(idToNameMap[state.speciesMap[battlerId]] || "???");
}

function replayAnimation(el, className) {
    el.classList.remove(className);
    void el.offsetWidth; // restart the CSS animation
    el.classList.add(className);
}

// Draw one side of the field (sprite, name, HP bar, team dots)
function renderSide(side, activeId, state, team) {
    const sprite = document.getElementById(side === "user" ? "userSprite" : "opponentSprite");
    const hpFill = document.getElementById(side === "user" ? "userHp" : "opponentHp");
    const nameEl = document.getElementById(side === "user" ? "userPokemonName" : "opponentPokemonName");
    const dots = document.getElementById(side === "user" ? "userDots" : "opponentDots");

    const hp = state.hp[activeId];
    const maxHp = state.maxHp?.[activeId] || hp || 1;
    const percent = Math.max(0, Math.round((hp / maxHp) * 100));

    // New Pokémon sent out
    if (side === "user" ? lastActive.user !== activeId : lastActive.gym !== activeId) {
        sprite.classList.remove("fainted");
        sprite.src = getPokemonSprite(state.speciesMap[activeId]);
        replayAnimation(sprite, "enter");
    } else if (lastHp[activeId] !== undefined && hp < lastHp[activeId]) {
        setTimeout(() => replayAnimation(sprite, "hit"), side === "user" ? 350 : 0);
    }

    if (hp <= 0) {
        setTimeout(() => sprite.classList.add("fainted"), 600);
    }

    nameEl.textContent = speciesName(state, activeId);
    hpFill.style.width = `${percent}%`;
    hpFill.classList.toggle("mid", percent <= 50 && percent > 20);
    hpFill.classList.toggle("low", percent <= 20);

    if (side === "user") {
        document.getElementById("userHpText").textContent = `${Math.max(0, hp)} / ${maxHp}`;
    }

    dots.innerHTML = team
        .map(id => `<i class="${state.hp[id] > 0 ? "" : "fainted"}" title="${speciesName(state, id)}"></i>`)
        .join("");
}

// Render battle state
function renderBattleState(data) {
    const state = data.state || data;
    const finished = data.result === "win" || data.result === "lose";

    const userTeam = data.userTeam || [];
    const gymTeam = data.gymTeam || [];

    // Pick the first alive Pokémon from each team (or the last one seen once it is over)
    const activeUserPokemonId = userTeam.find(id => state.hp[id] > 0) || (finished ? lastActive.user : null);
    const activeGymPokemonId = gymTeam.find(id => state.hp[id] > 0) || (finished ? lastActive.gym : null);

    if (!activeUserPokemonId || !activeGymPokemonId) {
        console.error("No active Pokémon found:", data);
        return;
    }

    renderSide("opponent", activeGymPokemonId, state, gymTeam);
    renderSide("user", activeUserPokemonId, state, userTeam);

    // Moves (always rebuild for current active Pokémon)
    const moveButtons = document.getElementById("moveButtons");
    moveButtons.innerHTML = "";

    // Use species ID to get moves
    const activeUserSpeciesId = state.speciesMap[activeUserPokemonId];
    (state.moves[activeUserSpeciesId] || []).forEach(move => {
        const ppLeft = state.pp?.[activeUserPokemonId]?.[move.name] ?? move.pp;
        const btn = document.createElement("button");
        btn.className = `move-btn type-${String(move.type).toLowerCase()}`;
        btn.innerHTML = `
            <span class="move-name">${escapeHTML(move.name)}</span>
            <span class="move-meta">${escapeHTML(move.type)} · PWR ${move.power} · PP ${ppLeft}/${move.pp}</span>
        `;
        btn.disabled = finished || ppLeft <= 0;
        btn.onclick = () => takeTurn(move.name); // send exact name
        moveButtons.appendChild(btn);
    });

    // Log (replace attacker/defender IDs with names, not damage numbers)
    const toName = id => displayPokemonName(idToNameMap[id] || id);
    const entries = (state.log || []).map(entry => {
        entry = entry.replace(/^(\d+)/, id => toName(id));
        entry = entry.replace(/ on (\d+)/, (_, id) => " on " + toName(id));
        entry = entry.replace(/started! (\d+)/, (_, id) => "started! " + toName(id));
        entry = entry.replace(/ vs (\d+)/, (_, id) => " vs " + toName(id));
        return entry;
    });

    const battleLog = document.getElementById("battleLog");
    battleLog.innerHTML = entries
        .map((entry, i) => {
            const classes = [i >= lastLogLength ? "new" : "", /fainted/.test(entry) ? "faint" : ""].join(" ");
            return `<p class="${classes}">${escapeHTML(entry)}</p>`;
        })
        .join("");
    lastLogLength = entries.length;

    if (!finished) {
        battleLog.innerHTML += `<p class="prompt">What will ${escapeHTML(speciesName(state, activeUserPokemonId))} do?</p>`;
    }

    battleLog.scrollTop = battleLog.scrollHeight;

    // Remember for the next render
    Object.keys(state.hp).forEach(id => { lastHp[id] = state.hp[id]; });
    lastActive = { user: activeUserPokemonId, gym: activeGymPokemonId };
}

function setBusy(value) {
    busy = value;
    document.querySelectorAll(".move-btn").forEach(btn => {
        if (value) btn.disabled = true;
    });
}

// Show the Gym Leader's name and portrait in the arena
function loadLeader(gymId) {
    fetchMethod(currentUrl + "/api/challenges", (status, gyms) => {
        if (status !== 200 || !Array.isArray(gyms)) return;
        const gym = gyms.find(g => String(g.gym_id) === String(gymId));
        if (!gym) return;
        document.getElementById("opponentName").textContent = gym.leader;
        const leader = document.getElementById("leaderSprite");
        leader.src = `../images/trainers/${gym.leader.toLowerCase()}.webp`;
        leader.classList.remove("d-none");
        document.title = `vs ${gym.leader} · PokéBattle`;
    });
}

// Start battle
function startBattle(gymId) {
    currentGymId = gymId;
    loadLeader(gymId);
    fetchMethod(currentUrl + "/api/battle/start", (status, data) => {
        document.getElementById("battleLoading").classList.add("d-none");
        if (status === 201 || status === 200) {
            battleId = data.battle_id;
            renderBattleState(data);
        } else {
            showToast(data?.message || "Failed to start battle.", "error");
            setTimeout(() => (window.location.href = "gym.html"), 1800);
        }
    }, "POST", { gym_id: gymId, user_id: userId });
}

// Take turn
function takeTurn(moveName) {
    if (busy || !battleId) return;
    setBusy(true);
    replayAnimation(document.getElementById("userSprite"), "attack");

    fetchMethod(currentUrl + `/api/battle/${battleId}/turn`, (status, data) => {
        setBusy(false);
        if (status === 200) {
            renderBattleState(data);
            if (data.result === "win" || data.result === "lose") {
                setBusy(true);
                // Let the last hit play out before the result appears
                setTimeout(() => endBattle(data.result), 1100);
            }
        } else {
            showToast(data?.message || "That move failed. Try again.", "error");
        }
    }, "POST", { move_name: moveName, user_id: userId, gym_id: currentGymId });
}

// End battle
function endBattle(result) {
    if (!battleId) {
        window.location.href = "gym.html";
        return;
    }
    fetchMethod(
        currentUrl + `/api/battle/${battleId}/end`,
        (status, data) => {
            if (status === 200 || status === 201) {
                if (result === "win") {
                    postCompletion(data);
                } else {
                    showBattlePopup({ result: "lose" });
                }
            } else {
                showToast(data?.message || "Could not end the battle.", "error");
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
            if (status === 200 || status === 201) {
                completionData.result = "win";
                showBattlePopup(completionData);
            } else {
                showToast(completionData?.message || "Error posting completion.", "error");
                showBattlePopup({ result: "win" });
            }
        },
        "POST",
        { user_id: userId, battle_id: battleData.battle_id }
    );
}

// Show popup
function showBattlePopup(data) {
    const popup = document.getElementById("battlePopup");
    const content = popup.querySelector(".popup-content");
    const resultEl = document.getElementById("popupResult");
    const rewardsEl = document.getElementById("popupRewards");
    const icon = document.getElementById("popupIcon");

    const won = data.result === "win";
    content.classList.toggle("win", won);
    content.classList.toggle("lose", !won);
    resultEl.textContent = won ? "Victory!" : "Defeat...";
    icon.src = won ? getItemSprite("amulet-coin") : getBallSprite("poke");

    const chips = [];
    let special = "";
    if (data.rewards) {
        chips.push(`<span class="chip gold">+${data.rewards.coins} coins</span>`);
        if (data.rewards.badge) chips.push(`<span class="chip brand">${escapeHTML(data.rewards.badge)}</span>`);
    } else {
        if (data.coins_awarded) {
            chips.push(`<span class="chip gold">+${data.coins_awarded} coins</span>`);
            if (data.boost_multiplier && data.boost_multiplier > 1) {
                chips.push(`<span class="chip" tabindex="0" data-tip="Your Amulet Coins added +${Math.round((data.boost_multiplier - 1) * 100)}% to this reward.">Amulet boost x${data.boost_multiplier}</span>`);
            }
        }
        if (data.amulet_awarded) {
            chips.push(`<span class="chip gold" tabindex="0" data-tip="${escapeHTML(itemInfo("Amulet Coin"))}"><img src="${getItemSprite("amulet-coin")}" alt="">New Amulet Coin<i class="info-dot">i</i></span>`);
            special += `<p class="text-muted small" style="margin-top: 8px">Amulet Coin: +10% coins from every gym win from now on (up to 10 coins).</p>`;
        }
        if (data.badge_awarded) {
            chips.push(`<span class="chip brand">Badge earned!</span>`);
        }
        if (data.mewtwo_awarded) {
            special = `
                <div class="reward-special">
                    <img src="${getPokemonSprite(150)}" alt="Mewtwo" />
                    <p>Mewtwo has joined your party!</p>
                </div>
            `;
        }
    }

    rewardsEl.innerHTML = chips.length || special
        ? `<div class="reward-list">${chips.join("")}</div>${special}`
        : `<p>${won ? "You won the battle!" : "Your team was defeated. Train up and try again."}</p>`;
    popup.style.display = "flex";

    const closeBtn = popup.querySelector("button");
    if (closeBtn) {
        closeBtn.onclick = () => {
            popup.style.display = "none";
            window.location.href = "gym.html";
        };
        closeBtn.focus();
    }
}

// Surrender
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("surrenderBtn").onclick = () => {
        if (busy) return;
        if (confirm("Surrender this battle?")) endBattle("lose");
    };

    const params = new URLSearchParams(window.location.search);
    const gymId = params.get("gym_id");
    if (gymId) {
        startBattle(gymId);
    } else {
        document.getElementById("battleLoading").innerHTML =
            `<div>Pick a gym to battle. <a href="gym.html">Go to Gyms →</a></div>`;
    }
});
