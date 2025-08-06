document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };

  const moodSelect = document.getElementById("moodSelect");
  const genreSelect = document.getElementById("genreSelect");
  const mappingForm = document.getElementById("mappingForm");
  const mappingsTable = document.getElementById("mappingsTable"); 
  const pinButton = document.querySelector("#pinMoodButton");
  const featuredMoodSelect = document.querySelector("#featuredMoodSelect");
  const currentFeaturedMood = document.querySelector("#currentFeaturedMood");

  async function fetchMoods() {
    const res = await fetch("http://localhost:3000/api/mood/moods", { headers });
    const moods = await res.json();
    moods.forEach((mood) => {
      const option1 = document.createElement("option");
      option1.value = mood.id;
      option1.textContent = mood.mood_label;
      moodSelect.appendChild(option1);

      const option2 = document.createElement("option");
      option2.value = mood.id;
      option2.textContent = mood.mood_label;
      featuredMoodSelect.appendChild(option2);
    });
  }

  async function fetchGenres() {
    const res = await fetch("http://localhost:3000/api/genres", { headers });
    const genres = await res.json();
    genres.forEach((genre) => {
      const option = document.createElement("option");
      option.value = genre.id;
      option.textContent = genre.name;
      genreSelect.appendChild(option);
    });
  }

  async function fetchMappings() {
    const res = await fetch("http://localhost:3000/api/manager/mappings", { headers });
    const mappings = await res.json();
    renderMappings(mappings);
  }

  function renderMappings(mappings) {
    mappingsTable.innerHTML = "";
    mappings.forEach((mapping) => {
      const row = document.createElement("tr");

      const genreCell = document.createElement("td");
      genreCell.className = "px-4 py-2";
      genreCell.textContent = mapping.genre;

      const moodCell = document.createElement("td");
      moodCell.className = "px-4 py-2";
      moodCell.textContent = mapping.mood;

      const actionCell = document.createElement("td");
      actionCell.className = "px-4 py-2 text-center";

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "bg-red-500 hover:bg-red-600 px-3 py-1 rounded";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => deleteMapping(mapping.id));

      actionCell.appendChild(deleteBtn);
      row.appendChild(genreCell);
      row.appendChild(moodCell);
      row.appendChild(actionCell);
      mappingsTable.appendChild(row);
    });
  }

  mappingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const mood_id = moodSelect.value;
    const genre_id = genreSelect.value;

    if (!mood_id || !genre_id) {
      alert("Please select both a mood and a genre.");
      return;
    }

    const res = await fetch("http://localhost:3000/api/manager/mappings", {
      method: "POST",
      headers,
      body: JSON.stringify({ mood_id, genre_id }),
    });

    if (res.ok) {
      alert("Mapping added!");
      fetchMappings();
    } else {
      alert("Failed to add mapping.");
    }
  });

  async function deleteMapping(id) {
    const confirmed = confirm("Are you sure you want to delete this mapping?");
    if (!confirmed) return;

    const res = await fetch(`http://localhost:3000/api/manager/mappings/${id}`, {
      method: "DELETE",
      headers,
    });

    if (res.ok) {
      alert("Mapping deleted!");
      fetchMappings();
    } else {
      alert("Failed to delete mapping.");
    }
  }

  if (pinButton && featuredMoodSelect) {
    pinButton.addEventListener("click", async () => {
      const moodId = featuredMoodSelect.value;
      if (!moodId) return alert("Please select a mood to pin.");

      try {
        const res = await fetch("http://localhost:3000/api/manager/featured-mood", {
          method: "POST",
          headers,
          body: JSON.stringify({ mood_id: moodId }),
        });

        const data = await res.json();

        if (res.ok) {
          alert(data.message || "Featured mood pinned successfully!");
          await fetchCurrentFeaturedMood();  //Ensure UI updates
        } else {
          alert(data.error || "Failed to pin featured mood.");
        }
      } catch (err) {
        console.error("Error pinning featured mood:", err);
        alert("Something went wrong.");
      }
    });
  }

  async function fetchCurrentFeaturedMood() {
    try {
      const res = await fetch("http://localhost:3000/api/manager/featured-mood", {
        headers,
      });

      const mood = await res.json();

      if (!mood || !mood.mood_label) {
        currentFeaturedMood.textContent = "No featured mood is currently pinned.";
      } else {
        currentFeaturedMood.textContent = `Currently pinned mood: ${mood.mood_label}`;
      }
    } catch (err) {
      console.error("Error fetching current featured mood:", err);
      currentFeaturedMood.textContent = "Failed to load featured mood.";
    }
  }

  // Initialize page
  fetchMoods();
  fetchGenres();
  fetchMappings();
  fetchCurrentFeaturedMood();
});

