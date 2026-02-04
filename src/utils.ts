/**
 * Parse an Intervals task URL to extract the task ID.
 * Accepts URLs like: https://<subdomain>.intervalsonline.com/tasks/view/<taskId>
 * Also accepts a raw numeric string/number as fallback.
 */
export function parseTaskIdFromUrl(input: string): number {
  const match = input.match(/\/tasks\/view\/(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }

  const asNumber = parseInt(input, 10);
  if (!isNaN(asNumber) && asNumber > 0) {
    return asNumber;
  }

  throw new Error(
    `Cannot parse task ID from: "${input}". Expected a URL like https://<subdomain>.intervalsonline.com/tasks/view/<id> or a numeric ID.`
  );
}

// --- Image MIME type helpers ---

const IMAGE_EXTENSIONS: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
};

const IMAGE_MIME_TYPES = new Set(Object.values(IMAGE_EXTENSIONS));

export function getMimeTypeFromFilename(filename: string): string | null {
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
  return ext ? IMAGE_EXTENSIONS[ext] ?? null : null;
}

export function isImageMimeType(mimeType: string): boolean {
  return IMAGE_MIME_TYPES.has(mimeType);
}
