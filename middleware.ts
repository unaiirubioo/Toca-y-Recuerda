import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return response;
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Antes esto solo refrescaba la sesión: el botón "Bloquear" del
    // admin cambiaba la base de datos pero NUNCA se comprobaba en
    // ningún sitio, así que un usuario bloqueado podía seguir usando
    // la cuenta con total normalidad (spec: "el botón no funciona" —
    // tenían razón, no hacía nada).
    const publicPath =
      pathname === "/cuenta-bloqueada" ||
      pathname === "/login" ||
      pathname.startsWith("/auth/") ||
      pathname.startsWith("/n/") ||
      pathname.startsWith("/album/") ||
      pathname.startsWith("/api/webhooks");

    if (user && !publicPath) {
      const { data: profile } = await supabase.from("profiles").select("is_blocked").eq("id", user.id).maybeSingle();
      if ((profile as any)?.is_blocked) {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/cuenta-bloqueada", request.url));
      }
    }
  } catch (error) {
    console.error('Middleware execution error ignored:', error);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};