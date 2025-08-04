document.addEventListener("DOMContentLoaded", () => {
  fetchReviews();
});

const token = localStorage.getItem("token");
const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`
};

async function fetchReviews() {
  try {
    const res = await fetch("http://localhost:3000/api/moderation/reviews", {
	    headers 
    });
    const reviews = await res.json();

    const tbody = document.querySelector("#reviewTable tbody");
    tbody.innerHTML = ""; 

    if (!Array.isArray(reviews)) { //Guarding to ensure it's an array
      console.error("Expected an array of reviews, got:", reviews);
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-red-400">Error: ${reviews.error || 'Unexpected response format'}</td></tr>`;
      return;
    }

    reviews.forEach(review => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td class="px-4 py-2">${review.movie_title || "Unknown"}</td>
        <td class="px-4 py-2">${review.review_text}</td>
        <td class="px-4 py-2">${review.username || "User #" + review.user_id}</td>
        <td class="px-4 py-2">${review.mood_tag || "N/A"}</td>
        <td class="px-4 py-2">${new Date(review.created_at).toLocaleString()}</td>
        <td class="px-4 py-2">
          <button class="bg-red-500 hover:bg-red-600 px-3 py-1 rounded" onclick="deleteReview(${review.review_id})">
            Delete
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed to fetch reviews:", err);
  }
}

async function deleteReview(reviewId) {
  const confirmed = confirm("Are you sure you want to delete this review?");
  if (!confirmed) return;

  try {
    const res = await fetch(`http://localhost:3000/api/moderation/reviews/${reviewId}`, {
      method: "DELETE",
      headers
    });

    const data = await res.json();
    alert(data.message || data.error);
    fetchReviews(); // Refresh table
  } catch (err) {
    console.error("Error deleting review:", err);
  }
}

