const NAME_LABEL_PATTERN =
  /((?:学生)?姓名|姓名[^\S\r\n]*\/[^\S\r\n]*学号|Name)[^\S\r\n]*[:：]?[^\S\r\n]*[\u4e00-\u9fa5A-Za-z·. ]{2,24}/gi
const STUDENT_ID_LABEL_PATTERN =
  /((?:学生)?学号|学生编号|Student[^\S\r\n]*ID|Student[^\S\r\n]*No\.?|ID)[^\S\r\n]*[:：]?[^\S\r\n]*[A-Za-z0-9-]{6,24}/gi
const LONG_ID_PATTERN = /(?<![\d-])\d{9,18}(?![\d-])/g

function redactNameLabel(match: string): string {
  const label = match.match(/^(.*?(?:姓名|Name))/i)?.[1]?.trim() || '姓名'
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
    .replace(LONG_ID_PATTERN, '[已脱敏学号]')
}
