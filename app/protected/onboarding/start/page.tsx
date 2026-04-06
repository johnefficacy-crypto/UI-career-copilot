// import { requireUser } from "@/utils/supabase/requireUser"

// export default async function StartPage() {
//   await requireUser()

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-50">
//       <div className="bg-white p-12 rounded-2xl shadow-md max-w-xl text-center space-y-6">
//         <h1 className="text-3xl font-bold">Your Govt Career Setup 🚀</h1>

//         <p className="text-gray-600">
//           We’ll ask a few questions to match you with exams you’re eligible for.
//         </p>

//         <div className="text-left text-sm text-gray-500 space-y-2">
//           <p>✔ Reservation & eligibility</p>
//           <p>✔ Education & certifications</p>
//           <p>✔ Attempts & experience</p>
//           <p>✔ Job preferences</p>
//         </div>

//         <a
//           href="/onboarding/identity"
//           className="block bg-black text-white py-3 rounded"
//         >
//           Start Setup →
//         </a>
//       </div>
//     </div>
//   )
// }

export default function StartPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="card p-12 max-w-xl text-center space-y-6">
        <h1 className="heading-xl">Gov Career Engine</h1>

        <p className="subtext">
          We build your eligibility DNA to match you with every exam in India.
        </p>

        <div className="text-left text-sm subtext space-y-2">
          <p>✔ Reservation & category eligibility</p>
          <p>✔ Education & certifications</p>
          <p>✔ Attempts & experience</p>
          <p>✔ Smart exam matching</p>
        </div>

        <a href="/onboarding/identity" className="btn-primary block">
          Start Setup →
        </a>
      </div>
    </div>
  )
}