// Use the global idToNameMap (loaded from idToNameMap.browser.js in your HTML)

// Build reverse lookup once at runtime
const nameToIdMap = {};
for (const [id, name] of Object.entries(idToNameMap)) {
    nameToIdMap[name.toLowerCase()] = parseInt(id, 10);
}

function getPokemonIdByName(name) {
    if (!name) return null;
    return nameToIdMap[name.toLowerCase()] || null;
}

// Normalize names for display (fixes Nidoran♀/♂ and Mr. Mime)
function normalizeName(name) {
    return displayPokemonName(name);
}

// Display state shared by the team and owned lists
let teamUserPokemonIds = new Set();
let lastOwnedList = null;
let currentTeam = [];
let dragFromSlot = null;

// Swap two slots, redraw straight away, then save the new order
function swapSlots(fromSlot, toSlot) {
    if (fromSlot === toSlot) return;
    const ordered = [...currentTeam].sort((a, b) => a.slot - b.slot);
    const from = ordered.findIndex(p => p.slot === fromSlot);
    const to = ordered.findIndex(p => p.slot === toSlot);
    if (from === -1 || to === -1) return;

    [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
    const reordered = ordered.map((p, i) => ({ ...p, slot: i + 1 }));
    renderTeam(reordered);
    reorderTeam(reordered.map(p => p.user_pokemon_id));
}

// Drag and drop between filled slots
function enableDragAndDrop(slotDiv, slot) {
    slotDiv.draggable = true;

    slotDiv.addEventListener("dragstart", e => {
        dragFromSlot = slot;
        slotDiv.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(slot));
    });

    slotDiv.addEventListener("dragend", () => {
        dragFromSlot = null;
        document.querySelectorAll(".team-slot").forEach(s => s.classList.remove("dragging", "drag-over"));
    });

    slotDiv.addEventListener("dragover", e => {
        if (dragFromSlot === null || dragFromSlot === slot) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        slotDiv.classList.add("drag-over");
    });

    slotDiv.addEventListener("dragleave", () => slotDiv.classList.remove("drag-over"));

    slotDiv.addEventListener("drop", e => {
        e.preventDefault();
        slotDiv.classList.remove("drag-over");
        if (dragFromSlot !== null) swapSlots(dragFromSlot, slot);
    });
}

// Render team slots
function renderTeam(team) {
    const grid = document.getElementById("teamGrid");
    if (!grid) return;

    // Entrance animations only on the first draw, so reordering doesn't flicker
    if (grid.dataset.rendered) grid.classList.add("no-anim");
    grid.dataset.rendered = "true";

    grid.innerHTML = "";
    currentTeam = team;
    teamUserPokemonIds = new Set(team.map(p => p.user_pokemon_id));

    for (let slot = 1; slot <= 6; slot++) {
        const slotData = team.find(p => p.slot === slot);
        const slotDiv = document.createElement("div");
        slotDiv.className = "team-slot";

        if (slotData) {
            slotDiv.classList.add("filled");

            const pokemonId = slotData.pokemon_id;
            const name = normalizeName(idToNameMap[pokemonId]);
            const spritePath = getPokemonSprite(pokemonId);

            slotDiv.innerHTML = `
                <span class="slot-no">${slot}</span>
                ${slot === 1 ? '<span class="lead-tag">Lead</span>' : ""}
                <img src="${spritePath}" alt="${escapeHTML(name)}" draggable="false" />
                <h5>${escapeHTML(name)}</h5>
                ${team.length > 1 ? `
                <div class="slot-actions">
                    <button class="move-slot" data-slot="${slot}" data-dir="-1" aria-label="Move ${escapeHTML(name)} left" ${slot === 1 ? "disabled" : ""}>‹</button>
                    <button data-slot="${slot}" class="remove-btn">Remove</button>
                    <button class="move-slot" data-slot="${slot}" data-dir="1" aria-label="Move ${escapeHTML(name)} right" ${slot === team.length ? "disabled" : ""}>›</button>
                </div>` : ""}
            `;
            if (team.length > 1) enableDragAndDrop(slotDiv, slot);
        } else {
            slotDiv.innerHTML = `
                <span class="slot-no">${slot}</span>
                <div class="empty-ball"></div>
                <p>Empty slot</p>
                <span class="add-label">Add a Pokémon below</span>
            `;
        }

        grid.appendChild(slotDiv);
    }

    document.querySelectorAll(".remove-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const slot = e.currentTarget.getAttribute("data-slot");
            removePokemon(slot);
        });
    });

    document.querySelectorAll(".move-slot").forEach(btn => {
        btn.addEventListener("click", e => {
            const slot = parseInt(e.currentTarget.getAttribute("data-slot"), 10);
            const dir = parseInt(e.currentTarget.getAttribute("data-dir"), 10);
            swapSlots(slot, slot + dir);
        });
    });

    if (lastOwnedList) renderOwned(lastOwnedList);
}

