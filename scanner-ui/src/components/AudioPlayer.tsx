import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';

export function AudioPlayer() {
  const { selectedCall } = useStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [selectedCall]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!selectedCall?.audioUrl) {
    return (
      <div className="p-4 bg-scanner-dark border-t border-gray-700">
        <p className="text-gray-400 text-sm">No audio available for this call</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-scanner-dark border-t border-gray-700">
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center"
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        <div className="flex-1">
          <p className="text-sm font-medium">{selectedCall.talkgroup?.alphaTag || 'Call Audio'}</p>
          <p className="text-xs text-gray-400">
            {new Date(selectedCall.timestamp).toLocaleString()}
          </p>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={selectedCall.audioUrl}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="mt-3">
        {selectedCall.transcription && (
          <div className="text-sm">
            <p className="font-medium text-gray-300">Transcription:</p>
            <p className="text-gray-400 mt-1">{selectedCall.transcription}</p>
          </div>
        )}
      </div>
    </div>
  );
}