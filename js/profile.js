// Profile greeting + editing functionality
window.username = localStorage.getItem('username');
window.userId = localStorage.getItem('userId'); 
window.token = localStorage.getItem('token');
const hasVisitedProfile = localStorage.getItem("hasVisitedProfile");

if (username) {
  const message = hasVisitedProfile
    ? `Welcome back, ${username}! We Miss You!`
    : `Welcome to your profile, ${username}!`;

  document.getElementById("welcomeMsg").textContent = message;
  localStorage.setItem("hasVisitedProfile", "true");
}

// Fetch user profile details (username + email)
async function fetchUserProfile() {
  try {
    const res = await fetch(`http://localhost:3000/api/user/${userId}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch profile: ${res.status}`);
    }
    const data = await res.json();
    document.getElementById("usernameDisplay").textContent = data.username;
    document.getElementById("emailDisplay").textContent = data.email;
    document.getElementById("editUsername").value = data.username;
    document.getElementById("editEmail").value = data.email;
  } catch (err) {
    console.error("Error fetching profile:", err);
  }
}

// Save updated username and email
async function saveProfileEdits() {
  const updatedUsername = document.getElementById("editUsername").value;
  const updatedEmail = document.getElementById("editEmail").value;
  try {
    const res = await fetch(`http://localhost:3000/api/user/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: updatedUsername, email: updatedEmail })
    });
    if (res.ok) {
      localStorage.setItem("username", updatedUsername);
      fetchUserProfile();
      toggleEditProfile();
    } else {
      alert("Update failed");
    }
  } catch (err) {
    console.error("Error updating profile:", err);
  }
}

// Show/hide edit form
function toggleEditProfile() {
  const form = document.getElementById("editProfileForm");
  form.style.display = form.style.display === "none" ? "block" : "none";
}

// Fetch all reviews made by this user
async function fetchUserReviews() {
  try {
    const res = await fetch(`http://localhost:3000/api/reviews/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const reviews = await res.json();
    const container = document.getElementById("userReviewsSection");

    if (!reviews.length) {
      container.innerHTML = `<p class="text-sm text-gray-300 italic">You haven’t written any reviews yet.</p>`;
      return;
    }

    renderUserReviews(reviews);

  } catch (err) {
    console.error("Failed to fetch user reviews", err);
    const container = document.getElementById("userReviewsSection");
    container.innerHTML = `<p class="text-red-400">Failed to load reviews.</p>`;
  }
}

// Render user reviews to the DOM
function renderUserReviews(reviews) {
  const container = document.getElementById("userReviewsSection");
  container.innerHTML = ""; // Clear old content

  reviews.forEach((review) => {
    const card = document.createElement("div");
    card.className = "bg-purple-700 text-white p-4 rounded-md mb-4";

    card.innerHTML = `
      <p class="font-bold">
        ${review.movie_title || "Unknown Movie"} 
        <span class="italic text-sm text-pink-200">(${review.mood_tag || "No Mood"})</span>
      </p>
      <p class="mt-2">${review.review_text}</p>
    `;

    container.appendChild(card);
  });
}

// Initialize everything on page load
fetchUserProfile();
fetchUserReviews();

