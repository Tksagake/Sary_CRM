import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Fetch user role from Supabase (ensure you store role info in user metadata)
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const userRole = data.role;

  // Redirect based on role
  if (userRole === "admin" && req.nextUrl.pathname.startsWith("/agent")) {
    return NextResponse.redirect(new URL("/dashboard/admin", req.url));
  }

  if (userRole === "agent" && req.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/dashboard/agent", req.url));
  }

  return res;
}

// Define protected routes
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/agent/:path*"],
};
