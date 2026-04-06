import { requireProfile } from "@/utils/supabase/requireProfile"
import { logout } from "./actions"

export default async function Dashboard() {
  const profile = await requireProfile()

  return (
    <div style={{ padding: 40 }}>
      <h1>Dashboard</h1>

      <form action={logout}>
        <button type="submit">Logout</button>
      </form>

      <p>Welcome {profile.full_name} 🎉</p>

      <pre>{JSON.stringify(profile, null, 2)}</pre>
    </div>
  )
}