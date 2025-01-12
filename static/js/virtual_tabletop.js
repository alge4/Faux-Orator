class VirtualTabletop {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.tokens = new Map();
    this.selectedToken = null;
    this.mode = "select"; // 'select', 'move', 'measure'

    this.initializeCanvas();
    this.initializeControls();
    this.initializeWebSocket();
  }

  initializeCanvas() {
    // Set canvas size to match container
    const resizeCanvas = () => {
      const container = this.canvas.parentElement;
      this.canvas.width = container.clientWidth;
      this.canvas.height = container.clientHeight;
      this.render();
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
  }

  initializeControls() {
    document.getElementById("move-token").addEventListener("click", () => {
      this.mode = "move";
    });

    document
      .getElementById("measure-distance")
      .addEventListener("click", () => {
        this.mode = "measure";
      });

    document.getElementById("roll-dice").addEventListener("click", () => {
      this.rollDice();
    });

    this.canvas.addEventListener("click", (e) => {
      const pos = this.getMousePosition(e);
      this.handleCanvasClick(pos);
    });
  }

  initializeWebSocket() {
    this.socket = io.connect();

    this.socket.on("token_moved", (data) => {
      this.updateTokenPosition(data.tokenId, data.x, data.y);
    });

    this.socket.on("dice_rolled", (data) => {
      this.showDiceResult(data);
    });
  }

  // Add methods for token management, dice rolling, measuring, etc.
}

// Initialize VTT when document is ready
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("vtt-canvas")) {
    window.virtualTabletop = new VirtualTabletop("vtt-canvas");
  }
});
