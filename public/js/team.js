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
    switch (name) {
        case "NidoranF": return "Nidoran♀";
        case "NidoranM": return "Nidoran♂";
        case "MrMime": return "Mr. Mime";
        default: return name;
    }
}

// Render team slots
function renderTeam(team) {
    const grid = document.getElementById("teamGrid");
    if (!grid) return;

    grid.innerHTML = "";

    for (let slot = 1; slot <= 6; slot++) {
        const slotData = team.find(p => p.slot === slot);
        const slotDiv = document.createElement("div");
        slotDiv.className = "team-slot";

        if (slotData) {
            slotDiv.classList.add("filled");

            const pokemonId = slotData.pokemon_id;
            const name = normalizeName(idToNameMap[pokemonId]);
            const spritePath = getPokemonSprite(pokemonId);

            console.log("DEBUG team slot:", slot, "name:", name, "id:", pokemonId, "sprite:", spritePath);

            slotDiv.innerHTML = `
                <img src="${spritePath}" alt="${name}" />
                <h5>${name}</h5>
                <button data-slot="${slot}" class="remove-btn">Remove</button>
            `;
        } else {
            slotDiv.innerHTML = `
                <p>Empty Slot ${slot}</p>
                <span class="add-label">Add a Pokémon</span>
            `;
        }

        grid.appendChild(slotDiv);
    }

    document.querySelectorAll(".remove-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const slot = e.target.getAttribute("data-slot");
            removePokemon(slot);
        });
    });

    document.querySelectorAll(".add-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const slot = e.target.getAttribute("data-slot");
            alert("Select a Pokémon from your owned list to add to slot " + slot);
        });
    });
}

// Render owned Pokémon list
function renderOwned(pokemonList) {
    const list = document.getElementById("ownedList");
    if (!list) return;

    list.innerHTML = "";

    pokemonList.forEach(p => {
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

        console.log("DEBUG owned:", displayName, "id:", pokemonId, "sprite:", spritePath);

        card.innerHTML = `
            <img src="${spritePath}" alt="${displayName}" />
            <h5>${displayName}</h5>
            <p>${p.rarity}</p>
            <button data-id="${p.id}" class="add-team-btn">Add to Team</button>
        `;

        list.appendChild(card);
    });

    document.querySelectorAll(".add-team-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const userPokemonId = e.target.getAttribute("data-id");
            addPokemon(userPokemonId);
        });
    });
}

// API calls
function getTeam(userId) {
    fetchMethod(currentUrl + `/api/team/${userId}`, function (status, data) {
        console.log("DEBUG: getTeam =", status, data);
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
        console.log("DEBUG: getOwned =", status, data);
        if (status === 200 && Array.isArray(data)) {
            renderOwned(data);
        }
    }, "GET", null);
}

function addPokemon(userPokemonId) {
    const userId = localStorage.getItem("userId");
    fetchMethod(currentUrl + `/api/team/${userId}/add`, function (status, data) {
        console.log("DEBUG: addPokemon =", status, data);
        if (status === 200 || status === 201) {
            getTeam(userId);
        }
    }, "POST", { user_pokemon_id: userPokemonId });
}

function removePokemon(slot) {
    const userId = localStorage.getItem("userId");
    fetchMethod(currentUrl + `/api/team/${userId}/remove/${slot}`, function (status, data) {
        console.log("DEBUG: removePokemon =", status, data);
        if (status === 200) {
            getTeam(userId);
        }
    }, "DELETE", null);
}

// Starter modal
function showStarterModal(userId) {
    const modal = document.getElementById("starterModal");
    if (!modal) return;
    modal.style.display = "block";

    modal.querySelectorAll("button[data-starter]").forEach(btn => {
        btn.addEventListener("click", e => {
            const starterName = e.target.getAttribute("data-starter");
            const starterId = nameToIdMap[starterName.toLowerCase()];

            fetchMethod(currentUrl + `/api/team/${userId}/starter`, function (status, data) {
                console.log("DEBUG: chooseStarter =", status, data);
                if (status === 200 || status === 201) {
                    modal.style.display = "none";
                    getTeam(userId);
                    getOwned(userId);
                }
            }, "POST", { starter_id: starterId });
        });
    });
}

// Init
document.addEventListener("DOMContentLoaded", () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    getTeam(userId);
    getOwned(userId);
});