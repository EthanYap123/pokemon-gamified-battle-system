// "Try the demo" buttons: create a throwaway trainer and log straight in.
document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll("[data-demo-login]");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const label = button.textContent;
      buttons.forEach((b) => (b.disabled = true));
      button.textContent = "Setting up your trainer…";

      fetchMethod(currentUrl + "/api/demo", (status, data) => {
        if (status === 200 && data?.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("userId", data.userId);
          // First stop: pick a starter
          window.location.href = "team.html";
          return;
        }
        buttons.forEach((b) => (b.disabled = false));
        button.textContent = label;
        const warningCard = document.getElementById("warningCard");
        const warningText = document.getElementById("warningText");
        const message = data?.message || "Couldn't start the demo. Please try again.";
        if (warningCard && warningText) {
          warningCard.classList.remove("d-none");
          warningText.innerText = message;
        } else {
          window.alert(message);
        }
      }, "POST", {});
    });
  });
});
