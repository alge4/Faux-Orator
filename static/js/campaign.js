// scripts/campaign.js
document.addEventListener('DOMContentLoaded', function () {
    const contextMenu = document.getElementById('context-menu');
    let currentCampaignId;

    document.querySelectorAll('.campaign-item').forEach(item => {
        item.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            currentCampaignId = this.getAttribute('data-campaign-id');
            contextMenu.style.top = `${e.pageY}px`;
            contextMenu.style.left = `${e.pageX}px`;
            contextMenu.style.display = 'block';
        });
    });

    document.addEventListener('click', function () {
        contextMenu.style.display = 'none';
    });

    document.getElementById('edit-campaign').addEventListener('click', function () {
        const campaignLabel = document.querySelector(`[data-campaign-id="${currentCampaignId}"] label`);
        const campaignInput = document.createElement('input');
        campaignInput.type = 'text';
        campaignInput.value = campaignLabel.textContent;
        campaignLabel.textContent = '';
        campaignLabel.appendChild(campaignInput);
        campaignInput.focus();

        const finishEdit = () => {
            const newName = campaignInput.value;
            fetch(`/edit_campaign/${currentCampaignId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify({ name: newName })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    campaignLabel.textContent = newName;
                } else {
                    alert('Error updating campaign name.');
                    campaignLabel.textContent = campaignInput.value; // Revert to original name if error
                }
            });
        };

        campaignInput.addEventListener('blur', finishEdit);
        campaignInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                finishEdit();
                campaignInput.blur();
            }
        });
    });

    document.getElementById('delete-campaign').addEventListener('click', function () {
        if (confirm('Are you sure you want to delete this campaign?')) {
            fetch(`/delete_campaign/${currentCampaignId}`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.querySelector(`[data-campaign-id="${currentCampaignId}"]`).remove();
                } else {
                    alert('Error deleting campaign.');
                }
            });
        }
    });
});
