document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("gymGrid");
  const userId = localStorage.getItem("userId");

  if (!userId) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1">
      <a href="login.html">Log in</a> or <a href="register.html">register</a> to view and challenge the gyms.
    </div>`;
    return;
  }

  grid.innerHTML = '<div class="skeleton"></div>'.repeat(6);

  // 1. Fetch gyms first (so we have order_index mapping)
  fetchMethod(currentUrl + "/api/challenges", (status, gyms) => {

    if (status !== 200 || !Array.isArray(gyms)) {
      console.error("Unexpected gym response format:", gyms);
      grid.innerHTML = `<div class="alert" style="grid-column: 1 / -1">Failed to load gyms.</div>`;
      return;
    }

    // Build lookup: gym_id → order_index
    const orderMap = {};
    gyms.forEach(g => orderMap[g.gym_id] = g.order_index);

    // 2. Fetch badges for current user
    fetchMethod(currentUrl + `/api/userbadges/users/${userId}/badges`, (status, badges) => {

      if (status !== 200 || !Array.isArray(badges)) {
        console.error("Failed to fetch user badges:", status, badges);
        grid.innerHTML = `<div class="alert" style="grid-column: 1 / -1">Failed to load gyms.</div>`;
        return;
      }

      // Compute highest order_index beaten using gym_id → order_index map
      const highestOrder = badges.length > 0
        ? Math.max(...badges.map(b => orderMap[b.gym_id] || 0))
        : 0;
      const clearedGyms = new Set(badges.map(b => b.gym_id));

      grid.innerHTML = "";

      // 3. Render gyms
      gyms.forEach(gym => {
        const card = document.createElement("div");
        card.className = "gym-card";

        // Challengeable if order_index <= highest beaten + 1
        const challengeable = gym.order_index <= highestOrder + 1;
        const cleared = clearedGyms.has(gym.gym_id);
        if (!challengeable) card.classList.add("locked");
        if (cleared) card.classList.add("cleared");

        const statusChip = cleared
          ? `<span class="chip success">✓ Cleared</span>`
          : challengeable
            ? `<span class="chip brand">Up next</span>`
            : `<span class="chip muted">🔒 Locked</span>`;

        const teamSprites = (Array.isArray(gym.pokemon_team_ids) ? gym.pokemon_team_ids : [])
          .map((id, i) => {
            const name = displayPokemonName(gym.pokemon_team_names?.[i] || `Pokémon ${id}`);
            return `<img src="${getPokemonSprite(id)}" alt="${escapeHTML(name)}" title="${escapeHTML(name)}" loading="lazy">`;
          })
          .join("");

        card.innerHTML = `
          <div class="gym-banner">
            <span class="gym-order">#${gym.order_index}</span>
            <span class="gym-status">${statusChip}</span>
            <img src="../images/trainers/${escapeHTML(gym.leader.toLowerCase())}.webp" alt="${escapeHTML(gym.leader)}">
          </div>
          <div class="gym-body">
            <h3>${escapeHTML(gym.name)}</h3>
            <p>Leader: ${escapeHTML(gym.leader)}</p>
            <div class="pokemon-team">${teamSprites}</div>
            <div class="gym-reward">
              <span class="chip gold" tabindex="0" data-tip="Coins for your first win here, plus the gym's badge. Amulet Coins add +10% each.">${gym.reward_first_clear} first clear</span>
              <span class="chip" tabindex="0" data-tip="Coins for every win after the first. Amulet Coins add +10% each.">${gym.reward_replay} replay</span>
            </div>
          </div>
        `;

        const btn = document.createElement("button");
        btn.textContent = !challengeable ? "Locked" : cleared ? "Rematch" : "Challenge";
        btn.disabled = !challengeable;
        btn.onclick = () => {
          window.location.href = `battle.html?gym_id=${gym.gym_id}`;
        };

        card.appendChild(btn);
        grid.appendChild(card);
      });
    }, "GET", null);
  }, "GET", null);
});
