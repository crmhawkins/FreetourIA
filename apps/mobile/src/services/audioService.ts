/**
 * audioService — lightweight singleton for audio playback outside React components.
 * Uses expo-audio's createAudioPlayer. ExploreScreen uses useAudioPlayer hook directly.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

class AudioService {
    private player: AudioPlayer | null = null;
    private onFinishCallback: (() => void) | null = null;

    onFinish(cb: () => void) { this.onFinishCallback = cb; }
    clearOnFinish() { this.onFinishCallback = null; }

    async initialize() {
        await setAudioModeAsync({ playsInSilentMode: true });
    }

    async playAudio(uri: string): Promise<void> {
        if (this.player) { try { this.player.remove(); } catch (_) {} this.player = null; }
        return new Promise<void>((resolve) => {
            const player = createAudioPlayer({ uri }, 100);
            this.player = player;
            player.addListener('playbackStatusUpdate', (status) => {
                if (status.didJustFinish) {
                    const cb = this.onFinishCallback;
                    this.onFinishCallback = null;
                    if (cb) cb();
                    resolve();
                }
            });
            player.play();
            setTimeout(resolve, 180000);
        });
    }

    async stopAudio(): Promise<void> {
        if (this.player) { try { this.player.remove(); } catch (_) {} this.player = null; }
    }

    async pauseAudio(): Promise<void> {
        if (this.player) { try { this.player.pause(); } catch (_) {} }
    }

    async resumeAudio(): Promise<void> {
        if (this.player) { try { this.player.play(); } catch (_) {} }
    }

    isAudioPlaying(): boolean { return this.player !== null; }

    async cleanup(): Promise<void> { await this.stopAudio(); }
}

export default new AudioService();
