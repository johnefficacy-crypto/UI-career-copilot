 **complete project handover document** 
 # CAREER COPILOT — FULL TECHNICAL HANDOFF DOCUMENT

---

# 1. PRODUCT VISION

## Product name

Career Copilot

## Mission

Build an AI-powered SaaS platform that helps Indian students and government-semigovernment,psu, banking, regulatory bodies, judicial etc job aspirants choose careers, prepare for exams, build study plans, and track progress. also in later provide them courses marketplace like udemy to choose.

This is **not just an exam prep site** — it is a **career decision + execution platform**.

## Target users

Primary audience:

* Government exam aspirants (SEBI, RBI, UPSC, SSC etc.)
* College students confused about career direction
* Early professionals wanting career switch

## Core value proposition

Most aspirants struggle with:

* Choosing exam vs job path
* Planning study schedules
* Staying consistent
* Knowing what to study next

Career Copilot will become an **AI mentor + planner + tracker**.

---

# 2. CURRENT DEVELOPMENT STAGE

We are in **Phase 1 — Foundation & Onboarding**

Completed:

* Next.js app initialized
* Supabase integrated
* Authentication working
* Profiles database schema created
* Multi-step onboarding flow implemented
* Server Actions architecture established

Upcoming:

* Route protection middleware
* Dashboard
* AI career guidance features
* Study planner system

---

# 3. TECHNOLOGY STACK

## Frontend

* Next.js App Router
* React
* TypeScript
* TailwindCSS
* Server Actions (no REST API)

## Backend / Infrastructure

* Supabase

  * PostgreSQL
  * Auth
  * Row Level Security

## Hosting plan

* Vercel (planned)

## AI integration (planned)

* OpenAI / Claude APIs

---

# 4. ARCHITECTURE OVERVIEW

We are following a **modern server-first architecture**:

Browser
→ Next.js Server Components / Server Actions
→ Supabase
→ PostgreSQL

No custom backend server exists.

Key principles:

* Server Components by default
* Server Actions for mutations
* Supabase as BaaS
* RLS for security
* Minimal client-side state

This is a **scalable SaaS architecture**.

---

# 5. AUTHENTICATION MODEL

Using Supabase Auth.

When a user signs up:

* Supabase creates a row in `auth.users`
* We maintain our own `profiles` table
* The two tables are linked by the same UUID

Relationship:
auth.users.id = profiles.id

This allows:

* Storing app-specific user data
* Keeping Supabase auth separate

---

# 6. DATABASE SCHEMA
# 7. ROW LEVEL SECURITY (RLS)

Profiles table is protected with RLS.

Policies ensure a user can:

* Read their own profile
* Insert their own profile
* Update their own profile

Rule:

```
auth.uid() = id
```

This guarantees full multi-tenant isolation.

---

# 8. TYPESCRIPT + SUPABASE TYPES ISSUE (IMPORTANT HISTORY)

We encountered a major TypeScript error:

Error:

```
No overload matches this call.
Argument of type '{ id: string }' is not assignable to parameter of type 'never'.
```

Root cause:
The generated Supabase types file had empty objects:

```
Views: {}
Functions: {}
```

Which meant TypeScript did not recognize the `profiles` table → type became `never`.

Resolution:
We regenerated Supabase types using the CLI so that the `profiles` table is properly typed.

This was a critical debugging milestone.

---

# 9. ONBOARDING SYSTEM (CORE FEATURE)

We built a **multi-step onboarding flow** using Next.js Server Actions.

This onboarding determines:

* Who the user is
* What they want to prepare for
* Their study capacity
* Their exam timeline

This data will later drive AI features.

---

## Onboarding Steps

### Step 0 — Basic Profile

Collect:

* Full name
* Career stage
* Target type (Govt exam / Private job)

### Step 1 — Identity

Collect:

* Age group
* Study status
* Daily study hours

### Step 2 — Goals

Collect:

* Primary goal
* Attempt year
* Weekly study days

### Step 3 — Finish

Mark onboarding as completed.

Final action:

```
onboarding_completed = true
```

This flag controls dashboard access.

---

# 10. SERVER ACTIONS ARCHITECTURE

All onboarding logic lives in:

```
app/onboarding/actions.ts
```

Key server actions:

### getAuthenticatedUser()

* Validates Supabase session
* Returns user or redirects to login

### ensureProfileRow()

* Checks if profile exists
* Inserts row if missing

### saveProfile()

Saves step 0 data.

### saveIdentity()

Saves step 1 data.

### saveGoals()

Saves step 2 data.

### completeOnboarding()

