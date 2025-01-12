let currentEditingCampaignId = null;

function editCampaign(campaignId) {
  currentEditingCampaignId = campaignId;
  const campaignName = document.querySelector(
    `.campaign-item[data-campaign-id="${campaignId}"] .campaign-name`
  ).textContent;
  document.getElementById("editCampaignName").value = campaignName;
  new bootstrap.Modal(document.getElementById("editCampaignModal")).show();
}

async function saveCampaignEdit() {
  const newName = document.getElementById("editCampaignName").value.trim();
  if (!newName) return;

  try {
    const response = await fetch(`/edit_campaign/${currentEditingCampaignId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `name=${encodeURIComponent(newName)}`,
    });

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
}

async function deleteCampaign(campaignId) {
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
    } else {
      console.error("Failed to delete campaign");
    }
  } catch (error) {
    console.error("Error deleting campaign:", error);
  }
}
