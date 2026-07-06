function loadProfile() {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    // 1. Get user info
    fetchMethod(currentUrl + `/api/users/${userId}`, function (status, profile) {
        console.log("DEBUG: /api/users/:id =", status, profile);

        if (status !== 200 || !profile) {
            console.error("Failed to fetch profile:", status, profile);
            return;
        }

        document.getElementById("profileUsername").textContent = profile.username;
        document.getElementById("profileEmail").textContent = profile.email;
        document.getElementById("profileCoins").textContent = profile.coins;
        document.getElementById("profileAmuletCoins").textContent = profile.amulet_coins;

        // 2. Get badges
        fetchMethod(currentUrl + `/api/userbadges/users/${userId}/badges`, function (status, badges) {
            console.log("DEBUG: /api/userbadges =", status, badges);
            if (status === 200 && Array.isArray(badges)) {
                renderBadges(badges);
            } else {
                console.error("Failed to fetch user badges:", status, badges);
            }
        }, "GET", null);

        // 3. Get Pokémon summary
        fetchMethod(currentUrl + `/api/userpokemon/${userId}`, function (status, pokemonList) {
            console.log("DEBUG: /api/userpokemon =", status, pokemonList);
            if (status === 200 && Array.isArray(pokemonList)) {
                const owned = pokemonList.length;
                const total = 151;
                const completionRate = ((owned / total) * 100).toFixed(1);

                document.getElementById("pokemonOwned").textContent = `${owned}/${total}`;
                document.getElementById("pokemonCompletion").textContent = `${completionRate}%`;
            } else {
                console.error("Failed to fetch user Pokémon:", status, pokemonList);
            }
        }, "GET", null);

        // 4. Get team
        fetchMethod(currentUrl + `/api/team/${userId}`, function (status, data) {
            console.log("DEBUG: /api/team =", status, data);
            if (status === 200 && data && Array.isArray(data.team)) {
                renderProfileTeam(data.team);
            } else {
                console.error("Failed to fetch team:", status, data);
            }
        }, "GET", null);
    }, "GET", null);
}

// Render badges
function renderBadgeCard(badge) {
    const card = document.createElement("div");
    card.className = "pokemon-card";

    const spritePath = `../images/badges/${badge.name}.png`;

    card.innerHTML = `
        <img src="${spritePath}" alt="${badge.name}" />
        <h5>${badge.name}</h5>
        <p>Gym ID: ${badge.gym_id}</p>
    `;
    return card;
}

function renderBadges(badges) {
    const container = document.getElementById("profileBadges");
    if (!container) return;

    console.log("DEBUG: renderBadges received =", badges);

    if (!Array.isArray(badges)) {
        console.error("ERROR: renderBadges expected an array, got:", badges);
        return;
    }

    container.innerHTML = "";
    badges.forEach(badge => {
        const card = renderBadgeCard(badge);
        container.appendChild(card);
    });
}

// Render team (using pokemon_id directly)
function renderProfileTeam(team) {
    const container = document.getElementById("profileTeam");
    if (!container) {
        console.error("No #profileTeam container found");
        return;
    }
    container.innerHTML = "";

    for (let i = 0; i < 6; i++) {
        const slot = team.find(t => t.slot === i + 1);
        console.log("DEBUG: team slot =", slot);

        if (slot && slot.pokemon_id) {
            const spriteURL = getPokemonSprite(slot.pokemon_id);
            container.innerHTML += `
                <div class="team-slot filled">
                    <img src="${spriteURL}" alt="Pokemon #${slot.pokemon_id}" class="pokemon-sprite">
                    <p>ID: ${slot.pokemon_id}</p>
                </div>
            `;
        } else {
            container.innerHTML += `
                <div class="team-slot">
                    <p>Empty Slot ${i + 1}</p>
                </div>
            `;
        }
    }
}

// Init
document.addEventListener("DOMContentLoaded", loadProfile);