Sets onboarding_completed = true and redirects.

This is a **clean mutation architecture** using Server Actions.

---

# 11. PROJECT STRUCTURE

```
app/
│
├── onboarding/
│   ├── page.tsx
│   ├── identity/page.tsx
│   ├── goals/page.tsx
│   ├── finish/page.tsx
│   └── actions.ts
│
├── dashboard/
│   └── page.tsx
│
├── login/
├── signup/
│
lib/
└── supabase/
    ├── client.ts
    └── server.ts
│
types/
└── supabase.ts
```

---

# 12. CURRENT MISSING PIECE

We have **no route protection yet**.

Right now:

* Users could manually open /dashboard
* Onboarding is not enforced globally

This is the **next development task**.

---

# 13. NEXT TASK FOR CLAUDE

We need middleware that enforces:

### Rule 1 — Not logged in

Redirect → `/login`

### Rule 2 — Logged in but onboarding incomplete

Redirect → `/onboarding`

### Rule 3 — Logged in + onboarding complete

Allow dashboard access

This middleware will be implemented using Supabase server client.

---

# 14. FUTURE ROADMAP (HIGH LEVEL)

After middleware:

Phase 2 — Dashboard

* User overview
* Study stats
* Exam target card

Phase 3 — AI Features

* Career guidance chat
* Study planner generator
* Weekly schedule generator

Phase 4 — Monetization

* Subscription plans
* Premium AI coaching

---

# END OF HANDOFF

---


1. utils/supabase/server.ts
    `import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/supabase"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}`
2. types/supabase.ts
`export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          career_stage: string | null
          target_type: string | null
          target_exam: string | null
          graduation_year: number | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          career_stage?: string | null
          target_type?: string | null
          target_exam?: string | null
          graduation_year?: number | null
          created_at?: string
        }
        Update: {
          full_name?: string | null
          career_stage?: string | null
          target_type?: string | null
          target_exam?: string | null
          graduation_year?: number | null
        }
      }
    }
    
  }
}
`

3. app/onboarding/actions.ts
`"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

type DB = Database // you can replace later with generated types

// Shared helper for all onboarding steps
export async function getAuthenticatedUser() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return { user, supabase }
}

// Ensures profile row exists (fixes dashboard bypass + deletion bug)
export async function ensureProfileRow(
  userId: string,
  supabase: SupabaseClient<DB>
) {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single()

  if (!data) {
    await supabase.from("profiles").insert({ id: userId })
  }
}

// STEP 0 → Save basic profile
export async function saveProfile(formData: FormData) {
  try {
    const { user, supabase } = await getAuthenticatedUser()

    if (!user) throw new Error("User not found")

    // Ensure blank row exists first
    await ensureProfileRow(user.id, supabase)

    const profileData = {
      id: user.id,
      full_name: formData.get("full_name") as string,
      career_stage: formData.get("career_stage") as string,
      target_type: formData.get("target_type") as string,
      target_exam: formData.get("target_exam") as string,
      graduation_year: formData.get("graduation_year")
        ? Number(formData.get("graduation_year"))
        : null,
      onboarding_step: 1,
      onboarding_completed: false,
    }

    const { error } = await supabase
      .from("profiles")
      .update(profileData)
      .eq("id", user.id)

    if (error) throw error
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to save profile"
    redirect(`/onboarding?error=${encodeURIComponent(message)}`)
  }

  // Move to next step
  redirect("/onboarding/identity")
}`

