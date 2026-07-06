function fetchMethod(url, callback, method = "GET", data = null, token = null) {
  console.log("fetchMethod: ", url, method, data, token);

  const headers = {};

  if (data) {
    headers["Content-Type"] = "application/json";
  }

  // ✅ Auto-include token from localStorage if not explicitly passed
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
      if (response.status === 204) {
        callback(response.status, {});
      } else {
        response.json().then((responseData) =>
          callback(response.status, responseData)
        );
      }
    })
    .catch((error) =>
      console.error(`Error from ${method} ${url}:`, error)
    );
}