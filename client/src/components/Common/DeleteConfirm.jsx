import { AlertTriangle, Loader2 } from 'lucide-react'

export default function DeleteConfirm({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Item',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  loading
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-sm modal-content p-5 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div
              className="flex-shrink-0 w-10 h-10 bg-red-100 flex items-center justify-center"
              style={{ borderRadius: '4px' }}
            >
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-800">{title}</h3>
              <p className="mt-1 text-sm text-gray-600">{message}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-5">
            <button
              onClick={onClose}
              className="btn-secondary text-sm"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="btn-danger text-sm flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