==========================================================
Folder structure of: D:\GovtExamAgent\career-copilot
├── .env.local
├── .gitignore
├── AGENTS.md
├── app
│   ├── auth
│   │   └── actions.tsx
│   ├── dashboard
│   │   ├── actions.ts
│   │   └── page.tsx
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   ├── login
│   │   └── page.tsx
│   ├── onboarding
│   │   ├── actions.ts
│   │   ├── advanced
│   │   │   └── page.tsx
│   │   ├── certifications
│   │   │   ├── action.ts
│   │   │   ├── CertificationsForm.tsx
│   │   │   └── page.tsx
│   │   ├── complete
│   │   │   └── page.tsx
│   │   ├── education
│   │   │   ├── action.ts
│   │   │   ├── DegreesForm.tsx
│   │   │   ├── EducationStep.tsx
│   │   │   └── page.tsx
│   │   ├── exam-attempts
│   │   │   ├── action.tsx
│   │   │   └── page.tsx
│   │   ├── experience
│   │   │   ├── action.ts
│   │   │   └── page.tsx
│   │   ├── identity
│   │   │   ├── action.ts
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── preferences
│   │   │   ├── action.ts
│   │   │   └── page.tsx
│   │   └── start
│   │       └── page.tsx
│   ├── page.tsx
│   ├── signup
│   │   └── page.tsx
│   └── supabase-test
│       └── page.tsx
├── CLAUDE.md
├── components
├── eslint.config.mjs
├── lib
│   ├── db
│   │   ├── certifications.ts
│   │   ├── education.ts
│   │   ├── examAttempts.ts
│   │   ├── preferences.ts
│   │   └── profile.ts
│   └── db.ts
├── middleware.ts
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── public
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── README.md
├── tsconfig.json
├── types
│   ├── aspirant.types.ts
│   └── supabase.ts
└── utils
    └── supabase
        ├── client.ts
        ├── getProfile.ts
        ├── getUser.ts
        ├── middleware.ts
        ├── redirectIfProfile.ts
        ├── redirectIfUser.ts
        ├── requireProfile.ts
        ├── requireUser.ts
        └── server.ts
    =======================================================

    -- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.age_criteria (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  post_id uuid,
  min_age integer,
  max_age integer,
  cutoff_date date,
  CONSTRAINT age_criteria_pkey PRIMARY KEY (id),
  CONSTRAINT age_criteria_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);
