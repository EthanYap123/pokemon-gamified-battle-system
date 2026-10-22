document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    const filterContainer = document.getElementById("filterContainer");

    showLoading();
    if (token && userId) {
        // Logged in → show dropdown + user Pokédex
        if (filterContainer) filterContainer.classList.remove("d-none");
        fetchMethod(currentUrl + `/api/userpokedex/${userId}`, renderUserPokedex);
    } else {
        // Not logged in → hide dropdown + show global Pokédex
        if (filterContainer) filterContainer.classList.add("d-none");
        fetchMethod(currentUrl + "/api/pokedex", renderGlobalPokedex);
    }

    // Attach view toggle only if logged in
    const filterToggle = document.getElementById("filterToggle");
    if (filterToggle && token && userId) {
        filterToggle.addEventListener("change", (e) => {
            showLoading();
            if (e.target.value === "global") {
                fetchMethod(currentUrl + "/api/pokedex", renderGlobalPokedex);
            } else {
                fetchMethod(currentUrl + `/api/userpokedex/${userId}`, renderUserPokedex);
            }
        });
    }

    // Attach filter button (works for both views)
    const applyFilterBtn = document.getElementById("applyFilter");
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener("click", () => {
            const type = document.getElementById("typeFilter").value;
            const rarity = document.getElementById("rarityFilter").value;

            showLoading();
            // If logged in, check toggle value
            if (token && userId && filterToggle && filterToggle.value === "user") {
                // User Pokédex filter (only obtained Pokémon)
                let url = currentUrl + `/api/userpokedex/${userId}?`;
                const params = [];
                if (type) params.push(`type=${type}`);
                if (rarity) params.push(`rarity=${rarity}`);
                url += params.join("&");
                fetchMethod(url, renderUserPokedex);
            } else {
                // Global Pokédex filter (logged out OR toggle = global)
                let url = currentUrl + "/api/pokedex?";
                const params = [];
                if (type) params.push(`type=${type}`);
                if (rarity) params.push(`rarity=${rarity}`);
                url += params.join("&");
                fetchMethod(url, renderGlobalPokedex);
            }
        });
    }
});

function showLoading() {
    const pokemonList = document.getElementById("pokemonList");
    if (pokemonList) pokemonList.innerHTML = '<div class="skeleton"></div>'.repeat(12);
}

function dexNumber(id) {
    return "#" + String(id).padStart(3, "0");
}

function typeBadges(type1, type2) {
    return `
        <span class="type-badge type-${escapeHTML(type1)}">${escapeHTML(type1)}</span>
        ${type2 ? `<span class="type-badge type-${escapeHTML(type2)}">${escapeHTML(type2)}</span>` : ""}
    `;
}

function showEmpty(pokemonList) {
    pokemonList.innerHTML = `<div class="empty-state">No Pokémon match these filters.</div>`;
}

// Render global Pokédex
function renderGlobalPokedex(responseStatus, responseData) {
    const pokemonList = document.getElementById("pokemonList");
    pokemonList.innerHTML = "";
    document.getElementById("dexProgress").classList.add("d-none");

    if (responseStatus !== 200 || !Array.isArray(responseData)) {
        const errorMsg = document.createElement("div");
        errorMsg.className = "alert alert-danger text-center w-100";
        errorMsg.innerText =
            responseData?.message || "Failed to load pokedex data.";
        pokemonList.appendChild(errorMsg);
        return;
    }

    if (responseData.length === 0) return showEmpty(pokemonList);

    responseData.forEach((pokemon) => {
        const spriteURL = getPokemonSprite(pokemon.pokemon_id);
        const displayItem = document.createElement("div");
        const name = displayPokemonName(pokemon.name);

        displayItem.dataset.id = pokemon.pokemon_id;
        displayItem.dataset.name = name.toLowerCase();
        displayItem.dataset.open = "1";
        displayItem.innerHTML = `
      <div class="pokemon-card dex-entry" tabindex="0" role="button" aria-label="View ${escapeHTML(name)} details">
        <span class="dex-no">${dexNumber(pokemon.pokemon_id)}</span>
        <img src="${spriteURL}" alt="${escapeHTML(name)}" loading="lazy">
        <h5>${escapeHTML(name)}</h5>
        <div>${typeBadges(pokemon.type1, pokemon.type2)}</div>
        <span class="rarity-pill rarity-${escapeHTML(pokemon.rarity)}">${escapeHTML(pokemon.rarity)}</span>
      </div>
    `;
        pokemonList.appendChild(displayItem);
    });
    applySearch();
}

