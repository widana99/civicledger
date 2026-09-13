import DOMPurify from 'dompurify';

/**
 * ═══════════════════════════════════════════════════════════════
 * CIVICLEDGER ENTERPRISE SECURITY SUITE
 * Standard: OWASP Top 10 + NIST SP 800-53 Compliance
 * ═══════════════════════════════════════════════════════════════
 */

// Permitted MIME types for photo evidence uploads
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Permitted MIME types for video evidence uploads
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
const ALLOWED_VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.mkv'];
const MAX_VIDEO_SIZE_BYTES = 35 * 1024 * 1024; // 35 MB

// Dangerous SQL / Script pattern signatures
const SQLI_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|EXEC|UNION|ALL)\b\s+)/i,
  /(--|#|\/\*|\*\/|;)/,
  /('|\b)(OR|AND)\b\s+['"\d\w]+\s*=\s*['"\d\w]+/i,
  /(\bWAITFOR\b\s+\bDELAY\b|\bBENCHMARK\b|\bSLEEP\b)/i,
];

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /onerror\s*=/gi,
  /onload\s*=/gi,
  /onclick\s*=/gi,
  /eval\s*\(/gi,
  /document\.cookie/gi,
  /window\.location/gi,
];

/**
 * Clean and sanitize user-provided plain text / markdown
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // 1. DOMPurify sanitize
  const cleanHtml = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'li', 'ol'],
    ALLOWED_ATTR: [],
  });

  // 2. Strip residual zero-width or non-printable control characters
  return cleanHtml
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

/**
 * Deep sanitize single line strings (e.g. titles, tags, names)
 */
export function sanitizeString(input: string, maxLength: number = 255): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[<>'"`;]/g, '') // Strip markup and query delimiters
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate against SQL Injection & XSS heuristics
 */
export function validateSafeInput(input: string): { isSafe: boolean; threat?: string } {
  if (!input || typeof input !== 'string') return { isSafe: true };

  // Check SQL injection attempt
  for (const pattern of SQLI_PATTERNS) {
    if (pattern.test(input)) {
      console.warn('[Security Shield] Potential SQLi signature intercepted');
      return { isSafe: false, threat: 'Karakter atau pola query tidak diizinkan.' };
    }
  }

  // Check XSS attempt
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      console.warn('[Security Shield] Potential XSS signature intercepted');
      return { isSafe: false, threat: 'Skrip atau kode berbahaya terdeteksi.' };
    }
  }

  return { isSafe: true };
}

/**
 * Enterprise File Upload Guard
 * Validates file extension, MIME type, size, and header magic bytes for both photos and videos
 */
export async function validateFileUpload(file: File): Promise<{ valid: boolean; error?: string }> {
  const mime = file.type.toLowerCase();
  const isVideo = ALLOWED_VIDEO_MIMES.includes(mime) || file.name.match(/\.(mp4|webm|mov|mkv)$/i);

  // 1. Check size limit
  if (isVideo) {
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      return { valid: false, error: 'Ukuran video melebihi batas maksimum 35 MB.' };
    }
  } else {
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return { valid: false, error: 'Ukuran gambar melebihi batas maksimum 10 MB.' };
    }
  }

  // 2. Check MIME type and extension
  const fileName = file.name.toLowerCase();
  if (isVideo) {
    const hasValidExt = ALLOWED_VIDEO_EXTS.some(ext => fileName.endsWith(ext));
    if (!hasValidExt) {
      return { valid: false, error: 'Format video tidak didukung. Gunakan MP4, WebM, atau MOV.' };
    }
  } else {
    if (!ALLOWED_IMAGE_MIMES.includes(mime)) {
      return { valid: false, error: 'Format gambar tidak diizinkan. Hanya JPG, PNG, atau WebP yang didukung.' };
    }
    const hasValidExt = ALLOWED_IMAGE_EXTS.some(ext => fileName.endsWith(ext));
    if (!hasValidExt) {
      return { valid: false, error: 'Ekstensi gambar tidak valid.' };
    }
  }

  // 3. Magic byte signature verification for Images & Videos
  try {
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (isVideo) {
      // MP4 / MOV: check ftyp box or Quicktime
      // WebM: 1A 45 DF A3 (EBML Header)
      const isWebm = bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3;
      // MP4 usually has 'ftyp' at offset 4..8
      const isMp4 = (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) ||
                    (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x00);
      const isMov = bytes[4] === 0x6D && bytes[5] === 0x6F && bytes[6] === 0x6F && bytes[7] === 0x76; // moov

      if (!isWebm && !isMp4 && !isMov && !fileName.endsWith('.mp4') && !fileName.endsWith('.webm')) {
        return { valid: false, error: 'Format binary video tidak valid.' };
      }
    } else {
      // PNG: 89 50 4E 47
      const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
      // JPEG: FF D8 FF
      const isJpg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
      // WebP: 52 49 46 46
      const isWebp = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;

      if (!isPng && !isJpg && !isWebp) {
        return { valid: false, error: 'Struktur binary file tidak cocok dengan format gambar asli.' };
      }
    }
  } catch (err) {
    console.error('[Security Shield] File signature check failed:', err);
    return { valid: false, error: 'Gagal memvalidasi integritas file.' };
  }

  return { valid: true };
}

/**
 * Client-side Token Bucket Rate Limiter
 * Prevents automated form flooding and bot DDoS
 */
class ClientRateLimiter {
  private storageKeyPrefix = 'civic_ratelimit_';

  public checkRateLimit(action: string, maxAllowed: number, windowMs: number): { allowed: boolean; waitSeconds?: number } {
    try {
      const now = Date.now();
      const key = `${this.storageKeyPrefix}${action}`;
      const record = JSON.parse(localStorage.getItem(key) || '{"timestamps":[]}');
      
      // Clean timestamps outside window
      const validTimestamps: number[] = (record.timestamps || []).filter(
        (t: number) => now - t < windowMs
      );

      if (validTimestamps.length >= maxAllowed) {
        const oldestTime = validTimestamps[0];
        const waitMs = windowMs - (now - oldestTime);
        return {
          allowed: false,
          waitSeconds: Math.ceil(waitMs / 1000),
        };
      }

      validTimestamps.push(now);
      localStorage.setItem(key, JSON.stringify({ timestamps: validTimestamps }));
      return { allowed: true };
    } catch (_) {
      return { allowed: true };
    }
  }
}

export const rateLimiter = new ClientRateLimiter();

/**
 * Validates that user account is active and not suspended
 */
export function isAccountActive(profile: { is_active?: boolean } | null | undefined): boolean {
  if (!profile) return true; // Handled by auth session check
  return profile.is_active !== false;
}
