import content from "../site.json";
import React, { useState, useRef, useEffect } from "react";

export function HeroMedia() {
  const videoRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 700px)").matches;
  });

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 700px)");
    const onChange = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const poster = `${import.meta.env.BASE_URL}girls/1001.png`;
  const mobilePoster = `${import.meta.env.BASE_URL}girls/1001-mobile.png`;
  const desktopVideo = `${import.meta.env.BASE_URL}girls/gemini_generated_video_4ba23423.mp4`;
  const mobileVideo = `${import.meta.env.BASE_URL}girls/gemini_generated_video_mobile.mp4`;

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
        <picture>
          <source media="(max-width: 700px)" srcSet={mobilePoster} />
          <img className="hero-poster" src={poster} alt="" fetchPriority="high" />
        </picture>
        <video
          key={isMobile ? "mobile" : "desktop"}
          ref={videoRef}
          className={`hero-video${started ? " is-playing" : ""}`}
          src={isMobile ? mobileVideo : desktopVideo}
          poster={isMobile ? mobilePoster : poster}
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
            playing ? content.HeroMedia.pauseLabel : content.HeroMedia.playLabel
          }
        >
          {playing ? content.HeroMedia.pause : content.HeroMedia.play}
        </button>
      )}
    </>
  );
}
