import { useEffect, useState } from 'react'
import { Bot, Trash2, Menu, X } from 'lucide-react'
import ChatWindow from './components/ChatWindow'
import InputBar from './components/InputBar'
import UploadPanel from './components/UploadPanel'
import { useChat } from './hooks/useChat'
import { useServiceStatus } from './hooks/useServiceStatus'
import { SERVICE_STATUS_COPY } from './lib/serviceStatus'

const STATUS_CLASSES = { checking: 'text-amber-600 bg-amber-50 border-amber-200', online: 'text-green-600 bg-green-50 border-green-200', offline: 'text-red-600 bg-red-50 border-red-200' }
const STATUS_DOT_CLASSES = { checking: 'bg-amber-500 animate-pulse', online: 'bg-green-500', offline: 'bg-red-500' }

export default function App() {
  const { messages, isLoading, sendMessage, clearChat } = useChat()
  const { status } = useServiceStatus()
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)
  const showSuggestions = messages.length <= 1

  useEffect(() => {
    const onResize = () => { if (window.innerWidth < 768) setSidebarOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return <div className="h-screen flex flex-col bg-gradient-to-br from-medical-50 to-slate-100 overflow-hidden">
    <header className="bg-white border-b border-slate-200 shadow-sm px-3 sm:px-4 py-3 flex items-center justify-between z-30 shrink-0">
      <div className="flex items-center gap-2 sm:gap-3">
        <button onClick={() => setSidebarOpen(value => !value)} className="text-slate-500 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors" aria-label="Toggle sidebar">{sidebarOpen ? <X size={18} /> : <Menu size={18} />}</button>
        <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl bg-medical-600 flex items-center justify-center shadow-sm"><Bot size={18} className="text-white" /></div><div><h1 className="text-sm sm:text-base font-bold text-slate-800 leading-tight">MedBot</h1><p className="text-xs text-slate-400 leading-none hidden sm:block">AI Medical Assistant ? RAG + GPT-4o</p></div></div>
      </div>
      <div className="flex items-center gap-2">
        <div className={`hidden sm:flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${STATUS_CLASSES[status]}`} role="status" aria-live="polite"><div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_CLASSES[status]}`} />{SERVICE_STATUS_COPY[status]}</div>
        <div className={`sm:hidden w-2 h-2 rounded-full mt-0.5 ${STATUS_DOT_CLASSES[status]}`} title={SERVICE_STATUS_COPY[status]} aria-label={SERVICE_STATUS_COPY[status]} />
        <button onClick={clearChat} title="Clear chat" aria-label="Clear chat" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
      </div>
    </header>
    <div className="flex flex-1 overflow-hidden relative">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed md:relative inset-y-0 left-0 h-full w-72 sm:w-80 md:w-72 bg-white border-r border-slate-200 overflow-y-auto shrink-0 shadow-sm transition-transform duration-300 ease-in-out z-30 md:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:-translate-x-full md:hidden'}`}><UploadPanel onClose={() => setSidebarOpen(false)} /></aside>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0"><ChatWindow messages={messages} isLoading={isLoading} /><div className="bg-white border-t border-slate-200 px-3 sm:px-4 py-3 sm:py-4 shadow-sm shrink-0"><InputBar onSend={sendMessage} isLoading={isLoading} showSuggestions={showSuggestions} /></div></main>
    </div>
  </div>
}
