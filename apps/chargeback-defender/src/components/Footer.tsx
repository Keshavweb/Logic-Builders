import { useState } from 'react'

type ScreenName = 'front' | 'intake' | 'review' | 'history'

interface FooterProps {
  onNavigate: (screen: ScreenName) => void
}

export default function Footer({ onNavigate }: FooterProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  const showTooltip = (msg: string) => {
    setActiveTooltip(msg)
    window.setTimeout(() => setActiveTooltip(null), 3000)
  }

  return (
    <footer className="w-full border-t border-gray-800/80 bg-black text-gray-400 py-8 px-6 mt-12 relative">
      {/* Dynamic Tooltip Banner */}
      {activeTooltip && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 border border-blue-500/50 text-blue-300 text-xs px-4 py-1.5 rounded-full shadow-lg transition-all animate-bounce">
          {activeTooltip}
        </div>
      )}

      <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
        
        {/* Brand & Description */}
        <div>
          <h2 
            className="text-lg font-bold text-white tracking-tight cursor-pointer hover:opacity-90 transition"
            onClick={() => onNavigate('front')}
          >
            <span className="text-blue-400 mr-0.5">Chargeback</span>Defender
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            Automated multi-agent dispute recovery and proof synthesis.
          </p>
        </div>

        {/* Quick Link Groups */}
        <div className="flex flex-wrap gap-10 text-xs">
          {/* Platform Navigation */}
          <div>
            <p className="text-gray-200 font-semibold mb-1.5">Platform</p>
            <ul className="space-y-1 text-gray-500 text-[11px]">
              <li>
                <button 
                  onClick={() => onNavigate('intake')} 
                  className="hover:text-gray-200 transition text-left"
                >
                  Batch Intake
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('review')} 
                  className="hover:text-gray-200 transition text-left"
                >
                  Review Queue
                </button>
              </li>
            </ul>
          </div>

          {/* Engine Navigation */}
          <div>
            <p className="text-gray-200 font-semibold mb-1.5">Engine</p>
            <ul className="space-y-1 text-gray-500 text-[11px]">
              <li>
                <button 
                  onClick={() => onNavigate('front')} 
                  className="hover:text-gray-200 transition text-left"
                >
                  Pipeline Architecture
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('history')} 
                  className="hover:text-gray-200 transition text-left"
                >
                  Outcome History
                </button>
              </li>
            </ul>
          </div>

          {/* Security Badges */}
          <div>
            <p className="text-gray-200 font-semibold mb-1.5">Security</p>
            <ul className="space-y-1 text-gray-500 text-[11px]">
              <li>
                <button 
                  onClick={() => showTooltip('🔒 AES-256 encrypted pipeline & tokenized API handlers.')} 
                  className="hover:text-gray-200 transition text-left"
                >
                  PCI-DSS Compliant
                </button>
              </li>
              <li>
                <button 
                  onClick={() => showTooltip('👤 Every AI draft requires explicit human review before submission.')} 
                  className="hover:text-gray-200 transition text-left"
                >
                  Human-in-the-Loop
                </button>
              </li>
            </ul>
          </div>
        </div>

      </div>

      {/* Compact Copyright & System Status */}
      <div className="max-w-5xl mx-auto pt-4 border-t border-gray-900 flex justify-between items-center text-[11px] text-gray-600">
        <p>&copy; {new Date().getFullYear()} Chargeback Defender</p>
        
        <button 
          onClick={() => showTooltip('🟢 All dispute agent engines are running normally.')}
          className="flex items-center gap-2 hover:text-gray-400 transition"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-gray-500 font-mono">v1.0.0</span>
        </button>
      </div>
    </footer>
  )
}