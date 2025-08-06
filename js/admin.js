document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };

  const userTable = document.getElementById("userTable");
  const logOutput = document.getElementById("logOutput");
  const resetCacheBtn = document.getElementById("resetCacheBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  // Fetch all users
  fetch("http://localhost:3000/api/admin/users", { headers })
    .then(res => res.json())
    .then(users => {
      userTable.innerHTML = "";
      users.forEach(user => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td class="px-4 py-2">${user.username}</td>
          <td class="px-4 py-2">${user.email}</td>
          <td class="px-4 py-2">${user.role}</td>
          <td class="px-4 py-2">
            ${user.role === "User" ? `<button data-id="${user.id}" class="promote-btn bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">Promote</button>` : "-"}
          </td>`;
        userTable.appendChild(row);
      });

      // Attach event listeners to promote buttons
      document.querySelectorAll(".promote-btn").forEach(button => {
        button.addEventListener("click", () => {
          const userId = button.getAttribute("data-id");
          if (!confirm("Promote this user to Manager?")) return;

          fetch("http://localhost:3000/api/admin/users/promote", {
            method: "POST",
            headers,
            body: JSON.stringify({ userId }),
          })
            .then(res => res.json())
            .then(data => {
              alert(data.message || "User promoted to Manager");
              location.reload();
            })
            .catch(err => {
              console.error("Promote error:", err);
              alert("Failed to promote user.");
            });
        });
      });
    })
    .catch(err => {
      userTable.innerHTML = `<tr><td colspan="4" class="text-red-500 p-2">Failed to load users</td></tr>`;
      console.error("User fetch error:", err);
    });

  // Fetch logs
  fetch("http://localhost:3000/api/admin/logs", { headers })
    .then(res => res.text())
    .then(text => {
      logOutput.textContent = text || "No logs found.";
    })
    .catch(err => {
      logOutput.textContent = "Failed to load logs.";
      console.error("Log fetch error:", err);
    });

  // Reset cache
  resetCacheBtn.addEventListener("click", () => {
    fetch("http://localhost:3000/api/admin/cache/reset", {
      method: "POST",
      headers,
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message || "Cache reset.");
      })
      .catch(err => {
        alert("Failed to reset cache.");
        console.error("Cache reset error:", err);
      });
  });

  // Logout
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  });
});

