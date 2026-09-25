import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getCachedUserStatus, setCachedUserStatus } from "@/lib/security/user-status-cache";

// Refresca el token de sesión de Supabase en cada petición para que las
// Server Actions y Server Components siempre tengan una sesión válida.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set(name, "", options);
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/registro") ||
    pathname.startsWith("/recuperar");
  const isProtectedPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/albumes") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/cuenta");
  const isAdminPage = pathname.startsWith("/admin");

  // Esta redirección es solo una capa de UX para no mostrar pantallas que
  // no tocan; la protección real de los datos vive en las políticas RLS
  // de Supabase (nunca confiar únicamente en el middleware/frontend).
  if (!data.user && (isProtectedPage || isAdminPage)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (data.user && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (data.user && (isProtectedPage || isAdminPage)) {
    let status = getCachedUserStatus(data.user.id);
    if (!status) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_blocked")
        .eq("id", data.user.id)
        .single();
      const p = profile as any;
      status = { role: p?.role ?? "user", isBlocked: !!p?.is_blocked };
      setCachedUserStatus(data.user.id, status.role, status.isBlocked);
    }

    if (status.isBlocked) {
      return NextResponse.redirect(new URL("/cuenta-bloqueada", request.url));
    }
    if (isAdminPage && status.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
