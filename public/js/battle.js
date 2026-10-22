let battleId = null;
let currentGymId = null;   // global gymId
const userId = localStorage.getItem("userId");

// What the screen is currently showing (used to animate changes)
let battleState = null;
let shown = { user: null, gym: null };
let lastLogLength = 0;
let busy = false;
let partyOpen = false;

const STEP_MS = 650;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const els = side => ({
    sprite: document.getElementById(side === "user" ? "userSprite" : "opponentSprite"),
    hp: document.getElementById(side === "user" ? "userHp" : "opponentHp"),
    name: document.getElementById(side === "user" ? "userPokemonName" : "opponentPokemonName"),
    level: document.getElementById(side === "user" ? "userLevel" : "opponentLevel"),
    dots: document.getElementById(side === "user" ? "userDots" : "opponentDots"),
});

function replayAnimation(el, className) {
    el.classList.remove(className);
    void el.offsetWidth; // restart the CSS animation
    el.classList.add(className);
}

function setHpBar(side, hp, maxHp) {
    const percent = Math.max(0, Math.round((hp / (maxHp || 1)) * 100));
    const bar = els(side).hp;
    bar.style.width = `${percent}%`;
    bar.classList.toggle("mid", percent <= 50 && percent > 20);
    bar.classList.toggle("low", percent <= 20);
    if (side === "user") {
        document.getElementById("userHpText").textContent = `${Math.max(0, hp)} / ${maxHp}`;
    }
}

// Show a battler on one side (name, level, sprite, HP)
function showBattler(side, key, animateEntry) {
    const b = battleState.battlers[key];
    const e = els(side);
    if (shown[side] !== key || animateEntry) {
        e.sprite.classList.remove("fainted");
        e.sprite.src = getPokemonSprite(b.form);
        e.sprite.alt = b.name;
        replayAnimation(e.sprite, "enter");
    }
    shown[side] = key;
    e.name.textContent = b.name;
    e.level.textContent = `Lv${b.level}`;
    setHpBar(side, b.hp, b.maxHp);
}

function renderDots(state) {
    for (const side of ["user", "gym"]) {
        const team = side === "user" ? state.userTeam : state.gymTeam;
        els(side).dots.innerHTML = team
            .map(k => `<i class="${state.battlers[k].fainted ? "fainted" : ""}" title="${escapeHTML(state.battlers[k].name)}"></i>`)
            .join("");
    }
}

function renderLog(state, finished) {
    const battleLog = document.getElementById("battleLog");
    battleLog.innerHTML = (state.log || [])
        .map((entry, i) => {
            const classes = [
                i >= lastLogLength ? "new" : "",
                /fainted|out of usable/.test(entry) ? "faint" : "",
                /super effective|critical hit/i.test(entry) ? "highlight" : "",
            ].join(" ");
            return `<p class="${classes}">${escapeHTML(entry)}</p>`;
        })
        .join("");
    lastLogLength = (state.log || []).length;

    if (!finished) {
        const active = state.battlers[state.active.user];
        const prompt = state.awaitingSwitch
            ? "Choose your next Pokémon!"
            : `What will ${active.name} do?`;
        battleLog.innerHTML += `<p class="prompt">${escapeHTML(prompt)}</p>`;
    }
    battleLog.scrollTop = battleLog.scrollHeight;
}

function renderMoves(state, finished) {
    const moveButtons = document.getElementById("moveButtons");
    moveButtons.innerHTML = "";
    const active = state.battlers[state.active.user];
    const usable = active.moves.filter(m => m.pp > 0);

    // Out of PP on every move: the only option is Struggle
    const moves = usable.length ? active.moves : [{ name: "Struggle", type: "Normal", power: 50, pp: 1, maxPp: 1, struggle: true }];

    moves.forEach(move => {
        const btn = document.createElement("button");
        btn.className = `move-btn type-${String(move.type).toLowerCase()}`;
        const tags = [
            escapeHTML(move.type),
            move.power ? `PWR ${move.power}` : "Status",
            move.struggle ? "" : `PP ${move.pp}/${move.maxPp}`,
        ].filter(Boolean).join(" · ");
        btn.innerHTML = `
            <span class="move-name">${escapeHTML(move.name)}${move.priority > 0 ? ' <span class="priority-tag">Priority</span>' : ""}</span>
            <span class="move-meta">${tags}</span>
        `;
        if (move.priority > 0) btn.dataset.tip = "Priority move: goes first, even against faster Pokémon.";
        btn.disabled = finished || state.awaitingSwitch || move.pp <= 0;
        btn.onclick = () => sendAction({ action: "move", move_name: move.name });
        moveButtons.appendChild(btn);
    });
}

