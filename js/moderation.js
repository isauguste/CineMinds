document.addEventListener("DOMContentLoaded", () => {
  fetchMoods();
  fetchGenres();
  fetchMappings();
});

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

// Fetch moods for both mapping and featured mood selection
async function fetchMoods() {
  try {
    const res = await fetch("http://localhost:3000/api/mood/moods");
    const moods = await res.json();

    // Clear both dropdowns
    moodSelect.innerHTML = `<option value="">-- Select Mood --</option>`;
    featuredMoodSelect.innerHTML = `<option value="">-- Select Mood --</option>`;

    moods.forEach(mood => {
      const option1 = document.createElement("option");
      option1.value = mood.id;
      option1.textContent = mood.mood_label;
      moodSelect.appendChild(option1);

      const option2 = document.createElement("option");
      option2.value = mood.id;
      option2.textContent = mood.mood_label;
      featuredMoodSelect.appendChild(option2);
    });
  } catch (err) {
    console.error("Failed to fetch moods:", err);
  }
}

// Fetch genres
async function fetchGenres() {
  try {
    const res = await fetch("http://localhost:3000/api/genres");
    const genres = await res.json();

    genreSelect.innerHTML = `<option value="">-- Select Genre --</option>`;

    genres.forEach(genre => {
      const option = document.createElement("option");
      option.value = genre.id;
      option.textContent = genre.name;
      genreSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Failed to fetch genres:", err);
  }
}

// Fetch and render mappings
async function fetchMappings() {
  try {
    const res = await fetch("http://localhost:3000/api/manager/mappings", { headers });
    const mappings = await res.json();
    renderMappings(mappings);
  } catch (err) {
    console.error("Failed to fetch mappings:", err);
  }
}

// Render mappings in table
function renderMappings(mappings) {
  mappingsTable.innerHTML = "";
  mappings.forEach(mapping => {
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

// Add mapping
mappingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const mood_id = moodSelect.value;
  const genre_id = genreSelect.value;

  if (!mood_id || !genre_id) {
    alert("Please select both a mood and a genre.");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/api/manager/mappings", {
      method: "POST",
      headers,
      body: JSON.stringify({ mood_id, genre_id })
    });

    if (res.ok) {
      alert("Mapping added!");
      fetchMappings(); // Refresh table
    } else {
      const errData = await res.json();
      alert(errData.error || "Failed to add mapping.");
    }
  } catch (err) {
    console.error("Failed to add mapping:", err);
    alert("Something went wrong.");
  }
});

// Delete mapping
async function deleteMapping(id) {
  const confirmed = confirm("Are you sure you want to delete this mapping?");
  if (!confirmed) return;

  try {
    const res = await fetch(`http://localhost:3000/api/manager/mappings/${id}`, {
      method: "DELETE",
      headers
    });

    if (res.ok) {
      alert("Mapping deleted!");
      fetchMappings(); // Refresh table
    } else {
      alert("Failed to delete mapping.");
    }
  } catch (err) {
    console.error("Error deleting mapping:", err);
  }
}

// Pin featured mood of the day
async function pinMood() {
  const moodId = featuredMoodSelect.value;

  if (!moodId) {
    alert("Please select a mood to pin.");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/api/manager/featured-mood", {
      method: "POST",
      headers,
      body: JSON.stringify({ mood_id: moodId })
    });

    const data = await res.json();
    if (res.ok) {
      alert(data.message || "Featured mood pinned successfully!");
    } else {
      alert(data.error || "Failed to pin featured mood.");
    }
  } catch (err) {
    console.error("Error pinning featured mood:", err);
    alert("Something went wrong.");
  }
}

