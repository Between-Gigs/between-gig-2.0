import type { NavigationGateway } from "./model";
/** Setup returns the caller's state; the editor must reload the selected subject instead. */
export async function setupSelectedNavigation(gateway: Pick<NavigationGateway, "setup" | "snapshot">, userId: string, isCurrent: () => boolean) {
  await gateway.setup();
  if (!isCurrent()) return undefined;
  const selected = await gateway.snapshot(userId);
  return isCurrent() ? selected : undefined;
}
