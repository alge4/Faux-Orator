document.addEventListener('DOMContentLoaded', function () {
    const campaignList = document.getElementById('campaign-list');
    const favoriteCampaignId = document.querySelector('.favorite-icon.favorited').dataset.campaignId;

    new Sortable(campaignList, {
        animation: 150,
        onEnd: function (evt) {
            const order = [];
            const items = Array.from(campaignList.children);

            for (let i = 0; i < items.length; i++) {
                const campaignId = items[i].dataset.campaignId;
                if (campaignId !== favoriteCampaignId) {
                    order.push(campaignId);
                }
            }

            // Prepend the favorite campaign id to the order
            order.unshift(favoriteCampaignId);

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
                    console.error('Failed to update campaign order.');
                }
            });

            // Force favorite campaign back to the top with animation
            const draggedElement = evt.item;
            const draggedCampaignId = draggedElement.dataset.campaignId;
            if (draggedCampaignId === favoriteCampaignId) {
                animateFavoriteToTop(draggedElement, items);
            }
        },
        filter: ".favorited",
        preventOnFilter: false
    });

    // Ensure the favorite campaign is always at the top
    const favoriteCampaignElement = document.querySelector(`.campaign-item[data-campaign-id="${favoriteCampaignId}"]`);
    if (favoriteCampaignElement) {
        campaignList.removeChild(favoriteCampaignElement);
        campaignList.insertBefore(favoriteCampaignElement, campaignList.firstChild);
    }

    function animateFavoriteToTop(favoriteElement, items) {
        let currentIndex = items.indexOf(favoriteElement);

        function moveUp(index) {
            if (index <= 0) {
                return;
            }

            const prevElement = items[index - 1];
            if (prevElement.dataset.campaignId !== favoriteCampaignId) {
                favoriteElement.classList.add('moving');
                prevElement.classList.add('moving');

                // Calculate the height difference
                const heightDifference = prevElement.getBoundingClientRect().top - favoriteElement.getBoundingClientRect().top;

                // Move the favorite element up
                favoriteElement.style.transform = `translateY(${heightDifference}px)`;
                prevElement.style.transform = `translateY(${-heightDifference}px)`;

                setTimeout(() => {
                    campaignList.insertBefore(favoriteElement, prevElement);
                    favoriteElement.style.transform = ``;
                    prevElement.style.transform = ``;
                    favoriteElement.classList.remove('moving');
                    prevElement.classList.remove('moving');

                    // Recalculate the item positions
                    const updatedItems = Array.from(campaignList.children);
                    moveUp(updatedItems.indexOf(favoriteElement));
                }, 500);
            }
        }

        if (currentIndex > 0) {
            moveUp(currentIndex);
        }
    }

    // Update favorite campaign on star click
    const favoriteIcons = document.querySelectorAll('.favorite-icon');
    favoriteIcons.forEach(icon => {
        icon.addEventListener('click', function () {
            const campaignId = this.dataset.campaignId;
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
                response.json().then(data => {
                    updateFavoriteCampaignUI(data.campaign_id);
                });
                console.log('Favorite campaign set successfully.');
            } else {
                console.error('Failed to set favorite campaign.');
            }
        });
    }

    function updateFavoriteCampaignUI(favoriteCampaignId) {
        const campaignList = document.querySelector('#campaign-list');
        const campaigns = Array.from(campaignList.children);
        const favoriteCampaign = campaigns.find(campaign => campaign.dataset.campaignId == favoriteCampaignId);

        // Remove the favorite campaign from its current position
        campaignList.removeChild(favoriteCampaign);

        // Insert the favorite campaign at the top
        campaignList.insertBefore(favoriteCampaign, campaignList.firstChild);

        // Update the favorite icon
        campaigns.forEach(campaign => {
            const icon = campaign.querySelector('.favorite-icon');
            if (campaign.dataset.campaignId == favoriteCampaignId) {
                icon.classList.add('favorited');
            } else {
                icon.classList.remove('favorited');
            }
        });
    }
});
