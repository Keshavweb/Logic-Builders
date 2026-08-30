import React, { useState } from 'react'

interface SignupProps {
  onSignup: (email: string) => void
  goToLogin: () => void
}

export default function Signup({ onSignup, goToLogin }: SignupProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    onSignup(email)
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 relative">
      {/* Background Accent Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-600/10 blur-[100px] pointer-events-none rounded-full"></div>

      {/* Card container matching Login */}
      <div className="w-full max-w-md bg-gray-900/90 p-8 rounded-2xl border border-gray-800 shadow-2xl relative z-10 backdrop-blur-sm">
        
        {/* Card Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Create a <span className="text-blue-400 mr-0.5">Chargeback</span><span>Defender</span> account
          </h2>
          <p className="text-xs text-gray-400 mt-1.5">
            Get started with automated dispute recovery & proof synthesis
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Work Email
            </label>
            <input
              type="email"
              required
              placeholder="merchant@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-gray-950 border border-gray-800 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition duration-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-gray-950 border border-gray-800 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition duration-200"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-2.5 px-4 bg-blue-950/80 hover:bg-blue-900 border border-blue-800/60 text-blue-200 font-medium text-sm rounded-lg transition duration-200 active:scale-[0.99]"
          >
            Create Account
          </button>
        </form>

        {/* Footer / Switch to Login */}
        <div className="mt-6 pt-6 border-t border-gray-800/80 text-center text-xs text-gray-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={goToLogin}
            className="text-blue-400 hover:text-blue-300 font-medium transition hover:underline"
          >
            Log in here
          </button>
        </div>

      </div>
    </div>
  )
}