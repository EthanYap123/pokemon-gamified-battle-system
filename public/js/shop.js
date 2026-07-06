// Utility: feedback popups
function showErrorBox(message) {
    const box = document.createElement("div");
    box.className = "feedback-box error";
    box.innerText = message;
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3000);
}

function showSuccessBox(message) {
    const box = document.createElement("div");
    box.className = "feedback-box success";
    box.innerText = message;
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3000);
}

// Initialize global variables
let userCoins = 0;
let userAmuletCoins = 0;

// Render balance in DOM
function renderBalance() {
    const balanceEl = document.getElementById("userBalance");
    if (balanceEl) {
        balanceEl.innerHTML = `
            <p>💰 Coins: ${userCoins}</p>
            <p>🪙 Amulet Coins: ${userAmuletCoins}</p>
        `;
    }
}

// Load balance from backend using GET by id
function loadUserBalance() {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    fetchMethod(currentUrl + `/api/users/${userId}`, (status, data) => {
        console.log("DEBUG user balance:", status, data);
        if (status === 200 && data) {
            userCoins = data.coins;
            userAmuletCoins = data.amulet_coins;
            renderBalance();
        }
    });
}

// Rendering shop items
const callback = (responseStatus, responseData) => {
    const shopList = document.getElementById("shopList");
    if (!shopList) return;
    shopList.innerHTML = "";

    if (responseStatus !== 200 || !Array.isArray(responseData)) {
        const errorMsg = document.createElement("div");
        errorMsg.className = "alert alert-danger text-center w-100";
        errorMsg.innerText = responseData?.message || "Failed to load shop data.";
        shopList.appendChild(errorMsg);
        return;
    }

    responseData.forEach((shop) => {
        const displayItem = document.createElement("div");
        displayItem.className = "col-xl-2 col-lg-3 col-md-4 col-sm-6 col-12";

        let spriteURL = "";
        if (shop.item_id >= 1 && shop.item_id <= 3) {
            const spriteKey = shop.item_name
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace("-ball", "")
                .replace("ball", "");
            spriteURL = getBallSprite(spriteKey);
        } else if (shop.item_id === 4) {
            spriteURL = getItemSprite("amulet-coin");
        }

        displayItem.innerHTML = `
          <div class="shop-card">
            <img src="${spriteURL}" alt="Sprite of ${shop.item_name}">
            <h5>${shop.item_name}</h5>
            <p>Item ID: ${shop.item_id}</p>
            <p>Price: ${shop.price}</p>
            <p>${shop.effect}</p>
            <button class="btn-buy" data-itemid="${shop.item_id}">Buy</button>
          </div>
        `;
        shopList.appendChild(displayItem);
    });
};

fetchMethod(currentUrl + "/api/shop/items", callback);

// Buy button logic
document.addEventListener("click", function (event) {
    if (event.target.classList.contains("btn-buy")) {
        const itemId = event.target.getAttribute("data-itemid");
        const userId = localStorage.getItem("userId");

        const data = { item_id: itemId };

        const purchaseCallback = (responseStatus, responseData) => {
            if (responseStatus === 403 && responseData?.message?.includes("Amulet coin limit reached")) {
                showErrorBox("🪙 You already have the max 10 Amulet Coins!");
                return;
            }

            if (responseStatus === 200 || responseStatus === 201) {
                // Update balance variables from backend response
                if (responseData.coins_after !== undefined) {
                    userCoins = responseData.coins_after;
                }
                if (responseData.amulet_coins_after !== undefined) {
                    userAmuletCoins = responseData.amulet_coins_after;
                }

                renderBalance(); // refresh display

                // Existing popup logic
                const awarded = responseData.pokemon_awarded;
                if (awarded) {
                    const spriteURL = getPokemonSprite(awarded.pokemon_id);
                    const popup = document.createElement("div");
                    popup.className = "gacha-popup";
                    popup.innerHTML = `
                        <div class="gacha-card">
                          <img src="${spriteURL}" alt="${awarded.name}">
                          <h5>${awarded.name}</h5>
                          <p>Rarity: ${awarded.rarity}</p>
                        </div>
                    `;
                    document.body.appendChild(popup);
                    setTimeout(() => popup.remove(), 2000);
                } else if (responseData.item === "Amulet Coin") {
                    const spriteURL = getItemSprite("amulet-coin");
                    const card = document.createElement("div");
                    card.className = "gacha-popup";
                    card.innerHTML = `
                        <div class="gacha-card">
                          <img src="${spriteURL}" alt="Amulet Coin">
                          <h5>Amulet Coin</h5>
                          <p>+5% coin gain (cap 10)</p>
                        </div>
                    `;
                    document.body.appendChild(card);
                    setTimeout(() => card.remove(), 2000);
                } else {
                    showSuccessBox(`Successfully purchased ${responseData.item || "item"}!`);
                }
            } else {
                showErrorBox(responseData?.message || "Please Login or Register to purchase items");
            }
        };

        fetchMethod(
            currentUrl + `/api/shop/${userId}/purchase`,
            purchaseCallback,
            "POST",
            data
        );
    }
});

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
    loadUserBalance(); // fetch balance from GET /api/users/:id
});