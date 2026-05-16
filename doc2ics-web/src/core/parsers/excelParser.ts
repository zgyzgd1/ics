import * as XLSX from 'xlsx'

function normalizeCell(value: unknown): string {
  if (value == null) return ''
  return String(value).trim()
}

export async function extractTextFromExcel(bytes: Uint8Array): Promise<string> {
  const workbook = XLSX.read(bytes, { type: 'array' })
  const chunks: string[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Array<unknown>>(sheet, {
      header: 1,
      blankrows: false,
      raw: false,
    })

    const normalized = rows
      .map((row) => row.map((cell) => normalizeCell(cell)).join(' | ').trim())
      .filter(Boolean)

    chunks.push(`# ${sheetName}`)
    chunks.push(...normalized)
  }

  return chunks.join('\n').trim()
}
