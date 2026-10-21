import { cx, type ButtonSize, type ButtonVariant } from "@ds/components";
import { buttonSizes, buttonVariants } from "@ds/components/Button";
import Link from "next/link";
import type * as React from "react";

/**
 * A link that looks like the design system's Button, for navigation. Requested upstream as Button's
 * `asChild` / `href` (docs/design-system-requests.md); until then it reuses Button's own class maps.
 */
export function ButtonLink({ href, variant = "secondary", size = "md", iconStart, iconEnd, fullWidth, className, children, ...rest }: {
  href: string; variant?: ButtonVariant; size?: ButtonSize; iconStart?: React.ReactNode; iconEnd?: React.ReactNode; fullWidth?: boolean;
} & Omit<React.ComponentProps<typeof Link>, "href">) {
  return (
    <Link href={href}
      className={cx("inline-flex shrink-0 items-center justify-center rounded-md font-sans whitespace-nowrap no-underline select-none",
        "transition-colors duration-fast ease-standard [&_svg]:size-4 [&_svg]:shrink-0",
        buttonVariants[variant], buttonSizes[size], fullWidth && "w-full", className)}
      {...rest}>
      {iconStart}{children}{iconEnd}
    </Link>
  );
}
