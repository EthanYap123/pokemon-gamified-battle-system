const callback = (responseStatus, responseData) => {

    const userList = document.getElementById("userList");
    if (!userList) return;
    userList.innerHTML = ""; // clear any existing content

    // Guard: only proceed if responseData is an array
    if (responseStatus !== 200 || !Array.isArray(responseData)) {
        const errorMsg = document.createElement("div");
        errorMsg.className = "alert alert-danger text-center w-100";
        errorMsg.innerText =
            responseData?.message || "Failed to load user data.";
        userList.appendChild(errorMsg);
        return;
    }

    const currentUserId = localStorage.getItem("userId");

    // Render each User card
    responseData.forEach((user) => {
        const displayItem = document.createElement("div");
        const isMe = String(user.user_id) === currentUserId;

        displayItem.innerHTML = `
    <div class="user-card">
      <div class="user-head">
        <div class="avatar">${escapeHTML(String(user.username).charAt(0))}</div>
        <div>
          <h5>${escapeHTML(user.username)}${isMe ? ' <span class="chip brand" style="padding:1px 7px">You</span>' : ""}</h5>
          <div class="user-id">Trainer #${user.user_id}</div>
        </div>
      </div>
      <div class="stat-chips">
        <span class="chip gold">💰 ${Number(user.coins).toLocaleString()}</span>
        <span class="chip"><img src="${getItemSprite("amulet-coin")}" alt="Amulet Coins">${user.amulet_coins}</span>
      </div>
    </div>
  `;

        userList.appendChild(displayItem);
    });
};

// Fetch data from backend API
fetchMethod(currentUrl + "/api/users", callback);