function renderParty(state, finished) {
    const list = document.getElementById("partyList");
    list.innerHTML = "";
    state.userTeam.forEach(key => {
        const b = state.battlers[key];
        const isActive = key === state.active.user && !state.awaitingSwitch;
        const percent = Math.max(0, Math.round((b.hp / b.maxHp) * 100));
        const btn = document.createElement("button");
        btn.className = "party-btn";
        btn.innerHTML = `
            <img src="${getPokemonSprite(b.form)}" alt="">
            <span class="party-info">
                <span class="party-name">${escapeHTML(b.name)} <small>Lv${b.level}</small></span>
                <span class="hp-bar"><span class="hp-fill ${percent <= 20 ? "low" : percent <= 50 ? "mid" : ""}" style="width:${percent}%"></span></span>
                <span class="party-hp">${b.fainted ? "Fainted" : isActive ? "In battle" : `${b.hp} / ${b.maxHp} HP`}</span>
            </span>
        `;
        btn.disabled = finished || b.fainted || isActive;
        btn.onclick = () => sendAction({ action: "switch", target: key });
        list.appendChild(btn);
    });
}

function setPartyOpen(open) {
    partyOpen = open;
    document.getElementById("moveButtons").classList.toggle("d-none", open);
    document.getElementById("partyList").classList.toggle("d-none", !open);
    document.getElementById("tabFight").classList.toggle("active", !open);
    document.getElementById("tabParty").classList.toggle("active", open);
    document.getElementById("tabFight").setAttribute("aria-selected", String(!open));
    document.getElementById("tabParty").setAttribute("aria-selected", String(open));
    document.getElementById("actionLabel").textContent = open
        ? (battleState?.awaitingSwitch ? "Choose your next Pokémon" : "Switch Pokémon (uses your turn)")
        : "Choose a move";
}

// Full redraw from the state (no attack animations)
function renderBattleState(state, result) {
    battleState = state;
    const finished = result === "win" || result === "lose";

    if (!state.awaitingSwitch || !shown.user) showBattler("user", state.active.user, false);
    showBattler("gym", state.active.gym, false);
    if (state.battlers[shown.user]?.fainted) els("user").sprite.classList.add("fainted");
    if (state.battlers[shown.gym]?.fainted) els("gym").sprite.classList.add("fainted");

    renderDots(state);
    renderLog(state, finished);
    renderMoves(state, finished);
    renderParty(state, finished);
    document.getElementById("tabFight").disabled = Boolean(state.awaitingSwitch) || finished;
    document.getElementById("tabParty").disabled = finished;
    setPartyOpen(Boolean(state.awaitingSwitch) || (partyOpen && !finished));
}

//////////////////////////////////////////////////////
// Turn animations
//////////////////////////////////////////////////////
function centreOf(el) {
    const arena = document.getElementById("arena").getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - arena.left + r.width / 2, y: r.top - arena.top + r.height / 2 };
}

function floatText(side, text, kind) {
    const fx = document.getElementById("fxLayer");
    const at = centreOf(els(side).sprite);
    const label = document.createElement("div");
    label.className = `float-text ${kind || ""}`;
    label.textContent = text;
    label.style.left = `${at.x}px`;
    label.style.top = `${at.y - 40}px`;
    fx.appendChild(label);
    setTimeout(() => label.remove(), 1400);
}

async function projectile(fromSide, toSide, moveType) {
    const fx = document.getElementById("fxLayer");
    const from = centreOf(els(fromSide).sprite);
    const to = centreOf(els(toSide).sprite);
    const orb = document.createElement("div");
    orb.className = `projectile type-${moveType}`;
    orb.style.left = `${from.x}px`;
    orb.style.top = `${from.y}px`;
    fx.appendChild(orb);
    void orb.offsetWidth;
    orb.style.transform = `translate(${to.x - from.x}px, ${to.y - from.y}px) scale(1.4)`;
    await wait(380);
    orb.classList.add("burst");
    setTimeout(() => orb.remove(), 350);
}

