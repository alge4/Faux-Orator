document.addEventListener("DOMContentLoaded", function () {
  // Current editing state
  let currentEditingCampaignId = null;

  // Initialize Sortable
  const campaignList = document.getElementById("campaign-list");
  const favoriteCampaignId = document.querySelector(".favorite-icon.favorited")
    ?.dataset.campaignId;

  // CRUD Operations
  window.editCampaign = function (campaignId) {
    currentEditingCampaignId = campaignId;
    const campaignName = document.querySelector(
      `.campaign-item[data-campaign-id="${campaignId}"] .campaign-name`
    ).textContent;
    document.getElementById("editCampaignName").value = campaignName;
    new bootstrap.Modal(document.getElementById("editCampaignModal")).show();
  };

  window.saveCampaignEdit = async function () {
    const newName = document.getElementById("editCampaignName").value.trim();
    if (!newName) return;

    try {
      const response = await fetch(
        `/edit_campaign/${currentEditingCampaignId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `name=${encodeURIComponent(newName)}`,
        }
      );

      if (response.ok) {
        const campaignElement = document.querySelector(
          `.campaign-item[data-campaign-id="${currentEditingCampaignId}"] .campaign-name`
        );
        campaignElement.textContent = newName;
        bootstrap.Modal.getInstance(
          document.getElementById("editCampaignModal")
        ).hide();
      } else {
        console.error("Failed to update campaign");
      }
    } catch (error) {
      console.error("Error updating campaign:", error);
    }
  };

  window.deleteCampaign = async function (campaignId) {
    if (!confirm("Are you sure you want to delete this campaign?")) return;

    try {
      const response = await fetch(`/delete_campaign/${campaignId}`, {
        method: "POST",
      });

      if (response.ok) {
        const campaignElement = document.querySelector(
          `.campaign-item[data-campaign-id="${campaignId}"]`
        );
        campaignElement.remove();
        // Update order after deletion
        updateCampaignOrder();
      } else {
        console.error("Failed to delete campaign");
      }
    } catch (error) {
      console.error("Error deleting campaign:", error);
    }
  };

  // Context Menu
  const contextMenu = document.getElementById("contextMenu");
  let activeItemId = null;

  // Add context menu event listeners
  document.querySelectorAll(".campaign-item").forEach((item) => {
    item.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      activeItemId = this.dataset.campaignId;

      // Position and show context menu
      contextMenu.style.display = "block";
      contextMenu.style.left = e.pageX + "px";
      contextMenu.style.top = e.pageY + "px";
    });
  });

  // Handle context menu actions
  contextMenu.addEventListener("click", function (e) {
    const action = e.target.closest(".menu-item")?.dataset.action;
    if (!action || !activeItemId) return;

    if (action === "edit") {
      makeEditable(activeItemId);
    } else if (action === "delete") {
      deleteCampaign(activeItemId);
    }

    // Hide context menu
    contextMenu.style.display = "none";
  });

  // Hide context menu when clicking outside
  document.addEventListener("click", function () {
    contextMenu.style.display = "none";
  });

  // Function to update campaign order while maintaining favorites at top
  function updateCampaignOrder() {
    const items = Array.from(campaignList.children);
    const order = items.map((item) => ({
      id: item.dataset.campaignId,
      isFavorite: item.dataset.isFavorite === "true",
    }));

    // Send the order to the server
    fetch("/update_campaign_order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": document
          .querySelector('meta[name="csrf-token"]')
          .getAttribute("content"),
      },
      body: JSON.stringify({ order: order.map((item) => item.id) }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          console.log("Campaign order updated successfully");
        }
      })
      .catch((error) => console.error("Error updating campaign order:", error));
  }

  // Initialize Sortable with group constraints
  new Sortable(campaignList, {
    animation: 150,
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    dragClass: "moving",
    group: "campaigns",
    forceFallback: false,
    fallbackTolerance: 3,
    scroll: true,
    scrollSensitivity: 30,
    scrollSpeed: 10,
    onStart: function (evt) {
      document.body.style.cursor = "grabbing";
    },
    onEnd: function (evt) {
      document.body.style.cursor = "";
      if (!evt.item.parentNode) {
        campaignList.appendChild(evt.item);
      }

      const items = Array.from(campaignList.children);
      const favorites = items.filter(
        (item) => item.dataset.isFavorite === "true"
      );
      const nonFavorites = items.filter(
        (item) => item.dataset.isFavorite === "false"
      );

      // Clear the list
      campaignList.innerHTML = "";

      // Add favorites first
      favorites.forEach((item) => campaignList.appendChild(item));
      // Then add non-favorites
      nonFavorites.forEach((item) => campaignList.appendChild(item));

      // Update the order in the database
      updateCampaignOrder();
    },
    onMove: function (evt) {
      return evt.related.parentNode === campaignList;
    },
  });

  // Favorite icon click handler
  document.querySelectorAll(".favorite-icon").forEach((icon) => {
    icon.addEventListener("click", async function (e) {
      e.stopPropagation();
      const campaignId = this.dataset.campaignId;
      const campaignItem = this.closest(".campaign-item");

      try {
        const response = await fetch(
          `/toggle_favorite_campaign/${campaignId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": document
                .querySelector('meta[name="csrf-token"]')
                .getAttribute("content"),
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          // Toggle between only two states
          if (data.is_favorite) {
            this.className = "fa-star favorite-icon fas favorited";
          } else {
            this.className = "fa-star favorite-icon far";
          }
          campaignItem.dataset.isFavorite = data.is_favorite;

          // Reorder the list to maintain favorites at top
          const items = Array.from(campaignList.children);
          const favorites = items.filter(
            (item) => item.dataset.isFavorite === "true"
          );
          const nonFavorites = items.filter(
            (item) => item.dataset.isFavorite === "false"
          );

          campaignList.innerHTML = "";
          favorites.forEach((item) => campaignList.appendChild(item));
          nonFavorites.forEach((item) => campaignList.appendChild(item));

          updateCampaignOrder();
        }
      } catch (error) {
        console.error("Error toggling favorite:", error);
      }
    });
  });

  // Ensure the favorite campaign is always at the top
  const favoriteCampaignElement = document.querySelector(
    `.campaign-item[data-campaign-id="${favoriteCampaignId}"]`
  );
  if (favoriteCampaignElement) {
    campaignList.removeChild(favoriteCampaignElement);
    campaignList.insertBefore(favoriteCampaignElement, campaignList.firstChild);
  }

  function animateFavoriteToTop(favoriteElement, items) {
    let currentIndex = items.indexOf(favoriteElement);

    function moveUp(index) {
      if (index <= 0) {
        return;
      }

      const prevElement = items[index - 1];
      if (prevElement.dataset.campaignId !== favoriteCampaignId) {
        favoriteElement.classList.add("moving");
        prevElement.classList.add("moving");

        // Calculate the height difference
        const heightDifference =
          prevElement.getBoundingClientRect().top -
          favoriteElement.getBoundingClientRect().top;

        // Move the favorite element up
        favoriteElement.style.transform = `translateY(${heightDifference}px)`;
        prevElement.style.transform = `translateY(${-heightDifference}px)`;

        setTimeout(() => {
          campaignList.insertBefore(favoriteElement, prevElement);
          favoriteElement.style.transform = ``;
          prevElement.style.transform = ``;
          favoriteElement.classList.remove("moving");
          prevElement.classList.remove("moving");

          // Recalculate the item positions
          const updatedItems = Array.from(campaignList.children);
          moveUp(updatedItems.indexOf(favoriteElement));
        }, 500);
      }
    }

    if (currentIndex > 0) {
      moveUp(currentIndex);
    }
  }

  // Double-click to edit
  document.querySelectorAll(".campaign-name").forEach((nameElement) => {
    nameElement.addEventListener("dblclick", function (e) {
      const campaignItem = e.target.closest(".campaign-item");
      makeEditable(campaignItem.dataset.campaignId);
    });
  });

  // Make campaign name editable
  function makeEditable(campaignId) {
    const campaignElement = document.querySelector(
      `.campaign-item[data-campaign-id="${campaignId}"] .campaign-name`
    );
    const currentName = campaignElement.textContent;

    // Create input element
    const input = document.createElement("input");
    input.type = "text";
    input.value = currentName;
    input.className = "campaign-name-edit";

    // Replace text with input
    campaignElement.textContent = "";
    campaignElement.appendChild(input);
    input.focus();
    input.select();

    // Handle save on blur or enter
    const saveEdit = async () => {
      const newName = input.value.trim();
      if (newName && newName !== currentName) {
        try {
          const response = await fetch(`/edit_campaign/${campaignId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `name=${encodeURIComponent(newName)}`,
          });

          if (response.ok) {
            campaignElement.textContent = newName;
          } else {
            campaignElement.textContent = currentName;
            console.error("Failed to update campaign name");
          }
        } catch (error) {
          campaignElement.textContent = currentName;
          console.error("Error updating campaign name:", error);
        }
      } else {
        campaignElement.textContent = currentName;
      }
    };

    input.addEventListener("blur", saveEdit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        input.blur();
      }
      if (e.key === "Escape") {
        campaignElement.textContent = currentName;
      }
    });
  }

  // Remove any old event listeners for /set_favorite_campaign
  const oldFavoriteHandlers = document.querySelectorAll(
    '[onclick*="setFavoriteCampaign"]'
  );
  oldFavoriteHandlers.forEach((el) => {
    el.removeAttribute("onclick");
  });

  // Add to existing DOMContentLoaded event listener
  document.querySelectorAll(".campaign-item").forEach((item) => {
    item.addEventListener("click", async function (e) {
      // Don't trigger if clicking favorite icon or context menu
      if (
        e.target.classList.contains("favorite-icon") ||
        e.target.classList.contains("menu-item")
      ) {
        return;
      }

      const campaignId = this.dataset.campaignId;

      try {
        const response = await fetch(`/select_campaign/${campaignId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": document
              .querySelector('meta[name="csrf-token"]')
              .getAttribute("content"),
          },
        });

        if (response.ok) {
          // Update active campaign visual state
          document.querySelectorAll(".campaign-item").forEach((c) => {
            c.classList.remove("active");
          });
          this.classList.add("active");

          // Refresh the content area
          const contentArea = document.getElementById("content");
          const data = await response.json();

          // Update tab contents based on current tab
          const activeTab = document.querySelector(".nav-link.active");
          if (activeTab) {
            const tabId = activeTab.getAttribute("href").substring(1);
            updateTabContent(tabId, data);
          }
        }
      } catch (error) {
        console.error("Error selecting campaign:", error);
      }
    });
  });

  function updateTabContent(tabId, campaignData) {
    const contentArea = document.getElementById(tabId);
    if (!contentArea) return;

    // Update campaign name in header
    const campaignNameHeader = document.getElementById(
      "selected-campaign-name"
    );
    if (campaignNameHeader) {
      campaignNameHeader.textContent = campaignData.name;
    }

    // Update the appropriate tab content
    switch (tabId) {
      case "planning":
        contentArea.innerHTML = campaignData.planning_html;
        break;
      case "playing":
        contentArea.innerHTML = campaignData.playing_html;
        break;
      case "perpend":
        contentArea.innerHTML = campaignData.perpend_html;
        break;
    }

    // Reinitialize any JavaScript handlers for the new content
    initializeTabHandlers(tabId);
  }

  function initializeTabHandlers(tabId) {
    // Add any tab-specific JavaScript initialization here
    switch (tabId) {
      case "planning":
        // Initialize planning tab handlers
        break;
      case "playing":
        // Initialize playing tab handlers
        initializeDiscordLogs();
        break;
      case "perpend":
        // Initialize perpend tab handlers
        break;
    }
  }

  // Example of a tab-specific handler
  function initializeDiscordLogs() {
    const logContainer = document.querySelector(".discord-logs");
    if (logContainer) {
      // Initialize discord log specific functionality
    }
  }
});
