"use client";
import { useSyncExternalStore } from "react";
import { defaultProfileTemplate, readProfileTemplate, subscribeProfileTemplate } from "./template";

export function useProfileTemplate() {
  return useSyncExternalStore(subscribeProfileTemplate, readProfileTemplate, () => defaultProfileTemplate);
}
