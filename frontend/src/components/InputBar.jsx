import { useState, useRef, useEffect } from 'react'
import { Send, Loader } from 'lucide-react'

const SUGGESTED = [
  "What are symptoms of diabetes?",
  "How is hypertension treated?",
  "What causes chest pain?",
  "Explain COVID-19 symptoms",
]

export default function InputBar({ onSend, isLoading, showSuggestions }) {
  const [input, setInput] = useState('')
  const textareaRef = useRef(null)

  // Auto-resize textarea height
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 128) + 'px'
  }, [input])

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    onSend(input.trim())
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Suggested prompts — horizontally scrollable on mobile */}
      {showSuggestions && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {SUGGESTED.map((q, i) => (
            <button
              key={i}
              onClick={() => onSend(q)}
              className="text-xs px-3 py-1.5 bg-medical-50 text-medical-700 border border-medical-200 rounded-full hover:bg-medical-100 transition-colors whitespace-nowrap shrink-0"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input box */}
      <div className="flex items-end gap-2 bg-white border border-slate-300 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-sm focus-within:border-medical-500 focus-within:ring-2 focus-within:ring-medical-100 transition-all">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask a medical question..."
          rows={1}
          className="flex-1 resize-none outline-none text-sm text-slate-700 placeholder-slate-400 leading-relaxed bg-transparent overflow-hidden"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="p-1.5 sm:p-2 rounded-xl bg-medical-600 text-white hover:bg-medical-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
          aria-label="Send message"
        >
          {isLoading ? <Loader size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>

      <p className="text-center text-xs text-slate-400 leading-snug">
        MedBot can make mistakes. Always consult a licensed medical professional.
      </p>
    </div>
  )
}
