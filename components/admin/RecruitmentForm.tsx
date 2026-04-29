"use client"

import { AdminInput, AdminSelect } from "@/components/admin/ui"

const STATUSES = ["upcoming", "open", "closed", "draft"] as const

type RecruitmentFormValues = {
  id?: string
  organization_id?: string | null
  name?: string | null
  year?: number | null
  status?: string | null
  notification_date?: string | null
  apply_start_date?: string | null
  apply_end_date?: string | null
}

interface Props {
  organizations: Array<{ id: string; name: string; type: string }>
  action: (formData: FormData) => Promise<void>
  defaultValues?: RecruitmentFormValues
  isEdit?: boolean
}

export function RecruitmentForm({ organizations, action, defaultValues, isEdit }: Props) {
  const dv = defaultValues ?? {}

  const orgOptions = organizations.map(o => ({ value: o.id, label: `${o.name} (${o.type})` }))
  const statusOptions = STATUSES.map(s => ({ value: s, label: s }))

  return (
    <form action={action} className="flex flex-col gap-5">
      {isEdit && <input type="hidden" name="id" value={dv.id} />}

      <AdminSelect
        label="Organization"
        name="organization_id"
        required
        defaultValue={dv.organization_id ?? ""}
        options={orgOptions}
        placeholder="Select organization"
      />

      <AdminInput
        label="Recruitment name"
        name="name"
        type="text"
        required
        defaultValue={dv.name ?? ""}
        placeholder="SEBI Grade A Officer"
        hint="e.g. SEBI Grade A Officer 2025"
      />

      <div className="grid grid-cols-2 gap-4">
        <AdminInput
          label="Year"
          name="year"
          type="number"
          required
          defaultValue={dv.year ?? new Date().getFullYear()}
        />
        <AdminSelect
          label="Status"
          name="status"
          defaultValue={dv.status ?? "upcoming"}
          options={statusOptions}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AdminInput
          label="Notification date"
          name="notification_date"
          type="date"
          defaultValue={dv.notification_date ?? ""}
        />
        <AdminInput
          label="Apply start"
          name="apply_start_date"
          type="date"
          defaultValue={dv.apply_start_date ?? ""}
        />
        <AdminInput
          label="Apply end (deadline)"
          name="apply_end_date"
          type="date"
          defaultValue={dv.apply_end_date ?? ""}
        />
      </div>

      <button
        type="submit"
        className="w-full py-2.5 rounded-lg bg-[#e8d5a3] text-[#0a0a0a] text-sm font-medium hover:bg-[#f0dfa8] transition-colors"
      >
        {isEdit ? "Save changes" : "Create recruitment"}
      </button>
    </form>
  )
}