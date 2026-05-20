const NAME_LABEL_PATTERN =
  /((?:学生)?姓名|姓名[^\S\r\n]*\/[^\S\r\n]*学号|学生|Name)[^\S\r\n]*[:：]?[^\S\r\n]*[\u4e00-\u9fa5A-Za-z·. ]{2,24}/gi
const STUDENT_ID_LABEL_PATTERN =
  /((?:学生)?学号|学生编号|Student[^\S\r\n]*ID|Student[^\S\r\n]*No\.?|ID)[^\S\r\n]*[:：]?[^\S\r\n]*[A-Za-z0-9-]{6,24}/gi
const CONTEXTUAL_ID_PATTERN = /(?:编号|ID|No\.?)\s*[:：]?\s*[A-Za-z0-9-]{6,18}/gi

function redactNameLabel(match: string): string {
  const label = match.match(/^(学生姓名|姓名[^\S\r\n]*\/[^\S\r\n]*学号|姓名|学生|Name)/i)?.[1]?.trim() || '姓名'
  const separator = match.includes('：') ? '：' : match.includes(':') ? ':' : '：'
  return `${label}${separator}[已脱敏姓名]`
}

function redactStudentIdLabel(match: string): string {
  const label = match.match(/^(.*?(?:学号|学生编号|Student\s*ID|Student\s*No\.?|ID))/i)?.[1]?.trim() || '学号'
  const separator = match.includes('：') ? '：' : match.includes(':') ? ':' : '：'
  return `${label}${separator}[已脱敏学号]`
}

export function redactSensitiveStudentInfo(text: string): string {
  return text
    .replace(NAME_LABEL_PATTERN, redactNameLabel)
    .replace(STUDENT_ID_LABEL_PATTERN, redactStudentIdLabel)
    .replace(CONTEXTUAL_ID_PATTERN, (match) => {
      const prefix = match.match(/^(.*?(?:编号|ID|No\.?))/i)?.[1]?.trim() || '编号'
      const separator = match.includes('：') ? '：' : match.includes(':') ? ':' : ' '
      return `${prefix}${separator}[已脱敏学号]`
    })
}
