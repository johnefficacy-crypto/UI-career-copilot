"use client"

import { useState } from "react"
import { savePreferences } from "./action"

const statesOfIndia = [
  "All India",
  "Maharashtra",
  "UP",
  "Bihar",
  "Gujarat",
  "Rajasthan",
  "MP",
  "Karnataka",
  "Tamil Nadu",
]

export default function PreferencesPage() {
  const [jobTypes, setJobTypes] = useState<string[]>([])
  const [states, setStates] = useState<string[]>([])

  const toggle = (
    value: string,
    list: string[],
    setList: (v: string[]) => void
  ) => {
    setList(list.includes(value)
      ? list.filter(v => v !== value)
      : [...list, value])
  }

  return (
    <form action={savePreferences} className="max-w-3xl mx-auto py-10 space-y-8">
      <h1 className="text-2xl font-bold">Job Preferences</h1>

      {/* Job Types */}
      <div>
        <h2 className="font-semibold mb-3">Target Job Types</h2>
        {["CENTRAL_GOVT","STATE_GOVT","PSU","REGULATORY","BANKING"].map(type => (
          <label key={type} className="block">
            <input
              type="checkbox"
              name="job_types"
              value={type}
              className="mr-2"
            />
            {type.replaceAll("_"," ")}
          </label>
        ))}
      </div>

      {/* Preferred States */}
      <div>
        <h2 className="font-semibold mb-3">Preferred Job Location</h2>
        {statesOfIndia.map(state => (
          <label key={state} className="block">
            <input
              type="checkbox"
              name="states"
              value={state}
              className="mr-2"
            />
            {state}
          </label>
        ))}
      </div>

      {/* Study Mode */}
      <div>
        <h2 className="font-semibold mb-3">Preparation Mode</h2>
        <select name="study_mode" className="border p-2 rounded w-full">
          <option value="SELF_STUDY">Self Study</option>
          <option value="COACHING">Coaching</option>
          <option value="WORKING_AND_PREPARING">Working + Preparing</option>
        </select>
      </div>

      <div>
        <input
          name="hours"
          type="number"
          placeholder="Study hours per day"
          className="border p-2 rounded w-full"
        />
      </div>

      <button className="w-full bg-black text-white py-3 rounded">
        Finish Onboarding 🎉
      </button>
    </form>
  )
}