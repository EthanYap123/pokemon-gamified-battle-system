document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    const filterContainer = document.getElementById("filterContainer");

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

// Render global Pokédex
function renderGlobalPokedex(responseStatus, responseData) {
    const pokemonList = document.getElementById("pokemonList");
    pokemonList.innerHTML = "";

    if (responseStatus !== 200 || !Array.isArray(responseData)) {
        const errorMsg = document.createElement("div");
        errorMsg.className = "alert alert-danger text-center w-100";
        errorMsg.innerText =
            responseData?.message || "Failed to load pokedex data.";
        pokemonList.appendChild(errorMsg);
        return;
    }

    responseData.forEach((pokemon) => {
        const spriteURL = getPokemonSprite(pokemon.pokemon_id);
        const displayItem = document.createElement("div");
        displayItem.className = "col-xl-2 col-lg-3 col-md-4 col-sm-6 col-12";

        displayItem.innerHTML = `
      <div class="pokemon-card">
        <img src="${spriteURL}" alt="${pokemon.name}">
        <h5>${pokemon.name}</h5>
        <p>ID: ${pokemon.pokemon_id}</p>
        <div>
          <span class="type-badge type-${pokemon.type1}">${pokemon.type1}</span>
          ${pokemon.type2 ? `<span class="type-badge type-${pokemon.type2}">${pokemon.type2}</span>` : ""}
        </div>
        <p class="text-muted small">Rarity: ${pokemon.rarity}</p>
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

    pokedexEntries.forEach((pokemon) => {
        const spriteURL = getPokemonSprite(pokemon.pokemon_id);
        const displayItem = document.createElement("div");
        displayItem.className = "col-xl-2 col-lg-3 col-md-4 col-sm-6 col-12";

        const discovered = Boolean(pokemon.obtained);
        const imgClass = discovered ? "" : "greyed-out";

        const nameDisplay = discovered ? pokemon.name : "???";
        const idDisplay = discovered ? pokemon.pokemon_id : "???";
        const type1Display = discovered ? pokemon.type1 : "???";
        const type2Display = discovered && pokemon.type2 ? pokemon.type2 : "";
        const rarityDisplay = discovered ? pokemon.rarity : "???";

        displayItem.innerHTML = `
          <div class="pokemon-card">
            <img src="${spriteURL}" alt="${nameDisplay}" class="${imgClass}">
            <h5>${nameDisplay}</h5>
            <p>ID: ${idDisplay}</p>
            <div>
              <span class="type-badge ${discovered ? `type-${type1Display}` : ""}">${type1Display}</span>
              ${type2Display ? `<span class="type-badge ${discovered ? `type-${type2Display}` : ""}">${type2Display}</span>` : ""}
            </div>
            <p class="text-muted small">Rarity: ${rarityDisplay}</p>
          </div>
        `;
        pokemonList.appendChild(displayItem);
    });
}