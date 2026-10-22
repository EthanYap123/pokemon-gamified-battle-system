// Fetch all badges from API
async function fetchAllBadges() {
    try {
        const res = await fetch("/api/badges");
        if (!res.ok) throw new Error("Failed to fetch badges");
        return await res.json();
    } catch (err) {
        console.error(err);
        return [];
    }
}

// Fetch badges owned by a specific user
async function fetchUserBadges(userId) {
    try {
        const res = await fetch(`/api/userbadges/users/${userId}/badges`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        if (!res.ok) throw new Error("Failed to fetch user badges");
        return await res.json();
    } catch (err) {
        console.error(err);
        return [];
    }
}

// Render a single badge card
function renderBadgeCard(badge = []) {
    const card = document.createElement("div");
    card.className = "pokemon-card badge-card";

    // Use badge.name directly since filenames match
    const spritePath = `../images/badges/${badge.name}.png`;

    card.innerHTML = `
    <img src="${spritePath}" alt="${escapeHTML(badge.name)}" />
    <h5>${escapeHTML(badge.name)}</h5>
    <p>Gym ${badge.gym_id}</p>
  `;
    return card;
}

// Render all badges into container
function renderBadges(badges, containerId = "badgeContainer") {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    if (badges.length === 0) {
        container.innerHTML = `<div class="empty-state">No badges to show.</div>`;
        return;
    }

    badges.forEach(badge => {
        const card = renderBadgeCard(badge);
        container.appendChild(card);
    });
}

// Setup filter dropdown
async function setupUserFilter() {
    const filter = document.getElementById("userFilter");
    if (!filter) return;

    // Viewing another trainer's badges needs a login
    if (!localStorage.getItem("token")) {
        filter.closest(".filter-bar").classList.add("d-none");
        return;
    }

    try {
        const res = await fetch("/api/users");
        if (!res.ok) throw new Error("Failed to fetch users");
        const users = await res.json();

        // Populate dropdown
        filter.innerHTML = `<option value="">All Users</option>`;
        users.forEach(user => {
            const opt = document.createElement("option");
            opt.value = user.user_id;
            opt.textContent = user.username;
            filter.appendChild(opt);
        });

        // Handle change
        filter.addEventListener("change", async e => {
            const userId = e.target.value;
            if (userId) {
                const userBadges = await fetchUserBadges(userId);
                renderBadges(userBadges);
            } else {
                const allBadges = await fetchAllBadges();
                renderBadges(allBadges);
            }
        });
    } catch (err) {
        console.error(err);
    }
}

// Init
document.addEventListener("DOMContentLoaded", async () => {
    const allBadges = await fetchAllBadges();
    renderBadges(allBadges);

    setupUserFilter();
});
