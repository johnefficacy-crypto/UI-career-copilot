/**
 * Eligibility Engine — Career Copilot
 *
 * Given a user's full profile and a post's criteria, determines whether
 * the user is eligible and returns a structured result with reasons.
 *
 * This is pure TypeScript — no Supabase imports. All data is passed in,
 * making it fully testable and reusable in both server actions and API routes.
 */

// ─── Input types ─────────────────────────────────────────────────────────────

export type UserProfile = {
  id: string
  dob: string | null
  date_of_birth: string | null
  category: string | null           // general | obc | sc | st | ews
  pwbd_status: string | null
  ex_serviceman: boolean
  govt_employee: boolean
  domicile_state: string | null
  nationality: string | null
}

export type UserEducation = {
  level: string                     // graduate | postgraduate | phd | diploma | 12th | 10th
  degree: string | null
  stream: string | null
  percentage: number | null
  cgpa: number | null
  is_completed: boolean
}

export type UserExamAttempts = {
  recruitment_id: string
  attempts_used: number
}

export type AgeCriteria = {
  min_age: number | null
  max_age: number | null
  cutoff_date: string | null
}

export type EducationCriteria = {
  min_qualification_level: string | null
  min_percentage: number | null
  allowed_disciplines: Record<string, unknown> | null
}

export type AttemptLimit = {
  category: string | null           // null means applies to all categories
  max_attempts: number | null
}

export type PostCriteria = {
  post_id: string
  recruitment_id: string
  age_criteria: AgeCriteria | null
  education_criteria: EducationCriteria | null
  attempt_limits: AttemptLimit[]
}

// ─── Output types ────────────────────────────────────────────────────────────

export type EligibilityCheckResult = {
  is_eligible: boolean
  checks: EligibilityCheck[]
  fail_reasons: string[]
}

export type EligibilityCheck = {
  rule: string
  passed: boolean
  detail: string
}

// ─── Education level ordering ─────────────────────────────────────────────────

const EDU_LEVEL_ORDER: Record<string, number> = {
  "10th":         1,
  "12th":         2,
  diploma:        3,
  graduate:       4,
  postgraduate:   5,
  phd:            6,
}

function eduLevelRank(level: string): number {
  return EDU_LEVEL_ORDER[level.toLowerCase()] ?? 0
}

// ─── Age relaxation rules (GoI standard) ─────────────────────────────────────

function getAgeRelaxationYears(profile: UserProfile): number {
  const cat = profile.category?.toLowerCase() ?? "general"
  let relaxation = 0

  if (cat === "obc")        relaxation = 3
  if (cat === "sc" || cat === "st") relaxation = 5
  if (profile.pwbd_status && profile.pwbd_status !== "none") {
    relaxation += cat === "general" ? 10 : cat === "obc" ? 13 : 15
  }
  if (profile.ex_serviceman) relaxation = Math.max(relaxation, 3)

  return relaxation
}

// ─── Core engine ─────────────────────────────────────────────────────────────

