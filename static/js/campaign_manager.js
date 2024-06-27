// static/js/campaign_manager.js
document.addEventListener('DOMContentLoaded', function() {
    const campaignList = document.getElementById('campaign-list');
    const favoriteIcons = document.querySelectorAll('.favorite-icon');
    let favoriteCampaignId = document.querySelector('.favorite-icon.favorited').dataset.campaignId;

    function initSortable() {
        new Sortable(campaignList, {
            animation: 150,
            onEnd: function(evt) {
                handleDragEnd(evt);
            }
        });
    }

    function handleDragEnd(evt) {
        const order = [];
        const items = Array.from(campaignList.children);

        items.forEach(item => {
            const campaignId = item.dataset.campaignId;
            order.push(campaignId);
        });

        fetch('/update_campaign_order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify({ order: order })
        }).then(response => {
            if (response.ok) {
                console.log('Campaign order updated successfully.');
            } else {
                response.json().then(data => {
                    if (data.message === 'Favorite campaign must be at the top.') {
                        resetCampaignOrder();
                    }
                    console.error('Failed to update campaign order.');
                });
            }
        });

        if (evt.item.querySelector('.favorite-icon').classList.contains('favorited')) {
            animateFavoriteToTop(evt.item, items);
        }
    }

    function resetCampaignOrder() {
        const favoriteCampaignElement = document.querySelector('.favorite-icon.favorited').closest('.campaign-item');
        campaignList.removeChild(favoriteCampaignElement);
        campaignList.insertBefore(favoriteCampaignElement, campaignList.firstChild);
    }

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
                response.json().then(data => {
                    favoriteCampaignId = data.campaign_id;
                    updateFavoriteCampaignUI(data.campaign_id);
                });
                console.log('Favorite campaign set successfully.');
            } else {
                console.error('Failed to set favorite campaign.');
            }
        });
    }

    function updateFavoriteCampaignUI(favoriteCampaignId) {
        const campaigns = Array.from(campaignList.children);
        const favoriteCampaign = campaigns.find(campaign => campaign.dataset.campaignId == favoriteCampaignId);

        campaignList.removeChild(favoriteCampaign);
        campaignList.insertBefore(favoriteCampaign, campaignList.firstChild);

        campaigns.forEach(campaign => {
            const icon = campaign.querySelector('.favorite-icon');
            if (campaign.dataset.campaignId == favoriteCampaignId) {
                icon.classList.add('favorited');
            } else {
                icon.classList.remove('favorited');
            }
        });

        initSortable();
    }

    function animateFavoriteToTop(favoriteElement, items) {
        let currentIndex = items.indexOf(favoriteElement);

        function moveUp(index) {
            if (index <= 0) return;

            const prevElement = items[index - 1];
            favoriteElement.classList.add('moving');
            prevElement.classList.add('moving');

            const heightDifference = prevElement.getBoundingClientRect().top - favoriteElement.getBoundingClientRect().top;
            favoriteElement.style.transform = `translateY(${heightDifference}px)`;
            prevElement.style.transform = `translateY(${-heightDifference}px)`;

            setTimeout(() => {
                campaignList.insertBefore(favoriteElement, prevElement);
                favoriteElement.style.transform = ``;
                prevElement.style.transform = ``;
                favoriteElement.classList.remove('moving');
                prevElement.classList.remove('moving');

                const updatedItems = Array.from(campaignList.children);
                moveUp(updatedItems.indexOf(favoriteElement));
            }, 300);
        }

        if (currentIndex > 0) moveUp(currentIndex);
    }

    favoriteIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const campaignId = this.dataset.campaignId;
            setFavoriteCampaign(campaignId);
        });
    });

    initSortable();
});
