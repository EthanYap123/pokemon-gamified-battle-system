const callback = (responseStatus, responseData) => {

    const pokemonList = document.getElementById("pokemonList");
    pokemonList.innerHTML = ""; // clear any existing content

    // Guard: only proceed if responseData is an array
    if (responseStatus !== 200 || !Array.isArray(responseData)) {
        const errorMsg = document.createElement("div");
        errorMsg.className = "error-card text-center w-100";
        errorMsg.innerText =
            responseData?.message || "Failed to load user Pokémon data.";
        pokemonList.appendChild(errorMsg);
        return;
    }

    if (responseData.length === 0) {
        pokemonList.innerHTML = `<div class="empty-state">No trainer has caught a Pokémon yet.</div>`;
        return;
    }

    // Render each user-owned Pokémon card
    responseData.forEach((pokemon) => {
        const displayItem = document.createElement("div");

        const spriteURL = getPokemonSprite(pokemon.pokemon_id);
        const name = displayPokemonName(pokemon.pokemon_name);
        const obtained = String(pokemon.obtained_at || "").slice(0, 10);

        displayItem.innerHTML = `
      <div class="pokemon-card">
        <span class="dex-no">#${String(pokemon.pokemon_id).padStart(3, "0")}</span>
        <img src="${spriteURL}" alt="Sprite of ${escapeHTML(name)}" loading="lazy">
        <h5>${escapeHTML(name)}</h5>
        <span class="rarity-pill rarity-${escapeHTML(pokemon.rarity)}">${escapeHTML(pokemon.rarity)}</span>
        <p style="margin-top: 8px">Trainer <strong>${escapeHTML(pokemon.username)}</strong></p>
        <p class="text-muted small">Caught ${escapeHTML(obtained)}</p>
      </div>
    `;

        pokemonList.appendChild(displayItem);
    });
};

// Fetch data from backend API (userpokemon table)
document.getElementById("pokemonList").innerHTML = '<div class="skeleton"></div>'.repeat(12);
fetchMethod(currentUrl + "/api/pokemon", callback);
