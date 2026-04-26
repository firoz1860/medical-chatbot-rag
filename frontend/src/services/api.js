import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 60 s for chat / health
})

export const chatAPI = {
  sendMessage: async (question, chatHistory = []) => {
    const response = await api.post('/chat', {
      question,
      chat_history: chatHistory,
    })
    return response.data
  },
}

export const uploadAPI = {
  /**
   * Upload a PDF and wait for the server to embed + index it.
   *
   * onProgress(pct, stage) is called with:
   *   stage = 'uploading'   while file bytes are being sent   (pct 0‑100)
   *   stage = 'processing'  once upload is done, server is working (pct undefined)
   */
  uploadPDF: async (file, onProgress) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // Embedding + Pinecone upsert can take several minutes for large PDFs
      timeout: 900000, // 15 minutes
      onUploadProgress: (e) => {
        if (!onProgress) return
        if (e.total && e.total > 0) {
          const pct = Math.min(100, Math.round((e.loaded * 100) / e.total))
          onProgress(pct, 'uploading')
          // Once file bytes are fully sent the server starts heavy processing
          if (pct === 100) onProgress(100, 'processing')
        } else {
          onProgress(null, 'uploading')
        }
      },
    })

    return response.data
  },

  deleteDocument: async (docName) => {
    const response = await api.delete(`/delete/${encodeURIComponent(docName)}`)
    return response.data
  },
}

export const healthAPI = {
  check: async () => {
    const response = await api.get('/health')
    return response.data
  },
}
