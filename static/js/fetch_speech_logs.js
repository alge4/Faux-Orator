// static/js/fetch_speech_logs.js
document.addEventListener('DOMContentLoaded', function() {
    const logContainer = document.getElementById('speech-log');

    async function fetchLogs() {
        const response = await fetch('/discord/fetch_speech_logs');
        const logs = await response.json();
        logContainer.innerHTML = '';
        logs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.textContent = `${log.username}: ${log.text}`;
            logContainer.appendChild(logEntry);
        });
    }

    setInterval(fetchLogs, 5000); // Fetch logs every 5 seconds
});
