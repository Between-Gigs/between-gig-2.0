import { cx } from "@ds/components/cx";
import { asset } from "@/lib/site";

/** The night version of an image sits beside it: "hero.jpg" → "hero-night.jpg" (graded from the original). */
export const nightOf = (src: string) => src.replace(/(\.[a-z0-9]+)$/i, "-night$1");

/**
 * A background or decorative image with its night grade for the dark theme, instead of fading the day photo
 * under an overlay. Both are lazy, so the hidden one only loads if the theme switches to it.
 */
export function ThemedImg({ src, darkSrc, className, alt = "", ...rest }: Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & { src: string; darkSrc?: string }) {
  return (
    <>
      <img src={asset(src)} alt={alt} loading="lazy" decoding="async" {...rest} className={cx(className, "dark:hidden")} />
      <img src={asset(darkSrc ?? nightOf(src))} alt={alt} loading="lazy" decoding="async" {...rest} className={cx(className, "hidden dark:block")} />
    </>
  );
}
