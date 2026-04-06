import { saveEducation } from "./action"
import DegreesForm from "./DegreesForm"
import { requireUser } from "@/utils/supabase/requireUser"

export default async function EducationPage() {
  await requireUser()

  return (
    <div style={{ padding: 40 }}>
      <h1>Education Details</h1>

      <form action={saveEducation}>
        <h2>10th</h2>
        <input name="10_board" placeholder="Board" required />
        <br /><br />
        <input name="10_percentage" placeholder="Percentage" required />
        <br /><br />
        <input name="10_year" placeholder="Passing Year" required />
        <br /><br />

        <h2>12th</h2>
        <input name="12_board" placeholder="Board" required />
        <br /><br />
        <input name="12_percentage" placeholder="Percentage" required />
        <br /><br />
        <input name="12_year" placeholder="Passing Year" required />
        <br /><br />

        <DegreesForm />

        <br /><br />
        <button type="submit">Next → Certifications</button>
      </form>
    </div>
  )
}