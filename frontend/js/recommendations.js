document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("moodForm");
  const moodText = document.getElementById("moodText");
  const moodSelect = document.getElementById("moodSelect");
  const resultsSection = document.getElementById("resultsSection");
  const resultsContainer = document.getElementById("resultsContainer");

  // hide old pager if present
  const pagWrap = document.getElementById("resultsPagination");
  if (pagWrap) pagWrap.classList.add("hidden");

  const loadMoreBtn = document.getElementById("loadMoreBtn");

  let allMovies = [];
  let serverPage = 1;          // backend page
  const LIMIT = 20;
  let lastBatchCount = 0;
  let currentQuery = "";
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

    // reset state
    currentQuery = mood;
    allMovies = [];
    serverPage = 1;
    lastBatchCount = 0;

    resultsContainer.innerHTML = "<p class='text-center w-full col-span-full'>Loading...</p>";
    resultsSection.classList.remove("hidden");

    await fetchAndAppend();
    renderMovies(allMovies);
    toggleLoadMore();

    resultsSection.scrollIntoView({ behavior: "smooth" });
  });

  loadMoreBtn?.addEventListener("click", async () => {
    await fetchAndAppend();
    renderMovies(allMovies);
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

      const normalized = batch.map((m) => {
        const id =
          m.id ?? m.movie_id ?? m.db_id ?? m.tmdb_id ?? m.imdb_id ?? null;

        const poster = (m.poster || m.poster_url || "").trim();
        const genresArr = Array.isArray(m.genres)
          ? m.genres
          : (m.genre ? m.genre.split(",").map((g) => g.trim()).filter(Boolean) : []);

        const quote =
          Array.isArray(m.reviews) && m.reviews[0] ? m.reviews[0] : "";

        return {
          raw: m,
          id,
          source: m._source || m.source || (m.tmdb_id ? "tmdb" : "db"),
          poster: poster !== "" ? poster : "https://placehold.co/300x450?text=No+Poster",
          title: m.title || "Untitled",
          year: m.year || m.movie_year || "",
          genres: genresArr,
          trailerLink: m.trailerLink || "",
          quote,
        };
      });

      allMovies = dedupeById([...allMovies, ...normalized]);
      serverPage += 1;
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
    if (!loadMoreBtn) return;
    if (lastBatchCount === LIMIT) {
      loadMoreBtn.classList.remove("hidden");
    } else {
      loadMoreBtn.classList.add("hidden");
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

        <p class="text-sm text-gray-400 mb-2">${m.year ? `${m.year} • ` : ""}${Array.isArray(m.genres) ? m.genres.join(", ") : m.genres}</p>
        ${m.trailerLink ? `<a href="${m.trailerLink}" target="_blank" class="text-sm text-blue-400 mb-2">Watch Trailer</a>` : ""}

        ${m.quote ? `<p class="text-xs text-gray-300 italic mb-2">"${m.quote}"</p>` : ""}

        <button
          class="mt-auto bg-red-500 hover:bg-red-600 text-sm text-white py-2 px-4 rounded"
          ${m.id ? `
            data-fav-id="${encodeURIComponent(m.id)}"
            data-fav-source="${encodeURIComponent(m.source || 'db')}"
            data-fav-title="${encodeURIComponent(m.title)}"
            data-fav-year="${encodeURIComponent(m.year)}"
            data-fav-poster="${encodeURIComponent(m.poster)}"
            data-fav-genres="${encodeURIComponent((Array.isArray(m.genres) ? m.genres : String(m.genres)).join('|'))}"
            data-fav-trailer="${encodeURIComponent(m.trailerLink || '')}"
            data-fav-review="${encodeURIComponent(m.quote || '')}"
          ` : "disabled"}
        >
          Save to Favorites
        </button>
      `;

      resultsContainer.appendChild(card);
    });

    // Delegate Save-to-Favorites
    resultsContainer.onclick = async (e) => {
      const btn = e.target.closest("button[data-fav-id]");
      if (!btn) return;

      const token = localStorage.getItem("token");
      if (!token) {
        alert("You must be logged in to save favorites.");
        return;
      }

      const payload = {
        movieId: decodeURIComponent(btn.getAttribute("data-fav-id")),
        source: decodeURIComponent(btn.getAttribute("data-fav-source") || "db"),
        title: decodeURIComponent(btn.getAttribute("data-fav-title") || ""),
        year: decodeURIComponent(btn.getAttribute("data-fav-year") || ""),
        poster: decodeURIComponent(btn.getAttribute("data-fav-poster") || ""),
        genres: decodeURIComponent(btn.getAttribute("data-fav-genres") || "")
                  .split("|")
                  .filter(Boolean),
        trailerLink: decodeURIComponent(btn.getAttribute("data-fav-trailer") || ""),
        review: decodeURIComponent(btn.getAttribute("data-fav-review") || ""),
      };

      try {
        btn.disabled = true;
        const res = await fetch("http://localhost:3000/api/favorites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || "Failed");
        }
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

