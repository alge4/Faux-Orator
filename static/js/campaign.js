// scripts/campaign.js
document.addEventListener('DOMContentLoaded', function() {
    const campaignList = document.getElementById('campaign-list');
    const mainHeader = document.getElementById('main-header');

    campaignList.addEventListener('click', function(event) {
        if (event.target && event.target.nodeName === "A") {
            event.preventDefault();
            const campaignName = event.target.getAttribute('data-campaign-name');
            mainHeader.textContent = campaignName;
        }
    });
});
