
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("moodForm");
  const moodText = document.getElementById("moodText");
  const moodSelect = document.getElementById("moodSelect");
  const resultsSection = document.getElementById("resultsSection");
  const resultsContainer = document.getElementById("resultsContainer");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const inputText = moodText.value.trim();
    const selectedMood = moodSelect.value;
    const payload = { moodText: inputText || selectedMood };

    if (!payload.moodText) {
      alert("Please type a mood or select one from the dropdown.");
      return;
    }

    // Show loading state (optional)
    resultsContainer.innerHTML = "<p class='text-center w-full col-span-full'>Loading...</p>";
    resultsSection.classList.remove("hidden");

    try {
      // Send to backend 
      const res = await fetch("http://localhost:3000/api/mood/analyzeMood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!Array.isArray(data.movies)) throw new Error("Invalid response");

      renderMovies(data.movies);
    } catch (err) {
      console.error("Error fetching recommendations:", err);
      resultsContainer.innerHTML = "<p class='text-center text-red-400'>Failed to load recommendations. Please try again.</p>";
    }
  });

  function renderMovies(movies) {
    resultsContainer.innerHTML = "";
    movies.forEach((movie) => {
      const card = document.createElement("div");
      card.className = "bg-gray-800 rounded-xl p-4 shadow-md flex flex-col";

      const trailerLink = movie.trailerLink ? `<a href="${movie.trailerLink}" target="_blank" class="text-sm text-blue-400 mt-2">Watch Trailer</a>` : "";
      const reviewText = movie.reviews && movie.reviews.length > 0 ? `<p class="text-xs text-gray-300 italic mt-2">\"${movie.reviews[0]}\"</p>` : "";

      card.innerHTML = `
        <img src="${movie.poster}" alt="${movie.title}" class="rounded mb-3">
        <h4 class="text-lg font-bold mb-1">${movie.title}</h4>
        <p class="text-sm text-gray-400 mb-2">${movie.year} • ${movie.genres.join(", ")}</p>
        ${trailerLink}
        ${reviewText}
        <button class="mt-auto bg-red-500 hover:bg-red-600 text-sm text-white py-2 px-4 rounded">Save to Favorites</button>
      `;

      resultsContainer.appendChild(card);
    });
  }
});

