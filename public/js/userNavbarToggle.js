document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");

  const profileButton = document.getElementById("profileButton");
  const logoutButton = document.getElementById("logoutButton");
  const loginButton = document.getElementById("loginButton");
  const registerButton = document.getElementById("registerButton");

  if (token) {
    // Logged in → show Profile + Logout
    profileButton.classList.remove("d-none");
    logoutButton.classList.remove("d-none");
    loginButton.classList.add("d-none");
    registerButton.classList.add("d-none");

    // Logout handler
    logoutButton.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      window.location.href = "login.html";
    });
  } else {
    // Not logged in → show Login + Register
    profileButton.classList.add("d-none");
    logoutButton.classList.add("d-none");
    loginButton.classList.remove("d-none");
    registerButton.classList.remove("d-none");
  }

  // Mobile menu toggle
  const navbar = document.querySelector(".navbar");
  if (navbar) {
    const toggle = document.createElement("button");
    toggle.className = "nav-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "Open menu");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = "<span></span>";
    toggle.addEventListener("click", () => {
      const open = navbar.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    navbar.appendChild(toggle);
  }
});
