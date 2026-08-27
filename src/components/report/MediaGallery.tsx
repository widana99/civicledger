import React, { useState } from 'react';
import {
  Image as ImageIcon, Video, X, ChevronLeft, ChevronRight,
  Maximize2, Play, Pause, Volume2, Film
} from 'lucide-react';

interface MediaGalleryProps {
  photoUrls?: string[];
  photoUrl?: string | null;
  videoUrl?: string | null;
  title?: string;
  badgeLabel?: string;
}

export function MediaGallery({
  photoUrls,
  photoUrl,
  videoUrl,
  title = 'Dokumentasi & Bukti Lapangan',
  badgeLabel,
}: MediaGalleryProps) {
  // Combine single photoUrl with photoUrls array
  const allPhotos = Array.from(
    new Set(
      [...(photoUrls || []), photoUrl]
        .filter((url): url is string => Boolean(url && url.trim().length > 0))
    )
  );

  const [activePhotoIdx, setActivePhotoIdx] = useState<number | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const hasPhotos = allPhotos.length > 0;
  const hasVideo = Boolean(videoUrl && videoUrl.trim().length > 0);

  if (!hasPhotos && !hasVideo) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
        <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-medium">Tidak ada foto atau video yang dilampirkan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600">
            {title}
          </h4>
          {badgeLabel && (
            <span className="px-2 py-0.5 rounded-full bg-[#0EA58D]/15 text-[#0EA58D] text-[10px] font-mono font-bold">
              {badgeLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          {hasPhotos && (
            <span className="flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5" />
              {allPhotos.length} Foto
            </span>
          )}
          {hasPhotos && hasVideo && <span>•</span>}
          {hasVideo && (
            <span className="flex items-center gap-1 text-sky-600 font-bold">
              <Film className="w-3.5 h-3.5" />
              1 Video Bukti
            </span>
          )}
        </div>
      </div>

      {/* ═══════ VIDEO PLAYER (IF PRESENT) ═══════ */}
      {hasVideo && videoUrl && (
        <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-lg relative group">
          <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-2 font-mono font-bold text-sky-400">
              <Film className="w-4 h-4" />
              <span>Rekaman Video Bukti Lapangan</span>
            </div>
            <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-md border border-sky-500/30 font-bold">
              HD Video
            </span>
          </div>

          <div className="relative aspect-video max-h-[380px] bg-black flex items-center justify-center">
            <video
              src={videoUrl}
              controls
              playsInline
              className="w-full h-full object-contain"
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
            >
              Browser Anda tidak mendukung tag video HTML5.
            </video>
          </div>
        </div>
      )}

      {/* ═══════ PHOTO GRID / CAROUSEL ═══════ */}
      {hasPhotos && (
        <div className={`grid gap-3 ${allPhotos.length === 1 ? 'grid-cols-1' : allPhotos.length === 2 ? 'grid-cols-2' : allPhotos.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {allPhotos.map((url, idx) => (
            <div
              key={idx}
              onClick={() => setActivePhotoIdx(idx)}
              className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 group cursor-pointer hover:shadow-md transition-all"
            >
              <img
                src={url}
                alt={`Dokumentasi ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="p-2 rounded-full bg-black/60 text-white backdrop-blur-xs">
                  <Maximize2 className="w-4 h-4" />
                </span>
              </div>
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono font-bold backdrop-blur-xs">
                Foto {idx + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════ FULLSCREEN LIGHTBOX MODAL ═══════ */}
      {activePhotoIdx !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <button
            onClick={() => setActivePhotoIdx(null)}
            className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {allPhotos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIdx((prev) => (prev! > 0 ? prev! - 1 : allPhotos.length - 1));
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIdx((prev) => (prev! < allPhotos.length - 1 ? prev! + 1 : 0));
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div className="max-w-4xl max-h-[85vh] flex flex-col items-center gap-3">
            <img
              src={allPhotos[activePhotoIdx]}
              alt={`Foto ${activePhotoIdx + 1}`}
              className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
            />
            <div className="text-white text-xs font-mono font-bold px-3 py-1 bg-white/10 rounded-full border border-white/10">
              Foto {activePhotoIdx + 1} dari {allPhotos.length}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
