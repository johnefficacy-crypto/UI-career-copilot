export default function CompletePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="bg-white p-12 rounded-2xl shadow-md text-center space-y-6">
        <h1 className="text-3xl font-bold">Setup Complete 🎉</h1>
        <p className="text-gray-600">
          Your eligibility engine is ready.
        </p>

        <a
          href="/dashboard"
          className="bg-black text-white px-8 py-3 rounded inline-block"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  )
}