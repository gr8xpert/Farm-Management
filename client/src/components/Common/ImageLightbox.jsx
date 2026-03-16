import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, FileText } from 'lucide-react'

export default function ImageLightbox({ images, initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)

  const currentImage = images[currentIndex]
  const isPdf = currentImage?.mime_type === 'application/pdf' || currentImage?.original_name?.endsWith('.pdf')

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goToPrev()
      if (e.key === 'ArrowRight') goToNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex])

  const goToPrev = () => {
    setZoom(1)
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setZoom(1)
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.5, 3))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.5, 0.5))

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = `/uploads/${currentImage.file_path}`
    link.download = currentImage.original_name || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!currentImage) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent z-10">
        <div className="text-white">
          <p className="text-sm font-medium">{currentImage.original_name}</p>
          <p className="text-xs text-gray-400">{currentIndex + 1} of {images.length}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isPdf && (
            <>
              <button
                onClick={handleZoomOut}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-white/70 text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={handleZoomIn}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </>
          )}
          <button
            onClick={handleDownload}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-4 p-3 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition-colors z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 p-3 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition-colors z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Content */}
      <div className="flex items-center justify-center w-full h-full p-16">
        {isPdf ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-800 font-medium mb-2">{currentImage.original_name}</p>
            <p className="text-gray-500 text-sm mb-4">PDF files cannot be previewed directly</p>
            <a
              href={`/uploads/${currentImage.file_path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Open PDF
            </a>
          </div>
        ) : (
          <img
            src={`/uploads/${currentImage.file_path}`}
            alt={currentImage.original_name}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
          />
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/50 rounded-lg">
          {images.map((img, idx) => {
            const isThisPdf = img.mime_type === 'application/pdf' || img.original_name?.endsWith('.pdf')
            return (
              <button
                key={img.id || img.file_path}
                onClick={() => { setZoom(1); setCurrentIndex(idx) }}
                className={`w-12 h-12 rounded overflow-hidden border-2 transition-colors ${
                  idx === currentIndex ? 'border-green-500' : 'border-transparent hover:border-white/50'
                }`}
              >
                {isThisPdf ? (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-gray-400" />
                  </div>
                ) : (
                  <img
                    src={`/uploads/${img.file_path}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>,
    document.body
  )
}
