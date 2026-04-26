import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import { Bot } from 'lucide-react'

function TypingIndicator() {
  return (
    <div className="flex gap-2 sm:gap-3 message-enter">
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-white border-2 border-medical-200 text-medical-600 shrink-0 mt-1">
        <Bot size={14} />
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          <div className="w-2 h-2 bg-medical-400 rounded-full typing-dot" />
          <div className="w-2 h-2 bg-medical-400 rounded-full typing-dot" />
          <div className="w-2 h-2 bg-medical-400 rounded-full typing-dot" />
        </div>
      </div>
    </div>
  )
}

export default function ChatWindow({ messages, isLoading }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-4 space-y-3 sm:space-y-4">
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isLoading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  )
}
