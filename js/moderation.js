document.addEventListener('DOMContentLoaded', () => {
  fetchPendingReviews();
});

async function fetchPendingReviews() {
  const token = localStorage.getItem('token'); // Must exist
  const reviewsTable = document.querySelector('#reviewsTableBody'); // tbody element

  if (!token || !reviewsTable) {
    console.error('Token or table body is missing.');
    return;
  }

  try {
    const res = await fetch('http://localhost:3000/api/manager/reviews/pending', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error ${res.status}: ${errText}`);
    }

    const reviews = await res.json();
    reviewsTable.innerHTML = '';

    reviews.forEach(review => {
      const row = document.createElement('tr');

      row.innerHTML = `
        <td>${review.movie_title}</td>
        <td>${review.text}</td>
        <td>${review.username}</td>
        <td>${review.mood || 'N/A'}</td>
        <td>${new Date(review.created_at).toLocaleDateString()}</td>
        <td>
          <button onclick="approveReview('${review.id}')" class="text-green-500">Approve</button>
          <button onclick="rejectReview('${review.id}')" class="text-red-500 ml-2">Reject</button>
        </td>
      `;

      reviewsTable.appendChild(row);
    });

  } catch (err) {
    console.error('Error fetching reviews:', err);
    alert('Failed to load reviews.');
  }
}

async function approveReview(id) {
  await handleReviewAction(id, 'approve');
}

async function rejectReview(id) {
  await handleReviewAction(id, 'reject');
}

async function handleReviewAction(reviewId, action) {
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`http://localhost:3000/api/manager/reviews/${reviewId}/${action}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error ${res.status}: ${errText}`);
    }

    alert(`Review ${action}d successfully.`);
    fetchPendingReviews(); // Refresh table
  } catch (err) {
    console.error(`Error during ${action}:`, err);
    alert(`Failed to ${action} review.`);
  }
}

