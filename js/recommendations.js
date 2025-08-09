document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("moodForm");
  const moodText = document.getElementById("moodText");
  const moodSelect = document.getElementById("moodSelect");
  const resultsSection = document.getElementById("resultsSection");
  const resultsContainer = document.getElementById("resultsContainer");

  // optional: hide/remove your old prev/next controls
  const pagWrap = document.getElementById("resultsPagination");
  if (pagWrap) pagWrap.classList.add("hidden");

  const loadMoreBtn = document.getElementById("loadMoreBtn");

  let allMovies = [];
  let serverPage = 1;               // page on the backend
  const LIMIT = 20;                  // how many per fetch
  let lastBatchCount = 0;            // to know if there’s more
  let currentQuery = "";             // last mood used
  let loading = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const inputText = (moodText.value || "").trim();
    const selectedMood = moodSelect.value;
    const mood = inputText || selectedMood;

    if (!mood) {
      alert("Please type a mood or select one from the dropdown.");
      return;
    }

    // reset state for a new query
    currentQuery = mood;
    allMovies = [];
    serverPage = 1;
    lastBatchCount = 0;
    resultsContainer.innerHTML = "<p class='text-center w-full col-span-full'>Loading...</p>";
    resultsSection.classList.remove("hidden");

    await fetchAndAppend(); // load first page
    renderMovies(allMovies);
    toggleLoadMore();

    resultsSection.scrollIntoView({ behavior: "smooth" });
  });

  loadMoreBtn?.addEventListener("click", async () => {
    await fetchAndAppend();
    renderMovies(allMovies, { append: false }); // re-render whole grid (simple)
    toggleLoadMore();
  });

  async function fetchAndAppend() {
    if (loading) return;
    loading = true;
    loadMoreBtn?.setAttribute("disabled", "true");

    try {
      const res = await fetch("http://localhost:3000/api/mood/analyzeMood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moodText: currentQuery, limit: LIMIT, page: serverPage }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const batch = Array.isArray(data.movies) ? data.movies : [];
      lastBatchCount = batch.length;

      // Normalize and append
      const normalized = batch.map((m) => {
        const id = m.id ?? m.movie_id ?? m.db_id ?? m.tmdb_id ?? m.imdb_id ?? null;
        const poster = m.poster || m.poster_url || "";
        return {
          raw: m,
          id,
          poster: poster && poster.trim() !== "" ? poster : "https://placehold.co/300x450?text=No+Poster",
          title: m.title || "Untitled",
          year: m.year || m.movie_year || "",
          genres: Array.isArray(m.genres) ? m.genres.join(", ") : (m.genre || ""),
          trailerLink: m.trailerLink || "",
          quote: Array.isArray(m.reviews) && m.reviews[0] ? m.reviews[0] : "",
        };
      });

      allMovies = dedupeById([...allMovies, ...normalized]);
      serverPage += 1; // next backend page
    } catch (err) {
      console.error("Error fetching recommendations:", err);
      if (allMovies.length === 0) {
        resultsContainer.innerHTML =
          "<p class='text-center text-red-400'>Failed to load recommendations. Please try again.</p>";
      }
    } finally {
      loading = false;
      loadMoreBtn?.removeAttribute("disabled");
    }
  }

  function dedupeById(list) {
    const seen = new Set();
    const out = [];
    for (const m of list) {
      const key = m.id ? `id:${m.id}` : `hash:${m.title}-${m.year}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(m);
      }
    }
    return out;
  }

  function toggleLoadMore() {
    // Show "Load more" if we got a full batch (likely more on server)
    if (loadMoreBtn) {
      if (lastBatchCount === LIMIT) {
        loadMoreBtn.classList.remove("hidden");
      } else {
        loadMoreBtn.classList.add("hidden");
      }
    }
  }

  function renderMovies(movies) {
    resultsContainer.innerHTML = "";

    movies.forEach((m, idx) => {
      if (!m.id && idx === 0) {
        console.warn("No usable id in recommendation object:", m.raw);
      }

      const href = m.id ? `/movie?id=${encodeURIComponent(m.id)}` : null;

      const card = document.createElement("div");
      card.className = "bg-gray-800 rounded-xl p-4 shadow-md flex flex-col hover:shadow-lg transition";

      card.innerHTML = `
        ${href ? `<a href="${href}" class="block">` : `<div>`}
          <img
            src="${m.poster}"
            alt="${m.title}"
            class="w-full h-64 object-cover rounded mb-3 ${href ? "hover:opacity-80 cursor-pointer" : "opacity-80"}"
            onerror="this.onerror=null;this.src='https://placehold.co/300x450?text=No+Poster';"
          />
        ${href ? `</a>` : `</div>`}

        ${href ? `<a href="${href}" class="hover:underline">` : `<div>`}
          <h4 class="text-lg font-bold mb-1">${m.title}</h4>
        ${href ? `</a>` : `</div>`}

        <p class="text-sm text-gray-400 mb-2">${m.year ? `${m.year} • ` : ""}${m.genres}</p>
        ${m.trailerLink ? `<a href="${m.trailerLink}" target="_blank" class="text-sm text-blue-400 mb-2">Watch Trailer</a>` : ""}

        ${m.quote ? `<p class="text-xs text-gray-300 italic mb-2">"${m.quote}"</p>` : ""}

        <button class="mt-auto bg-red-500 hover:bg-red-600 text-sm text-white py-2 px-4 rounded"
                ${m.id ? `data-fav="${encodeURIComponent(m.id)}"` : "disabled"}>
          Save to Favorites
        </button>
      `;

      resultsContainer.appendChild(card);
    });

    // Delegate Save-to-Favorites
    resultsContainer.onclick = async (e) => {
      const btn = e.target.closest("[data-fav]");
      if (!btn) return;

      const movieId = btn.getAttribute("data-fav");
      const token = localStorage.getItem("token");
      if (!token) {
        alert("You must be logged in to save favorites.");
        return;
      }

      try {
        btn.disabled = true;
        const res = await fetch("http://localhost:3000/api/favorites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ movieId }),
        });
        if (!res.ok) throw new Error("Failed");
        btn.textContent = "Saved ✓";
      } catch (err) {
        console.error(err);
        alert("Could not save to favorites.");
      } finally {
        btn.disabled = false;
      }
    };
  }
});

