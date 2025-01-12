from dataclasses import dataclass
from typing import List

@dataclass
class TurnServer:
    urls: str
    username: str
    credential: str

@dataclass
class WebRTCConfig:
    stun_servers: List[str] = None
    turn_servers: List[TurnServer] = None

    def __post_init__(self):
        if self.stun_servers is None:
            self.stun_servers = [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302'
            ]
        
        if self.turn_servers is None:
            # Add your TURN server credentials here
            self.turn_servers = [
                TurnServer(
                    urls='turn:your-turn-server.com:3478',
                    username='your-username',
                    credential='your-password'
                )
            ]

    def to_dict(self):
        return {
            'iceServers': [
                {'urls': server} for server in self.stun_servers
            ] + [
                {
                    'urls': server.urls,
                    'username': server.username,
                    'credential': server.credential
                } for server in self.turn_servers
            ]
        } 