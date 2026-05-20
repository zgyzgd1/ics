import { format } from 'date-fns'

const supportedExtensions = new Set(['pdf', 'docx', 'xlsx', 'xls', 'csv', 'txt', 'md'])

export function getFileExtension(fileName: string): string {
  const raw = fileName.split('.').pop()?.toLowerCase() ?? ''
  return raw.trim()
}

export function detectFileKind(fileName: string, mimeType: string): 'pdf' | 'docx' | 'xlsx' | 'csv' | 'txt' | 'unknown' {
  const ext = getFileExtension(fileName)

  if (ext === 'pdf' || mimeType.includes('pdf')) return 'pdf'
  if (ext === 'docx' || mimeType.includes('wordprocessingml')) return 'docx'
  if (ext === 'xlsx' || ext === 'xls' || mimeType.includes('spreadsheetml')) return 'xlsx'
  if (ext === 'csv' || mimeType.includes('csv')) return 'csv'
  if (ext === 'txt' || ext === 'md' || mimeType.startsWith('text/')) return 'txt'

  return 'unknown'
}

export function assertSupportedFile(fileName: string): void {
  const ext = getFileExtension(fileName)
  if (!supportedExtensions.has(ext)) {
    throw new Error(`不支持的文件类型：.${ext || '未知'}`)
  }
}

export function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function buildDefaultIcsFilename(inputName: string): string {
  const base = inputName.replace(/\.[^.]+$/, '')
  const stamp = format(new Date(), 'yyyyMMdd-HHmmss')
  return `${base || '日程'}-${stamp}.ics`
}

export async function saveIcsToDisk(content: string, filename: string): Promise<void> {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function shareIcsFile(content: string, filename: string): Promise<boolean> {
  if (!navigator.share) {
    return false
  }

  const file = new File([content], filename, { type: 'text/calendar' })
  const shareData: ShareData = { files: [file], title: filename }

  if (navigator.canShare && !navigator.canShare(shareData)) {
    return false
  }

  try {
    await navigator.share(shareData)
    return true
  } catch {
    return false
  }
}
