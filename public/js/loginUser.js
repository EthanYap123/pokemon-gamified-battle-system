document.addEventListener("DOMContentLoaded", function () {
  const callback = (responseStatus, responseData) => {
    console.log("responseStatus:", responseStatus);
    console.log("responseData:", responseData);

    // Guard: only proceed if login was successful
    if (responseStatus === 200 && responseData?.token) {
      // Store token + userId in localStorage
      localStorage.setItem("token", responseData.token);
      localStorage.setItem("userId", responseData.userId);

      // Redirect to profile page
      window.location.href = "profile.html";
      return;
    }

    // Show warning card if login failed
    const warningCard = document.getElementById("warningCard");
    const warningText = document.getElementById("warningText");

    if (warningCard && warningText) {
      warningCard.classList.remove("d-none");
      warningText.innerText =
        responseData?.message || "Login failed. Please try again.";
    }
  };

  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
      console.log("loginForm.addEventListener");
      event.preventDefault();

      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;

      const data = { username, password };

      // Perform login request
      fetchMethod(currentUrl + "/api/login", callback, "POST", data);

      // Reset the form fields
      loginForm.reset();
    });
  }
});