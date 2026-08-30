import { useEffect, useState } from 'react'

type Props = {
  message: string | null
}

export default function Toast({ message }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (message) {
      setVisible(true)
    } else {
      setVisible(false)
    }
  }, [message])

  if (!visible || !message) return null

  return (
    <div className="fixed right-7 bottom-7 z-20 rounded-xl bg-text-primary px-4 py-3 text-sm font-medium text-white shadow-lg transition-all duration-300">
      {message}
    </div>
  )
}
