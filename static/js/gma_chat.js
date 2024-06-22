document.addEventListener('DOMContentLoaded', (event) => {
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    socket.on('gma_response', function(data) {
        addMessageToChat('GMA', data);
    });

    document.getElementById('chat-form').addEventListener('submit', function(event) {
        event.preventDefault();
        const messageInput = document.getElementById('chat-input');
        const message = messageInput.value;

        fetch('/gma/send_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: new URLSearchParams({
                message: message
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                addMessageToChat('You', message);
                messageInput.value = '';
            } else {
                alert('Failed to send message.');
            }
        });
    });

    document.getElementById('custom-story-form').addEventListener('submit', function(event) {
        event.preventDefault();
        const promptInput = document.getElementById('custom-story-prompt');
        const prompt = promptInput.value;

        fetch('/gma/get_custom_story', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: new URLSearchParams({
                prompt: prompt
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                addMessageToChat('GMA', data.response);
                promptInput.value = '';
            } else {
                alert('Failed to get custom story.');
            }
        });
    });

    function addMessageToChat(sender, message) {
        const chatMessages = document.getElementById('chat-messages');
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
        chatMessages.appendChild(messageElement);
    }
});
