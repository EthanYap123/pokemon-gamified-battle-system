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
let multiPull = { count: 10, discount: 0.9 };

// Pity bar + daily free ball button
function renderStatus(status) {
    if (!status) return;
    multiPull = { count: status.multi_pull_count || 10, discount: status.multi_pull_discount || 0.9 };
    document.getElementById("shopStatus").classList.remove("d-none");
    document.getElementById("pityText").textContent =
        `${status.pity_count}/${status.pity_threshold} · rare within ${status.pulls_until_rare} pull${status.pulls_until_rare === 1 ? "" : "s"}`;
    document.getElementById("pityBar").style.width = `${(status.pity_count / status.pity_threshold) * 100}%`;

    const dailyBtn = document.getElementById("dailyBtn");
    dailyBtn.disabled = !status.daily_available;
    dailyBtn.classList.toggle("ready", Boolean(status.daily_available));
    document.getElementById("dailyText").textContent = status.daily_available
        ? "Claim free daily Poké Ball"
        : "Daily ball claimed · back tomorrow";
}

function loadStatus() {
    const userId = localStorage.getItem("userId");
    if (!userId) return;
    fetchMethod(currentUrl + `/api/shop/${userId}/status`, (status, data) => {
        if (status === 200) renderStatus(data);
    });
}

