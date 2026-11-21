import { describe, expect, it } from 'vitest';
import { safeVideoEmbedUrl } from './video-embed';
import { portfolioItems, encodeVideoSample } from './video-links';
describe('safe player URLs', () => {
  it('generates only YouTube privacy host', () => expect(safeVideoEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'));
  it('preserves Vimeo unlisted hash', () => expect(safeVideoEmbedUrl('https://vimeo.com/76979871/a1b2c3d4')).toBe('https://player.vimeo.com/video/76979871?h=a1b2c3d4&dnt=1'));
  it('preserves the player URL hash too', () => expect(safeVideoEmbedUrl('https://player.vimeo.com/video/76979871?h=a1b2c3d4')).toBe('https://player.vimeo.com/video/76979871?h=a1b2c3d4&dnt=1'));
  it.each(['https://player.vimeo.com/video/76979871?h=bad', 'https://evil.com/x', 'javascript:alert(1)', 'https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ'])('rejects %s', url => expect(safeVideoEmbedUrl(url)).toBeNull());
  it('indexes a mixed gallery in displayed order', () => expect(portfolioItems(['/media/a', encodeVideoSample({url:'https://youtu.be/dQw4w9WgXcQ'}), '/media/b'], true).map(x => x.photoIndex)).toEqual([0,1,2]));
});
