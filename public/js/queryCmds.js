function fetchMethod(url, callback, method = "GET", data = null, token = null) {

  const headers = {};

  if (data) {
    headers["Content-Type"] = "application/json";
  }

  // Auto-include token from localStorage if not explicitly passed
  const authToken = token || localStorage.getItem("token");
  if (authToken) {
    headers["Authorization"] = "Bearer " + authToken;
  }

  const options = {
    method: method.toUpperCase(),
    headers: headers,
  };

  if (method.toUpperCase() !== "GET" && data !== null) {
    options.body = JSON.stringify(data);
  }

  fetch(url, options)
    .then((response) => {
      // Expired or invalid session: clear it and send the user to log in again
      if (response.status === 401 && authToken && !url.endsWith("/api/login")) {
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        window.location.href = "login.html?expired=1";
        return;
      }

      if (response.status === 204) {
        callback(response.status, {});
      } else {
        response
          .json()
          .catch(() => ({ message: "Unexpected response from the server." }))
          .then((responseData) => callback(response.status, responseData));
      }
    })
    .catch((error) => {
      console.error(`Error from ${method} ${url}:`, error);
      callback(0, { message: "Could not reach the server. Please try again." });
    });
}

// Escape text before putting it inside innerHTML
function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// "mr. mime" -> "Mr. Mime", "NidoranF" -> "Nidoran♀"
function displayPokemonName(name) {
  if (!name) return "";
  if (/^nidoranf$/i.test(name)) return "Nidoran♀";
  if (/^nidoranm$/i.test(name)) return "Nidoran♂";
  if (/^mr[-. ]*mime$/i.test(name)) return "Mr. Mime";
  if (/^farfetch'?d$/i.test(name)) return "Farfetch'd";
  return String(name).replace(/\b\w/g, (c) => c.toUpperCase());
}

// What each item does, shown in tooltips (keep in sync with the server rules)
const ITEM_INFO = {
  "amulet coin":
    "Each Amulet Coin adds +10% to the coins you win from gyms, up to 10 coins (+100%). Clearing a gym also has a 10% chance to give you one.",
  "poke ball":
    "Catches a random Pokémon: 70% common, 25% uncommon, 5% rare. Already own it? You get half the price back.",
  "great ball":
    "Catches a random Pokémon: 50% common, 40% uncommon, 9% rare, 1% ultra rare. Already own it? You get half the price back.",
  "ultra ball":
    "Catches a random Pokémon: 30% common, 50% uncommon, 18% rare, 2% ultra rare. Already own it? You get half the price back.",
};

function itemInfo(name) {
  const key = String(name || "").toLowerCase().replace(/é/g, "e").trim();
  return ITEM_INFO[key] || "";
}

// Keep tooltips on screen: line them up with the element when it is near an edge
function placeTooltip(event) {
  const el = event.target.closest && event.target.closest("[data-tip]");
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const half = Math.min(250, window.innerWidth * 0.8) / 2;
  const centre = rect.left + rect.width / 2;
  el.classList.toggle("tip-start", centre - half < 8);
  el.classList.toggle("tip-end", centre + half > window.innerWidth - 8);
}
document.addEventListener("mouseover", placeTooltip);
document.addEventListener("focusin", placeTooltip);

// Small toast message at the top of the page
function showToast(message, type = "success") {
  document.querySelectorAll(".feedback-box").forEach((box) => box.remove());
  const box = document.createElement("div");
  box.className = `feedback-box ${type}`;
  box.innerText = message;
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3000);
}
