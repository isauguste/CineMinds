// ------ Auth / globals ------
const token = localStorage.getItem("token");
if (!window.userId) {
  window.userId = localStorage.getItem("userId") || null;
}

let favorites = [];
let filteredFavorites = [];
let currentPage = 1;
const pageSize = 10;

// prefer token-only DELETE route first, then fallback to userId route if 404
const PREFER_TOKEN_ONLY_DELETE = true;

// Poster placeholder (used only if movie.poster_url is null/empty/broken)
const placeholderPoster = "https://placehold.co/300x450?text=No+Poster";

// ------ Boot ------
document.addEventListener("DOMContentLoaded", () => {
  if (!token) {
    alert("You must be logged in.");
    return;
  }

  fetchFavorites();

  document.getElementById("sortSelect")?.addEventListener("change", applyFilters);
  document.getElementById("genreFilter")?.addEventListener("change", applyFilters);
  document.getElementById("prevBtn")?.addEventListener("click", () => changePage(-1));
  document.getElementById("nextBtn")?.addEventListener("click", () => changePage(1));
});

// ------ Helpers ------
async function getCurrentUserId() {
  if (window.userId) return window.userId;

  const stored = localStorage.getItem("userId");
  if (stored) {
    window.userId = stored;
    return stored;
  }

  throw new Error("No user id available. Make sure you set localStorage.userId at login.");
}

