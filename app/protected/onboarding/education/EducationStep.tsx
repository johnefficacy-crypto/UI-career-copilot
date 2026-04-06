"use client";
import { useState } from "react";

type Degree = {
  qualification: string;
  specialization: string;
  university: string;
  percentage: string;
  passing_year: string;
};

export default function EducationStep({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [degrees, setDegrees] = useState<Degree[]>([]);

  const addDegree = () =>
    setDegrees([
      ...degrees,
      {
        qualification: "",
        specialization: "",
        university: "",
        percentage: "",
        passing_year: "",
      },
    ]);

  return (
    <form action={action} className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold">Education Details</h1>

      {/* 10th */}
      <div className="space-y-2">
        <h2 className="font-semibold">Class 10</h2>
        <input name="10_board" placeholder="Board" required />
        <input name="10_percentage" placeholder="Percentage" required />
        <input name="10_year" placeholder="Passing year" required />
      </div>

      {/* 12th */}
      <div className="space-y-2">
        <h2 className="font-semibold">Class 12</h2>
        <input name="12_board" placeholder="Board" required />
        <input name="12_percentage" placeholder="Percentage" required />
        <input name="12_year" placeholder="Passing year" required />
      </div>

      {/* Dynamic Degrees */}
      <div className="space-y-4">
        <h2 className="font-semibold">Higher Education</h2>

        {degrees.map((deg, i) => (
          <div key={i} className="border p-4 rounded">
            <input
              name={`degree_${i}_qualification`}
              placeholder="Degree (B.Tech, BA...)"
              required
            />
            <input
              name={`degree_${i}_specialization`}
              placeholder="Specialization"
            />
            <input
              name={`degree_${i}_university`}
              placeholder="University"
            />
            <input
              name={`degree_${i}_percentage`}
              placeholder="Percentage / CGPA"
            />
            <input
              name={`degree_${i}_year`}
              placeholder="Passing year"
            />
          </div>
        ))}

        <button
          type="button"
          onClick={addDegree}
          className="bg-gray-200 px-3 py-1 rounded"
        >
          + Add Degree
        </button>
      </div>

      <button className="bg-black text-white px-6 py-2 rounded">
        Continue
      </button>
    </form>
  );
}