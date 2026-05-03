import { describe, expect, it } from "vitest"
import { checkEligibility, type PostCriteria, type UserEducation, type UserProfile } from "@/lib/eligibility/engine"

const profile: UserProfile = { id: "u1", dob: "2000-01-01", date_of_birth: null, category: "general", pwbd_status: null, ex_serviceman: false, service_years: null, govt_employee: false, domicile_state: "Delhi", nationality: "Indian" }
const education: UserEducation[] = [{ level: "graduate", degree: "BA", stream: "Arts", percentage: 65, cgpa: null, is_completed: true }]
const baseCriteria: PostCriteria = { post_id: "p1", recruitment_id: "r1", age_criteria: null, education_criteria: null, attempt_limits: [], org_state: null }

describe("eligibility exam credential gating", () => {
  it("passes when user has all required exam credentials", () => {
    const result = checkEligibility(profile, education, [], [{ exam_key: "gate_cse" }, { exam_key: "net" }], { ...baseCriteria, required_exam_keys: ["gate_cse", "net"] })
    expect(result.checks.find((c) => c.rule === "exam_credential")?.passed).toBe(true)
  })
  it("fails when a required exam credential is missing", () => {
    const result = checkEligibility(profile, education, [], [{ exam_key: "gate_cse" }], { ...baseCriteria, required_exam_keys: ["gate_cse", "net"] })
    expect(result.is_eligible).toBe(false)
    expect(result.checks.find((c) => c.rule === "exam_credential")?.passed).toBe(false)
  })
  it("does not add credential blocker when no required exam credentials", () => {
    const result = checkEligibility(profile, education, [], [{ exam_key: "gate_cse" }], { ...baseCriteria, required_exam_keys: [] })
    expect(result.checks.some((c) => c.rule === "exam_credential")).toBe(false)
  })
})