function renderUserPokedex(responseStatus, responseData) {
    const pokemonList = document.getElementById("pokemonList");
    pokemonList.innerHTML = "";

    // Handle error
    if (responseStatus !== 200 || (!Array.isArray(responseData) && !responseData.pokedex)) {
        const errorMsg = document.createElement("div");
        errorMsg.className = "alert alert-danger text-center w-100";
        errorMsg.innerText =
            responseData?.message || "Failed to load user pokedex.";
        pokemonList.appendChild(errorMsg);
        return;
    }

    if (responseData.mew_awarded) {
        // Create overlay
        const overlay = document.createElement("div");
        overlay.className = "popup-overlay";

        // Create card
        const card = document.createElement("div");
        card.className = "popup-card";

        card.innerHTML = `
        <div class="popup-header">🌟 Pokédex Complete!</div>
        <div class="popup-body">
            <img src="${getPokemonSprite(151)}" alt="Mew" class="popup-sprite">
            <p>A mysterious Pokémon has joined your party...</p>
        </div>
        <div class="popup-footer">
            <button id="closePopupBtn" class="btn btn-primary">Close</button>
        </div>
    `;

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        // Close button handler
        document.getElementById("closePopupBtn").addEventListener("click", () => {
            document.body.removeChild(overlay);
        });
    }

    // Normalize to array of Pokémon entries
    const pokedexEntries = Array.isArray(responseData) ? responseData : responseData.pokedex;

    // Caught counter (only meaningful for the full, unfiltered list)
    const progress = document.getElementById("dexProgress");
    if (pokedexEntries.length >= 151) {
        const caught = pokedexEntries.filter(p => Boolean(p.obtained)).length;
        document.getElementById("dexProgressText").textContent = `${caught} / ${pokedexEntries.length} caught`;
        progress.classList.remove("d-none");
        requestAnimationFrame(() => {
            document.getElementById("dexProgressBar").style.width = `${(caught / pokedexEntries.length) * 100}%`;
        });
    } else {
        progress.classList.add("d-none");
    }

    if (pokedexEntries.length === 0) return showEmpty(pokemonList);

    pokedexEntries.forEach((pokemon) => {
        const spriteURL = getPokemonSprite(pokemon.pokemon_id);
        const displayItem = document.createElement("div");

        const discovered = Boolean(pokemon.obtained);
        const imgClass = discovered ? "" : "greyed-out";

        const nameDisplay = discovered ? displayPokemonName(pokemon.name) : "???";

        displayItem.dataset.id = pokemon.pokemon_id;
        displayItem.dataset.name = discovered ? nameDisplay.toLowerCase() : "";
        displayItem.dataset.open = discovered ? "1" : "";
        displayItem.innerHTML = `
          <div class="pokemon-card ${discovered ? "dex-entry" : "undiscovered"}" ${discovered ? `tabindex="0" role="button" aria-label="View ${escapeHTML(nameDisplay)} details"` : ""}>
            <span class="dex-no">${dexNumber(pokemon.pokemon_id)}</span>
            <img src="${spriteURL}" alt="${escapeHTML(nameDisplay)}" class="${imgClass}" loading="lazy">
            <h5>${escapeHTML(nameDisplay)}</h5>
            <div>${discovered ? typeBadges(pokemon.type1, pokemon.type2) : '<span class="type-badge">???</span>'}</div>
            ${discovered ? `<span class="rarity-pill rarity-${escapeHTML(pokemon.rarity)}">${escapeHTML(pokemon.rarity)}</span>` : ""}
          </div>
        `;
        pokemonList.appendChild(displayItem);
    });
    applySearch();
}

