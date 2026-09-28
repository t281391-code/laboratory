import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, validateSession } from "@/server/auth";
export async function proxy(request: NextRequest) {
  const session = await validateSession(request.cookies.get(COOKIE)?.value);
  if (!session) {
    const response = NextResponse.redirect(new URL("/login/", request.url));
    response.cookies.delete(COOKIE); return response;
  }
  if (request.nextUrl.pathname.startsWith("/admin/") && session.user.role !== "ADMIN") return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}
export const config = { matcher: ["/", "/samples/:path*", "/tests/:path*", "/forms/:path*", "/reports/:path*", "/equipment/:path*", "/standards/:path*", "/sleepers/:path*", "/secret/:path*", "/small/:path*", "/sample-registry/:path*", "/admin/:path*"] };
