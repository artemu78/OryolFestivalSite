import { assetUrl } from "../assetUrl";
import content from "../site.json";
import React, { useState, useRef, useEffect } from "react";

export function HeroMedia() {
  const [isMobile, setIsMobile] = useState(null);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 700px)");
    setIsMobile(mql.matches);
    const onChange = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const posterRef = useRef(null);
  const videoRef = useRef(null);
  const [readyVariant, setReadyVariant] = useState(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const poster = assetUrl(
    isMobile ? "girls/1001-mobile.jpg" : "girls/1001.jpg",
  );
  const videoSource = assetUrl(
    isMobile
      ? "girls/gemini_generated_video_mobile.mp4"
      : "girls/gemini_generated_video_4ba23423.mp4",
  );

  useEffect(() => {
    if (isMobile === null) return;
    setStarted(false);
    setPlaying(false);
    setReadyVariant(null);
    let cancelled = false;
    let decoded = false;
    let frame;
    const startAfterPaint = () => {
      if (cancelled || !decoded || document.readyState !== "complete") return;
      // Give the decoded poster a paint opportunity before attaching any video URL.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (!cancelled) setReadyVariant(isMobile);
        });
      });
    };
    window.addEventListener("load", startAfterPaint, { once: true });
    posterRef.current
      .decode()
      .catch(() => {
        // A broken poster must not prevent the video from loading.
      })
      .then(() => {
        decoded = true;
        startAfterPaint();
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("load", startAfterPaint);
    };
  }, [isMobile]);

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
          <source
            media="(max-width: 700px)"
            srcSet={assetUrl("girls/1001-mobile.jpg")}
          />
          <img
            ref={posterRef}
            className="hero-poster"
            src={assetUrl("girls/1001.jpg")}
            alt=""
            fetchPriority="high"
          />
        </picture>
        {isMobile !== null && readyVariant === isMobile && (
          <video
            key={isMobile ? "mobile" : "desktop"}
            ref={videoRef}
            className={`hero-video${started ? " is-playing" : ""}`}
            src={videoSource}
            poster={poster}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
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
        )}
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
