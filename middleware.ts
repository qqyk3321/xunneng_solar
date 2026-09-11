import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase-auth/middleware";
import { isTestRoute, testsEnabled } from "@/lib/test-pages/access";

export async function middleware(request: NextRequest) {
  // Block pages AND child APIs/callbacks before touching sessions or private data.
  if (isTestRoute(request.nextUrl.pathname) && !testsEnabled()) {
    return new NextResponse("Not found", {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
  const pathname = request.nextUrl.pathname;
  if (
    pathname !== "/auth-preview" &&
    !pathname.startsWith("/auth-preview/") &&
    pathname !== "/home-preview" &&
    pathname !== "/my-submissions-preview"
  )
    return NextResponse.next();
  const response = await updateSupabaseSession(request);
  if (request.nextUrl.pathname === "/my-submissions-preview") {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
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
  ],
};