const RARITY_RANK = { common: 0, uncommon: 1, rare: 2, ultra: 3, legendary: 4 };

// Fill the type dropdown with the types the player actually owns
function fillTypeFilter(pokemonList) {
    const select = document.getElementById("ownedType");
    if (!select) return;
    const current = select.value;
    const types = [...new Set(pokemonList.flatMap(p => [p.type1, p.type2]).filter(Boolean))].sort();
    select.innerHTML = `<option value="">Any</option>` +
        types.map(t => `<option value="${escapeHTML(t)}">${escapeHTML(t.charAt(0).toUpperCase() + t.slice(1))}</option>`).join("");
    if (types.includes(current)) select.value = current;
}

// Apply search, rarity, type, "hide team" and sort to the owned list
function filterOwned(pokemonList) {
    const query = (document.getElementById("ownedSearch")?.value || "").trim().toLowerCase();
    const rarity = document.getElementById("ownedRarity")?.value || "";
    const type = document.getElementById("ownedType")?.value || "";
    const sort = document.getElementById("ownedSort")?.value || "newest";
    const hideTeam = document.getElementById("ownedHideTeam")?.checked;

    const result = pokemonList.filter(p =>
        (!query || normalizeName(p.name).toLowerCase().includes(query)) &&
        (!rarity || p.rarity === rarity) &&
        (!type || p.type1 === type || p.type2 === type) &&
        (!hideTeam || !teamUserPokemonIds.has(p.id))
    );

    const sorters = {
        newest: (a, b) => b.id - a.id,
        oldest: (a, b) => a.id - b.id,
        rarity: (a, b) => (RARITY_RANK[b.rarity] ?? 0) - (RARITY_RANK[a.rarity] ?? 0) || a.pokemon_id - b.pokemon_id,
        dex: (a, b) => a.pokemon_id - b.pokemon_id || a.id - b.id,
        name: (a, b) => normalizeName(a.name).localeCompare(normalizeName(b.name)),
    };
    return result.sort(sorters[sort] || sorters.newest);
}