// Instant search by name or Pokédex number
function applySearch() {
    const input = document.getElementById("searchFilter");
    const list = document.getElementById("pokemonList");
    if (!input || !list) return;
    const query = input.value.trim().toLowerCase().replace(/^#/, "");
    let shownCount = 0;
    list.querySelectorAll("[data-id]").forEach(item => {
        const match = !query
            || item.dataset.name.includes(query)
            || item.dataset.id === String(parseInt(query, 10));
        item.classList.toggle("d-none", !match);
        if (match) shownCount++;
    });
    let empty = list.querySelector(".search-empty");
    if (!shownCount && list.querySelector("[data-id]")) {
        if (!empty) {
            empty = document.createElement("div");
            empty.className = "empty-state search-empty";
            list.appendChild(empty);
        }
        empty.textContent = `No Pokémon match "${input.value.trim()}".`;
    } else if (empty) {
        empty.remove();
    }
}

// Details popup: stats and moves
function statBar(label, value, max) {
    return `
      <div class="stat-row">
        <span class="stat-label">${label}</span>
        <span class="stat-value">${value}</span>
        <span class="stat-track"><span style="width:${Math.min(100, (value / max) * 100)}%"></span></span>
      </div>`;
}

function openDetails(id) {
    const modal = document.getElementById("dexModal");
    const body = document.getElementById("dexModalBody");
    body.innerHTML = `<div class="skeleton" style="min-height: 320px"></div>`;
    modal.style.display = "flex";

    fetchMethod(currentUrl + `/api/pokedex/${id}/details`, (status, p) => {
        if (status !== 200) {
            body.innerHTML = `<div class="alert">${escapeHTML(p?.message || "Could not load this Pokémon.")}</div>`;
            return;
        }
        const name = displayPokemonName(p.name);
        const b = p.base_stats || {};
        const total = ["hp", "attack", "defense", "sp_attack", "sp_defense", "speed"].reduce((s, k) => s + (b[k] || 0), 0);
        body.innerHTML = `
          <div class="dex-modal-head">
            <img src="${getPokemonSprite(p.pokemon_id)}" alt="${escapeHTML(name)}">
            <div>
              <span class="dex-no-inline">${dexNumber(p.pokemon_id)}</span>
              <h2 id="dexModalName">${escapeHTML(name)}</h2>
              <div>${typeBadges(p.type1, p.type2)} <span class="rarity-pill rarity-${escapeHTML(p.rarity)}">${escapeHTML(p.rarity)}</span></div>
            </div>
          </div>
          <h5>Base stats <span class="text-muted small">(total ${total})</span></h5>
          <div class="stat-list">
            ${statBar("HP", b.hp, 160)}
            ${statBar("Attack", b.attack, 160)}
            ${statBar("Defense", b.defense, 160)}
            ${statBar("Sp. Atk", b.sp_attack, 160)}
            ${statBar("Sp. Def", b.sp_defense, 160)}
            ${statBar("Speed", b.speed, 160)}
          </div>
          ${p.stats ? `<p class="text-muted small">At level ${p.level} in battle: ${p.stats.hp} HP, ${p.stats.attack} Atk, ${p.stats.defense} Def, ${p.stats.sp_attack} Sp. Atk, ${p.stats.sp_defense} Sp. Def, ${p.stats.speed} Speed.</p>` : ""}
          <h5>Moves</h5>
          <div class="move-list">
            ${p.moves.length ? p.moves.map(m => `
              <div class="move-row">
                <span class="type-badge type-${escapeHTML(String(m.type).toLowerCase())}">${escapeHTML(m.type)}</span>
                <span class="move-row-name">${escapeHTML(m.name)}${m.priority > 0 ? ' <span class="chip brand" style="padding:1px 7px">Priority</span>' : ""}</span>
                <span class="text-muted small">${m.power ? `PWR ${m.power}` : "Status"} · PP ${m.pp}</span>
              </div>`).join("") : '<p class="text-muted">No moves.</p>'}
          </div>
        `;
    });
}

function closeDetails() {
    document.getElementById("dexModal").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("searchFilter").addEventListener("input", applySearch);
    const list = document.getElementById("pokemonList");
    const open = e => {
        const item = e.target.closest("[data-id]");
        if (item && item.dataset.open) openDetails(item.dataset.id);
    };
    list.addEventListener("click", open);
    list.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open(e);
        }
    });
    document.getElementById("dexModalClose").addEventListener("click", closeDetails);
    document.getElementById("dexModal").addEventListener("click", e => {
        if (e.target.id === "dexModal") closeDetails();
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") closeDetails();
    });
});