CREATE TABLE public.aspirant_certifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  certification_name text,
  issuing_body text,
  year_completed integer,
  is_active boolean DEFAULT true,
  CONSTRAINT aspirant_certifications_pkey PRIMARY KEY (id),
  CONSTRAINT aspirant_certifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.aspirant_education (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  level text NOT NULL,
  degree text,
  stream text,
  institution text,
  university text,
  graduation_year integer,
  percentage numeric,
  cgpa numeric,
  is_completed boolean DEFAULT true,
  CONSTRAINT aspirant_education_pkey PRIMARY KEY (id),
  CONSTRAINT aspirant_education_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.aspirant_exam_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  exam_id uuid,
  attempts_used integer DEFAULT 0,
  CONSTRAINT aspirant_exam_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT aspirant_exam_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.aspirant_experience (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  sector text,
  role text,
  organization text,
  start_date date,
  end_date date,
  years_experience numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT aspirant_experience_pkey PRIMARY KEY (id),
  CONSTRAINT aspirant_experience_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.aspirant_location (
  user_id uuid NOT NULL,
  state text NOT NULL,
  district text,
  is_rural boolean,
  domicile_certificate boolean DEFAULT false,
  CONSTRAINT aspirant_location_pkey PRIMARY KEY (user_id),
  CONSTRAINT aspirant_location_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.aspirant_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  preferred_sectors ARRAY,
  preferred_states ARRAY,
  willing_to_relocate boolean DEFAULT true,
  target_exams ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT aspirant_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT aspirant_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.aspirant_reservations (
  user_id uuid NOT NULL,
  category text NOT NULL,
  sub_category text,
  is_pwd boolean DEFAULT false,
  pwd_type text,
  is_ex_serviceman boolean DEFAULT false,
  is_jk_domicile boolean DEFAULT false,
  is_widow boolean DEFAULT false,
  age_relaxation_extra_years integer DEFAULT 0,
  CONSTRAINT aspirant_reservations_pkey PRIMARY KEY (user_id),
  CONSTRAINT aspirant_reservations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.attempt_limits (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  post_id uuid,
  category text,
  max_attempts integer,
  CONSTRAINT attempt_limits_pkey PRIMARY KEY (id),
  CONSTRAINT attempt_limits_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);
CREATE TABLE public.career_progression (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  post_id uuid,
  promotion_path text,
  CONSTRAINT career_progression_pkey PRIMARY KEY (id),
  CONSTRAINT career_progression_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);
CREATE TABLE public.certification_criteria (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  post_id uuid,
  certification_id uuid,
  mandatory boolean DEFAULT true,
  CONSTRAINT certification_criteria_pkey PRIMARY KEY (id),
  CONSTRAINT certification_criteria_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT certification_criteria_certification_id_fkey FOREIGN KEY (certification_id) REFERENCES public.certifications(id)
);
CREATE TABLE public.certifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  issuer text,
  CONSTRAINT certifications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.education_criteria (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  post_id uuid,
  min_qualification_level text,
  min_percentage numeric,
  allowed_disciplines jsonb,
  CONSTRAINT education_criteria_pkey PRIMARY KEY (id),
  CONSTRAINT education_criteria_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);
CREATE TABLE public.educational_qualifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  qualification_level text,
  degree_name text,
  discipline text,
  university_type text,
  percentage numeric,
  graduation_year integer,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT educational_qualifications_pkey PRIMARY KEY (id),
  CONSTRAINT educational_qualifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.exam_stages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  recruitment_id uuid,
  stage_name text,
  stage_order integer,
  CONSTRAINT exam_stages_pkey PRIMARY KEY (id),
  CONSTRAINT exam_stages_recruitment_id_fkey FOREIGN KEY (recruitment_id) REFERENCES public.recruitments(id)
);
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type text NOT NULL,
  state text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  recruitment_id uuid,
  post_name text NOT NULL,
  group_type text,
  pay_level text,
  job_type text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_recruitment_id_fkey FOREIGN KEY (recruitment_id) REFERENCES public.recruitments(id)
);
CREATE TABLE public.probation_details (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  post_id uuid,
  probation_months integer,
  confirmation_rules text,
  CONSTRAINT probation_details_pkey PRIMARY KEY (id),
  CONSTRAINT probation_details_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  career_stage text,
  target_type text,
  target_exam text,
  graduation_year text,
  created_at timestamp without time zone DEFAULT now(),
  date_of_birth date,
  gender text,
  category text,
  pwbd_status text,
  domicile_state text,
  nationality text DEFAULT 'Indian'::text,
  ex_serviceman boolean DEFAULT false,
  govt_employee boolean DEFAULT false,
  dob date,
  phone text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.recruitments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid,
  name text NOT NULL,
  year integer NOT NULL,
  notification_date date,
  apply_start_date date,
  apply_end_date date,
  status text DEFAULT 'upcoming'::text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT recruitments_pkey PRIMARY KEY (id),
  CONSTRAINT recruitments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.salary_details (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  post_id uuid,
  pay_level text,
  basic_pay_min numeric,
  basic_pay_max numeric,
  grade_pay numeric,
  allowances text,
  in_hand_estimate text,
  CONSTRAINT salary_details_pkey PRIMARY KEY (id),
  CONSTRAINT salary_details_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);
CREATE TABLE public.service_bonds (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  post_id uuid,
  bond_years integer,
  bond_amount numeric,
  bond_details text,
  CONSTRAINT service_bonds_pkey PRIMARY KEY (id),
  CONSTRAINT service_bonds_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);
CREATE TABLE public.training_details (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  post_id uuid,
  training_months integer,
  training_location text,
  stipend text,
  CONSTRAINT training_details_pkey PRIMARY KEY (id),
  CONSTRAINT training_details_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);
CREATE TABLE public.user_certifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  certification_id uuid,
  year_obtained integer,
  score text,
  CONSTRAINT user_certifications_pkey PRIMARY KEY (id),
  CONSTRAINT user_certifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_certifications_certification_id_fkey FOREIGN KEY (certification_id) REFERENCES public.certifications(id)
);
CREATE TABLE public.user_exam_attempts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  recruitment_id uuid,
  attempts_used integer DEFAULT 0,
  CONSTRAINT user_exam_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT user_exam_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_exam_attempts_recruitment_id_fkey FOREIGN KEY (recruitment_id) REFERENCES public.recruitments(id)
);
CREATE TABLE public.user_targets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  recruitment_id uuid,
  status text DEFAULT 'interested'::text,
  CONSTRAINT user_targets_pkey PRIMARY KEY (id),
  CONSTRAINT user_targets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_targets_recruitment_id_fkey FOREIGN KEY (recruitment_id) REFERENCES public.recruitments(id)
);
CREATE TABLE public.vacancies (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  post_id uuid,
  category text,
  vacancy_count integer,
  state text,
  CONSTRAINT vacancies_pkey PRIMARY KEY (id),
  CONSTRAINT vacancies_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);
