import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import Home from './pages/Home'
import Preview from './pages/Preview'
import Mapping from './pages/Mapping'
import Export from './pages/Export'
import { useAppStore } from './store/appStore'

function stepIsEnabled(step: 'preview' | 'mapping' | 'export', hasParsed: boolean, eventsCount: number): boolean {
  if (step === 'preview') return hasParsed
  if (step === 'mapping') return hasParsed
  return hasParsed && eventsCount > 0
}

export default function App() {
  const parseStatus = useAppStore((state) => state.parseStatus)
  const events = useAppStore((state) => state.events)
  const reset = useAppStore((state) => state.reset)

  const hasParsed = parseStatus === 'parsed'

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Doc2ICS 网页版</h1>
          <p>浏览器端文档转日历工具，支持离线使用</p>
        </div>

        <div className="inline-group">
          <Link to="/" className="button-link">
            首页
          </Link>
          <button type="button" onClick={reset}>
            重置
          </button>
        </div>
      </header>

      <nav className="step-nav">
        <NavLink to="/" end>
          1. 上传
        </NavLink>
        <NavLink to={stepIsEnabled('preview', hasParsed, events.length) ? '/preview' : '/'}>
          2. 预览
        </NavLink>
        <NavLink to={stepIsEnabled('mapping', hasParsed, events.length) ? '/mapping' : '/'}>
          3. 映射
        </NavLink>
        <NavLink to={stepIsEnabled('export', hasParsed, events.length) ? '/export' : '/'}>
          4. 导出
        </NavLink>
      </nav>

      <main>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/preview" element={hasParsed ? <Preview /> : <Navigate to="/" replace />} />
            <Route path="/mapping" element={hasParsed ? <Mapping /> : <Navigate to="/" replace />} />
            <Route
              path="/export"
              element={hasParsed && events.length > 0 ? <Export /> : <Navigate to="/" replace />}
            />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  )
}
