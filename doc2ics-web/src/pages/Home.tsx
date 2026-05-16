import { useState } from 'react'
import { EnhancementPanel } from '../components/EnhancementPanel'
import { FileDrop } from '../components/FileDrop'
import { runParseWorker } from '../core/workers/runParseWorker'
import { useAppStore } from '../store/appStore'
import type { ParseProgress } from '../types/app'
import { assertSupportedFile } from '../utils/fileUtils'

export default function Home() {
  const [parseProgress, setParseProgress] = useState<ParseProgress | null>(null)
  const selectedFile = useAppStore((state) => state.selectedFile)
  const parseStatus = useAppStore((state) => state.parseStatus)
  const errorMessage = useAppStore((state) => state.errorMessage)
  const recognitionSettings = useAppStore((state) => state.recognitionSettings)
  const setFile = useAppStore((state) => state.setFile)
  const startParsing = useAppStore((state) => state.startParsing)
  const finishParsing = useAppStore((state) => state.finishParsing)
  const failParsing = useAppStore((state) => state.failParsing)
  const updateOcrSettings = useAppStore((state) => state.updateOcrSettings)
  const updateAiSettings = useAppStore((state) => state.updateAiSettings)

  function handleFileSelected(file: File) {
    setParseProgress(null)
    setFile(file)
  }

  async function handleParse() {
    if (!selectedFile) {
      setParseProgress(null)
      failParsing('请先选择文件再解析。')
      return
    }

    try {
      assertSupportedFile(selectedFile.name)
      setParseProgress({ percent: 0, status: '等待开始' })
      startParsing()

      const response = await runParseWorker(selectedFile, recognitionSettings, setParseProgress)
      if (!response.ok) {
        setParseProgress((current) => ({
          percent: current?.percent ?? 100,
          status: '解析失败',
          detail: response.error,
        }))
        failParsing(response.error)
        return
      }

      setParseProgress({
        percent: 100,
        status: '解析完成',
        detail: `识别到 ${response.events.length} 个日程`,
      })
      finishParsing(response.outcome, response.events)
    } catch (error) {
      const message = error instanceof Error ? error.message : '解析失败'
      setParseProgress({ percent: 100, status: '解析失败', detail: message })
      failParsing(message)
    }
  }

  const visibleParseProgress = selectedFile ? parseProgress : null
  const progressPercent = visibleParseProgress?.percent ?? 0

  return (
    <section className="page-grid">
      <FileDrop selectedFile={selectedFile} onFileSelected={handleFileSelected} disabled={parseStatus === 'parsing'} />

      <div className="side-stack">
        <EnhancementPanel
          settings={recognitionSettings}
          onOcrChange={updateOcrSettings}
          onAiChange={updateAiSettings}
          disabled={parseStatus === 'parsing'}
        />

        <section className="panel">
          <h3>处理</h3>
          <p className="muted">
            所有处理都在你的浏览器本地完成，不会上传任何文件到服务器。
          </p>

          <button type="button" onClick={handleParse} disabled={!selectedFile || parseStatus === 'parsing'}>
            {parseStatus === 'parsing' ? '正在解析文档...' : '解析文档'}
          </button>

          {visibleParseProgress && (
            <div className={`parse-progress ${parseStatus === 'error' ? 'is-error' : ''}`} aria-live="polite">
              <div className="parse-progress-header">
                <span>{visibleParseProgress.status}</span>
                <span>{progressPercent}%</span>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-label="解析进度"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent}
              >
                <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              {visibleParseProgress.detail && <p className="parse-progress-detail">{visibleParseProgress.detail}</p>}
            </div>
          )}

          {parseStatus === 'parsed' && <p className="success">解析完成，请继续预览。</p>}
          {parseStatus === 'error' && errorMessage && <p className="error">{errorMessage}</p>}
        </section>
      </div>
    </section>
  )
}
