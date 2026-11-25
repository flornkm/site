// A short fingerprint of a gift's front, put in its preview URL: the preview changes only
// when the front does, so crawlers and the CDN can keep it for good under that URL.
export function previewVersion(cover: { paper: string; ink: string; title: string }): string {
  let hash = 5381;
  for (const char of `${cover.paper}|${cover.ink}|${cover.title}`) {
    hash = ((hash << 5) + hash + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}
