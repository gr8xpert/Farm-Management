import { useState, useRef } from 'react'
import { Plus, X, Loader2, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/gif,image/webp,application/pdf'

export default function ImageUploader({ images = [], onChange, maxImages = 5, label = 'Attachments' }) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return

    const remaining = maxImages - images.length
    if (files.length > remaining) {
      toast.error(`Can only add ${remaining} more file${remaining === 1 ? '' : 's'}`)
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      files.forEach(f => formData.append('files', f))

      const response = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (response.data.success) {
        onChange([...images, ...response.data.data])
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = async (index) => {
    const img = images[index]

    // If not yet saved to DB (no id), delete the physical file
    if (!img.id) {
      try {
        await api.delete('/uploads', { data: { file_path: img.file_path } })
      } catch (err) {
        // Ignore — file cleanup is best-effort
      }
    }

    const updated = images.filter((_, i) => i !== index)
    onChange(updated)
  }

  const getImageUrl = (img) => {
    return `/uploads/${img.file_path}`
  }

  const isPdf = (img) => {
    return img.mime_type === 'application/pdf' || img.original_name?.endsWith('.pdf')
  }

  return (
    <div>
      {label && <label className="form-label">{label}</label>}
      <div className="flex flex-wrap gap-2 mt-1">
        {images.map((img, index) => (
          <div
            key={img.id || img.file_path}
            className="relative group w-20 h-20 rounded border border-gray-200 overflow-hidden bg-gray-50"
          >
            {isPdf(img) ? (
              <a
                href={getImageUrl(img)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-full flex flex-col items-center justify-center text-gray-400 hover:text-gray-600"
                title={img.original_name}
              >
                <FileText className="w-6 h-6" />
                <span className="text-[9px] mt-1 truncate max-w-[70px] text-center">PDF</span>
              </a>
            ) : (
              <a href={getImageUrl(img)} target="_blank" rel="noopener noreferrer">
                <img
                  src={getImageUrl(img)}
                  alt={img.original_name}
                  className="w-full h-full object-cover"
                />
              </a>
            )}
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-20 h-20 rounded border-2 border-dashed border-gray-300 hover:border-green-400 flex flex-col items-center justify-center text-gray-400 hover:text-green-500 transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span className="text-[9px] mt-0.5">Add</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
