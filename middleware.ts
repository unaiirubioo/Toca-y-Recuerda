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

      // Bug reportado: tras borrar una cuenta a mano (DELETE directo en
      // SQL Editor, en vez de "Delete user" desde el panel de Supabase),
      // el access token sigue siendo válido como JWT hasta que caduca
      // por su cuenta (hasta 1 hora) aunque la fila ya no exista — y
      // eso rompía la creación de álbumes/NFC con errores de clave
      // foránea, porque owner_id ya no apuntaba a nadie real. Si no
      // existe el perfil, se cierra la sesión inmediatamente en la
      // siguiente petición en vez de esperar a que caduque el token.
      if (!profile) {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/login", request.url));
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