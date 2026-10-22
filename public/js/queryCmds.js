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

// Small toast message at the top of the page
function showToast(message, type = "success") {
  document.querySelectorAll(".feedback-box").forEach((box) => box.remove());
  const box = document.createElement("div");
  box.className = `feedback-box ${type}`;
  box.innerText = message;
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3000);
}
