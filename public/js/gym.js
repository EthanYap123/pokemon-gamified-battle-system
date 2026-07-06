document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("gymGrid");
  const userId = localStorage.getItem("userId");

  if (!userId) {
    console.error("No userId found in localStorage");
    grid.innerHTML = "<p>Please log in to view gyms.</p>";
    return;
  }

  // 1. Fetch gyms first (so we have order_index mapping)
  fetchMethod(currentUrl + "/api/challenges", (status, gyms) => {
    console.log("DEBUG: /api/challenges =", status, gyms);

    if (status !== 200 || !Array.isArray(gyms)) {
      console.error("❌ Unexpected gym response format:", gyms);
      grid.innerHTML = "<p>Failed to load gyms.</p>";
      return;
    }

    // Build lookup: gym_id → order_index
    const orderMap = {};
    gyms.forEach(g => orderMap[g.gym_id] = g.order_index);

    // 2. Fetch badges for current user
    fetchMethod(currentUrl + `/api/userbadges/users/${userId}/badges`, (status, badges) => {
      console.log("DEBUG: /api/userbadges =", status, badges);

      if (status !== 200 || !Array.isArray(badges)) {
        console.error("❌ Failed to fetch user badges:", status, badges);
        grid.innerHTML = "<p>Failed to load gyms.</p>";
        return;
      }

      // Compute highest order_index beaten using gym_id → order_index map
      const highestOrder = badges.length > 0
        ? Math.max(...badges.map(b => orderMap[b.gym_id] || 0))
        : 0;

      console.log("ℹ️ Highest beaten order_index from badges:", highestOrder);

      // 3. Render gyms
      gyms.forEach(gym => {
        const card = document.createElement("div");
        card.className = "gym-card";

        // Challengeable if order_index <= highest beaten + 1
        const challengeable = gym.order_index <= highestOrder + 1;
        if (!challengeable) {
          card.classList.add("locked");
        }

        const img = document.createElement("img");
        img.src = `../images/trainers/${gym.leader.toLowerCase()}.webp`;
        img.alt = gym.leader;

        const title = document.createElement("h3");
        title.textContent = gym.name;

        const leader = document.createElement("p");
        leader.textContent = `Leader: ${gym.leader}`;

        const reward = document.createElement("p");
        reward.textContent =
          `Reward: ${gym.reward_first_clear} coins (first clear), ${gym.reward_replay} coins (replay)`;

        const teamDiv = document.createElement("div");
        teamDiv.className = "pokemon-team";
        if (Array.isArray(gym.pokemon_team_ids)) {
          gym.pokemon_team_ids.forEach(id => {
            const pokeImg = document.createElement("img");
            pokeImg.src =
              `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
            pokeImg.alt = `Pokemon ${id}`;
            teamDiv.appendChild(pokeImg);
          });
        }

        const btn = document.createElement("button");
        btn.textContent = "Challenge";
        btn.disabled = !challengeable;
        btn.onclick = () => {
          console.log("➡️ Challenge clicked for gym:", gym.gym_id);
          window.location.href = `battle.html?gym_id=${gym.gym_id}`;
        };

        card.append(img, title, leader, reward, teamDiv, btn);
        grid.appendChild(card);
      });
    }, "GET", null);
  }, "GET", null);
});