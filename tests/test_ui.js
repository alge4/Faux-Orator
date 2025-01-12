/**
 * @jest-environment jsdom
 */

describe("UI Interactions", () => {
  beforeEach(() => {
    document.body.innerHTML = `
            <div id="campaign-list">
                <div class="campaign-item" data-campaign-id="1">
                    <i class="favorite-icon far fa-star"></i>
                    <div class="campaign-name">Test Campaign</div>
                </div>
            </div>
        `;
  });

  test("campaign name becomes editable on double click", () => {
    const campaignName = document.querySelector(".campaign-name");
    campaignName.dispatchEvent(new MouseEvent("dblclick"));

    const input = document.querySelector("input");
    expect(input).toBeTruthy();
    expect(input.value).toBe("Test Campaign");
  });
});
