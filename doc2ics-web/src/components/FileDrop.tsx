import { useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'
import { formatFileSize } from '../utils/fileUtils'

interface FileDropProps {
  selectedFile: File | null
  disabled?: boolean
  onFileSelected: (file: File) => void
}

export function FileDrop({ selectedFile, disabled = false, onFileSelected }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)

    if (disabled) {
      return
    }

    const file = event.dataTransfer.files?.[0]
    if (file) {
      onFileSelected(file)
    }
  }

  function handlePickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      onFileSelected(file)
    }
  }

  return (
    <div
      className={`file-drop ${isDragging ? 'is-dragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          inputRef.current?.click()
        }
      }}
      onClick={() => {
        if (!disabled) {
          inputRef.current?.click()
        }
      }}
      aria-disabled={disabled}
    >
      <UploadCloud size={28} />
      <h2>将文档拖到这里</h2>
      <p>支持格式：PDF 文档、Word 文档、Excel 表格、逗号分隔表、纯文本</p>

      {selectedFile && (
        <p className="selected-file">
          {selectedFile.name} ({formatFileSize(selectedFile.size)})
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden-input"
        accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md"
        onChange={handlePickFile}
        disabled={disabled}
      />
    </div>
  )
}