=================================
CLAUDE CODE: 
Folder structure of: D:\GovtExamAgent\career-copilot
├── .env.local
├── .gitignore
├── actions
│   ├── admin.ts
│   ├── auth.ts
│   ├── billing.ts
│   ├── eligibility.ts
│   ├── marketplace.ts
│   ├── onboarding.ts
│   ├── profile.ts
│   └── study-planner.ts
├── AGENTS.md
├── app
│   ├── admin
│   │   ├── eligibility
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   ├── organizations
│   │   │   ├── new
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── page.tsx
│   │   └── recruitments
│   │       ├── new
│   │       │   └── page.tsx
│   │       ├── page.tsx
│   │       └── [id]
│   │           └── page.tsx
│   ├── api
│   │   └── webhooks
│   │       └── razorpay
│   │           ├── route.ts
│   │           └── route.v2.ts
│   ├── auth
│   │   ├── actions.tsx
│   │   ├── login
│   │   │   └── page.tsx
│   │   └── signup
│   │       └── page.tsx
│   ├── dashboard
│   │   ├── billing
│   │   │   └── page.tsx
│   │   ├── page.tsx
│   │   ├── page.v2.tsx
│   │   ├── pageWithstudyPlan.tsx
│   │   └── study-plan
│   │       ├── new
│   │       │   └── page.tsx
│   │       ├── page.tsx
│   │       └── [id]
│   │           └── page.tsx
│   ├── favicon.ico
│   ├── globals.css
│   ├── instructor
│   │   └── courses
│   │       └── page.tsx
│   ├── layout.tsx
│   ├── marketplace
│   │   ├── course
│   │   │   └── [slug]
│   │   │       └── page.tsx
│   │   ├── my-courses
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── page.tsx
│   ├── pricing
│   │   └── page.ts
│   ├── protected
│   │   ├── dashboard
│   │   │   ├── actions.ts
│   │   │   └── page.tsx
│   │   └── onboarding
│   │       ├── actions.ts
│   │       ├── advanced
│   │       │   └── page.tsx
│   │       ├── certifications
│   │       │   ├── action.ts
│   │       │   ├── CertificationsForm.tsx
│   │       │   └── page.tsx
│   │       ├── complete
│   │       │   └── page.tsx
│   │       ├── education
│   │       │   ├── action.ts
│   │       │   ├── DegreesForm.tsx
│   │       │   ├── EducationStep.tsx
│   │       │   └── page.tsx
│   │       ├── exam-attempts
│   │       │   ├── action.tsx
│   │       │   └── page.tsx
│   │       ├── experience
│   │       │   ├── action.ts
│   │       │   └── page.tsx
│   │       ├── identity
│   │       │   ├── action.ts
│   │       │   └── page.tsx
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       ├── preferences
│   │       │   ├── action.ts
│   │       │   └── page.tsx
│   │       └── start
│   │           └── page.tsx
│   └── supabase-test
│       └── page.tsx
├── CLAUDE.md
├── components
│   ├── admin
│   │   ├── PostForm.tsx
│   │   └── RecruitmentForm.tsx
│   ├── billing
│   │   ├── GateGuard.tsx
│   │   └── PricingCards.tsx
│   ├── dashboard
│   │   ├── DashboardShell.tsx
│   │   ├── ExamTargetCard.tsx
│   │   ├── NotificationsFeed.tsx
│   │   ├── ProfileCard.tsx
│   │   ├── StatsBar.tsx
│   │   ├── StudyPlanPlaceholder.tsx
│   │   └── StudyPlanWidget.tsx
│   ├── marketplace
│   │   ├── CourseCard.tsx
│   │   ├── CourseCurriculum.tsx
│   │   ├── CourseHero.tsx
│   │   ├── CourseReviews.tsx
│   │   ├── EnrollButton.tsx
│   │   └── MarketplaceFilters.tsx
│   ├── onboarding
│   ├── study-plan
│   │   ├── LogSessionForm.tsx
│   │   ├── PlanStatsBar.tsx
│   │   └── WeekCard.tsx
│   └── ui
├── eslint.config.mjs
├── lib
│   ├── ai
│   │   └── study-planner.ts
│   ├── billing
│   │   ├── gate.ts
│   │   ├── marketplace-payment.ts
│   │   ├── plans.ts
│   │   └── razorpay.ts
│   ├── db
│   │   ├── admin.ts
│   │   ├── billing.ts
│   │   ├── certifications.ts
│   │   ├── dashboard.ts
│   │   ├── education.ts
│   │   ├── examAttempts.ts
│   │   ├── marketplace.ts
│   │   ├── preferences.ts
│   │   ├── profiles.ts
│   │   └── study-planner.ts
│   ├── eligibility
│   │   ├── engine.ts
│   │   └── runner.ts
│   └── utils
│       └── dates.ts
├── middleware.ts
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── project overview.md
├── public
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── README.md
├── supabase
│   ├── .temp
│   │   └── cli-latest
│   └── migrations
│       └── marketplace_setup.sql
├── tsconfig.json
├── types
│   ├── app.ts
│   ├── aspirant.types.ts
│   ├── marketplace.ts
│   └── supabase.ts
└── utils
    └── supabase
        ├── client.ts
        ├── getProfile.ts
        ├── getUser.ts
        ├── redirectIfProfile.ts
        ├── redirectIfUser.ts
        ├── requireProfile.ts
        ├── requireUser.ts
        └── server.ts