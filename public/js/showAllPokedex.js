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

        displayItem.innerHTML = `
      <div class="pokemon-card">
        <span class="dex-no">${dexNumber(pokemon.pokemon_id)}</span>
        <img src="${spriteURL}" alt="${escapeHTML(name)}" loading="lazy">
        <h5>${escapeHTML(name)}</h5>
        <div>${typeBadges(pokemon.type1, pokemon.type2)}</div>
        <span class="rarity-pill rarity-${escapeHTML(pokemon.rarity)}">${escapeHTML(pokemon.rarity)}</span>
      </div>
    `;
        pokemonList.appendChild(displayItem);
    });
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

        displayItem.innerHTML = `
          <div class="pokemon-card ${discovered ? "" : "undiscovered"}">
            <span class="dex-no">${dexNumber(pokemon.pokemon_id)}</span>
            <img src="${spriteURL}" alt="${escapeHTML(nameDisplay)}" class="${imgClass}" loading="lazy">
            <h5>${escapeHTML(nameDisplay)}</h5>
            <div>${discovered ? typeBadges(pokemon.type1, pokemon.type2) : '<span class="type-badge">???</span>'}</div>
            ${discovered ? `<span class="rarity-pill rarity-${escapeHTML(pokemon.rarity)}">${escapeHTML(pokemon.rarity)}</span>` : ""}
          </div>
        `;
        pokemonList.appendChild(displayItem);
    });
}
