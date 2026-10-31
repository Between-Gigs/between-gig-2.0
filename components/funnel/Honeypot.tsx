import type * as React from "react";

/**
 * A field people never see or reach. Bots that fill in every field fill it too, and the server drops what they send
 * (Company OS decision N-08). Read it on submit with `trapValue(e)`.
 */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="sr-only">
      <label>Website<input name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" /></label>
    </div>
  );
}

/** What a bot typed into the honeypot, or "" for a person. */
export const trapValue = (e: React.FormEvent<HTMLFormElement>) => String(new FormData(e.currentTarget).get("website") ?? "");