async function playEvents(events, newState) {
    for (const ev of events) {
        if (ev.type === "move") {
            const attackerSide = ev.side;
            const defenderSide = ev.side === "user" ? "gym" : "user";
            replayAnimation(els(attackerSide).sprite, "attack");
            await wait(200);

            if (ev.note === "nothing") {
                floatText(attackerSide, "Nothing happened!", "muted");
            } else if (ev.note === "transform") {
                const sprite = els(attackerSide).sprite;
                sprite.src = getPokemonSprite(ev.form);
                replayAnimation(sprite, "enter");
                floatText(attackerSide, "Transformed!", "muted");
            } else {
                await projectile(attackerSide, defenderSide, ev.moveType);
                if (ev.effectiveness === 0) {
                    floatText(defenderSide, "No effect", "muted");
                } else {
                    replayAnimation(els(defenderSide).sprite, "hit");
                    const defender = newState.battlers[ev.defender];
                    setHpBar(defenderSide, ev.hpAfter, defender.maxHp);
                    if (ev.crit) floatText(defenderSide, "Critical hit!", "crit");
                    else if (ev.effectiveness > 1) floatText(defenderSide, "Super effective!", "super");
                    else if (ev.effectiveness < 1) floatText(defenderSide, "Not very effective", "muted");
                    else floatText(defenderSide, `-${ev.damage}`, "");
                }
            }
            await wait(STEP_MS);
        } else if (ev.type === "recoil") {
            setHpBar(ev.side, 0, newState.battlers[ev.battler].maxHp);
        } else if (ev.type === "faint") {
            els(ev.side).sprite.classList.add("fainted");
            await wait(STEP_MS);
        } else if (ev.type === "switch") {
            // Use the new state for the incoming Pokémon
            battleState = newState;
            showBattler(ev.side, ev.to, true);
            await wait(STEP_MS);
        }
    }
}

//////////////////////////////////////////////////////
// API calls
//////////////////////////////////////////////////////

// Show the Gym Leader's portrait in the arena
function loadLeader(state) {
    const leader = document.getElementById("leaderSprite");
    leader.src = `../images/trainers/${state.leader.toLowerCase()}.webp`;
    leader.classList.remove("d-none");
    document.getElementById("opponentName").textContent = state.leader;
    document.title = `vs ${state.leader} · PokéBattle`;
}

// Start battle
function startBattle(gymId) {
    currentGymId = gymId;
    fetchMethod(currentUrl + "/api/battle/start", (status, data) => {
        document.getElementById("battleLoading").classList.add("d-none");
        if (status === 201 || status === 200) {
            battleId = data.battle_id;
            loadLeader(data.state);
            renderBattleState(data.state, null);
        } else {
            showToast(data?.message || "Failed to start battle.", "error");
            setTimeout(() => (window.location.href = data?.message?.includes("starter") ? "team.html" : "gym.html"), 1800);
        }
    }, "POST", { gym_id: gymId, user_id: userId });
}

// Move or switch
function sendAction(body) {
    if (busy || !battleId) return;
    busy = true;
    document.querySelectorAll(".move-btn, .party-btn, .action-tabs button").forEach(b => (b.disabled = true));

    fetchMethod(currentUrl + `/api/battle/${battleId}/turn`, async (status, data) => {
        if (status === 200) {
            // After choosing a Pokémon, go straight back to picking moves
            if (body.action === "switch") partyOpen = false;
            await playEvents(data.events || [], data.state);
            renderBattleState(data.state, data.result);
            if (data.result === "win") {
                await wait(700);
                postCompletion();
            } else if (data.result === "lose") {
                await wait(700);
                showBattlePopup({ result: "lose" });
            } else {
                busy = false;
            }
        } else {
            busy = false;
            renderBattleState(battleState, null);
            showToast(data?.message || "That didn't work. Try again.", "error");
        }
    }, "POST", body);
}

// Surrender
function endBattle() {
    if (!battleId) {
        window.location.href = "gym.html";
        return;
    }
    fetchMethod(
        currentUrl + `/api/battle/${battleId}/end`,
        (status, data) => {
            if (status === 200 || status === 201) {
                showBattlePopup({ result: "lose", surrendered: true });
            } else {
                showToast(data?.message || "Could not end the battle.", "error");
            }
        },
        "POST",
        {}
    );
}

// Claim the gym's rewards for this win
function postCompletion() {
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
        { user_id: userId, battle_id: battleId }
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
        special += `
            <div class="reward-special">
                <img src="${getPokemonSprite(150)}" alt="Mewtwo" />
                <p>Mewtwo has joined your party!</p>
            </div>
        `;
    }

    const fallback = won
        ? "You won the battle!"
        : data.surrendered
            ? "You forfeited the battle."
            : "Your team was defeated. Train up and try again.";
    rewardsEl.innerHTML = chips.length || special
        ? `<div class="reward-list">${chips.join("")}</div>${special}`
        : `<p>${fallback}</p>`;
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

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("surrenderBtn").onclick = () => {
        if (busy) return;
        if (confirm("Surrender this battle?")) endBattle();
    };
    document.getElementById("tabFight").onclick = () => setPartyOpen(false);
    document.getElementById("tabParty").onclick = () => setPartyOpen(true);

    const params = new URLSearchParams(window.location.search);
    const gymId = params.get("gym_id");
    if (gymId) {
        startBattle(gymId);
    } else {
        document.getElementById("battleLoading").innerHTML =
            `<div>Pick a gym to battle. <a href="gym.html">Go to Gyms →</a></div>`;
    }
});
