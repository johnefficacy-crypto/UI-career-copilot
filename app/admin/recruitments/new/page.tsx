import { getAllOrganizations } from "@/lib/db/admin"
import { adminCreateRecruitment } from "@/actions/admin"
import { RecruitmentForm } from "@/components/admin/RecruitmentForm"

export default async function NewRecruitmentPage() {
  const organizations = await getAllOrganizations()

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-white text-2xl font-medium mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
        Add recruitment
      </h1>
      <p className="text-white/40 text-sm mb-8">Fill in the basic details. You can add posts and criteria after saving.</p>

      <RecruitmentForm organizations={organizations} action={adminCreateRecruitment} />
    </div>
  )
}