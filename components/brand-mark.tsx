/** Same local vector artwork as the browser tab icon; the parent link names the brand. */
export function BrandMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Tiny local SVG shared with Next's file-based favicon.
    <img
      src="/icon.svg"
      width={32}
      height={32}
      alt=""
      aria-hidden="true"
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        marginRight: 8,
      }}
    />
  );
}
