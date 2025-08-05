document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  const reviewsTable = document.getElementById("reviewTableBody");

  // Check for valid token and Manager role
  if (!token || role !== 'Manager') {
    console.error('Missing token or unauthorized role. Redirecting...');
    window.location.href = 'login.html';
    return;
  }

  if (!reviewsTable) {
    console.error("Table body element missing.");
    return;
  }

  console.log("Token:", token);
  console.log("Role:", role);
  console.log("Table Element:", reviewsTable);

  fetchPendingReviews(token, reviewsTable);
});

async function fetchPendingReviews(token, table) {
  try {
    const res = await fetch('http://localhost:3000/api/reviews/pending', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Fetch failed: ${res.status} - ${errorText}`);
    }

    const reviews = await res.json();

    reviews.forEach(review => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${review.movie_title}</td>
        <td>${review.review_text}</td>
        <td>${review.username}</td>
        <td>${review.mood_tag}</td>
        <td>${new Date(review.created_at).toLocaleDateString()}</td>
        <td>
          <button onclick="approveReview(${review.review_id})">Approve</button>
          <button onclick="rejectReview(${review.review_id})">Reject</button>
        </td>
      `;
      table.appendChild(row);
    });
  } catch (err) {
    console.error("Failed to load pending reviews:", err);
  }
}


