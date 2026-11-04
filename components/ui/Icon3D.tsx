import { cx } from "@ds/components";
import type { Icon3DName } from "@/lib/icons3d";
import { asset } from "@/lib/site";

/** One 3D icon (decorative by default; give it a label when it carries meaning alone). */
export function Icon3D({ name, label, className }: { name: Icon3DName; label?: string; className?: string }) {
  return <img src={asset(`img/icons3d/${name}.png`)} alt={label ?? ""} aria-hidden={label ? undefined : true} width={128} height={128} loading="lazy" decoding="async"
    className={cx("size-8 shrink-0 select-none object-contain", className)} />;
}
