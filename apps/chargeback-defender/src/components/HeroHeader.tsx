interface HeroHeaderProps {
  onGetStarted: () => void
}

export default function HeroHeader({ onGetStarted }: HeroHeaderProps) {
  return (
    <div className="flex flex-col items-center text-center relative z-10 max-w-3xl">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,102,255,0.12),_transparent_70%)] pointer-events-none -z-10"></div>

      {/* Main Title */}
      <h1 className="text-5xl font-extrabold mb-4 tracking-tight">
        Your shield against chargebacks.
      </h1>

      {/* Sub-line */}
      <p className="text-lg text-gray-300 mb-8 leading-relaxed">
        Automate dispute recovery with speed and precision.<br />
        Stay profitable, protected, and always in control.
      </p>

      {/* CTA Button */}
      <div>
        <button
          onClick={onGetStarted}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-md text-white font-semibold transition shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-95"
        >
          Get Started
        </button>
      </div>
    </div>
  )
}