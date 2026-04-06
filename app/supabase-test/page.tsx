import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()   // ⭐ THIS IS THE FIX
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase.auth.getSession()

  return (
    <div style={{ padding: 40 }}>
      <h1>Supabase Connection Test</h1>
      <pre>{JSON.stringify({ data, error }, null, 2)}</pre>
    </div>
  )
}