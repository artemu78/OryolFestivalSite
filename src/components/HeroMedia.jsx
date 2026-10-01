import React, { useState, useRef } from "react";

export function HeroMedia() {
  const videoRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const poster = `${import.meta.env.BASE_URL}girls/1001.png`;

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => setStarted(false));
    } else {
      video.pause();
    }
  }

  return (
    <>
      <div className="hero-media" aria-hidden="true">
        <img className="hero-poster" src={poster} alt="" fetchPriority="high" />
        <video
          ref={videoRef}
          className={`hero-video${started ? " is-playing" : ""}`}
          src={`${import.meta.env.BASE_URL}girls/gemini_generated_video_4ba23423.mp4`}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onPlaying={() => {
            setStarted(true);
            setPlaying(true);
          }}
          onPause={() => setPlaying(false)}
          onError={() => {
            setStarted(false);
            setPlaying(false);
          }}
        />
      </div>
      {started && (
        <button
          className="hero-playback"
          onClick={togglePlayback}
          aria-label={
            playing ? "Приостановить фоновое видео" : "Продолжить фоновое видео"
          }
        >
          {playing ? "Ⅱ Пауза" : "▷ Продолжить"}
        </button>
      )}
    </>
  );
}
