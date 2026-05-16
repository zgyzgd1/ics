import { OfficeParser } from 'officeparser'

export async function extractTextFromOffice(bytes: Uint8Array): Promise<string> {
  const ast = await OfficeParser.parseOffice(bytes, {
    newlineDelimiter: '\n',
    ocr: false,
    pdfWorkerSrc: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/build/pdf.worker.min.mjs',
  })

  return ast.toText().trim()
}
