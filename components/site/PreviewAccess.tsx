"use client";
import * as React from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { basePath } from "@/lib/site";
import { Page } from "./Page";

/** Legacy entry links may point only inside the public Hub. */
export function previewTarget(raw: string | null): string {
  if (!raw || !/^\/(?:hub|preview)(?:\/|$)/.test(raw) || /(?:\\|\/\/|%2f|%5c|%00|[\u0000-\u001f])/i.test(raw)) return "/hub/";
  const pathname = raw.split("?")[0]!;
  if (pathname.split("/").some(part => { try { return [".", ".."].includes(decodeURIComponent(part)); } catch { return true; } })) return "/hub/";
  const path = raw.replace(/^\/preview(?=\/|$)/, "/hub");
  return /^\/hub(?:\/preview)?\/?$/.test(path) ? "/hub/" : path;
}
export function PreviewAccess() {
  React.useEffect(() => {
    const target = previewTarget(new URLSearchParams(window.location.search).get("next"));
    window.location.replace(basePath === "/hub" ? target : basePath + target);
  }, []);
  return <Page><div className="mx-auto grid max-w-xl gap-4 py-20 text-center"><h1 className="font-display text-heading-xl text-ink">Opening the Hub</h1><p className="text-body-md text-ink-muted">The Hub is open for testing. No sign-in is needed.</p><ButtonLink href={basePath === "/hub" ? "/" : "/hub/"}>Open Hub</ButtonLink></div></Page>;
}
