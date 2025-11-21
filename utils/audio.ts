
// Sound Effect URLs (using free assets for demo purposes)
const SOUNDS = {
  play: 'https://cdn.pixabay.com/audio/2022/03/24/audio_c8c8a73467.mp3', // Crisp Card Flip
  pass: 'https://cdn.pixabay.com/audio/2022/03/24/audio_02c6e7623e.mp3', // Fast Whoosh
  win: 'https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c7443c.mp3',  // Victory Tune
};

type SoundType = keyof typeof SOUNDS;

export const playSound = (type: SoundType) => {
  // Check if running in browser environment
  if (typeof window === 'undefined') return;

  try {
    const audio = new Audio(SOUNDS[type]);
    audio.volume = 0.5;
    // Reset time to allow rapid replay of same sound
    audio.currentTime = 0; 
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        // Auto-play was prevented (user interaction required) or network error
        console.warn('Audio playback failed:', error);
      });
    }
  } catch (e) {
    console.error("Audio system error:", e);
  }
};
