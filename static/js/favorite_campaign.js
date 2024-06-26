// static/js/favorite_campaign.js
document.addEventListener('DOMContentLoaded', function() {
    const favoriteRadios = document.querySelectorAll('input[name="favorite"]');

    favoriteRadios.forEach(radio => {
        radio.addEventListener('click', function() {
            const campaignId = this.id.split('-')[1];
            setFavoriteCampaign(campaignId);
        });
    });

    function setFavoriteCampaign(campaignId) {
        fetch('/set_favorite_campaign', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify({ campaign_id: campaignId })
        }).then(response => {
            if (response.ok) {
                console.log('Favorite campaign set successfully.');
            } else {
                console.error('Failed to set favorite campaign.');
            }
        });
    }
});
