// Utility: feedback popups
function showErrorBox(message) {
    showToast(message, "error");
}

function showSuccessBox(message) {
    showToast(message, "success");
}

// Initialize global variables
let userCoins = 0;
let userAmuletCoins = 0;
let buying = false;

// Render balance in DOM
function renderBalance() {
    const balanceEl = document.getElementById("userBalance");
    if (balanceEl) {
        balanceEl.innerHTML = `
            <span class="chip gold">💰 Coins <b>${Number(userCoins).toLocaleString()}</b></span>
            <span class="chip tip-below" tabindex="0" data-tip="${escapeHTML(itemInfo("Amulet Coin"))} You have +${Math.min(userAmuletCoins, 10) * 10}% right now."><img src="${getItemSprite("amulet-coin")}" alt="">Amulet Coins <b>${userAmuletCoins}/10</b><i class="info-dot">i</i></span>
        `;
    }
}

// Load balance from backend using GET by id
function loadUserBalance() {
    const userId = localStorage.getItem("userId");
    if (!userId) {
        const balanceEl = document.getElementById("userBalance");
        if (balanceEl) {
            balanceEl.innerHTML = `<span class="chip"><a href="login.html">Log in</a>&nbsp;to buy items</span>`;
        }
        return;
    }

    fetchMethod(currentUrl + `/api/users/${userId}`, (status, data) => {
        if (status === 200 && data) {
            userCoins = data.coins;
            userAmuletCoins = data.amulet_coins;
            renderBalance();
        }
    });
}

// Odds bar for the ball items (read from the item's effect text)
function oddsBar(effect) {
    const colours = {
        common: "var(--rarity-common)",
        uncommon: "var(--rarity-uncommon)",
        rare: "var(--rarity-rare)",
        ultrarare: "var(--rarity-ultra)",
    };
    const parts = [...String(effect).matchAll(/(\d+)%\s*(common|uncommon|rare|ultraRare)/gi)];
    if (parts.length === 0) return "";
    return `<div class="odds" title="${escapeHTML(effect)}">${parts
        .map(([, pct, rarity]) => `<span style="width:${pct}%;background:${colours[rarity.toLowerCase()]}"></span>`)
        .join("")}</div>`;
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
            <span class="item-icon" tabindex="0" data-tip="${escapeHTML(itemInfo(shop.item_name) || shop.effect)}">
              <img src="${spriteURL}" alt="Sprite of ${escapeHTML(shop.item_name)}">
            </span>
            <h5>${escapeHTML(shop.item_name)}<i class="info-dot" tabindex="0" data-tip="${escapeHTML(itemInfo(shop.item_name) || shop.effect)}">i</i></h5>
            <div class="price">💰 ${Number(shop.price).toLocaleString()}</div>
            ${oddsBar(shop.effect)}
            <p class="effect">${escapeHTML(shop.effect)}</p>
            <button class="btn-buy" data-itemid="${shop.item_id}">Buy</button>
          </div>
        `;
        shopList.appendChild(displayItem);
    });
};

fetchMethod(currentUrl + "/api/shop/items", callback);

// Gacha reveal: the ball wobbles, then the Pokémon pops out
function showGachaReveal(ballSprite, awarded, responseData) {
    const popup = document.createElement("div");
    popup.className = "gacha-popup";
    popup.innerHTML = `
        <div class="gacha-card rarity-${escapeHTML(awarded.rarity)}">
          <img class="gacha-ball" src="${ballSprite}" alt="">
        </div>
    `;
    document.body.appendChild(popup);

    const card = popup.querySelector(".gacha-card");
    setTimeout(() => {
        const name = displayPokemonName(awarded.name);
        const note = responseData.duplicate
            ? `<p>Already caught! Refunded 💰 ${responseData.refund}</p>`
            : `<p>New Pokémon added to your collection!</p>`;
        card.classList.add("revealed");
        card.innerHTML = `
          <img class="gacha-mon" src="${getPokemonSprite(awarded.pokemon_id)}" alt="${escapeHTML(name)}">
          <h5>${escapeHTML(name)}</h5>
          <span class="rarity-pill rarity-${escapeHTML(awarded.rarity)}">${escapeHTML(awarded.rarity === "ultraRare" ? "ultra rare" : awarded.rarity)}</span>
          ${note}
          <div class="tap-hint">Tap anywhere to continue</div>
        `;
        popup.addEventListener("click", () => popup.remove());
    }, 1800);
}

// Buy button logic
document.addEventListener("click", function (event) {
    const button = event.target.closest(".btn-buy");
    if (button && button.dataset.itemid) {
        if (buying) return;
        const itemId = button.getAttribute("data-itemid");
        const userId = localStorage.getItem("userId");
        const ballSprite = button.closest(".shop-card").querySelector("img").src;

        if (!userId) {
            showErrorBox("Please Login or Register to purchase items");
            return;
        }

        const data = { item_id: itemId };
        buying = true;
        button.disabled = true;

        const purchaseCallback = (responseStatus, responseData) => {
            buying = false;
            button.disabled = false;

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

                const awarded = responseData.pokemon_awarded;
                if (awarded) {
                    showGachaReveal(ballSprite, awarded, responseData);
                } else if (responseData.item === "Amulet Coin") {
                    const card = document.createElement("div");
                    card.className = "gacha-popup";
                    card.innerHTML = `
                        <div class="gacha-card revealed">
                          <img class="gacha-mon" src="${getItemSprite("amulet-coin")}" alt="Amulet Coin">
                          <h5>Amulet Coin</h5>
                          <p>${escapeHTML(itemInfo("Amulet Coin"))}</p>
                          <p><strong>You now have ${userAmuletCoins}/10 (+${Math.min(userAmuletCoins, 10) * 10}% gym coins).</strong></p>
                          <div class="tap-hint">Tap anywhere to continue</div>
                        </div>
                    `;
                    card.addEventListener("click", () => card.remove());
                    document.body.appendChild(card);
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
