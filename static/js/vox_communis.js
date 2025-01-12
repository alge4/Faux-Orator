class VoxCommunis {
  constructor() {
    this.initializeSortable();
    this.initializeEventListeners();
    this.socket = io.connect(
      location.protocol + "//" + document.domain + ":" + location.port
    );
  }

  initializeSortable() {
    const channelList = document.getElementById("voice-channel-list");
    if (channelList) {
      new Sortable(channelList, {
        handle: ".handle",
        animation: 150,
        onEnd: (evt) => this.updateChannelOrder(evt),
      });
    }
  }

  initializeEventListeners() {
    document
      .getElementById("add-voice-channel")
      ?.addEventListener("click", () => this.addChannel());

    document.querySelectorAll(".edit-channel").forEach((btn) => {
      btn.addEventListener("click", (e) => this.editChannel(e));
    });

    document.querySelectorAll(".delete-channel").forEach((btn) => {
      btn.addEventListener("click", (e) => this.deleteChannel(e));
    });
  }

  updateChannelOrder(evt) {
    const channelIds = Array.from(evt.to.children).map(
      (item) => item.dataset.channelId
    );
    fetch("/api/voice-channels/reorder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": document.querySelector('meta[name="csrf-token"]')
          .content,
      },
      body: JSON.stringify({ channel_ids: channelIds }),
    });
  }

  addChannel() {
    const name = prompt("Enter channel name:");
    if (name) {
      fetch("/api/voice-channels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": document.querySelector('meta[name="csrf-token"]')
            .content,
        },
        body: JSON.stringify({ name }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            location.reload();
          }
        });
    }
  }

  editChannel(e) {
    const channelItem = e.target.closest(".voice-channel-item");
    const channelId = channelItem.dataset.channelId;
    const currentName = channelItem.querySelector(".channel-name").textContent;
    const newName = prompt("Enter new channel name:", currentName);

    if (newName && newName !== currentName) {
      fetch(`/api/voice-channels/${channelId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": document.querySelector('meta[name="csrf-token"]')
            .content,
        },
        body: JSON.stringify({ name: newName }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            location.reload();
          }
        });
    }
  }

  deleteChannel(e) {
    if (confirm("Are you sure you want to delete this channel?")) {
      const channelId = e.target.closest(".voice-channel-item").dataset
        .channelId;
      fetch(`/api/voice-channels/${channelId}`, {
        method: "DELETE",
        headers: {
          "X-CSRFToken": document.querySelector('meta[name="csrf-token"]')
            .content,
        },
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            location.reload();
          }
        });
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new VoxCommunis();
});
