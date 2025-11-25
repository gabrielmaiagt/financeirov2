'use client';

import React, { createContext, useState, useCallback, useRef, ReactNode } from 'react';

interface SoundContextType {
  play: (src: string) => void;
  setVolume: (volume: number) => void;
  volume: number;
}

export const SoundContext = createContext<SoundContextType | undefined>(undefined);

interface SoundProviderProps {
  children: ReactNode;
}

export const SoundProvider = ({ children }: SoundProviderProps) => {
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback((src: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch(error => console.error("Error playing sound:", error));
    audioRef.current = audio;
  }, [volume]);

  const handleSetVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  };

  const value = { play, setVolume: handleSetVolume, volume };

  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  );
};