// Render owned Pokémon list
function renderOwned(pokemonList) {
    const list = document.getElementById("ownedList");
    if (!list) return;

    if (pokemonList !== lastOwnedList) fillTypeFilter(pokemonList);
    lastOwnedList = pokemonList;
    if (list.dataset.rendered) list.classList.add("no-anim");
    list.dataset.rendered = "true";
    list.innerHTML = "";

    const shownList = filterOwned(pokemonList);
    const count = document.getElementById("ownedCount");
    if (count) {
        count.textContent = shownList.length === pokemonList.length
            ? `${pokemonList.length} caught`
            : `${shownList.length} of ${pokemonList.length} shown`;
    }

    if (pokemonList.length === 0) {
        list.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1">
            No Pokémon yet. Pick a starter, then visit the <a href="shop.html">Shop</a> to catch more.
        </div>`;
        return;
    }

    if (shownList.length === 0) {
        list.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1">No Pokémon match these filters.</div>`;
        return;
    }

    shownList.forEach(p => {
        const card = document.createElement("div");
        card.className = "owned-card rarity-" + p.rarity;

        let pokemonId = p.pokemon_id;

        // Manual patch for the 3 problem cases
        if (!pokemonId) {
            const lowerName = p.name.toLowerCase();
            if (lowerName === "mr. mime" || lowerName === "mrmime") {
                pokemonId = 122;
            } else if (lowerName === "nidoranm" || lowerName === "nidoran♂") {
                pokemonId = 32;
            } else if (lowerName === "nidoranf" || lowerName === "nidoran♀") {
                pokemonId = 29;
            } else {
                // fallback to lookup map if needed
                pokemonId = getPokemonIdByName(p.name);
            }
        }

        const spritePath = getPokemonSprite(pokemonId);
        const displayName = normalizeName(p.name);
        const inTeam = teamUserPokemonIds.has(p.id);

        card.innerHTML = `
            <img src="${spritePath}" alt="${escapeHTML(displayName)}" loading="lazy" />
            <h5>${escapeHTML(displayName)}</h5>
            <div class="owned-types">
                <span class="type-badge type-${escapeHTML(p.type1)}">${escapeHTML(p.type1)}</span>
                ${p.type2 ? `<span class="type-badge type-${escapeHTML(p.type2)}">${escapeHTML(p.type2)}</span>` : ""}
            </div>
            <span class="rarity-pill rarity-${escapeHTML(p.rarity)}">${escapeHTML(p.rarity)}</span>
            <button data-id="${p.id}" class="add-team-btn" ${inTeam ? "disabled" : ""}>${inTeam ? "✓ In team" : currentTeam.length >= 6 ? "Swap into team" : "Add to Team"}</button>
        `;

        list.appendChild(card);
    });

    document.querySelectorAll(".add-team-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const userPokemonId = e.currentTarget.getAttribute("data-id");
            addPokemon(userPokemonId);
        });
    });
}

// API calls
function getTeam(userId) {
    fetchMethod(currentUrl + `/api/team/${userId}`, function (status, data) {
        if (status === 200 && data && Array.isArray(data.team)) {
            renderTeam(data.team);

            if (data.team.length === 0) {
                showStarterModal(userId);
            }
        }
    }, "GET", null);
}

function getOwned(userId) {
    fetchMethod(currentUrl + `/api/userpokemon/${userId}`, function (status, data) {
        if (status === 200 && Array.isArray(data)) {
            renderOwned(data);
        }
    }, "GET", null);
}

// Team is full: ask which member the new Pokémon should replace
function openReplaceModal(userPokemonId) {
    const incoming = (lastOwnedList || []).find(p => String(p.id) === String(userPokemonId));
    if (!incoming) return;
    const incomingName = normalizeName(incoming.name);
    const modal = document.getElementById("replaceModal");
    const grid = document.getElementById("replaceGrid");

    document.getElementById("replaceText").innerHTML =
        `Pick a Pokémon for <strong>${escapeHTML(incomingName)}</strong> to replace. The replaced one stays in your collection.`;

    const ordered = [...currentTeam].sort((a, b) => a.slot - b.slot);
    grid.innerHTML = ordered.map(member => {
        const name = normalizeName(idToNameMap[member.pokemon_id]);
        return `
            <button class="replace-option" data-slot="${member.slot}">
                <span class="slot-no">${member.slot}</span>
                <img src="${getPokemonSprite(member.pokemon_id)}" alt="">
                <span>${escapeHTML(name)}</span>
            </button>`;
    }).join("");

    grid.querySelectorAll(".replace-option").forEach(btn => {
        btn.addEventListener("click", () => {
            const slot = parseInt(btn.dataset.slot, 10);
            const replaced = ordered.find(m => m.slot === slot);
            const order = ordered.map(m => (m.slot === slot ? Number(userPokemonId) : m.user_pokemon_id));
            closeReplaceModal();

            const userId = localStorage.getItem("userId");
            fetchMethod(currentUrl + `/api/team/${userId}/reorder`, function (status, data) {
                if (status === 200) {
                    showToast(`${incomingName} replaced ${normalizeName(idToNameMap[replaced.pokemon_id])}!`);
                } else {
                    showToast(data?.message || "Could not swap that Pokémon in.", "error");
                }
                getTeam(userId);
            }, "PUT", { order });
        });
    });

    modal.style.display = "flex";
    grid.querySelector("button")?.focus();
}

