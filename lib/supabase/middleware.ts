import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { canAccessRoute } from "@/lib/permissions"
import type { UserRole } from "@/lib/types"

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const publicRoutes = ["/", "/auth/login", "/auth/sign-up", "/auth/sign-up-success", "/auth/error", "/access-denied"]
  const isPublicRoute = publicRoutes.some((route) => request.nextUrl.pathname === route)

  if (!user && !isPublicRoute && !request.nextUrl.pathname.startsWith("/auth")) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  if (user && request.nextUrl.pathname.startsWith("/auth")) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  if (user && !isPublicRoute) {
    const { data: userProfile } = await supabase.from("users").select("role").eq("email", user.email).single()

    const userRole = (userProfile?.role || "staff") as UserRole
    const pathname = request.nextUrl.pathname

    if (!canAccessRoute(userRole, pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = "/access-denied"
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
