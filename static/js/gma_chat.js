class GMAChat {
  constructor() {
    this.socket = io.connect(
      location.protocol + "//" + document.domain + ":" + location.port
    );
    this.currentMode = "planning";
    this.initializeSocketListeners();
    this.initializeUIHandlers();
  }

  initializeSocketListeners() {
    this.socket.on("gma_response", (data) => {
      this.addMessageToChat("GMA", data.message, data.mode);
    });
  }

  initializeUIHandlers() {
    // Handle tab changes
    document.querySelectorAll(".nav-link").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const mode = e.target.getAttribute("href").replace("#", "");
        this.currentMode = mode;
      });
    });

    // Handle message sending for each mode
    ["", "-playing", "-perpend"].forEach((suffix) => {
      const input = document.getElementById(`gma-input${suffix}`);
      const button = document.getElementById(`send-gma-message${suffix}`);

      if (input && button) {
        const mode = suffix ? suffix.replace("-", "") : "planning";

        input.addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
            this.sendMessage(input.value, mode);
            input.value = "";
          }
        });

        button.addEventListener("click", () => {
          this.sendMessage(input.value, mode);
          input.value = "";
        });
      }
    });
  }

  sendMessage(message, mode) {
    if (!message.trim()) return;

    this.addMessageToChat("You", message, mode);

    fetch("/gma/send_message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": document.querySelector('meta[name="csrf-token"]')
          .content,
      },
      body: JSON.stringify({
        message: message,
        mode: mode,
        campaign_id: this.getCurrentCampaignId(),
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) {
          console.error("Failed to send message:", data.error);
        }
      });
  }

  addMessageToChat(sender, message, mode) {
    const chatId =
      mode === "planning" ? "gma-messages" : `gma-messages-${mode}`;
    const chatContainer = document.getElementById(chatId);

    if (!chatContainer) return;

    const messageElement = document.createElement("div");
    messageElement.classList.add("chat-message");
    messageElement.innerHTML = `
            <span class="message-sender">${sender}:</span>
            <span class="message-content">${message}</span>
            <span class="message-time">${new Date().toLocaleTimeString()}</span>
        `;

    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  getCurrentCampaignId() {
    const campaignElement = document.querySelector(".campaign-item.active");
    return campaignElement ? campaignElement.dataset.campaignId : null;
  }
}

// Initialize GMA chat when document is ready
document.addEventListener("DOMContentLoaded", () => {
  window.gmaChat = new GMAChat();
});
