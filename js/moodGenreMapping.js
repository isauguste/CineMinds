const token = localStorage.getItem("token");
const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`
};

const moodSelect = document.getElementById("moodSelect");
const genreSelect = document.getElementById("genreSelect");
const mappingForm = document.getElementById("mappingForm");
const mappingsTable = document.getElementById("mappingsTable");
const featuredMoodSelect = document.getElementById("featuredMoodSelect");
const currentFeaturedMood = document.getElementById("currentFeaturedMood");

// Load everything on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  fetchMoods();
  fetchGenres();
  fetchMappings();
  fetchCurrentFeaturedMood();
});

async function fetchMoods() {
  try {
    const res = await fetch("http://localhost:3000/api/mood/moods");
    const moods = await res.json();
    moodSelect.innerHTML = `<option value="">-- Select Mood --</option>`;
    featuredMoodSelect.innerHTML = `<option value="">-- Select Mood --</option>`;
    moods.forEach(mood => {
      const option1 = new Option(mood.mood_label, mood.id);
      const option2 = new Option(mood.mood_label, mood.id);
      moodSelect.add(option1);
      featuredMoodSelect.add(option2);
    });
  } catch (err) {
    console.error("Failed to fetch moods:", err);
  }
}

async function fetchGenres() {
  try {
    const res = await fetch("http://localhost:3000/api/genres");
    const genres = await res.json();
    genreSelect.innerHTML = `<option value="">-- Select Genre --</option>`;
    genres.forEach(genre => {
      genreSelect.add(new Option(genre.name, genre.id));
    });
  } catch (err) {
    console.error("Failed to fetch genres:", err);
  }
}

async function fetchMappings() {
  try {
    const res = await fetch("http://localhost:3000/api/manager/mappings", { headers });
    const mappings = await res.json();
    renderMappings(mappings);
  } catch (err) {
    console.error("Failed to fetch mappings:", err);
  }
}

function renderMappings(mappings) {
  mappingsTable.innerHTML = "";
  mappings.forEach(mapping => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="px-4 py-2">${mapping.genre}</td>
      <td class="px-4 py-2">${mapping.mood}</td>
      <td class="px-4 py-2 text-center">
        <button class="bg-red-500 hover:bg-red-600 px-3 py-1 rounded" onclick="deleteMapping(${mapping.id})">Delete</button>
      </td>`;
    mappingsTable.appendChild(row);
  });
}

mappingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const mood_id = moodSelect.value;
  const genre_id = genreSelect.value;

  if (!mood_id || !genre_id) return alert("Please select both a mood and a genre.");

  try {
    const res = await fetch("http://localhost:3000/api/manager/mappings", {
      method: "POST",
      headers,
      body: JSON.stringify({ mood_id, genre_id })
    });
    const data = await res.json();
    if (res.ok) {
      alert("Mapping added!");
      fetchMappings();
    } else {
      alert(data.error || "Failed to add mapping.");
    }
  } catch (err) {
    console.error("Failed to add mapping:", err);
    alert("Something went wrong.");
  }
});

async function deleteMapping(id) {
  if (!confirm("Are you sure you want to delete this mapping?")) return;
  try {
    const res = await fetch(`http://localhost:3000/api/manager/mappings/${id}`, {
      method: "DELETE",
      headers
    });
    if (res.ok) {
      alert("Mapping deleted!");
      fetchMappings();
    } else {
      alert("Failed to delete mapping.");
    }
  } catch (err) {
    console.error("Error deleting mapping:", err);
  }
}

async function pinMood() {
  const moodId = featuredMoodSelect.value;
  if (!moodId) return alert("Please select a mood to pin.");
  try {
    const res = await fetch("http://localhost:3000/api/manager/featured-mood", {
      method: "POST",
      headers,
      body: JSON.stringify({ mood_id: moodId })
    });
    const data = await res.json();
    if (res.ok) alert(data.message || "Featured mood pinned successfully!");
    else alert(data.error || "Failed to pin featured mood.");
  } catch (err) {
    console.error("Error pinning featured mood:", err);
    alert("Something went wrong.");
  }
}

async function fetchCurrentFeaturedMood() {
  try {
    const res = await fetch("http://localhost:3000/api/manager/featured-mood", { headers });
    const mood = await res.json();
    currentFeaturedMood.textContent = `Currently pinned mood: ${mood.mood_label}`;
  } catch (err) {
    console.error("Error fetching current featured mood:", err);
    currentFeaturedMood.textContent = "No featured mood is currently pinned.";
  }
}

