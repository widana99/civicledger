import React, { useRef, useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';

interface VideoBackgroundProps {
  src?: string;
  poster?: string;
  className?: string;
  overlayOpacity?: number;
  showControls?: boolean;
}

export function VideoBackground({
  src = '/videos/hero-city.webm',
  poster = '/images/hero_showcase.jpg',
  className = '',
  overlayOpacity = 0.6,
  showControls = true,
}: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);

  // Defer heavy video download until after initial page paint
  useEffect(() => {
    // Wait until browser is idle or 600ms to allow LCP / FCP to render instantly
    const timer = setTimeout(() => {
      setShouldLoadVideo(true);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!shouldLoadVideo) return;
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          setVideoLoaded(true);
        })
        .catch(() => {
          // Autoplay fallback
        });
    }
  }, [shouldLoadVideo, src]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div className={`absolute inset-0 w-full h-full overflow-hidden z-0 bg-slate-950 ${className}`}>
      {/* High-speed Optimized Poster Image (Instant LCP) */}
      <img
        src={poster}
        alt="Civic City View"
        loading="eager"
        fetchPriority="high"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
          videoLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      />

      {/* Deferred Video Background */}
      {shouldLoadVideo && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="w-full h-full object-cover scale-[1.02] transform-gpu transition-opacity duration-1000"
          style={{ pointerEvents: 'none' }}
        >
          <source src="/videos/hero-city.webm" type="video/webm" />
          <source src="/videos/hero-city.mp4" type="video/mp4" />
        </video>
      )}

      {/* Cinematic Gradient Overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/50 to-slate-950/90 pointer-events-none"
        style={{ opacity: overlayOpacity }}
      />

      {/* Interactive Controls */}
      {showControls && shouldLoadVideo && (
        <div className="absolute bottom-5 right-5 z-30 flex items-center gap-1.5 p-1.5 rounded-full bg-black/60 border border-white/15 backdrop-blur-md text-white text-xs">
          <button
            onClick={togglePlay}
            type="button"
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
            title={isPlaying ? 'Pause Video' : 'Play Video'}
            aria-label="Toggle video playback"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={toggleMute}
            type="button"
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            aria-label="Toggle video sound"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        </div>
      )}
    </div>
  );
}
