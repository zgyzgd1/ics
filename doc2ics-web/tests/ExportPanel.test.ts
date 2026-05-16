import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ExportPanel } from '../src/components/ExportPanel'

describe('ExportPanel', () => {
  it('labels the ICS file action as download', () => {
    const html = renderToStaticMarkup(
      React.createElement(ExportPanel, {
        calendarName: '课程表',
        timezone: 'Asia/Shanghai',
        exportFilename: 'schedule.ics',
        icsContent: 'BEGIN:VCALENDAR',
        isGenerating: false,
        onCalendarNameChange: () => undefined,
        onTimezoneChange: () => undefined,
        onExportFilenameChange: () => undefined,
        onGenerate: () => undefined,
        onCopy: () => undefined,
        onDownload: () => undefined,
        onShare: () => undefined,
      }),
    )

    expect(html).toContain('下载')
    expect(html).not.toContain('保存</button>')
  })
})
