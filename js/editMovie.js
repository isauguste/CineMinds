document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("editMovieForm");
  const movieId = getMovieIdFromURL();

  // Fetch current movie data
  fetch(`http://localhost:5000/api/getMovie?id=${movieId}`)
    .then(res => res.json())
    .then(movie => {
      document.getElementById("title").value = movie.title;
      document.getElementById("genre").value = movie.genre;
      document.getElementById("description").value = movie.description;
      document.getElementById("mood").value = movie.mood;
      document.getElementById("movieId").value = movie.id;
    })
    .catch(err => console.error("Failed to fetch movie:", err));

  // Submit edited data
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const updatedMovie = {
      id: movieId,
      title: form.title.value,
      genre: form.genre.value,
      description: form.description.value,
      mood: form.mood.value
    };

    fetch("http://localhost:5000/api/updateMovie", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updatedMovie)
    })
      .then(res => res.json())
      .then(response => {
        if (response.success) {
          alert("Movie updated successfully!");
          window.location.href = "recommendations.html";
        } else {
          alert("Failed to update movie.");
        }
      })
      .catch(err => console.error("Error updating movie:", err));
  });

  function getMovieIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  }
});
