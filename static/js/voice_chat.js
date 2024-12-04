// static/js/voice_chat.js

document.addEventListener('DOMContentLoaded', () => {
    const startVoiceChatBtn = document.getElementById('start-voice-chat-btn');
    const audioContainer = document.getElementById('audio-container');
    const userList = document.getElementById('user-list');
    const npcList = document.getElementById('npc-list');
    const socket = io.connect();

    let localStream;
    let peerConnections = {};
    let userMediaStreams = {};
    let usersInChannel = {};
    let currentUser = currentUser || 'Unknown User';
    let npcsListening = npcsListening || [];
    const room = campaignId || 'global_room';

    startVoiceChatBtn.addEventListener('click', () => {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(stream => {
                localStream = stream;
                const localAudio = document.createElement('audio');
                localAudio.srcObject = stream;
                localAudio.muted = true;
                localAudio.autoplay = true;
                audioContainer.appendChild(localAudio);

                socket.emit('join', { room: room, username: currentUser });

                usersInChannel[socket.id] = { username: currentUser, isSpeaking: false };
                updateUserList();
                monitorLocalAudioLevel();
            })
            .catch(error => {
                console.error('Error accessing media devices.', error);
            });
    });

    // ... rest of the code (user_joined, user_left, signal handling, updateUserList, monitorLocalAudioLevel, etc.) ...
});
