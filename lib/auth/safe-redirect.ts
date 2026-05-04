export function safeRedirectPath(redirect: string | null | undefined): string {
  if (!redirect) return "/dashboard"
  if (!redirect.startsWith("/")) return "/dashboard"
  if (redirect.startsWith("//")) return "/dashboard"
  return redirect
}