export function checkEligibility(
  profile: UserProfile,
  education: UserEducation[],
  examAttempts: UserExamAttempts[],
  criteria: PostCriteria
): EligibilityCheckResult {
  const checks: EligibilityCheck[] = []

  // ── 1. Age check ─────────────────────────────────────────────────────────
  if (criteria.age_criteria) {
    const ac = criteria.age_criteria
    const dobStr = profile.dob ?? profile.date_of_birth
    const cutoff = ac.cutoff_date ? new Date(ac.cutoff_date) : new Date()

    if (!dobStr) {
      checks.push({
        rule: "age",
        passed: false,
        detail: "Date of birth not provided — cannot verify age eligibility.",
      })
    } else {
      const dob = new Date(dobStr)
      const ageAtCutoff = Math.floor(
        (cutoff.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      )
      const relaxation = getAgeRelaxationYears(profile)
      const effectiveMax = (ac.max_age ?? Infinity) + relaxation

      const minOk = ac.min_age === null || ageAtCutoff >= ac.min_age
      const maxOk = ac.max_age === null || ageAtCutoff <= effectiveMax

      if (!minOk) {
        checks.push({
          rule: "age",
          passed: false,
          detail: `Age ${ageAtCutoff} is below minimum age ${ac.min_age} as of ${ac.cutoff_date ?? "today"}.`,
        })
      } else if (!maxOk) {
        checks.push({
          rule: "age",
          passed: false,
          detail: `Age ${ageAtCutoff} exceeds maximum ${ac.max_age} (+ ${relaxation} yrs relaxation = ${effectiveMax}) as of ${ac.cutoff_date ?? "today"}.`,
        })
      } else {
        checks.push({
          rule: "age",
          passed: true,
          detail: `Age ${ageAtCutoff} is within range ${ac.min_age ?? "—"}–${effectiveMax}${relaxation > 0 ? ` (includes ${relaxation} yr relaxation)` : ""}.`,
        })
      }
    }
  }

  // ── 2. Education check ───────────────────────────────────────────────────
  if (criteria.education_criteria) {
    const ec = criteria.education_criteria
    const completedEdu = education.filter((e) => e.is_completed)

    if (completedEdu.length === 0) {
      checks.push({
        rule: "education",
        passed: false,
        detail: "No completed education records found.",
      })
    } else {
      const highestEdu = completedEdu.sort(
        (a, b) => eduLevelRank(b.level) - eduLevelRank(a.level)
      )[0]

      const requiredRank = ec.min_qualification_level
        ? eduLevelRank(ec.min_qualification_level)
        : 0
      const userRank = eduLevelRank(highestEdu.level)
      const levelOk = userRank >= requiredRank

      // Percentage / CGPA check
      let marksOk = true
      let marksDetail = ""
      if (ec.min_percentage) {
        const userPct = highestEdu.percentage
          ?? (highestEdu.cgpa ? highestEdu.cgpa * 10 : null)

        if (userPct === null) {
          marksOk = false
          marksDetail = `Minimum ${ec.min_percentage}% required but marks not recorded.`
        } else if (userPct < ec.min_percentage) {
          marksOk = false
          marksDetail = `Score ${userPct}% is below the required ${ec.min_percentage}%.`
        } else {
          marksDetail = `Score ${userPct}% meets the required ${ec.min_percentage}%.`
        }
      }

      // Discipline check
      let disciplineOk = true
      let disciplineDetail = ""
      if (ec.allowed_disciplines && Object.keys(ec.allowed_disciplines).length > 0) {
        const allowed = ec.allowed_disciplines as Record<string, string[]>
        const userStream = highestEdu.stream?.toLowerCase() ?? ""
        const userDegree = highestEdu.degree?.toLowerCase() ?? ""

        const allAllowed = Object.values(allowed).flat().map((d) => d.toLowerCase())
        const matched = allAllowed.some(
          (d) => userStream.includes(d) || userDegree.includes(d)
        )

        if (!matched) {
          disciplineOk = false
          disciplineDetail = `Your stream/degree (${highestEdu.stream ?? highestEdu.degree ?? "unknown"}) is not in the allowed disciplines.`
        } else {
          disciplineDetail = `Discipline ${highestEdu.stream ?? highestEdu.degree} is accepted.`
        }
      }

      const passed = levelOk && marksOk && disciplineOk
      const details = [
        levelOk
          ? `Education level ${highestEdu.level} meets requirement of ${ec.min_qualification_level ?? "any"}.`
          : `Education level ${highestEdu.level} is below required ${ec.min_qualification_level}.`,
        marksDetail,
        disciplineDetail,
      ].filter(Boolean).join(" ")

      checks.push({ rule: "education", passed, detail: details })
    }
  }

  // ── 3. Attempt limit check ───────────────────────────────────────────────
  if (criteria.attempt_limits.length > 0) {
    const userCategory = profile.category?.toLowerCase() ?? "general"
    const userAttemptRecord = examAttempts.find(
      (a) => a.recruitment_id === criteria.recruitment_id
    )
    const attemptsUsed = userAttemptRecord?.attempts_used ?? 0

    // Find the limit that applies to this user's category
    const applicableLimit =
      criteria.attempt_limits.find(
        (l) => l.category?.toLowerCase() === userCategory
      ) ??
      criteria.attempt_limits.find((l) => l.category === null) ??
      null

    if (applicableLimit?.max_attempts !== null && applicableLimit !== null) {
      const maxAttempts = applicableLimit.max_attempts!
      const passed = attemptsUsed < maxAttempts

      checks.push({
        rule: "attempts",
        passed,
        detail: passed
          ? `${attemptsUsed} of ${maxAttempts} attempts used.`
          : `Attempt limit reached: ${attemptsUsed}/${maxAttempts} for category ${userCategory}.`,
      })
    }
  }

  // ── 4. Nationality check (basic) ─────────────────────────────────────────
  {
    const nat = profile.nationality?.toLowerCase() ?? "indian"
    const passed = nat === "indian"
    checks.push({
      rule: "nationality",
      passed,
      detail: passed ? "Indian nationality confirmed." : "Only Indian nationals are eligible.",
    })
  }

  // ── Aggregate result ─────────────────────────────────────────────────────
  const failedChecks = checks.filter((c) => !c.passed)
  return {
    is_eligible: failedChecks.length === 0,
    checks,
    fail_reasons: failedChecks.map((c) => c.detail),
  }
}

// ─── Batch engine — run against multiple posts ────────────────────────────────

export type BatchEligibilityResult = {
  post_id: string
  recruitment_id: string
  result: EligibilityCheckResult
}

export function checkEligibilityBatch(
  profile: UserProfile,
  education: UserEducation[],
  examAttempts: UserExamAttempts[],
  postCriteriaList: PostCriteria[]
): BatchEligibilityResult[] {
  return postCriteriaList.map((criteria) => ({
    post_id: criteria.post_id,
    recruitment_id: criteria.recruitment_id,
    result: checkEligibility(profile, education, examAttempts, criteria),
  }))
}