function timeAgo(value) {
    const seconds = Math.max(0, (Date.now() - new Date(String(value).replace(" ", "T")).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

function loadHistory() {
    const userId = localStorage.getItem("userId");
    if (!userId) return;
    fetchMethod(currentUrl + `/api/shop/${userId}/history?limit=20`, (status, rows) => {
        if (status !== 200 || !Array.isArray(rows)) return;
        const section = document.getElementById("historySection");
        const list = document.getElementById("pullHistory");
        section.classList.remove("d-none");
        if (rows.length === 0) {
            list.innerHTML = `<div class="empty-state">No pulls yet. Throw a ball above!</div>`;
            return;
        }
        list.innerHTML = rows.map(r => `
            <div class="history-row rarity-${escapeHTML(r.rarity)}">
              <img src="${getPokemonSprite(r.pokemon_id)}" alt="" loading="lazy">
              <span class="history-name">${escapeHTML(displayPokemonName(r.name))}</span>
              <span class="rarity-pill rarity-${escapeHTML(r.rarity)}">${escapeHTML(r.rarity)}</span>
              ${r.duplicate ? '<span class="chip muted">Duplicate</span>' : '<span class="chip success">New</span>'}
              <span class="history-meta">${escapeHTML(r.item_name.replace("Poke", "Poké"))} · ${timeAgo(r.pulled_at)}</span>
            </div>
        `).join("");
    });
}

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
        ultra: "var(--rarity-ultra)",
    };
    const parts = [...String(effect).matchAll(/(\d+)%\s*(ultra ?rare|uncommon|common|rare)/gi)];
    if (parts.length === 0) return "";
    return `<div class="odds" title="${escapeHTML(effect)}">${parts
        .map(([, pct, rarity]) => {
            const key = /^ultra/i.test(rarity) ? "ultra" : rarity.toLowerCase();
            return `<span style="width:${pct}%;background:${colours[key]}"></span>`;
        })
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

        const isBall = shop.item_name.toLowerCase() !== "amulet coin";
        const multiPrice = Math.round(shop.price * multiPull.count * multiPull.discount);
        displayItem.innerHTML = `
          <div class="shop-card">
            <span class="item-icon" tabindex="0" data-tip="${escapeHTML(itemInfo(shop.item_name) || shop.effect)}">
              <img src="${spriteURL}" alt="Sprite of ${escapeHTML(shop.item_name)}">
            </span>
            <h5>${escapeHTML(shop.item_name)}<i class="info-dot" tabindex="0" data-tip="${escapeHTML(itemInfo(shop.item_name) || shop.effect)}">i</i></h5>
            <div class="price">💰 ${Number(shop.price).toLocaleString()}</div>
            ${oddsBar(shop.effect)}
            <p class="effect">${escapeHTML(shop.effect)}</p>
            <div class="buy-row">
              <button class="btn-buy" data-itemid="${shop.item_id}" data-qty="1">Buy${isBall ? " ×1" : ""}</button>
              ${isBall ? `<button class="btn-buy btn-multi" data-itemid="${shop.item_id}" data-qty="${multiPull.count}" data-tip="${multiPull.count} pulls for 💰${multiPrice.toLocaleString()} (10% off). At least one uncommon or better is guaranteed.">×${multiPull.count} · 💰${multiPrice.toLocaleString()}</button>` : ""}
            </div>
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
          <span class="rarity-pill rarity-${escapeHTML(awarded.rarity)}">${escapeHTML(rarityLabel(awarded.rarity))}</span>
          ${note}
          <div class="tap-hint">Tap anywhere to continue</div>
        `;
        popup.addEventListener("click", () => closeReveal(popup));
    }, 1800);
}

function rarityLabel(rarity) {
    return rarity === "ultra" || rarity === "ultraRare" ? "ultra rare" : rarity;
}

// 10-pull reveal: balls shake together, then open one by one
function showMultiReveal(ballSprite, pulls, responseData) {
    const rank = { common: 0, uncommon: 1, rare: 2, ultra: 3 };
    const best = pulls.reduce((a, b) => (rank[b.rarity] > rank[a.rarity] ? b : a));
    const newCount = pulls.filter(p => !p.duplicate).length;

    const popup = document.createElement("div");
    popup.className = "gacha-popup";
    popup.innerHTML = `
        <div class="gacha-card multi rarity-${escapeHTML(best.rarity)}">
          <h5>${pulls.length} pulls</h5>
          <div class="multi-grid">
            ${pulls.map((p, i) => `
              <div class="multi-slot" data-i="${i}">
                <img class="gacha-ball" src="${ballSprite}" alt="">
              </div>`).join("")}
          </div>
          <div class="multi-summary"></div>
        </div>
    `;
    document.body.appendChild(popup);

    const slots = popup.querySelectorAll(".multi-slot");
    pulls.forEach((p, i) => {
        setTimeout(() => {
            const name = displayPokemonName(p.name);
            slots[i].className = `multi-slot open rarity-${escapeHTML(p.rarity)}${p.duplicate ? " dupe" : ""}`;
            slots[i].innerHTML = `
              <img class="gacha-mon" src="${getPokemonSprite(p.pokemon_id)}" alt="${escapeHTML(name)}">
              <span class="multi-name">${escapeHTML(name)}</span>
              <span class="multi-tag">${p.duplicate ? "Dupe" : escapeHTML(rarityLabel(p.rarity))}</span>
            `;
        }, 1200 + i * 180);
    });

    setTimeout(() => {
        popup.querySelector(".gacha-card").classList.add("revealed");
        popup.querySelector(".multi-summary").innerHTML = `
          <p>${newCount} new Pokémon${responseData.refund ? ` · duplicates refunded 💰 ${responseData.refund}` : ""}</p>
          <div class="tap-hint">Tap anywhere to continue</div>
        `;
        popup.addEventListener("click", () => closeReveal(popup));
    }, 1200 + pulls.length * 180 + 200);
}

function afterPull(responseData) {
    if (responseData.coins_after !== undefined) userCoins = responseData.coins_after;
    if (responseData.amulet_coins_after !== undefined) userAmuletCoins = responseData.amulet_coins_after;
    renderBalance();
    if (responseData.pity_threshold) renderStatus(responseData);
}

// Close a reveal popup, then show the new pulls in the history (not before, so it isn't spoiled)
function closeReveal(popup) {
    popup.remove();
    loadHistory();
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

        const quantity = Number(button.dataset.qty) || 1;
        const data = { item_id: itemId, quantity };
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
                afterPull(responseData); // refresh balance, pity and history

                const awarded = responseData.pokemon_awarded;
                if (responseData.pulls && responseData.pulls.length > 1) {
                    showMultiReveal(ballSprite, responseData.pulls, responseData);
                } else if (awarded) {
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

// Free daily Poké Ball
function claimDaily() {
    const userId = localStorage.getItem("userId");
    const dailyBtn = document.getElementById("dailyBtn");
    if (!userId || buying) return;
    buying = true;
    dailyBtn.disabled = true;

    fetchMethod(currentUrl + `/api/shop/${userId}/daily`, (status, data) => {
        buying = false;
        if (status === 200 || status === 201) {
            afterPull(data);
            showGachaReveal(getBallSprite("poke"), data.pokemon_awarded, data);
        } else {
            showErrorBox(data?.message || "Could not claim the daily ball.");
            loadStatus();
        }
    }, "POST", {});
}

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
    loadUserBalance(); // fetch balance from GET /api/users/:id
    loadStatus();
    loadHistory();
    document.getElementById("dailyBtn").addEventListener("click", claimDaily);
});
