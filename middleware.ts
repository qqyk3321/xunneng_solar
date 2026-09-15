import { NextResponse, type NextRequest } from "next/server";
import {
  isTestRoute,
  isRetiredRoute,
  testsEnabled,
} from "@/lib/test-pages/access";

export async function middleware(request: NextRequest) {
  // Block pages AND child APIs/callbacks before touching sessions or private data.
  if (
    isRetiredRoute(request.nextUrl.pathname) ||
    (isTestRoute(request.nextUrl.pathname) && !testsEnabled())
  ) {
    return new NextResponse("Not found", {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
  return NextResponse.next();
}

export const config = {
  // Literal patterns are required by Next.js static matcher analysis.
  // Public /api/contact and the existing consultation result route are NOT tests.
  matcher: [
    "/test-pages/:path*",
    "/auth-preview/:path*",
    "/home-preview/:path*",
    "/my-submissions-preview/:path*",
    "/antigua-calculator-preview/:path*",
    "/contact-preview/:path*",
    "/contact-submissions-preview/:path*",
    "/image-upload-preview/:path*",
    "/rich-text-preview/:path*",
    "/submission-preview-test/:path*",
  ],
};
