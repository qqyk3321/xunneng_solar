// Intentionally not an arbitrary URL: do not introduce an open redirect.
export function previewReturnPath(value: string | string[] | undefined) {
  return value === "/home-preview" || value === "/my-submissions-preview"
    ? value
    : null;
}
