from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import threading
import time

@dataclass
class ChannelStats:
    channel_id: str
    peak_users: int = 0
    current_users: int = 0
    total_speaking_time: timedelta = field(default_factory=lambda: timedelta())
    connection_issues: int = 0
    start_time: datetime = field(default_factory=datetime.utcnow)

@dataclass
class UserStats:
    user_id: str
    speaking_time: timedelta = field(default_factory=lambda: timedelta())
    connection_drops: int = 0
    last_speaking: Optional[datetime] = None

class VoiceMonitor:
    def __init__(self, cleanup_interval: int = 3600):
        self.channel_stats: Dict[str, ChannelStats] = {}
        self.user_stats: Dict[str, Dict[str, UserStats]] = {}  # channel_id -> user_id -> stats
        self.lock = threading.Lock()
        self.cleanup_interval = cleanup_interval
        self._start_cleanup_thread()

    def _start_cleanup_thread(self):
        def cleanup():
            while True:
                time.sleep(self.cleanup_interval)
                self._cleanup_old_stats()

        thread = threading.Thread(target=cleanup, daemon=True)
        thread.start()

    def _cleanup_old_stats(self):
        """Remove stats older than 24 hours"""
        with self.lock:
            cutoff = datetime.utcnow() - timedelta(hours=24)
            for channel_id in list(self.channel_stats.keys()):
                if self.channel_stats[channel_id].start_time < cutoff:
                    del self.channel_stats[channel_id]
                    if channel_id in self.user_stats:
                        del self.user_stats[channel_id]

    def record_user_joined(self, channel_id: str, user_id: str):
        with self.lock:
            if channel_id not in self.channel_stats:
                self.channel_stats[channel_id] = ChannelStats(channel_id)
            
            stats = self.channel_stats[channel_id]
            stats.current_users += 1
            stats.peak_users = max(stats.peak_users, stats.current_users)

            if channel_id not in self.user_stats:
                self.user_stats[channel_id] = {}
            if user_id not in self.user_stats[channel_id]:
                self.user_stats[channel_id][user_id] = UserStats(user_id)

    def record_speaking_state(self, channel_id: str, user_id: str, is_speaking: bool):
        with self.lock:
            if channel_id not in self.user_stats or user_id not in self.user_stats[channel_id]:
                return

            user_stat = self.user_stats[channel_id][user_id]
            now = datetime.utcnow()

            if is_speaking:
                user_stat.last_speaking = now
            elif user_stat.last_speaking:
                duration = now - user_stat.last_speaking
                user_stat.speaking_time += duration
                self.channel_stats[channel_id].total_speaking_time += duration
                user_stat.last_speaking = None

    def get_channel_report(self, channel_id: str) -> Optional[dict]:
        with self.lock:
            if channel_id not in self.channel_stats:
                return None

            stats = self.channel_stats[channel_id]
            return {
                'peak_users': stats.peak_users,
                'current_users': stats.current_users,
                'total_speaking_time': str(stats.total_speaking_time),
                'connection_issues': stats.connection_issues,
                'uptime': str(datetime.utcnow() - stats.start_time),
                'users': [
                    {
                        'user_id': user_id,
                        'speaking_time': str(user_stats.speaking_time),
                        'connection_drops': user_stats.connection_drops
                    }
                    for user_id, user_stats in self.user_stats[channel_id].items()
                ]
            } 