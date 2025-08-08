document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("moodForm");
  const moodText = document.getElementById("moodText");
  const moodSelect = document.getElementById("moodSelect");
  const resultsSection = document.getElementById("resultsSection");
  const resultsContainer = document.getElementById("resultsContainer");

  // Pagination controls 
  const pagWrap = document.getElementById("resultsPagination");
  const prevBtn = document.getElementById("resultsPrev");
  const nextBtn = document.getElementById("resultsNext");
  const pageInfo = document.getElementById("resultsPageInfo");

  let allMovies = [];
  let currentPage = 1;
  const pageSize = 10;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const inputText = (moodText.value || "").trim();
    const selectedMood = moodSelect.value;
    const payload = { moodText: inputText || selectedMood };

    if (!payload.moodText) {
      alert("Please type a mood or select one from the dropdown.");
      return;
    }

    resultsContainer.innerHTML = "<p class='text-center w-full col-span-full'>Loading...</p>";
    resultsSection.classList.remove("hidden");

    try {
      const res = await fetch("http://localhost:3000/api/mood/analyzeMood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!Array.isArray(data.movies)) throw new Error("Invalid response");

      // Normalize fields and keep a reliable id
      allMovies = data.movies.map((m) => {
        const id =
          m.id ??
          m.movie_id ??
          m.db_id ??
          m.tmdb_id ??
          m.imdb_id ??
          null;

        return {
          raw: m,
          id,
          poster: m.poster || m.poster_url || "https://placehold.co/300x450?text=No+Poster",
          title: m.title || "Untitled",
          year: m.year || m.movie_year || "",
          genres: Array.isArray(m.genres) ? m.genres.join(", ") : (m.genre || ""),
          trailerLink: m.trailerLink || null,
          quote: Array.isArray(m.reviews) && m.reviews[0] ? m.reviews[0] : null,
        };
      });

      currentPage = 1;
      renderPage();

      // Auto-scroll to results
      resultsSection.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error("Error fetching recommendations:", err);
      resultsContainer.innerHTML =
        "<p class='text-center text-red-400'>Failed to load recommendations. Please try again.</p>";
      pagWrap?.classList.add("hidden");
    }
  });

  function renderPage() {
    const totalPages = Math.max(1, Math.ceil(allMovies.length / pageSize));
    const start = (currentPage - 1) * pageSize;
    const pageItems = allMovies.slice(start, start + pageSize);

    renderMovies(pageItems);

    if (allMovies.length > pageSize) {
      pagWrap.classList.remove("hidden");
      pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
      prevBtn.disabled = currentPage === 1;
      nextBtn.disabled = currentPage === totalPages;
    } else {
      pagWrap.classList.add("hidden");
    }
  }

  prevBtn?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage();
      resultsSection.scrollIntoView({ behavior: "smooth" });
    }
  });

  nextBtn?.addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(allMovies.length / pageSize));
    if (currentPage < totalPages) {
      currentPage++;
      renderPage();
      resultsSection.scrollIntoView({ behavior: "smooth" });
    }
  });

  function renderMovies(movies) {
    resultsContainer.innerHTML = "";

    movies.forEach((m, idx) => {
      if (!m.id && idx === 0) {
        console.warn("No usable id in recommendation object:", m.raw);
      }

      const href = m.id ? `/movie?id=${encodeURIComponent(m.id)}` : null;

      const card = document.createElement("div");
      card.className =
        "bg-gray-800 rounded-xl p-4 shadow-md flex flex-col hover:shadow-lg transition";

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

    // Delegate Save-to-Favorites (overwrites handler each render—fine)
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

