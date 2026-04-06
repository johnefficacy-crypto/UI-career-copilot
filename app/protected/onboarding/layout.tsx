// "use client"
// import { ReactNode } from "react"
// import { usePathname } from "next/navigation"

// const steps = [
//   "identity",
//   "education",
//   "certifications",
//   "experience",
//   "exam-attempts",
//   "preferences",
// ]

// export default function OnboardingLayout({ children }: { children: ReactNode }) {
//   const pathname = usePathname()
//   const currentIndex = steps.findIndex(step => pathname.includes(step)) + 1
//   const progress = (currentIndex / steps.length) * 100

//   if (currentIndex === 0) return children

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="max-w-3xl mx-auto pt-10">
//         <div className="mb-6">
//           <p className="text-sm text-gray-500">
//             Step {currentIndex} of {steps.length}
//           </p>
//           <div className="h-2 bg-gray-200 rounded mt-2">
//             <div
//               className="h-2 bg-green-500 rounded transition-all"
//               style={{ width: `${progress}%` }}
//             />
//           </div>
//         </div>
//       </div>

//       {children}
//     </div>
//   )
// }

"use client"

import { ReactNode } from "react"
import { usePathname } from "next/navigation"

const steps = [
  "identity",
  "education",
  "certifications",
  "experience",
  "exam-attempts",
  "preferences",
]

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const currentIndex = steps.findIndex(step => pathname.includes(step)) + 1
  const progress = (currentIndex / steps.length) * 100

  if (currentIndex === 0) return children

  return (
    <div className="min-h-screen px-6">
      <div className="max-w-3xl mx-auto pt-10">
        <p className="text-sm subtext">
          Step {currentIndex} of {steps.length}
        </p>

        <div className="h-2 bg-slate-800 rounded mt-2">
          <div
            className="h-2 rounded"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg,#6366F1,#22D3EE)"
            }}
          />
        </div>
      </div>

      <div className="mt-8">{children}</div>
    </div>
  )
}