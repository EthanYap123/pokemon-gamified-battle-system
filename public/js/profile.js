function loadProfile() {
    const userId = localStorage.getItem("userId");
    if (!userId) {
        window.location.href = "login.html";
        return;
    }

    // 1. Get user info
    fetchMethod(currentUrl + `/api/users/${userId}`, function (status, profile) {

        if (status !== 200 || !profile) {
            console.error("Failed to fetch profile:", status, profile);
            document.getElementById("profileUsername").textContent = "Could not load profile";
            return;
        }

        document.getElementById("profileUsername").textContent = profile.username;
        document.getElementById("profileEmail").textContent = profile.email;
        document.getElementById("profileAvatar").textContent = (profile.username || "?").charAt(0);
        document.getElementById("profileCoins").textContent = Number(profile.coins).toLocaleString();
        document.getElementById("profileAmuletCoins").textContent = `${profile.amulet_coins}/10`;

        // 2. Get badges
        fetchMethod(currentUrl + `/api/userbadges/users/${userId}/badges`, function (status, badges) {
            if (status === 200 && Array.isArray(badges)) {
                renderBadges(badges);
            } else {
                console.error("Failed to fetch user badges:", status, badges);
            }
        }, "GET", null);

        // 3. Get Pokémon summary
        fetchMethod(currentUrl + `/api/userpokemon/${userId}`, function (status, pokemonList) {
            if (status === 200 && Array.isArray(pokemonList)) {
                const owned = pokemonList.length;
                const total = 151;
                const completionRate = ((owned / total) * 100).toFixed(1);

                document.getElementById("pokemonOwned").textContent = `${owned}/${total}`;
                document.getElementById("pokemonCompletion").textContent = `${completionRate}%`;
                document.getElementById("pokemonCompletionBar").style.width = `${Math.min(100, completionRate)}%`;
            } else {
                console.error("Failed to fetch user Pokémon:", status, pokemonList);
            }
        }, "GET", null);

        // 4. Get team
        fetchMethod(currentUrl + `/api/team/${userId}`, function (status, data) {
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
    card.className = "pokemon-card badge-card";

    const spritePath = `../images/badges/${badge.name}.png`;

    card.innerHTML = `
        <img src="${spritePath}" alt="${escapeHTML(badge.name)}" />
        <h5>${escapeHTML(badge.name)}</h5>
        <p>Gym ${badge.gym_id}</p>
    `;
    return card;
}

function renderBadges(badges) {
    const container = document.getElementById("profileBadges");
    if (!container) return;

    if (!Array.isArray(badges)) {
        console.error("ERROR: renderBadges expected an array, got:", badges);
        return;
    }

    document.getElementById("profileBadgeCount").textContent = `${badges.length}/9`;

    container.innerHTML = "";
    if (badges.length === 0) {
        container.innerHTML = `<div class="empty-state">No badges yet. <a href="gym.html">Challenge Brock</a> to earn your first.</div>`;
        return;
    }
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

        if (slot && slot.pokemon_id) {
            const spriteURL = getPokemonSprite(slot.pokemon_id);
            const name = displayPokemonName(idToNameMap[slot.pokemon_id] || `#${slot.pokemon_id}`);
            container.innerHTML += `
                <div class="team-slot filled">
                    <span class="slot-no">${i + 1}</span>
                    <img src="${spriteURL}" alt="${escapeHTML(name)}" class="pokemon-sprite">
                    <h5>${escapeHTML(name)}</h5>
                </div>
            `;
        } else {
            container.innerHTML += `
                <div class="team-slot">
                    <span class="slot-no">${i + 1}</span>
                    <div class="empty-ball"></div>
                    <p>Empty slot</p>
                </div>
            `;
        }
    }
}

// Init
document.addEventListener("DOMContentLoaded", loadProfile);
