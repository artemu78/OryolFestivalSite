import { assetUrl } from "../assetUrl";
import content from "../site.json";
import React, { useState, useRef, useEffect } from "react";

export function HeroMedia() {
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

  return (
    <DeferredHeroMedia
      key={isMobile ? "mobile" : "desktop"}
      isMobile={isMobile}
    />
  );
}

function DeferredHeroMedia({ isMobile }) {
  const posterRef = useRef(null);
  const videoRef = useRef(null);
  const [videoReady, setVideoReady] = useState(false);
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
    let cancelled = false;
    let decoded = false;
    let frame;
    const startAfterPaint = () => {
      if (cancelled || !decoded || document.readyState !== "complete") return;
      // Give the decoded poster a paint opportunity before attaching any video URL.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (!cancelled) setVideoReady(true);
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
  }, []);

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
        <img
          ref={posterRef}
          className="hero-poster"
          src={poster}
          alt=""
          fetchPriority="high"
        />
        <video
          ref={videoRef}
          className={`hero-video${started ? " is-playing" : ""}`}
          src={videoReady ? videoSource : undefined}
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
