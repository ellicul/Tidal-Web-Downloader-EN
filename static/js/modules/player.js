// js/modules/player.js
import { getTrackInfo } from './api.js';
import * as dom from './dom.js';
import { updatePlayerUI, updateTrackListUI } from './ui.js';

export const player = {
    tracklist: [], 
    currentIndex: -1, 
    currentTrack: null, 
    currentAlbumId: null, 
    isPlaying: false, 
    isLoading: false,

    async playTrackAtIndex(index, albumId = null) {
        if (index < 0 || index >= this.tracklist.length) { this.stop(); return; }
        this.currentIndex = index; this.currentTrack = this.tracklist[index];
        if (!this.currentTrack) { console.error("Track is undefined at index:", index); this.stop(); return; }
        this.currentAlbumId = albumId || this.currentTrack?.album?.id;
        this.setLoading(true);
        try {
            const data = await getTrackInfo(this.currentTrack.id);
            dom.playerAudioElement.src = data[2].OriginalTrackUrl;
            await dom.playerAudioElement.play();
        } catch (err) { console.error('Playback Error:', err); this.stop(); }
    },

    playNext() { this.hasNext() ? this.playTrackAtIndex(this.currentIndex + 1, this.currentAlbumId) : this.stop(); },

    playPrev() { this.hasPrev() ? this.playTrackAtIndex(this.currentIndex - 1, this.currentAlbumId) : this.stop(); },

    togglePlayPause() { 
        if (this.isLoading || !this.currentTrack) return; 
        this.isPlaying ? dom.playerAudioElement.pause() : dom.playerAudioElement.play(); 
    },

    stop() {
        dom.playerAudioElement.pause(); dom.playerAudioElement.src = '';
        const oldAlbumId = this.currentAlbumId;
        this.currentTrack = null; this.currentIndex = -1; this.tracklist = []; this.currentAlbumId = null;
        this.setPlaying(false);
    },

    setPlaying(state) { 
        this.isPlaying = state; 
        updatePlayerUI(); 
        updateTrackListUI(); 
    },

    setLoading(state) { 
        this.isLoading = state; 
        updatePlayerUI(); 
    },

    setVolume(val) { 
        dom.playerAudioElement.volume = val / 100; 
    },

    seek(pct) { 
        if (dom.playerAudioElement.duration) dom.playerAudioElement.currentTime = (dom.playerAudioElement.duration * pct) / 100; 
    },

    hasNext: () => player.currentIndex < player.tracklist.length - 1,
    
    hasPrev: () => player.currentIndex > 0,
};