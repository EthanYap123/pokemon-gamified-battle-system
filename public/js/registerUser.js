document.addEventListener("DOMContentLoaded", function () {
  const signupForm = document.getElementById("signupForm");
  const warningCard = document.getElementById("warningCard");
  const warningText = document.getElementById("warningText");

  if (signupForm) {
    signupForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const username = document.getElementById("username").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      // Guard: check password confirmation
      if (password !== confirmPassword) {
        if (warningCard && warningText) {
          warningCard.classList.remove("d-none");
          warningText.innerText = "Passwords do not match";
        }
        return;
      }

      const data = { username, email, password };

      const callback = (responseStatus, responseData) => {
        console.log("responseStatus:", responseStatus);
        console.log("responseData:", responseData);

        // Guard: only proceed if registration was successful
        if ((responseStatus === 201 || responseStatus === 200) && responseData?.userId) {
          // Optionally store token if backend returns one
          if (responseData.token) {
            localStorage.setItem("token", responseData.token);
          }
          localStorage.setItem("userId", responseData.userId);

          // Redirect to home page after successful registration
          window.location.href = "index.html";
          return;
        }

        // Show warning card if registration failed
        if (warningCard && warningText) {
          warningCard.classList.remove("d-none");
          warningText.innerText =
            responseData?.message || "Registration failed. Please try again.";
        }
      };

      // Perform signup request
      fetchMethod(currentUrl + "/api/register", callback, "POST", data);

      // Reset the form fields
      signupForm.reset();
    });
  }
});