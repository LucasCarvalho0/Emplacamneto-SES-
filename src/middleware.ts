import { NextResponse, type NextRequest } from "next/server";

// Barreira rápida: sem cookie de sessão, nem tenta renderizar. A validação real (sessão, perfil,
// conta ativa) é feita no servidor, em cada página, ação e rota de API.
export function middleware(req: NextRequest) {
  if (req.cookies.has("ecc_session")) return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin")) return NextResponse.redirect(new URL("/login", req.url));
  if (pathname.startsWith("/operador") && !pathname.startsWith("/operador/login")) {
    return NextResponse.redirect(new URL("/operador/login", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/operador/:path*"] };
