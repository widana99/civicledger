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
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

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
 * Validates file extension, MIME type, size, and header magic bytes
 */
export async function validateFileUpload(file: File): Promise<{ valid: boolean; error?: string }> {
  // 1. Check size limit
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'Ukuran file melebihi batas maksimum 5 MB.' };
  }

  // 2. Check MIME type
  if (!ALLOWED_IMAGE_MIMES.includes(file.type.toLowerCase())) {
    return { valid: false, error: 'Format file tidak diizinkan. Hanya JPG, PNG, atau WebP yang didukung.' };
  }

  // 3. Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExt = ALLOWED_IMAGE_EXTS.some(ext => fileName.endsWith(ext));
  if (!hasValidExt) {
    return { valid: false, error: 'Ekstensi file tidak valid.' };
  }

  // 4. Magic byte signature verification for JPG, PNG, WebP
  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // PNG: 89 50 4E 47
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
    // JPEG: FF D8 FF
    const isJpg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    // WebP: 52 49 46 46 ... 57 45 42 50
    const isWebp = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;

    if (!isPng && !isJpg && !isWebp) {
      return { valid: false, error: 'Struktur binary file tidak cocok dengan format gambar asli.' };
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
