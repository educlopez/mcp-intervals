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
