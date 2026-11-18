"use client";

import * as React from "react";
import type { EmailTemplate } from "@/lib/data";
import { apiSource } from "@/lib/data/api";
import type { ManualEmailName, ManualEmailRequest, ManualPreview, Receipt, ReleaseAction, ReleaseStatus } from "@/lib/email-manual";
import { basePath } from "@/lib/site";

type RequestMethods = {
  manualStatus: { input: EmailTemplate; output: ReleaseStatus };
  releaseVersion: {
    input: { name: EmailTemplate; action: ReleaseAction; templateId: string; sourceHash: string; releaseId?: string };
    output: ReleaseStatus;
  };
  previewReal: { input: { name: ManualEmailName; recipient: string }; output: ManualPreview };
  sendReal: { input: { name: ManualEmailName } & ManualEmailRequest; output: Receipt };
  realReceipt: { input: { name: ManualEmailName; requestId: string }; output: Receipt };
};

export class ManualEmailApiError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}

export async function requestManualEmail<M extends keyof RequestMethods>(
  method: M,
  input: RequestMethods[M]["input"],
  signal: AbortSignal,
): Promise<RequestMethods[M]["output"]> {
  const token = await apiSource.token();
  signal.throwIfAborted();
  if (!token) throw new ManualEmailApiError(401, "owner_sign_in_required");
  const response = await fetch(`${basePath}/api/emails/${method}/`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ args: [input] }),
    cache: "no-store",
    signal,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || !Object.hasOwn(body, "result")) {
    throw new ManualEmailApiError(response.status, typeof body?.error === "string" ? body.error : "unavailable");
  }
  return body.result;
}

/** Scoped to one mounted owner view. Aborting a fetch never establishes that the server did not act. */
export function useOwnerEmailOperation() {
  const active = React.useRef<AbortController | null>(null);
  const mounted = React.useRef(false);
  const [busy, setBusy] = React.useState(false);
  React.useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.abort();
      active.current = null;
    };
  }, []);
  const run = React.useCallback(async (operation: (signal: AbortSignal) => Promise<void>) => {
    if (!mounted.current || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    try {
      await operation(controller.signal);
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
      }
    }
  }, []);
  return { busy, run };
}
