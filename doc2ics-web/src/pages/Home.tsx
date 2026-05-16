import { EnhancementPanel } from '../components/EnhancementPanel'
import { FileDrop } from '../components/FileDrop'
import { runParseWorker } from '../core/workers/runParseWorker'
import { useAppStore } from '../store/appStore'
import { assertSupportedFile } from '../utils/fileUtils'

export default function Home() {
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

  async function handleParse() {
    if (!selectedFile) {
      failParsing('请先选择文件再解析。')
      return
    }

    try {
      assertSupportedFile(selectedFile.name)
      startParsing()

      const response = await runParseWorker(selectedFile, recognitionSettings)
      if (!response.ok) {
        failParsing(response.error)
        return
      }

      finishParsing(response.outcome, response.events)
    } catch (error) {
      failParsing(error instanceof Error ? error.message : '解析失败')
    }
  }

  return (
    <section className="page-grid">
      <FileDrop selectedFile={selectedFile} onFileSelected={setFile} disabled={parseStatus === 'parsing'} />

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

          {parseStatus === 'parsed' && <p className="success">解析完成，请继续预览。</p>}
          {parseStatus === 'error' && errorMessage && <p className="error">{errorMessage}</p>}
        </section>
      </div>
    </section>
  )
}
