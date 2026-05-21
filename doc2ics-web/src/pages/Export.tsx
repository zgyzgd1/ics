import { useState } from 'react'
import { ExportPanel } from '../components/ExportPanel'
import { runIcsWorker } from '../core/workers/runIcsWorker'
import { useAppStore } from '../store/appStore'
import { saveIcsToDisk, shareIcsFile } from '../utils/fileUtils'

export default function Export() {
  const events = useAppStore((state) => state.events)
  const timezone = useAppStore((state) => state.timezone)
  const calendarName = useAppStore((state) => state.calendarName)
  const exportFilename = useAppStore((state) => state.exportFilename)
  const icsContent = useAppStore((state) => state.icsContent)

  const setTimezone = useAppStore((state) => state.setTimezone)
  const setCalendarName = useAppStore((state) => state.setCalendarName)
  const setExportFilename = useAppStore((state) => state.setExportFilename)
  const setIcsContent = useAppStore((state) => state.setIcsContent)

  const [isGenerating, setIsGenerating] = useState(false)

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      const response = await runIcsWorker(events, { calendarName, timezone })
      if (response.ok) {
        setIcsContent(response.ics)
      } else {
        setIcsContent(`错误：${response.error}`)
      }
    } catch (error) {
      setIcsContent(`错误：${error instanceof Error ? error.message : '日历文件生成失败'}`)
    }
    setIsGenerating(false)
  }

  async function handleCopy() {
    if (!icsContent) return
    await navigator.clipboard.writeText(icsContent)
  }

  async function handleDownload() {
    if (!icsContent) return
    await saveIcsToDisk(icsContent, exportFilename)
  }

  async function handleShare() {
    if (!icsContent) return
    await shareIcsFile(icsContent, exportFilename)
  }

  return (
    <section className="page-grid">
      <ExportPanel
        calendarName={calendarName}
        timezone={timezone}
        exportFilename={exportFilename}
        icsContent={icsContent}
        isGenerating={isGenerating}
        onCalendarNameChange={setCalendarName}
        onTimezoneChange={setTimezone}
        onExportFilenameChange={setExportFilename}
        onGenerate={handleGenerate}
        onCopy={handleCopy}
        onDownload={handleDownload}
        onShare={handleShare}
      />
    </section>
  )
}
