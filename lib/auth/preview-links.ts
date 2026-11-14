/** Leave the isolated Hub for real account entry; Pages previews use the verified test application. */
export function realAccountLinks(basePath: string) {
  const origin = basePath === "/hub" ? "" : "https://test.between-gigs.com";
  return { join: `${origin}/join/`, login: `${origin}/login/` };
}
