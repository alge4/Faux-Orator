class VoxUserManager {
  constructor() {
    this.currentChannel = null;
    this.draggedUser = null;
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    document.querySelectorAll(".channel-user").forEach((user) => {
      this.makeUserDraggable(user);
    });

    document.querySelectorAll(".droppable-area").forEach((area) => {
      this.makeAreaDroppable(area);
    });
  }

  makeUserDraggable(userElement) {
    userElement.draggable = true;

    userElement.addEventListener("dragstart", (e) => {
      this.draggedUser = userElement;
      userElement.classList.add("dragging");
      e.dataTransfer.setData("text/plain", userElement.dataset.userId);
    });

    userElement.addEventListener("dragend", () => {
      userElement.classList.remove("dragging");
      this.draggedUser = null;
    });
  }

  makeAreaDroppable(area) {
    area.addEventListener("dragover", (e) => {
      e.preventDefault();
      area.classList.add("drag-over");
    });

    area.addEventListener("dragleave", () => {
      area.classList.remove("drag-over");
    });

    area.addEventListener("drop", async (e) => {
      e.preventDefault();
      area.classList.remove("drag-over");

      const userId = e.dataTransfer.getData("text/plain");
      const newChannelId = area.dataset.channelId;

      if (this.draggedUser) {
        await this.moveUserToChannel(userId, newChannelId);
      }
    });
  }

  async moveUserToChannel(userId, newChannelId) {
    try {
      const response = await fetch("/vox/users/move", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": document.querySelector('meta[name="csrf-token"]')
            .content,
        },
        body: JSON.stringify({
          user_id: userId,
          channel_id: newChannelId,
        }),
      });

      if (response.ok) {
        this.animateUserMove(this.draggedUser, newChannelId);
      }
    } catch (error) {
      console.error("Error moving user:", error);
    }
  }

  animateUserMove(userElement, newChannelId) {
    const targetArea = document.querySelector(
      `.droppable-area[data-channel-id="${newChannelId}"]`
    );

    userElement.style.animation = "slideOut 0.3s ease";

    userElement.addEventListener(
      "animationend",
      () => {
        userElement.remove();
        const newUserElement = userElement.cloneNode(true);
        newUserElement.style.animation = "slideIn 0.3s ease";
        targetArea.appendChild(newUserElement);
        this.makeUserDraggable(newUserElement);
      },
      { once: true }
    );
  }

  updateChannelStatus(channelId, status) {
    const indicator = document.querySelector(
      `.voice-channel-item[data-channel-id="${channelId}"] .channel-status-indicator`
    );

    if (indicator) {
      indicator.className = "channel-status-indicator";
      if (status.active) indicator.classList.add("active");
      if (status.speaking) indicator.classList.add("speaking");
    }
  }
}
