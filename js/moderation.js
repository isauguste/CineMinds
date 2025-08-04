document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };

  const reviewsTable = document.getElementById("pendingReviewsTable");

  async function fetchPendingReviews() {
    try {
      const res = await fetch("http://localhost:3000/api/manager/reviews/pending", { headers });
      const reviews = await res.json();
      renderReviewTable(reviews);
    } catch (err) {
      console.error("Error fetching reviews:", err);
      reviewsTable.innerHTML = `<tr><td colspan="6" class="text-center text-red-500 py-4">Error loading reviews</td></tr>`;
    }
  }

  function renderReviewTable(reviews) {
    reviewsTable.innerHTML = "";
    if (!Array.isArray(reviews) || reviews.length === 0) {
      reviewsTable.innerHTML = `<tr><td colspan="6" class="text-center text-gray-400 py-4">No pending reviews.</td></tr>`;
      return;
    }

    reviews.forEach(review => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="px-4 py-2">${review.movie_title}</td>
        <td class="px-4 py-2">${review.content}</td>
        <td class="px-4 py-2">${review.username}</td>
        <td class="px-4 py-2">${review.mood}</td>
        <td class="px-4 py-2">${new Date(review.created_at).toLocaleDateString()}</td>
        <td class="px-4 py-2 space-x-2 text-center">
          <button class="approve-btn bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded" data-id="${review.id}">Approve</button>
          <button class="reject-btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded" data-id="${review.id}">Reject</button>
        </td>`;
      reviewsTable.appendChild(row);
    });

    document.querySelectorAll(".approve-btn").forEach(btn => {
      btn.addEventListener("click", () => updateReviewStatus(btn.dataset.id, "approve"));
    });
    document.querySelectorAll(".reject-btn").forEach(btn => {
      btn.addEventListener("click", () => updateReviewStatus(btn.dataset.id, "reject"));
    });
  }

  async function updateReviewStatus(id, action) {
    try {
      const res = await fetch(`http://localhost:3000/api/manager/reviews/${id}/${action}`, {
        method: "PUT",
        headers
      });
      if (!res.ok) throw new Error();
      alert(`Review ${action}d successfully.`);
      fetchPendingReviews();
    } catch (err) {
      console.error(`${action} Error:`, err);
      alert(`Could not ${action} review.`);
    }
  }

  fetchPendingReviews();
});
