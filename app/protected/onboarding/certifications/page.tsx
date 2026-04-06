// import { saveCertifications } from "./action"
// import CertificationsForm from "@/app/onboarding/certifications/CertificationsForm"

// export default function CertificationsPage() {
//   return (
//     <form action={saveCertifications} className="max-w-2xl mx-auto space-y-6">
//       <CertificationsForm />
//       <button type="submit">Finish Onboarding</button>
//     </form>
//   )
// } 

"use client"

import { useState } from "react"
import { saveCertifications } from "./action"

type Cert = { name: string; org: string; year: string }

export default function CertificationsPage() {
  const [certs, setCerts] = useState<Cert[]>([])

  function addCert() {
    setCerts([...certs, { name: "", org: "", year: "" }])
  }

  function removeCert(i: number) {
    setCerts(certs.filter((_, idx) => idx !== i))
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Certifications</h1>

      <form action={saveCertifications}>
        {certs.map((c, i) => (
          <div key={i}>
            <input name={`cert_${i}_name`} placeholder="Certification Name" required />
            <input name={`cert_${i}_org`} placeholder="Issuing Organization" />
            <input name={`cert_${i}_year`} placeholder="Year" />
            <button type="button" onClick={() => removeCert(i)}>Remove</button>
          </div>
        ))}

        <button type="button" onClick={addCert}>+ Add Certification</button>

        <br /><br />
        <button type="submit">Next → Experience</button>
      </form>
    </div>
  )
}