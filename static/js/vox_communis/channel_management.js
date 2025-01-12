class VoiceChannelManagement {
  constructor() {
    this.modal = document.getElementById("channel-modal");
    this.form = document.getElementById("channel-form");
    this.channelList = document.getElementById("voice-channel-list");
    this.createButton = document.getElementById("create-voice-channel");
    this.closeButton = this.modal.querySelector(".close");
    this.currentChannelId = null;

    this.initializeSortable();
    this.initializeEventListeners();
  }

  initializeSortable() {
    if (this.channelList) {
      new Sortable(this.channelList, {
        handle: ".handle",
        animation: 150,
        onEnd: (evt) => this.updateChannelOrder(evt),
      });
    }
  }

  initializeEventListeners() {
    this.createButton?.addEventListener("click", () => this.showModal());
    this.closeButton?.addEventListener("click", () => this.hideModal());
    this.form?.addEventListener("submit", (e) => this.handleSubmit(e));

    // Edit and delete buttons
    document.querySelectorAll(".edit-channel").forEach((btn) => {
      btn.addEventListener("click", (e) => this.handleEdit(e));
    });

    document.querySelectorAll(".delete-channel").forEach((btn) => {
      btn.addEventListener("click", (e) => this.handleDelete(e));
    });
  }

  showModal(channelId = null, channelName = "") {
    this.currentChannelId = channelId;
    this.modal.style.display = "block";
    document.getElementById("modal-title").textContent = channelId
      ? "Edit Voice Channel"
      : "Create Voice Channel";
    document.getElementById("channel-name").value = channelName;
  }

  hideModal() {
    this.modal.style.display = "none";
    this.form.reset();
    this.currentChannelId = null;
  }

  async handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(this.form);
    const name = formData.get("name");

    try {
      const response = await fetch(
        this.currentChannelId
          ? `/vox/channels/${this.currentChannelId}`
          : "/vox/channels",
        {
          method: this.currentChannelId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": document.querySelector('meta[name="csrf-token"]')
              .content,
          },
          body: JSON.stringify({
            name,
            campaign_id: window.selectedCampaignId,
          }),
        }
      );

      if (response.ok) {
        location.reload();
      }
    } catch (error) {
      console.error("Error saving channel:", error);
    }
  }

  async handleDelete(e) {
    const channelItem = e.target.closest(".voice-channel-item");
    const channelId = channelItem.dataset.channelId;
    const channelName = channelItem.querySelector(".channel-name").textContent;

    if (!confirm(`Are you sure you want to delete "${channelName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/vox/channels/${channelId}`, {
        method: "DELETE",
        headers: {
          "X-CSRFToken": document.querySelector('meta[name="csrf-token"]')
            .content,
        },
      });

      if (response.ok) {
        channelItem.remove();
      }
    } catch (error) {
      console.error("Error deleting channel:", error);
    }
  }

  async updateChannelOrder(evt) {
    const channelIds = Array.from(this.channelList.children).map(
      (item) => item.dataset.channelId
    );

    try {
      await fetch("/vox/channels/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": document.querySelector('meta[name="csrf-token"]')
            .content,
        },
        body: JSON.stringify({ channel_ids: channelIds }),
      });
    } catch (error) {
      console.error("Error updating channel order:", error);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new VoiceChannelManagement();
});
