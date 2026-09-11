export const IMAGE_LAB_BUCKET = "image-compression-lab";
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40_000_000;
export const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ImageMime = (typeof IMAGE_MIMES)[number];
export const PRESETS = [
  { id: "high", label: "高清", quality: 0.9, maxEdge: 3200 },
  { id: "balanced", label: "均衡", quality: 0.75, maxEdge: 1920 },
  { id: "small", label: "省流量", quality: 0.5, maxEdge: 1280 },
] as const;

export function detectImageMime(bytes: Uint8Array): ImageMime | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return "image/jpeg";
  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)
  )
    return "image/png";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}

export function imageDimensions(
  width: number,
  height: number,
  maxEdge?: number,
) {
  const scale = maxEdge ? Math.min(1, maxEdge / Math.max(width, height)) : 1;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
export function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(2)} MB`
    : `${(bytes / 1024).toFixed(1)} KB`;
}
