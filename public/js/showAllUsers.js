let leaderboardRows = [];
let sortKey = "badges";

// Tie-breakers: badges → caught → coins
const SORT_ORDER = {
    badges: ["badges", "caught", "coins"],
    caught: ["caught", "badges", "coins"],
    coins: ["coins", "badges", "caught"],
};

function renderLeaderboard() {
    const userList = document.getElementById("userList");
    if (!userList) return;

    const currentUserId = localStorage.getItem("userId");
    const keys = SORT_ORDER[sortKey];
    const rows = [...leaderboardRows].sort((a, b) => {
        for (const k of keys) {
            if (b[k] !== a[k]) return b[k] - a[k];
        }
        return a.username.localeCompare(b.username);
    });

    const medal = rank => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`);

    userList.innerHTML = rows.map((user, i) => {
        const isMe = String(user.user_id) === currentUserId;
        const stat = (key, label) => `<span class="lb-stat ${key === sortKey ? "active" : ""}"><b>${Number(user[key]).toLocaleString()}</b>${label}</span>`;
        return `
          <div class="lb-row ${isMe ? "me" : ""} ${i < 3 ? "top" : ""}">
            <span class="lb-rank">${medal(i + 1)}</span>
            <div class="avatar">${escapeHTML(String(user.username).charAt(0))}</div>
            <div class="lb-name">
              <h5>${escapeHTML(user.username)}${isMe ? ' <span class="chip brand" style="padding:1px 7px">You</span>' : ""}</h5>
              <span class="chip" tabindex="0" data-tip="${escapeHTML(itemInfo("Amulet Coin"))}"><img src="${getItemSprite("amulet-coin")}" alt="Amulet Coins">${user.amulet_coins} Amulet</span>
            </div>
            <div class="lb-stats">
              ${stat("badges", "badges")}
              ${stat("caught", "caught")}
              ${stat("coins", "coins")}
            </div>
          </div>`;
    }).join("");
}

const callback = (responseStatus, responseData) => {
    const userList = document.getElementById("userList");
    if (!userList) return;

    // Guard: only proceed if responseData is an array
    if (responseStatus !== 200 || !Array.isArray(responseData)) {
        userList.innerHTML = "";
        const errorMsg = document.createElement("div");
        errorMsg.className = "alert alert-danger text-center w-100";
        errorMsg.innerText =
            responseData?.message || "Failed to load user data.";
        userList.appendChild(errorMsg);
        return;
    }

    leaderboardRows = responseData;
    renderLeaderboard();
};

document.querySelectorAll(".sort-tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
        sortKey = btn.dataset.sort;
        document.querySelectorAll(".sort-tabs button").forEach(b => {
            b.classList.toggle("active", b === btn);
            b.setAttribute("aria-selected", String(b === btn));
        });
        renderLeaderboard();
    });
});

// Fetch data from backend API
document.getElementById("userList").innerHTML = '<div class="skeleton" style="min-height:70px"></div>'.repeat(4);
fetchMethod(currentUrl + "/api/users/leaderboard", callback);