function closeReplaceModal() {
    document.getElementById("replaceModal").style.display = "none";
}

function addPokemon(userPokemonId) {
    if (currentTeam.length >= 6) {
        openReplaceModal(userPokemonId);
        return;
    }
    const userId = localStorage.getItem("userId");
    fetchMethod(currentUrl + `/api/team/${userId}/add`, function (status, data) {
        if (status === 200 || status === 201) {
            showToast("Added to your team!");
            getTeam(userId);
        } else {
            showToast(data?.message || "Could not add that Pokémon.", "error");
        }
    }, "POST", { user_pokemon_id: userPokemonId });
}

function removePokemon(slot) {
    const userId = localStorage.getItem("userId");
    fetchMethod(currentUrl + `/api/team/${userId}/remove/${slot}`, function (status, data) {
        if (status === 200) {
            getTeam(userId);
        } else {
            showToast(data?.message || "Could not remove that Pokémon.", "error");
        }
    }, "DELETE", null);
}

function reorderTeam(order) {
    const userId = localStorage.getItem("userId");
    fetchMethod(currentUrl + `/api/team/${userId}/reorder`, function (status, data) {
        if (status !== 200) {
            showToast(data?.message || "Could not save the new order.", "error");
            getTeam(userId); // put back what the server has
        }
    }, "PUT", { order });
}

// Starter modal
function showStarterModal(userId) {
    const modal = document.getElementById("starterModal");
    if (!modal || modal.dataset.ready) return;
    modal.dataset.ready = "true";
    modal.style.display = "block";

    modal.querySelectorAll("button[data-starter]").forEach(btn => {
        btn.addEventListener("click", e => {
            const starterName = e.currentTarget.getAttribute("data-starter");
            const starterId = nameToIdMap[starterName.toLowerCase()];

            fetchMethod(currentUrl + `/api/team/${userId}/starter`, function (status, data) {
                if (status === 200 || status === 201) {
                    modal.style.display = "none";
                    showToast(`${displayPokemonName(starterName)}, I choose you!`);
                    getTeam(userId);
                    getOwned(userId);
                } else {
                    showToast(data?.message || "Could not choose that starter.", "error");
                }
            }, "POST", { starter_id: starterId });
        });
    });
}

// Init
document.addEventListener("DOMContentLoaded", () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
        document.getElementById("teamGrid").outerHTML = `<div class="empty-state">
            <a href="login.html">Log in</a> or <a href="register.html">register</a> to build your team.
        </div>`;
        return;
    }

    getTeam(userId);
    getOwned(userId);

    // Owned list filters
    ["ownedSearch", "ownedRarity", "ownedType", "ownedSort", "ownedHideTeam"].forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener(el.tagName === "INPUT" && el.type === "search" ? "input" : "change", () => {
            if (lastOwnedList) renderOwned(lastOwnedList);
        });
    });

    // Replace popup
    document.getElementById("replaceClose").addEventListener("click", closeReplaceModal);
    document.getElementById("replaceModal").addEventListener("click", e => {
        if (e.target.id === "replaceModal") closeReplaceModal();
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") closeReplaceModal();
    });
});
