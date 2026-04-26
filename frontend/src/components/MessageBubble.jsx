import ReactMarkdown from 'react-markdown'
import { Bot, User, Database } from 'lucide-react'

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const time = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className={`flex gap-2 sm:gap-3 message-enter ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 mt-1
        ${isUser ? 'bg-medical-600 text-white' : 'bg-white border-2 border-medical-200 text-medical-600'}`}>
        {isUser ? <User size={13} /> : <Bot size={13} />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[85%] sm:max-w-[80%] md:max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-sm leading-relaxed shadow-sm
          ${isUser
            ? 'bg-medical-600 text-white rounded-tr-sm'
            : message.isError
              ? 'bg-red-50 text-red-700 border border-red-200 rounded-tl-sm'
              : 'bg-white text-slate-700 border border-slate-200 rounded-tl-sm'
          }`}>
          {isUser ? (
            <p className="break-words">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none
              prose-headings:text-slate-800 prose-headings:font-semibold
              prose-p:text-slate-700 prose-p:leading-relaxed
              prose-li:text-slate-700
              prose-strong:text-slate-800
              prose-code:text-medical-700 prose-code:bg-medical-50 prose-code:px-1 prose-code:rounded
              prose-ul:my-1 prose-ol:my-1">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Metadata row */}
        <div className={`flex items-center gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-xs text-slate-400">{time}</span>
          {!isUser && message.sourcesFound !== undefined && (
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full
              ${message.sourcesFound ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
              <Database size={10} />
              {message.sourcesFound ? `${message.chunksUsed} sources` : 'No sources'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
