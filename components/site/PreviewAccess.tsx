"use client";
import * as React from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { hubTarget } from "@/lib/hub-target";
import { data } from "@/lib/data";
import { basePath } from "@/lib/site";
import { Page } from "./Page";

/** Legacy entry links may point only inside the public Hub. */
export { hubTarget as previewTarget } from "@/lib/hub-target";

export function PreviewAccess() {
  React.useEffect(() => {
    let target = hubTarget(new URLSearchParams(window.location.search).get("next"));
    if (data.kind === "sample" && basePath !== "/hub" && target !== "/hub/") target = target.replace(/^\/hub(?=\/)/, "");
    window.location.replace(basePath === "/hub" ? target : basePath + target);
  }, []);
  return <Page><div className="mx-auto grid max-w-xl gap-4 py-20 text-center"><h1 className="font-display text-heading-xl text-ink">Opening the Hub</h1><p className="text-body-md text-ink-muted">The Hub is open for testing. No sign-in is needed.</p><ButtonLink href={basePath === "/hub" ? "/" : "/hub/"}>Open Hub</ButtonLink></div></Page>;
}
