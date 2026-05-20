import { describe, expect, it } from 'vitest'
import { extractCourseEventsFromText } from '../src/core/extractor/courseTimetableExtractor'

describe('timeTableForStu12.pdf - no duplicates, no missing courses', () => {
  const text = `我的课程表 2026年春季学期 学生：张光耀(2024214110625) 上课时间暂未确定的课程： 大学生职业发展与就业指导3 [B01731003] 上课周次 上课教师 张晓霞 机械设计基础课程设计 [B04215002] 上课周次 16周 上课教师 徐鹏云 拆装与驾驶实习 [B05214213] 上课周次 17-19周 上课教师 白庆华 调课信息： 节次/星期 星期一 星期二 星期三 星期四 星期五 星期六 星期日 第1小节-第2小节 B04211004-机械设计基础 A[02] 13-14周,星期1,第1小节-第2小节东1教-209(D) B05211205-汽车构造[02] 1-14周,星期2,第1小节-第2小节东1教-409(D) B04211004-机械设计基础 A[02] 1-7周,9-11周(单),13-15周,星期3,第1小节-第2小节东1教-208(D) B04211004-机械设计基础 A[02] 8-12周(双),星期3,第1小节-第2小节无 B05211204-流体力学与热工基础[02] 8-15周,星期4,第1小节-第2小节东1教-210(D) B04211004-机械设计基础 A[02] 1-7周,9-11周(单),13-15周,星期5,第1小节-第2小节东1教-208(D) B04211004-机械设计基础 A[02] 8-12周(双),星期5,第1小节-第2小节无 BM2331003-中华诗词之美[02] 1-2周,13-15周,星期6,第1小节-第2小节东2教-104(D) BM2331003-中华诗词之美[02] 3-12周,星期6,第1小节-第2小节无 第3小节-第4小节 B05211204-流体力学与热工基础[02] 8-15周,星期1,第3小节-第4小节东1教-403(D) B05212203-工程材料与机械制造基础[02] 1-10周,星期2,第3小节-第4小节东1教-210(D) B05211233-汽车单片机与嵌入式技术[02] 9-16周,星期4,第3小节-第4小节东1教-309(D) B01341004-大学英语4[28] 1-8周,星期5,第3小节-第4小节无 B03321005-现代企业管理[02] 10-13周,16-17周,星期6,第3小节-第4小节东1教-103(D) B03321005-现代企业管理[02] 1-5周,9周,星期6,第3小节-第4小节东1教-103(D) B03321005-现代企业管理[02] 14-15周,星期6,第3小节-第4小节无 B03321005-现代企业管理[02] 6-7周,星期6,第3小节-第4小节无 第5小节-第6小节 B01711004-体育4[32] 1-18周,星期1,第5小节-第6小节无 B05212202-材料力学[02] 1-12周,星期2,第5小节-第6小节东1教-301(D) B01301016-毛泽东思想和中国特色社会主义理论体系概论[12] 11周,星期3,第5小节-第6小节东综合楼-307(D) B05212203-工程材料与机械制造基础[02] 1-10周,星期3,第5小节-第6小节东1教-401(D) B01301008-形势与政策4[15] 7周,星期4,第5小节-第6小节东综合楼-205(D) B05212202-材料力学[02] 1-11周,星期5,第5小节-第6小节东1教-301(D) B01301008-形势与政策4[15] 6-7周,9周,星期6,第5小节-第6小节东综合楼-205(D) 第7小节-第8小节 B01301016-毛泽东思想和中国特色社会主义理论体系概论[12] 1-8周,10周,星期1,第7小节-第8小节东1教-207(D) B01341004-大学英语4[28] 1-16周,星期2,第7小节-第8小节东1教-205(D) B05211205-汽车构造[02] 1-14周,星期3,第7小节-第8小节东1教-103(D) B01301016-毛泽东思想和中国特色社会主义理论体系概论[12] 1-4周,星期5,第7小节-第8小节东综合楼-107(D) 第9小节-第10小节 B03211701-智慧农机[03] 1-16周,星期1,第9小节-第10小节东综合楼-105(D) B05213206-汽车构造实验[06] 12-15周,星期2,第9小节-第10小节东工训大楼-机电-智能驾驶实验室-104 B05213206-汽车构造实验[06] 8-11周,星期2,第9小节-第10小节东工训大楼-机电-汽车电器与电子实验室-214 B01301016-毛泽东思想和中国特色社会主义理论体系概论[12] 5-10周,星期4,第9小节-第10小节无 第11小节-第12小节 B05212203-工程材料与机械制造基础[02S04] 9-12周,星期3,第11小节-第12小节东工训大楼-机电-金相制样室-416 B05212202-材料力学[02S04] 10-14周,星期4,第11小节-第12小节东水利楼-材料力学实验室一-118 B05213233-汽车单片机与嵌入式技术实验[06] 8-15周,星期5,第11小节-第12小节东工训大楼-机电-汽车构造与拆装实验室-226`

  it('extracts exactly 35 courses - no duplicates, no missing', () => {
    const events = extractCourseEventsFromText(text)

    expect(events).toHaveLength(35)

    const byDay = (e: any) => e.recurrence?.byDay?.[0]
    const weeks = (e: any) => e.course?.weeks
    const location = (e: any) => e.location || '无'

    const find = (summary: string, day: string) => events.find(e => e.summary.includes(summary) && byDay(e) === day)

    const e1 = find('机械设计基础', 'MO')
    expect(e1).toBeDefined()
    expect(weeks(e1)).toBe('13,14')
    expect(location(e1)).toBe('东1教-209(D)')

    const e2 = find('汽车构造', 'TU')
    expect(e2).toBeDefined()
    expect(weeks(e2)).toBe('1,2,3,4,5,6,7,8,9,10,11,12,13,14')
    expect(location(e2)).toBe('东1教-409(D)')

    const e3 = find('机械设计基础', 'WE')
    expect(e3).toBeDefined()
    expect(weeks(e3)).toBe('1,2,3,4,5,6,7,9,11,13,14,15')
    expect(location(e3)).toBe('东1教-208(D)')

    const e4 = events.filter(e => e.summary.includes('机械设计基础') && byDay(e) === 'WE')
    expect(e4).toHaveLength(2)
    expect(weeks(e4[1])).toBe('8,10,12')

    const e5 = find('流体力学', 'TH')
    expect(e5).toBeDefined()
    expect(weeks(e5)).toBe('8,9,10,11,12,13,14,15')
    expect(location(e5)).toBe('东1教-210(D)')

    const e6 = find('机械设计基础', 'FR')
    expect(e6).toBeDefined()
    expect(weeks(e6)).toBe('1,2,3,4,5,6,7,9,11,13,14,15')
    expect(location(e6)).toBe('东1教-208(D)')

    const e7 = events.filter(e => e.summary.includes('机械设计基础') && byDay(e) === 'FR')
    expect(e7).toHaveLength(2)
    expect(weeks(e7[1])).toBe('8,10,12')

    const e8 = find('中华诗词', 'SA')
    expect(e8).toBeDefined()
    expect(weeks(e8)).toBe('1,2,13,14,15')
    expect(location(e8)).toBe('东2教-104(D)')

    const e9 = events.filter(e => e.summary.includes('中华诗词') && byDay(e) === 'SA')
    expect(e9).toHaveLength(2)
    expect(weeks(e9[1])).toBe('3,4,5,6,7,8,9,10,11,12')

    const e10 = find('流体力学', 'MO')
    expect(e10).toBeDefined()
    expect(weeks(e10)).toBe('8,9,10,11,12,13,14,15')
    expect(location(e10)).toBe('东1教-403(D)')

    const e11 = find('工程材料', 'TU')
    expect(e11).toBeDefined()
    expect(weeks(e11)).toBe('1,2,3,4,5,6,7,8,9,10')
    expect(location(e11)).toBe('东1教-210(D)')

    const e12 = find('汽车单片机', 'TH')
    expect(e12).toBeDefined()
    expect(weeks(e12)).toBe('9,10,11,12,13,14,15,16')
    expect(location(e12)).toBe('东1教-309(D)')

    const e13 = find('大学英语', 'FR')
    expect(e13).toBeDefined()
    expect(weeks(e13)).toBe('1,2,3,4,5,6,7,8')

    const e14 = find('现代企业', 'SA')
    expect(e14).toBeDefined()
    expect(weeks(e14)).toBe('10,11,12,13,16,17')
    expect(location(e14)).toBe('东1教-103(D)')

    const modernMgmt = events.filter(e => e.summary.includes('现代企业') && byDay(e) === 'SA')
    expect(modernMgmt).toHaveLength(4)
    expect(weeks(modernMgmt[1])).toBe('1,2,3,4,5,9')
    expect(weeks(modernMgmt[2])).toBe('14,15')
    expect(weeks(modernMgmt[3])).toBe('6,7')

    const e18 = find('体育', 'MO')
    expect(e18).toBeDefined()
    expect(weeks(e18)).toBe('1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18')

    const e19 = find('材料力学', 'TU')
    expect(e19).toBeDefined()
    expect(weeks(e19)).toBe('1,2,3,4,5,6,7,8,9,10,11,12')
    expect(location(e19)).toBe('东1教-301(D)')

    const e20 = find('毛泽东思想', 'WE')
    expect(e20).toBeDefined()
    expect(weeks(e20)).toBe('11')
    expect(location(e20)).toBe('东综合楼-307(D)')

    const e21 = events.filter(e => e.summary.includes('工程材料') && byDay(e) === 'WE')
    expect(e21).toHaveLength(2)
    expect(weeks(e21[0])).toBe('1,2,3,4,5,6,7,8,9,10')
    expect(location(e21[0])).toBe('东1教-401(D)')
    expect(weeks(e21[1])).toBe('9,10,11,12')
    expect(location(e21[1])).toBe('东工训大楼-机电-金相制样室-416')

    const e22 = find('形势与政策', 'TH')
    expect(e22).toBeDefined()
    expect(weeks(e22)).toBe('7')
    expect(location(e22)).toBe('东综合楼-205(D)')

    const e23 = find('材料力学', 'FR')
    expect(e23).toBeDefined()
    expect(weeks(e23)).toBe('1,2,3,4,5,6,7,8,9,10,11')
    expect(location(e23)).toBe('东1教-301(D)')

    const e24 = events.filter(e => e.summary.includes('形势与政策') && byDay(e) === 'SA')
    expect(e24).toHaveLength(1)
    expect(weeks(e24[0])).toBe('6,7,9')
    expect(location(e24[0])).toBe('东综合楼-205(D)')

    const e25 = find('毛泽东思想', 'MO')
    expect(e25).toBeDefined()
    expect(weeks(e25)).toBe('1,2,3,4,5,6,7,8,10')
    expect(location(e25)).toBe('东1教-207(D)')

    const e26 = find('大学英语', 'TU')
    expect(e26).toBeDefined()
    expect(weeks(e26)).toBe('1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16')
    expect(location(e26)).toBe('东1教-205(D)')

    const e27 = find('汽车构造', 'WE')
    expect(e27).toBeDefined()
    expect(weeks(e27)).toBe('1,2,3,4,5,6,7,8,9,10,11,12,13,14')
    expect(location(e27)).toBe('东1教-103(D)')

    const e28 = events.filter(e => e.summary.includes('毛泽东思想') && byDay(e) === 'FR')
    expect(e28).toHaveLength(1)
    expect(weeks(e28[0])).toBe('1,2,3,4')
    expect(location(e28[0])).toBe('东综合楼-107(D)')

    const e29 = find('智慧农机', 'MO')
    expect(e29).toBeDefined()
    expect(weeks(e29)).toBe('1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16')
    expect(location(e29)).toBe('东综合楼-105(D)')

    const autoExp = events.filter(e => e.summary.includes('汽车构造实验'))
    expect(autoExp).toHaveLength(2)
    expect(weeks(autoExp[0])).toBe('12,13,14,15')
    expect(location(autoExp[0])).toBe('东工训大楼-机电-智能驾驶实验室-104')
    expect(weeks(autoExp[1])).toBe('8,9,10,11')
    expect(location(autoExp[1])).toBe('东工训大楼-机电-汽车电器与电子实验室-214')

    const e32 = events.filter(e => e.summary.includes('毛泽东思想') && byDay(e) === 'TH')
    expect(e32).toHaveLength(1)
    expect(weeks(e32[0])).toBe('5,6,7,8,9,10')

    const e34 = events.filter(e => e.summary.includes('材料力学') && byDay(e) === 'TH')
    expect(e34).toHaveLength(1)
    expect(weeks(e34[0])).toBe('10,11,12,13,14')
    expect(location(e34[0])).toBe('东水利楼-材料力学实验室一-118')

    const e35 = find('汽车单片机与嵌入式技术实验', 'FR')
    expect(e35).toBeDefined()
    expect(weeks(e35)).toBe('8,9,10,11,12,13,14,15')
    expect(location(e35)).toBe('东工训大楼-机电-汽车构造与拆装实验室-226')
  })

  it('correctly handles odd/even week parity', () => {
    const events = extractCourseEventsFromText(text)

    const oddWeeks = events.filter(e => {
      const w = e.course?.weeks || ''
      return w.includes('9,11') && !w.includes('10')
    })
    expect(oddWeeks.length).toBeGreaterThanOrEqual(2)

    const evenWeeks = events.filter(e => {
      const w = e.course?.weeks || ''
      return w === '8,10,12'
    })
    expect(evenWeeks.length).toBeGreaterThanOrEqual(2)
  })

  it('has no duplicate event IDs', () => {
    const events = extractCourseEventsFromText(text)
    const ids = events.map(e => e.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })
})
