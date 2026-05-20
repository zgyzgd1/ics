import { describe, expect, it } from 'vitest'
import { redactSensitiveStudentInfo } from '../src/core/privacy/privacyRedactor'

describe('redactSensitiveStudentInfo', () => {
  it('redacts student names and ids while keeping timetable clues', () => {
    const text = [
      '学生姓名：张三',
      '学号：202312345678',
      '课程名称：高等数学',
      '上课时间：2026-09-07 08:00-09:40',
      '地点：教学楼 A101',
      '备用编号 202398765432',
    ].join('\n')

    const redacted = redactSensitiveStudentInfo(text)

    expect(redacted).toContain('学生姓名：[已脱敏姓名]')
    expect(redacted).toContain('学号：[已脱敏学号]')
    expect(redacted).toContain('备用编号 [已脱敏学号]')
    expect(redacted).toContain('课程名称：高等数学')
    expect(redacted).toContain('2026-09-07 08:00-09:40')
    expect(redacted).toContain('教学楼 A101')
    expect(redacted).not.toContain('张三')
    expect(redacted).not.toContain('202312345678')
    expect(redacted).not.toContain('202398765432')
  })

  it('redacts timetable owner written as student label before an id', () => {
    const text = '我的课程表 2026年春季学期 学生：张三([已脱敏学号]) B04211004-机械设计基础 A[02]'

    const redacted = redactSensitiveStudentInfo(text)

    expect(redacted).toContain('学生：[已脱敏姓名]([已脱敏学号])')
    expect(redacted).toContain('机械设计基础')
    expect(redacted).not.toContain('张三')
  })
})
