document.getElementById('gma-config-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const configType = document.getElementById('config-type').value;
    const configValue = document.getElementById('config-value').value;
    fetch('/gma/configure_gma', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: new URLSearchParams({
            config_type: configType,
            config_value: configValue
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('GMA configuration updated successfully.');
        } else {
            alert('Failed to update GMA configuration.');
        }
    });
});
