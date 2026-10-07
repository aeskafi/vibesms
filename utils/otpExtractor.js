/**
 * @fileoverview Smart OTP & Verification Code Extractor.
 * Detects 4-8 digit numeric or alphanumeric verification codes from SMS messages.
 *
 * Curated by Arham Eskafi (https://arham.dev) - Walk Cook Live
 */

/**
 * Extracts verification code from SMS message text.
 * @param {string} text - The SMS body.
 * @returns {{ code: string | null, confidence: string }}
 */
export function extractOtp(text) {
  if (!text || typeof text !== "string") {
    return { code: null, confidence: "none" };
  }

  // 1. Google / Discord / Service prefix format: G-123456 or C-123456
  const prefixMatch = text.match(/\b([A-Z]-\d{4,8})\b/i);
  if (prefixMatch) {
    return { code: prefixMatch[1].trim(), confidence: "high" };
  }

  // 2. Hyphenated split code: 123-456
  const hyphenatedMatch = text.match(/\b(\d{3}-\d{3})\b/);
  if (hyphenatedMatch) {
    return { code: hyphenatedMatch[1].trim(), confidence: "high" };
  }

  // 3. Keyword followed by 4-8 digits: "code is 482019", "OTP: 9821", "verification code: 482019"
  const keywordRegex = /(?:code|otp|verification|pin|passcode|token|secret|pass|código)\b[^\d\n\r]{0,30}?\b(\d{4,8})\b/i;
  const keywordMatch = text.match(keywordRegex);
  if (keywordMatch && keywordMatch[1]) {
    return { code: keywordMatch[1].trim(), confidence: "high" };
  }

  // 4. Isolated 4-8 digit numbers
  const isolatedNumberRegex = /\b(\d{4,8})\b/g;
  const matches = [...text.matchAll(isolatedNumberRegex)];

  // Filter out years like 2024, 2025, 2026 unless it's the only number
  const nonYears = matches.filter((m) => {
    const val = parseInt(m[1], 10);
    return val < 1970 || val > 2099;
  });

  if (nonYears.length > 0) {
    return { code: nonYears[0][1], confidence: nonYears.length === 1 ? "medium" : "low" };
  }

  if (matches.length === 1) {
    return { code: matches[0][1], confidence: "medium" };
  }

  return { code: null, confidence: "none" };
}
