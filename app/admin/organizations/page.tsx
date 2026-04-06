import { getAllOrganizations } from "@/lib/db/admin"
import Link from "next/link"

type Organization = Awaited<ReturnType<typeof getAllOrganizations>>[number]

export default async function OrganizationsPage() {
  const orgs = await getAllOrganizations()

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-medium text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Organizations
          </h1>
          <p className="mt-0.5 text-sm text-white/40">{orgs.length} registered</p>
        </div>

        <Link
          href="/admin/organizations/new"
          className="rounded-lg bg-[#e8d5a3] px-4 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-[#f0dfa8]"
        >
          + Add organization
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {orgs.map((org: Organization) => (
          <div
            key={org.id}
            className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-3"
          >
            <div>
              <p className="text-sm font-medium text-white">{org.name}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-xs text-white/35">{org.type}</span>
                {org.state && (
                  <>
                    <span className="text-xs text-white/20">·</span>
                    <span className="text-xs text-white/35">{org.state}</span>
                  </>
                )}
              </div>
            </div>

            <Link
              href={`/admin/organizations/${org.id}/edit`}
              className="text-xs text-white/40 transition-colors hover:text-white"
            >
              Edit
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}