const callback = (responseStatus, responseData) => {
    console.log("responseStatus:", responseStatus);
    console.log("responseData:", responseData);

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

    // Render each User card
    responseData.forEach((user) => {
        const displayItem = document.createElement("div");
        displayItem.className = "col-xl-2 col-lg-3 col-md-4 col-sm-6 col-12";

        displayItem.innerHTML = `
    <div class="user-card">
      <h5>${user.username}</h5>
      <p>User ID: ${user.user_id}</p>
      <p>Coins: ${user.coins}</p>
      <p>Amulet Coins: ${user.amulet_coins}</p>
    </div>
  `;

        userList.appendChild(displayItem);
    });
};

// Fetch data from backend API
fetchMethod(currentUrl + "/api/users", callback);