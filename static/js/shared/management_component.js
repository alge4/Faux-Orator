class ManagementComponent {
  constructor(options) {
    this.listElement = document.getElementById(options.listId);
    this.modalId = options.modalId;
    this.formId = options.formId;
    this.createButtonId = options.createButtonId;
    this.apiEndpoint = options.apiEndpoint;
    this.itemClass = options.itemClass;

    this.modal = document.getElementById(this.modalId);
    this.form = document.getElementById(this.formId);
    this.createButton = document.getElementById(this.createButtonId);

    this.initializeCommon();
  }

  initializeCommon() {
    // Initialize Sortable
    if (this.listElement) {
      new Sortable(this.listElement, {
        handle: ".handle",
        animation: 150,
        onEnd: (evt) => this.handleReorder(evt),
      });
    }

    // Modal handlers
    this.createButton?.addEventListener("click", () => this.showModal());
    this.modal
      ?.querySelector(".close")
      ?.addEventListener("click", () => this.hideModal());
    this.form?.addEventListener("submit", (e) => this.handleSubmit(e));

    // Edit and delete handlers
    document
      .querySelectorAll(`.${this.itemClass} .edit-button`)
      .forEach((btn) => {
        btn.addEventListener("click", (e) => this.handleEdit(e));
      });

    document
      .querySelectorAll(`.${this.itemClass} .delete-button`)
      .forEach((btn) => {
        btn.addEventListener("click", (e) => this.handleDelete(e));
      });
  }

  async handleReorder(evt) {
    const items = Array.from(this.listElement.children).map(
      (item) => item.dataset.id
    );

    try {
      await fetch(`${this.apiEndpoint}/reorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": document.querySelector('meta[name="csrf-token"]')
            .content,
        },
        body: JSON.stringify({ items }),
      });
    } catch (error) {
      console.error("Error reordering items:", error);
    }
  }

  // ... rest of shared functionality
}

// Usage example:
// const channelManager = new ManagementComponent({
//     listId: 'voice-channel-list',
//     modalId: 'channel-modal',
//     formId: 'channel-form',
//     createButtonId: 'create-voice-channel',
//     apiEndpoint: '/vox/channels',
//     itemClass: 'voice-channel-item'
// });
