import { parseVideoUrl } from './video-links';
/** Reparse saved input; never use an arbitrary URL as an iframe source. */
export function safeVideoEmbedUrl(input: string): string | null {
  const result = parseVideoUrl(input);
  if (!result.ok) return null;
  const video = result.video;
  if (video.provider === 'youtube') return `https://www.youtube-nocookie.com/embed/${video.id}`;
  const hash = new URL(video.url).pathname.split('/').filter(Boolean)[1];
  return `https://player.vimeo.com/video/${video.id}?${hash ? `h=${encodeURIComponent(hash)}&` : ''}dnt=1`;
}
