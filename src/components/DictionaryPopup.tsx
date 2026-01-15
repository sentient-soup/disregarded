import { useState, useEffect, useRef } from "react";

interface Phonetic {
  text?: string;
  audio?: string;
}

interface Definition {
  definition: string;
  example?: string;
}

interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
}

interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics?: Phonetic[];
  meanings: Meaning[];
}

interface DictionaryPopupProps {
  word: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export function DictionaryPopup({ word, position, onClose }: DictionaryPopupProps) {
  const [entry, setEntry] = useState<DictionaryEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const popupRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch dictionary data
  useEffect(() => {
    async function fetchDefinition() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError("Word not found in dictionary");
          } else {
            setError("Failed to fetch definition");
          }
          return;
        }

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setEntry(data[0]);
        } else {
          setError("No definition found");
        }
      } catch (err) {
        setError("Failed to fetch definition");
      } finally {
        setLoading(false);
      }
    }

    fetchDefinition();
  }, [word]);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Adjust position to keep popup in viewport
  const adjustedPosition = { ...position };
  if (popupRef.current) {
    const rect = popupRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (rect.right > viewportWidth) {
      adjustedPosition.x = viewportWidth - rect.width - 16;
    }
    if (rect.bottom > viewportHeight) {
      adjustedPosition.y = position.y - rect.height - 16;
    }
  }

  // Get audio URL from phonetics
  const audioUrl = entry?.phonetics?.find((p) => p.audio)?.audio;
  const phonetic = entry?.phonetic || entry?.phonetics?.find((p) => p.text)?.text;

  const playAudio = () => {
    if (audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play().catch(console.error);
    }
  };

  return (
    <div
      ref={popupRef}
      className="dictionary-popup"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* Header */}
      <div className="dictionary-popup-header">
        <div className="dictionary-popup-word">{word}</div>
        {phonetic && <div className="dictionary-popup-phonetic">{phonetic}</div>}
        {audioUrl && (
          <button
            className="dictionary-popup-audio-btn"
            onClick={playAudio}
            title="Play pronunciation"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="16"
              height="16"
            >
              <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07l-1.41-1.41a3 3 0 0 0 0-4.24l1.41-1.42zM19.07 4.93a10 10 0 0 1 0 14.14l-1.41-1.41a8 8 0 0 0 0-11.32l1.41-1.41z" />
            </svg>
          </button>
        )}
        <button className="dictionary-popup-close" onClick={onClose}>
          x
        </button>
      </div>

      {/* Content */}
      <div className="dictionary-popup-content">
        {loading && <div className="dictionary-popup-loading">Loading...</div>}

        {error && <div className="dictionary-popup-error">{error}</div>}

        {entry && (
          <div className="dictionary-popup-meanings">
            {entry.meanings.slice(0, 3).map((meaning, idx) => (
              <div key={idx} className="dictionary-popup-meaning">
                <div className="dictionary-popup-pos">{meaning.partOfSpeech}</div>
                <ol className="dictionary-popup-definitions">
                  {meaning.definitions.slice(0, 2).map((def, defIdx) => (
                    <li key={defIdx} className="dictionary-popup-definition">
                      <span>{def.definition}</span>
                      {def.example && (
                        <div className="dictionary-popup-example">"{def.example}"</div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
