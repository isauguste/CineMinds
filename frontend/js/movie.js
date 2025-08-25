document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("movieDetails");
  const reviewForm = document.getElementById("reviewForm");
  const favoriteBtn = document.getElementById("favoriteBtn");
  const ratingSelect = document.getElementById("rating");

  const urlParams = new URLSearchParams(window.location.search);
  const movieId = urlParams.get("id");
  console.log("Raw location:", window.location.href);
  console.log("Movie ID:", movieId);

  if (!movieId) {
    container.innerHTML = `<p class="text-red-400">No movie ID provided.</p>`;
    return;
  }

  // Fetch and display movie details
  fetch(`http://localhost:3000/api/movies/${movieId}`)
    .then(res => res.json())
    .then(movie => {
      if (!movie || movie.error) {
        container.innerHTML = `<p class="text-red-400">${movie?.error || 'Movie not found.'}</p>`;
        return;
      }

      container.innerHTML = `
        <div class="bg-purple-950 bg-opacity-80 rounded-lg p-6 shadow-lg flex flex-col md:flex-row gap-8">
          <img src="${movie.poster_url || 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${movie.title}" class="rounded-lg w-full md:w-1/3" />
          <div class="flex-1 space-y-4">
            <h2 class="text-3xl font-bold text-white">${movie.title}</h2>
            <p class="text-sm text-gray-300">Release Year: ${movie.year || movie.movie_year || 'N/A'}</p>
            <p class="text-yellow-400">Rating: ${movie.rating || 'Not Rated'}</p>
            <p class="text-gray-200">${movie.description || 'No description available.'}</p>
            ${movie.trailer_url ? `
              <a href="${movie.trailer_url}" target="_blank" class="inline-block mt-2 text-blue-400 hover:underline">
                🎥 Watch Trailer
              </a>
            ` : ''}

            <!-- Where to Watch -->
            <div class="mt-4">
              <h3 class="text-xl font-semibold text-white">Where to Watch</h3>
              <div id="detail-platforms" class="mt-2"></div>
            </div>
          </div>
        </div>
      `;

      // Render streaming availability chips
      const platformsEl = document.getElementById("detail-platforms");
      const year =
        movie.year ||
        movie.movie_year ||
        movie.release_year ||
        (movie.release_date ? String(movie.release_date).slice(0, 4) : "");

      if (typeof renderAvailability === "function") {
        renderAvailability(platformsEl, {
          title: movie.title,
          year,
          id: movie.id || movieId,
          tmdbId: movie.tmdb_id || movie.api_movie_id || ""
        });
      }

      loadReviews(movieId);
    })
    .catch(err => {
      console.error("Error fetching movie details:", err);
      container.innerHTML = `<p class="text-red-400">Failed to load movie details.</p>`;
    });

  // Favorite button
 /* favoriteBtn.addEventListener("click", () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to favorite a movie.");
      return;
    }

    fetch("http://localhost:3000/api/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ movieId }),
    })
      .then(res => res.json())
      .then(() => {
        alert("Movie saved to favorites!");
      })
      .catch(err => console.error("Favorite error:", err));
  }); */

  // Submit review form
  reviewForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to submit a review.");
      return;
    }

    const review_text = document.getElementById("reviewText").value;
    const mood_tag = document.getElementById("reviewMood").value;

    if (!review_text || !mood_tag) {
      alert("Please fill out all fields before submitting your review.");
      return;
    }

    fetch("http://localhost:3000/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ movie_id: movieId, review_text, mood_tag }),
    })
      .then(res => {
        if (!res.ok) throw new Error("Bad Request");
        return res.json();
      })
      .then(() => {
        alert("Review submitted!");
        document.getElementById("reviewText").value = "";
        document.getElementById("reviewMood").value = "";
        document.getElementById("rating").value = "";
        loadReviews(movieId);
      })
      .catch(err => {
        console.error("Review submission failed:", err);
        alert("Review submission failed.");
      });
  });
});

// Load all reviews for this movie
function loadReviews(movieId) {
  fetch(`http://localhost:3000/api/reviews/${movieId}`)
    .then(res => res.json())
    .then(reviews => {
      const container = document.getElementById("reviewList");
      if (Array.isArray(reviews) && reviews.length > 0) {
        container.innerHTML = reviews.map(r => `
          <div class="border-b border-gray-600 py-2">
            <p class="text-sm text-gray-400">${r.username || 'Anonymous'} (${r.mood_tag})</p>
            <p class="text-yellow-300">${r.rating ? '⭐'.repeat(r.rating) : ''}</p>
            <p>${r.review_text}</p>
          </div>
        `).join("");
      } else {
        container.innerHTML = `<p class="text-sm text-gray-400">No reviews yet.</p>`;
      }
    })
    .catch(err => {
      console.error("Error loading reviews:", err);
      document.getElementById("reviewList").innerHTML = `<p class="text-sm text-red-400">Failed to load reviews.</p>`;
    });
}

