/**
 * @jest-environment jsdom
 */

describe("Drag and Drop", () => {
  beforeEach(() => {
    document.body.innerHTML = `
            <div id="campaign-list">
                <div class="campaign-item" data-campaign-id="1">Item 1</div>
                <div class="campaign-item" data-campaign-id="2">Item 2</div>
            </div>
        `;
  });

  test("maintains order after drag", () => {
    const list = document.getElementById("campaign-list");
    const items = list.children;

    // Simulate drag end
    const event = new CustomEvent("sortablejs:end", {
      detail: { newIndex: 1, oldIndex: 0 },
    });
    list.dispatchEvent(event);

    expect(items[1].dataset.campaignId).toBe("1");
  });
});
