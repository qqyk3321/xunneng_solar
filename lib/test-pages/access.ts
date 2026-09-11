/** Archived experiments keep their local URLs but are never public deployments. */
export const TEST_ROUTE_ROOTS = [
  "/test-pages",
  "/auth-preview",
  "/home-preview",
  "/my-submissions-preview",
  "/antigua-calculator-preview",
  "/contact-preview",
  "/contact-submissions-preview",
  "/image-upload-preview",
  "/rich-text-preview",
] as const;

export function isTestRoute(pathname: string) {
  return TEST_ROUTE_ROOTS.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );
}

export function testsEnabled() {
  return process.env.NODE_ENV === "development";
}
