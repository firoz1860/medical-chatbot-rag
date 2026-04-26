import { useState, useCallback } from 'react'
import { chatAPI } from '../services/api'

export function useChat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: `👋 Hello! I'm **MedBot**, your AI medical assistant.\n\nI can answer medical questions based on the documents uploaded to my knowledge base.\n\n**To get started:**\n- Upload medical PDFs using the panel on the left\n- Then ask me any medical question!\n\n⚠️ *I am not a substitute for professional medical advice.*`,
      timestamp: new Date()
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const sendMessage = useCallback(async (question) => {
    if (!question.trim() || isLoading) return

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: question,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)
    setError(null)

    try {
      // Build history for context (exclude welcome message)
      const history = messages
        .filter(m => m.id !== 1)
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }))

      const result = await chatAPI.sendMessage(question, history)

      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: result.answer,
        sourcesFound: result.sources_found,
        chunksUsed: result.chunks_used,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Something went wrong. Please try again.'
      setError(errMsg)
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `❌ Error: ${errMsg}`,
        isError: true,
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading])

  const clearChat = useCallback(() => {
    setMessages([{
      id: 1,
      role: 'assistant',
      content: `👋 Chat cleared! Ask me anything about the uploaded medical documents.`,
      timestamp: new Date()
    }])
    setError(null)
  }, [])

  return { messages, isLoading, error, sendMessage, clearChat }
}
