class CampaignMediaClient {
    constructor(campaignId) {
        this.campaignId = campaignId;
        this.socket = io();
        this.peerConnections = {};
        this.localStreams = {};
        this.mediaConstraints = {
            audio: true,
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                // Add your TURN server configuration here
            ]
        };
        
        this.initializeSocketHandlers();
    }

    async initialize() {
        try {
            // Get user media streams
            const stream = await navigator.mediaDevices.getUserMedia(this.mediaConstraints);
            this.localStreams.camera = stream;
            this.displayLocalStream(stream);
            
            // Join the campaign channel
            this.socket.emit('join_channel', {
                campaign_id: this.campaignId
            });
        } catch (error) {
            console.error('Error accessing media devices:', error);
        }
    }

    async startScreenShare() {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });
            this.localStreams.screen = screenStream;
            this.broadcastNewStream(screenStream, 'screen');
        } catch (error) {
            console.error('Error starting screen share:', error);
        }
    }

    initializeSocketHandlers() {
        this.socket.on('user_joined_channel', async (data) => {
            if (data.user_id !== this.socket.id) {
                await this.createPeerConnection(data.user_id);
            }
        });

        this.socket.on('user_left_channel', (data) => {
            if (this.peerConnections[data.user_id]) {
                this.peerConnections[data.user_id].close();
                delete this.peerConnections[data.user_id];
                this.removeUserVideo(data.user_id);
            }
        });

        // WebRTC Signaling
        this.socket.on('offer', async (data) => {
            const pc = await this.createPeerConnection(data.from);
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            this.socket.emit('answer', {
                answer: answer,
                to: data.from,
                from: this.socket.id
            });
        });

        this.socket.on('answer', async (data) => {
            const pc = this.peerConnections[data.from];
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
        });

        this.socket.on('ice_candidate', async (data) => {
            const pc = this.peerConnections[data.from];
            if (pc) {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        });
    }

    async createPeerConnection(userId) {
        if (this.peerConnections[userId]) {
            return this.peerConnections[userId];
        }

        const pc = new RTCPeerConnection(this.configuration);
        this.peerConnections[userId] = pc;

        // Add local streams to peer connection
        Object.values(this.localStreams).forEach(stream => {
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });
        });

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('ice_candidate', {
                    candidate: event.candidate,
                    to: userId,
                    from: this.socket.id
                });
            }
        };

        // Handle incoming streams
        pc.ontrack = (event) => {
            this.handleRemoteStream(event.streams[0], userId);
        };

        // Create and send offer if we're the initiator
        if (Object.keys(this.localStreams).length > 0) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            this.socket.emit('offer', {
                offer: offer,
                to: userId,
                from: this.socket.id
            });
        }

        return pc;
    }

    handleRemoteStream(stream, userId) {
        const videoElement = document.createElement('video');
        videoElement.id = `video-${userId}`;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.srcObject = stream;
        
        const videoContainer = document.getElementById('remote-videos');
        videoContainer.appendChild(videoElement);
    }

    displayLocalStream(stream) {
        const videoElement = document.createElement('video');
        videoElement.id = 'local-video';
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.muted = true;
        videoElement.srcObject = stream;
        
        const localVideoContainer = document.getElementById('local-video-container');
        localVideoContainer.appendChild(videoElement);
    }

    removeUserVideo(userId) {
        const videoElement = document.getElementById(`video-${userId}`);
        if (videoElement) {
            videoElement.remove();
        }
    }

    toggleAudio(enabled) {
        if (this.localStreams.camera) {
            this.localStreams.camera.getAudioTracks().forEach(track => {
                track.enabled = enabled;
            });
        }
    }

    toggleVideo(enabled) {
        if (this.localStreams.camera) {
            this.localStreams.camera.getVideoTracks().forEach(track => {
                track.enabled = enabled;
            });
        }
    }

    async broadcastNewStream(stream, type) {
        // Add the new stream to all existing peer connections
        Object.values(this.peerConnections).forEach(pc => {
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });
        });
    }

    disconnect() {
        // Close all peer connections
        Object.values(this.peerConnections).forEach(pc => pc.close());
        this.peerConnections = {};

        // Stop all local streams
        Object.values(this.localStreams).forEach(stream => {
            stream.getTracks().forEach(track => track.stop());
        });
        this.localStreams = {};

        // Leave the channel
        this.socket.emit('leave_channel', {
            campaign_id: this.campaignId
        });
    }
} 