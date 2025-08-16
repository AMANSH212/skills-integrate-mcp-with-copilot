document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const sortSelect = document.getElementById("activity-sort");
  const searchInput = document.getElementById("activity-search");

  let allActivities = {};

  // --- Utility to parse first time from schedule ---
  function extractTimeValue(str) {
    if (!str) return 0;
    const match = str.match(/(\d{1,2}):(\d{2})\s*([APMapm]{2})/);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === "PM" && hours !== 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  function renderActivities() {
    activitiesList.innerHTML = "";
    activitySelect.innerHTML = "";

    const search = searchInput.value.trim().toLowerCase();
    const sortBy = sortSelect.value;

    let activityArr = Object.entries(allActivities);

    // Sort
    if (sortBy === "name") {
      activityArr.sort((a, b) => a[0].localeCompare(b[0]));
    } else if (sortBy === "time") {
      activityArr.sort(
        (a, b) =>
          extractTimeValue(a[1].schedule) - extractTimeValue(b[1].schedule)
      );
    }

    // Filter
    let filtered = activityArr.filter(([name, details]) => {
      if (!search) return true;
      return (
        name.toLowerCase().includes(search) ||
        (details.description &&
          details.description.toLowerCase().includes(search)) ||
        (details.schedule &&
          details.schedule.toLowerCase().includes(search))
      );
    });

    // Render
    filtered.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft =
        details.max_participants - (details.participants?.length || 0);

      const participantsHTML =
        details.participants && details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>
                       <button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description || ""}</p>
        <p><strong>Schedule:</strong> ${details.schedule || "N/A"}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;
      activitiesList.appendChild(activityCard);

      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });

    // Add delete listeners
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  // Fetch activities
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      allActivities = activities;
      renderActivities();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Unregister
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(
          email
        )}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }
      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Signup
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );
      const result = await response.json();
      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }
      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Search/sort listeners
  searchInput.addEventListener("input", renderActivities);
  sortSelect.addEventListener("change", renderActivities);

  // Init
  fetchActivities();
});
