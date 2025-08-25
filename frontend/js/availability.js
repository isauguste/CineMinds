const API_BASE = "http://localhost:3000";

function renderAvailability(containerEl, { title, year, id, tmdbId }) {
  if (!containerEl) return;
  containerEl.innerHTML = `<span class="empty" style="opacity:.8;font-size:.85rem;">Checking availability…</span>`;

  fetch(`${API_BASE}/api/availability?` + new URLSearchParams({
    title: title || "",
    year: year || "",
    movieId: id || "",
    tmdbId: tmdbId || ""
  }))
    .then(res => res.json())
    .then(data => {
      const list = data?.sources || [];
      containerEl.innerHTML = "";

      if (!list.length) {
        containerEl.innerHTML = `<span class="empty" style="opacity:.8;font-size:.85rem;">No streaming platforms found</span>`;
        return;
      }

      // Render up to 6 chips
      list.slice(0, 6).forEach(s => {
        const span = document.createElement("span");
        span.style.cssText = "display:inline-block;border-radius:0.5rem;padding:0.25rem 0.5rem;font-size:0.75rem;margin:0.25rem;background:#1e293b;color:#f1f5f9;";
        const label = `${s.platform} (${s.access})`;
        if (s.link) {
          const a = document.createElement("a");
          a.href = s.link;
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = label;
          a.style.color = "inherit";
          a.style.textDecoration = "none";
          a.onmouseover = () => a.style.textDecoration = "underline";
          a.onmouseout = () => a.style.textDecoration = "none";
          span.appendChild(a);
        } else {
          span.textContent = label;
        }
        containerEl.appendChild(span);
      });
    })
    .catch(() => {
      containerEl.innerHTML = `<span class="empty" style="opacity:.8;font-size:.85rem;">Availability unavailable</span>`;
    });
}

