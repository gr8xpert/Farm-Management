import { X, Loader2 } from 'lucide-react'

export default function FormModal({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  loading,
  submitText = 'Save',
  size = 'md'
}) {
  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit()
  }

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div
          className={`relative w-full ${sizeClasses[size]} modal-content animate-fadeIn`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-800">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              style={{ borderRadius: '4px' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit}>
            <div className="px-5 py-4 max-h-[65vh] overflow-y-auto">
              {children}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary text-sm flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitText}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
