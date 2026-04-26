import { useState, useRef } from 'react'
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, Loader, X, Brain } from 'lucide-react'
import { uploadAPI } from '../services/api'

// Stage can be: null | 'uploading' | 'processing'
const STAGE_LABELS = {
  uploading:  'Uploading file…',
  processing: 'Generating embeddings & indexing…',
}

export default function UploadPanel({ onClose }) {
  const [uploadedDocs, setUploadedDocs] = useState([])
  const [stage, setStage] = useState(null)       // upload stage
  const [uploadPct, setUploadPct] = useState(0)  // 0-100 while uploading
  const [dragOver, setDragOver] = useState(false)
  const [statusMsg, setStatusMsg] = useState(null)
  const fileRef = useRef()

  const handleUpload = async (file) => {
    if (!file) return

    if (file.type !== 'application/pdf') {
      setStatusMsg({ type: 'error', text: 'Please upload a valid PDF file.' })
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setStatusMsg({ type: 'error', text: 'File too large. Maximum size is 50 MB.' })
      return
    }

    setStage('uploading')
    setUploadPct(0)
    setStatusMsg(null)

    try {
      const result = await uploadAPI.uploadPDF(file, (pct, newStage) => {
        setStage(newStage)
        if (newStage === 'uploading') setUploadPct(pct ?? 0)
      })

      // result = { message, chunks_indexed, document }
      if (!result || result.chunks_indexed == null || !result.document) {
        throw new Error('Unexpected response from server. Please try again.')
      }

      setUploadedDocs(prev => [
        ...prev,
        {
          name: result.document,
          chunks: result.chunks_indexed,
          uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
      setStatusMsg({
        type: 'success',
        text: `✓ Indexed ${result.chunks_indexed} chunks from "${file.name}"`,
      })
    } catch (err) {
      // Axios timeout produces a generic network error without response
      let msg = 'Upload failed. Please try again.'
      if (err.code === 'ECONNABORTED') {
        msg = 'Request timed out. The server is still processing your file — wait a moment then try chatting anyway.'
      } else if (err.response?.data?.error) {
        msg = err.response.data.error
      } else if (err.message) {
        msg = err.message
      }
      setStatusMsg({ type: 'error', text: msg })
    } finally {
      setStage(null)
      setUploadPct(0)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (docName) => {
    try {
      await uploadAPI.deleteDocument(docName)
      setUploadedDocs(prev => prev.filter(d => d.name !== docName))
      setStatusMsg({ type: 'success', text: `Removed "${docName}" from knowledge base.` })
    } catch {
      setStatusMsg({ type: 'error', text: 'Delete failed. Please try again.' })
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  const isWorking = stage !== null

  return (
    <div className="h-full flex flex-col">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
        <div>
          <h2 className="text-sm font-bold text-medical-800">Knowledge Base</h2>
          <p className="text-xs text-slate-500 mt-0.5">Upload medical PDFs to train the chatbot</p>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Drop Zone */}
        <div
          role="button"
          tabIndex={0}
          aria-disabled={isWorking}
          className={`border-2 border-dashed rounded-xl p-5 text-center transition-all
            ${isWorking
              ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'
              : dragOver
                ? 'border-medical-500 bg-medical-50 scale-[0.99] cursor-pointer'
                : 'border-slate-300 hover:border-medical-400 hover:bg-medical-50 cursor-pointer'
            }`}
          onClick={() => !isWorking && fileRef.current?.click()}
          onKeyDown={e => e.key === 'Enter' && !isWorking && fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); if (!isWorking) setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={isWorking ? e => e.preventDefault() : onDrop}
        >
          <Upload className="mx-auto mb-2 text-medical-500" size={26} />
          <p className="text-sm font-medium text-slate-700">
            {isWorking ? 'Processing…' : 'Drop PDF here or click to browse'}
          </p>
          <p className="text-xs text-slate-400 mt-1">Max 50 MB per file</p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => { if (e.target.files[0]) handleUpload(e.target.files[0]) }}
          />
        </div>

        {/* Progress indicator */}
        {isWorking && (
          <div className="space-y-2 bg-medical-50 border border-medical-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-medical-700">
              {stage === 'processing'
                ? <Brain size={14} className="shrink-0 animate-pulse" />
                : <Loader size={14} className="animate-spin shrink-0" />
              }
              <span className="truncate font-medium">{STAGE_LABELS[stage]}</span>
              {stage === 'uploading' && uploadPct != null && (
                <span className="ml-auto tabular-nums text-xs">{uploadPct}%</span>
              )}
            </div>

            {/* Progress bar */}
            {stage === 'uploading' ? (
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div
                  className="bg-medical-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
            ) : (
              /* Indeterminate bar during server-side processing */
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div className="h-1.5 bg-medical-400 rounded-full animate-indeterminate" />
              </div>
            )}

            <p className="text-xs text-slate-400">
              {stage === 'uploading'
                ? 'Sending file to server…'
                : 'This may take several minutes for large PDFs. Please keep this tab open.'}
            </p>
          </div>
        )}

        {/* Status Message */}
        {statusMsg && (
          <div className={`flex items-start gap-2 p-3 rounded-lg text-xs
            ${statusMsg.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {statusMsg.type === 'success'
              ? <CheckCircle size={14} className="mt-0.5 shrink-0" />
              : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
            <span className="break-words leading-relaxed">{statusMsg.text}</span>
          </div>
        )}

        {/* Indexed Documents */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Indexed Documents ({uploadedDocs.length})
          </p>
          {uploadedDocs.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <FileText size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs">No documents indexed yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {uploadedDocs.map((doc, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between bg-slate-50 border border-slate-200 rounded-lg p-3 group hover:border-medical-200 transition-colors"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <FileText size={14} className="text-medical-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p
                        className="text-xs font-medium text-slate-700 truncate"
                        title={doc.name}
                      >
                        {doc.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {doc.chunks.toLocaleString()} chunks · {doc.uploadedAt}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.name)}
                    title="Remove document"
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity ml-2 shrink-0 p-0.5"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sample Questions */}
        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Sample Questions
          </p>
          <ul className="space-y-1 text-xs text-slate-500">
            <li className="flex gap-1.5"><span className="text-medical-400">•</span> What are the symptoms of diabetes?</li>
            <li className="flex gap-1.5"><span className="text-medical-400">•</span> How is hypertension treated?</li>
            <li className="flex gap-1.5"><span className="text-medical-400">•</span> What medications are used for asthma?</li>
          </ul>
        </div>

      </div>
    </div>
  )
}
