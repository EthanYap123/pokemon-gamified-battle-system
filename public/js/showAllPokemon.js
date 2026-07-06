const callback = (responseStatus, responseData) => {
    console.log("responseStatus:", responseStatus);
    console.log("responseData:", responseData);

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

    // Render each user-owned Pokémon card
    responseData.forEach((pokemon) => {
        const displayItem = document.createElement("div");
        displayItem.className = "col-xl-2 col-lg-3 col-md-4 col-sm-6 col-12";

        const spriteURL = getPokemonSprite(pokemon.pokemon_id);

        displayItem.innerHTML = `
      <div class="pokemon-card">
        <img src="${spriteURL}" alt="Sprite of ${pokemon.pokemon_name}">
        <h5>${pokemon.pokemon_name}</h5>
        <p>ID: ${pokemon.pokemon_id}</p>
        <p class="text-muted small">Owned by: ${pokemon.username} (User ID: ${pokemon.user_id})</p>
        <p class="text-muted small">Obtained On: ${pokemon.obtained_at}</p>
      </div>
    `;

        pokemonList.appendChild(displayItem);
    });
};

// Fetch data from backend API (userpokemon table)
fetchMethod(currentUrl + "/api/pokemon", callback);