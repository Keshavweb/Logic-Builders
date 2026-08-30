import { useEffect, useState } from 'react'

type Props = {
  message: string | null
}

export default function Toast({ message }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (message) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
      }, 3000)

      return () => clearTimeout(timer)
    } else {
      setVisible(false)
    }
  }, [message])

  if (!visible || !message) return null

  return (
    <div className="fixed bottom-7 right-7 z-50 flex items-center gap-2.5 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-xs font-medium text-gray-100 shadow-2xl backdrop-blur-md transition-all duration-300">
      <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
      <span>{message}</span>
    </div>
  )
}