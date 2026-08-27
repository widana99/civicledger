import React, { Suspense, useState, useEffect, useRef, lazy } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

// Lazy load the heavy 1.2MB Spline component
const Spline = lazy(() => import('@splinetool/react-spline'));

interface SplineSceneProps {
  sceneUrl?: string;
  className?: string;
}

export function SplineScene({
  sceneUrl = 'https://prod.spline.design/hyEpCSgFwD6XVbdZ/scene.splinecode',
  className = '',
}: SplineSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Lazy load Spline runtime only when user scrolls near the 3D section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Aggressively remove any Spline watermark or branding badge
  useEffect(() => {
    if (!isInView) return;

    const removeWatermarks = () => {
      const selectors = [
        'a[href*="spline.design"]',
        '#spline-watermark',
        '[class*="watermark"]',
        'spline-viewer::part(watermark)',
        '.spline-watermark',
      ];
      selectors.forEach((sel) => {
        try {
          document.querySelectorAll(sel).forEach((el) => {
            (el as HTMLElement).style.setProperty('display', 'none', 'important');
            (el as HTMLElement).style.setProperty('opacity', '0', 'important');
            (el as HTMLElement).style.setProperty('visibility', 'hidden', 'important');
            (el as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
          });
        } catch (_) {}
      });
    };

    const interval = setInterval(removeWatermarks, 200);
    const timeout = setTimeout(() => clearInterval(interval), 8000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isInView]);

  return (
    <div
      ref={containerRef}
      className={`relative rounded-3xl overflow-hidden bg-[#070A11] border border-slate-800 shadow-2xl ${className}`}
    >
      {!isInView ? (
        // Ultra-lightweight placeholder preview before user scrolls
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-8 text-center">
          <img
            src="/images/smart_city_hologram.jpg"
            alt="Smart City 3D Hologram"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-slate-900/90 border border-slate-700 text-[#0EA58D] shadow-lg animate-pulse">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-white font-header font-bold text-sm">3D WebGL Digital Twin</h4>
            <p className="text-slate-400 text-xs max-w-xs font-body font-mono">
              Gulir untuk memuat simulasi 3D real-time.
            </p>
          </div>
        </div>
      ) : hasError ? (
        <div className="relative flex flex-col items-center justify-center bg-slate-950 border border-slate-800 rounded-3xl p-8 text-center overflow-hidden h-full">
          <img
            src="/images/smart_city_hologram.jpg"
            alt="Smart City 3D Hologram"
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="p-3 rounded-full bg-slate-900/90 border border-slate-700 text-[#0EA58D]">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-white font-header font-bold text-sm">3D WebGL Smart City</h4>
            <p className="text-slate-300 text-xs max-w-xs font-body">
              Model 3D interaktif siap dieksplorasi.
            </p>
          </div>
        </div>
      ) : (
        <>
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#070A11]/90 backdrop-blur-md z-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#0EA58D]" />
              <div className="flex items-center gap-2 text-slate-300 text-xs font-mono tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#0EA58D] animate-ping" />
                MEMUAT 3D WEBGL ENGINE...
              </div>
            </div>
          )}

          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-[#070A11]">
                <Loader2 className="w-8 h-8 animate-spin text-[#0EA58D]" />
              </div>
            }
          >
            <div className="w-full h-full relative overflow-hidden">
              {/* Scaled Spline Canvas to naturally clip corner watermark outside viewport */}
              <div className="w-full h-full transform scale-[1.07] origin-center">
                <Spline
                  scene={sceneUrl}
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setHasError(true);
                  }}
                  className="w-full h-full cursor-grab active:cursor-grabbing"
                />
              </div>

              {/* Absolute bottom-right opaque shield covering any residual badge */}
              <div className="absolute bottom-0 right-0 w-64 h-24 bg-[#070A11] pointer-events-none z-30" />
            </div>
          </Suspense>
        </>
      )}
    </div>
  );
}
