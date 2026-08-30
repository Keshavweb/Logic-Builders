import type { ScreenName } from '../types'

interface HeaderProps {
  currentScreen: ScreenName
  onNavigate: (screen: ScreenName) => void
}

export default function Header({ currentScreen, onNavigate }: HeaderProps) {
  const navItems: { key: ScreenName; label: string }[] = [
    { key: 'front', label: 'Home' },
    { key: 'intake', label: 'Upload Batch' },
    { key: 'review', label: 'Review Queue' },
    { key: 'history', label: 'Submission History' },
    { key: 'login', label: 'Log In' },
  ]

  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-gray-800 bg-black text-gray-200">
      <div 
        onClick={() => onNavigate('front')} 
        className="cursor-pointer group select-none"
      >
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400 group-hover:text-gray-300 transition">
          Automated Dispute Recovery
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-blue-400 mr-1">Chargeback</span>
          <span className="text-gray-100">Defender</span>
        </h1>
      </div>

      <nav
        className="flex items-center gap-2 rounded-full bg-black/30 p-2"
        aria-label="Main navigation"
      >
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              currentScreen === item.key
                ? 'text-gray-100 border border-white'
                : 'bg-transparent text-gray-400 hover:text-gray-300 hover:border-white'
            }`}
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  )
}