// ------ Data fetch ------
async function fetchFavorites() {
  try {
    const res = await fetch(`http://localhost:3000/api/favorites`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Fetch failed");
    favorites = await res.json(); // expect: movie_id, title, genre, poster_url, user_rating, added_at?

    populateGenres(favorites);
    applyFilters();
  } catch (err) {
    console.error("Failed to fetch favorites:", err);
    const msg = document.getElementById("emptyMessage");
    if (msg) {
      msg.textContent = "Error loading favorites.";
      msg.style.display = "block";
    }
  }
}

// ------ Filters / render ------
function applyFilters() {
  const sortVal = document.getElementById("sortSelect")?.value || "date";
  const genreVal = document.getElementById("genreFilter")?.value || "all";

  filteredFavorites = [...favorites];

  if (genreVal !== "all") {
    filteredFavorites = filteredFavorites.filter((m) => m.genre === genreVal);
  }

  if (sortVal === "title") {
    filteredFavorites.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortVal === "genre") {
    filteredFavorites.sort((a, b) => a.genre.localeCompare(b.genre));
  } else if (sortVal === "date") {
    filteredFavorites.sort(
      (a, b) => new Date(b.added_at || b.date_added || 0) - new Date(a.added_at || a.date_added || 0)
    );
  }

  currentPage = 1;
  renderPage();
  updatePagination();
}

function renderPage() {
  const grid = document.getElementById("favoritesGrid");
  const emptyMsg = document.getElementById("emptyMessage");

  if (!grid || !emptyMsg) return;

  grid.innerHTML = "";

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = filteredFavorites.slice(start, end);

  if (pageItems.length === 0) {
    emptyMsg.style.display = "block";
    emptyMsg.textContent = favorites.length ? "No favorites found." : "No favorites yet.";
    return;
  }

  emptyMsg.style.display = "none";

  pageItems.forEach((movie) => {
    const posterSrc = movie.poster_url || placeholderPoster;

    const card = document.createElement("div");
    card.className = "bg-purple-700 p-3 rounded shadow text-white";
    card.innerHTML = `
      <img
        src="${posterSrc}"
        alt="${movie.title}"
        class="w-full h-48 object-cover rounded mb-2"
        onerror="this.onerror=null;this.src='${placeholderPoster}'"
      />

      <h3 class="text-lg font-bold mb-1">${movie.title}</h3>
      <p class="text-sm mb-2">${movie.genre || ""}</p>

      <!-- Availability chips go here -->
      <div class="platforms mb-2" id="platforms-${movie.movie_id}"></div>

      <div class="rating mb-2" data-movie-id="${movie.movie_id}" data-current-rating="${movie.user_rating || 0}">
        ${renderStarsInteractive(movie.user_rating || 0, movie.movie_id)}
      </div>

      <button data-remove="${movie.movie_id}"
              class="bg-pink-600 hover:bg-pink-700 text-white py-1 px-2 rounded">
        Remove
      </button>
    `;
    grid.appendChild(card);

    // Fetch and render streamingavailability chips
    // 
    const year =
      movie.year || movie.release_year || movie.releaseYear || movie.release_date?.slice(0, 4) || "";
    const el = document.getElementById(`platforms-${movie.movie_id}`);
    if (typeof renderAvailability === "function") {
      renderAvailability(el, {
        title: movie.title,
        year,
        id: movie.movie_id
      });
    }
  });

  attachStarListeners();
  attachRemoveListeners();
}

function renderStarsInteractive(rating, movieId) {
  let stars = "";
  const r = Math.round(Number(rating) || 0);
  for (let i = 1; i <= 5; i++) {
    stars += `<span class="star cursor-pointer text-xl"
                    data-movie-id="${movieId}"
                    data-rating="${i}">
                ${i <= r ? "⭐" : "☆"}
              </span>`;
  }
  return stars;
}

// ------ Interactions ------
function attachStarListeners() {
  document.querySelectorAll(".star").forEach((star) => {
    star.addEventListener("click", async (e) => {
      const movieId = e.target.dataset.movieId;
      const rating = parseInt(e.target.dataset.rating, 10);

      try {
        const res = await fetch(`http://localhost:3000/api/favorites/${encodeURIComponent(movieId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ rating }),
        });

        if (!res.ok) throw new Error("Rating update failed");
        const payload = await res.json(); // { movie_id, user_rating }

        const target = favorites.find((m) => String(m.movie_id) === String(movieId));
        if (target) target.user_rating = payload.user_rating ?? rating;

        applyFilters();
      } catch (err) {
        console.error("Error updating rating", err);
        alert("Failed to update rating.");
      }
    });
  });
}

function attachRemoveListeners() {
  document.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const movieId = e.currentTarget.getAttribute("data-remove");
      await removeFavorite(movieId);
    });
  });
}

// ------ Pagination ------
function updatePagination() {
  const prev = document.getElementById("prevBtn");
  const next = document.getElementById("nextBtn");
  const totalPages = Math.ceil(filteredFavorites.length / pageSize) || 1;

  if (prev) prev.disabled = currentPage === 1;
  if (next) next.disabled = currentPage >= totalPages;
}

function changePage(offset) {
  const totalPages = Math.ceil(filteredFavorites.length / pageSize) || 1;
  currentPage += offset;

  if (currentPage < 1) currentPage = 1;
  if (currentPage > totalPages) currentPage = totalPages;

  renderPage();
  updatePagination();
}

// ------ Genre filter ------
function populateGenres(favs) {
  const genreFilter = document.getElementById("genreFilter");
  if (!genreFilter) return;

  const genreSet = new Set(favs.map((m) => m.genre).filter(Boolean));
  genreFilter.innerHTML = '<option value="all">All Genres</option>';

  genreSet.forEach((genre) => {
    const opt = document.createElement("option");
    opt.value = genre;
    opt.textContent = genre;
    genreFilter.appendChild(opt);
  });
}

// ------ Remove favorite (refresh after delete) ------
async function removeFavorite(movieId) {
  if (!token) {
    alert("You must be logged in.");
    return;
  }

  const btn = document.querySelector(`[data-remove="${movieId}"]`);
  const oldText = btn ? btn.textContent : null;
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Removing...";
  }

  const tryTokenOnly = async () => {
    return fetch(`http://localhost:3000/api/favorites/${encodeURIComponent(movieId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const tryUserIdRoute = async () => {
    const uid = await getCurrentUserId();
    return fetch(
      `http://localhost:3000/api/users/${encodeURIComponent(uid)}/favorites/${encodeURIComponent(movieId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  };

  try {
    let res;
    if (PREFER_TOKEN_ONLY_DELETE) {
      res = await tryTokenOnly();
      if (!res.ok && res.status === 404) {
        res = await tryUserIdRoute();
      }
    } else {
      res = await tryUserIdRoute();
    }

    if (!res.ok) throw new Error("Failed to remove favorite");

    await fetchFavorites();
    console.log("Favorite removed:", movieId);
  } catch (err) {
    console.error("Error removing favorite:", err);
    alert("Failed to remove favorite.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = oldText || "Remove";
    }
  }
}

