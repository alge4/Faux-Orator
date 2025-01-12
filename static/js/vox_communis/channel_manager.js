class VoiceChannelManager {
  constructor(campaignId) {
    this.campaignId = campaignId;
    this.channelList = document.getElementById("voice-channel-list");
    this.addChannelBtn = document.getElementById("add-voice-channel");
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Add channel button
    this.addChannelBtn?.addEventListener("click", () => this.createChannel());

    // Edit and delete buttons for existing channels
    document.querySelectorAll(".edit-channel").forEach((btn) => {
      btn.addEventListener("click", (e) => this.editChannel(e));
    });

    document.querySelectorAll(".delete-channel").forEach((btn) => {
      btn.addEventListener("click", (e) => this.deleteChannel(e));
    });
  }

  async createChannel() {
    const name = prompt("Enter channel name:");
    if (!name) return;

    try {
      const response = await fetch("/vox/channels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": document.querySelector('meta[name="csrf-token"]')
            .content,
        },
        body: JSON.stringify({
          campaign_id: this.campaignId,
          name: name,
        }),
      });

      if (response.ok) {
        location.reload(); // Refresh to show new channel
      }
    } catch (error) {
      console.error("Error creating channel:", error);
    }
  }

  async editChannel(event) {
    const channelItem = event.target.closest(".voice-channel-item");
    const channelId = channelItem.dataset.channelId;
    const currentName = channelItem.querySelector(".channel-name").textContent;

    const newName = prompt("Enter new channel name:", currentName);
    if (!newName || newName === currentName) return;

    try {
      const response = await fetch(`/vox/channels/${channelId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": document.querySelector('meta[name="csrf-token"]')
            .content,
        },
        body: JSON.stringify({ name: newName }),
      });

      if (response.ok) {
        channelItem.querySelector(".channel-name").textContent = newName;
      }
    } catch (error) {
      console.error("Error updating channel:", error);
    }
  }

  async deleteChannel(event) {
    const channelItem = event.target.closest(".voice-channel-item");
    const channelId = channelItem.dataset.channelId;
    const channelName = channelItem.querySelector(".channel-name").textContent;

    // Prevent deletion of default channels if they're the last ones
    const totalChannels = document.querySelectorAll(
      ".voice-channel-item"
    ).length;
    if (totalChannels <= 2 && ["Game", "Whisper"].includes(channelName)) {
      alert(
        "Cannot delete the last default channel. At least one channel must remain."
      );
      return;
    }

    if (
      !confirm(`Are you sure you want to delete the channel "${channelName}"?`)
    )
      return;

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
}
