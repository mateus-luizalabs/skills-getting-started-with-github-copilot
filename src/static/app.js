document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: derive initials from an email/local-part
  function getInitials(email) {
    const local = String(email).split("@")[0] || "";
    const parts = local.replace(/[._-]+/g, " ").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Helper: simple text escape for insertion into innerHTML
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select and keep the placeholder
      activitySelect.innerHTML = `<option value="">-- Select an activity --</option>`;

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML with delete buttons
        const participantsHtml =
          Array.isArray(details.participants) && details.participants.length > 0
            ? `<ul class="participants-list">${details.participants
                .map(
                  (p) =>
                    `<li class="participant-item" data-email="${escapeHtml(p)}" data-activity="${escapeHtml(name)}"><span class="avatar">${escapeHtml(
                      getInitials(p)
                    )}</span><span class="participant-email">${escapeHtml(p)}</span><button class="delete-btn" type="button" aria-label="Delete participant ${escapeHtml(p)}">✕</button></li>`
                )
                .join("")}</ul>`
            : `<p class="no-participants">No participants yet</p>`;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <div class="participants-section">
            <h5>Participants</h5>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Use event delegation for delete buttons so handlers persist after re-render
      // (delegated handler attached once below)
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Wait for activities to refresh so the UI reflects the change immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Delegate delete button clicks from the activities list so handlers survive re-renders
  activitiesList.addEventListener("click", async (event) => {
    const btn = event.target.closest(".delete-btn");
    if (!btn) return;
    event.preventDefault();
    const parentItem = btn.closest(".participant-item");
    if (!parentItem) return;
    const email = parentItem.dataset.email;
    const activity = parentItem.dataset.activity;

    if (!email || !activity) return;

    if (confirm(`Are you sure you want to unregister ${email} from ${activity}?`)) {
      try {
        const response = await fetch(
          `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
          { method: "POST" }
        );

        if (response.ok) {
          await fetchActivities();
        } else {
          const result = await response.json();
          alert(result.detail || "Failed to unregister participant");
        }
      } catch (error) {
        alert("Error unregistering participant");
        console.error("Error unregistering:", error);
      }
    }
  });

  // Initialize app
  fetchActivities();
});
