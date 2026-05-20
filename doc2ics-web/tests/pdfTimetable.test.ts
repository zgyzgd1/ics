import { describe, expect, it } from 'vitest'
import { extractCourseEventsFromText } from '../src/core/extractor/courseTimetableExtractor'

describe('timeTableForStu12.pdf course extraction', () => {
  it('extracts all courses from the student timetable PDF text', () => {
    // Raw text extracted from timeTableForStu12.pdf
    const text = `我的课程表 2026年春季学期 学生：张光耀(2024214110625) 上课时间暂未确定的课程： 大学生职业发展与就业指导3 [B01731003] 上课周次 上课教师 张晓霞 机械设计基础课程设计 [B04215002] 上课周次 16周 上课教师 徐鹏云 拆装与驾驶实习 [B05214213] 上课周次 17-19周 上课教师 白庆华 调课信息： 节次/星期 星期一 星期二 星期三 星期四 星期五 星期六 星期日 第1小节-第2小节 B04211004-机械设计基础 A[02] 13-14周,星期1,第1小节-第2小节东1教-209(D) B05211205-汽车构造[02] 1-14周,星期2,第1小节-第2小节东1教-409(D) B04211004-机械设计基础 A[02] 1-7周,9-11周(单),13-15周,星期3,第1小节-第2小节东1教-208(D) B04211004-机械设计基础 A[02] 8-12周(双),星期3,第1小节-第2小节无 B05211204-流体力学与热工基础[02] 8-15周,星期4,第1小节-第2小节东1教-210(D) B04211004-机械设计基础 A[02] 1-7周,9-11周(单),13-15周,星期5,第1小节-第2小节东1教-208(D) B04211004-机械设计基础 A[02] 8-12周(双),星期5,第1小节-第2小节无 BM2331003-中华诗词之美[02] 1-2周,13-15周,星期6,第1小节-第2小节东2教-104(D) BM2331003-中华诗词之美[02] 3-12周,星期6,第1小节-第2小节无 第3小节-第4小节 B05211204-流体力学与热工基础[02] 8-15周,星期1,第3小节-第4小节东1教-403(D) B05212203-工程材料与机械制造基础[02] 1-10周,星期2,第3小节-第4小节东1教-210(D) B05211233-汽车单片机与嵌入式技术[02] 9-16周,星期4,第3小节-第4小节东1教-309(D) B01341004-大学英语4[28] 1-8周,星期5,第3小节-第4小节无 B03321005-现代企业管理[02] 10-13周,16-17周,星期6,第3小节-第4小节东1教-103(D) B03321005-现代企业管理[02] 1-5周,9周,星期6,第3小节-第4小节东1教-103(D) B03321005-现代企业管理[02] 14-15周,星期6,第3小节-第4小节无 B03321005-现代企业管理[02] 6-7周,星期6,第3小节-第4小节无 第5小节-第6小节 B01711004-体育4[32] 1-18周,星期1,第5小节-第6小节无 B05212202-材料力学[02] 1-12周,星期2,第5小节-第6小节东1教-301(D) B01301016-毛泽东思想和中国特色社会主义理论体系概论[12] 11周,星期3,第5小节-第6小节东综合楼-307(D) B05212203-工程材料与机械制造基础[02] 1-10周,星期3,第5小节-第6小节东1教-401(D) B01301008-形势与政策4[15] 7周,星期4,第5小节-第6小节东综合楼-205(D) B05212202-材料力学[02] 1-11周,星期5,第5小节-第6小节东1教-301(D) B01301008-形势与政策4[15] 6-7周,9周,星期6,第5小节-第6小节东综合楼-205(D) 第7小节-第8小节 B01301016-毛泽东思想和中国特色社会主义理论体系概论[12] 1-8周,10周,星期1,第7小节-第8小节东1教-207(D) B01341004-大学英语4[28] 1-16周,星期2,第7小节-第8小节东1教-205(D) B05211205-汽车构造[02] 1-14周,星期3,第7小节-第8小节东1教-103(D) B01301016-毛泽东思想和中国特色社会主义理论体系概论[12] 1-4周,星期5,第7小节-第8小节东综合楼-107(D) 第9小节-第10小节 B03211701-智慧农机[03] 1-16周,星期1,第9小节-第10小节东综合楼-105(D) B05213206-汽车构造实验[06] 12-15周,星期2,第9小节-第10小节东工训大楼-机电-智能驾驶实验室-104 B05213206-汽车构造实验[06] 8-11周,星期2,第9小节-第10小节东工训大楼-机电-汽车电器与电子实验室-214 B01301016-毛泽东思想和中国特色社会主义理论体系概论[12] 5-10周,星期4,第9小节-第10小节无 第11小节-第12小节 B05212203-工程材料与机械制造基础[02S04] 9-12周,星期3,第11小节-第12小节东工训大楼-机电-金相制样室-416 B05212202-材料力学[02S04] 10-14周,星期4,第11小节-第12小节东水利楼-材料力学实验室一-118 B05213233-汽车单片机与嵌入式技术实验[06] 8-15周,星期5,第11小节-第12小节东工训大楼-机电-汽车构造与拆装实验室-226`

    const events = extractCourseEventsFromText(text)

    console.log(`Extracted ${events.length} course events:`)
    events.forEach((e, i) => {
      console.log(`${i + 1}. ${e.summary} | ${e.recurrence?.byDay?.[0]} | 周次:${e.course?.weeks} | ${e.location || '无地点'}`)
    })

    // The PDF contains approximately 29 course entries
    expect(events.length).toBeGreaterThanOrEqual(25)

    // Verify key courses are present
    const summaries = events.map((e) => e.summary)
    expect(summaries.some((s) => s.includes('机械设计基础'))).toBe(true)
    expect(summaries.some((s) => s.includes('汽车构造'))).toBe(true)
    expect(summaries.some((s) => s.includes('流体力学'))).toBe(true)
    expect(summaries.some((s) => s.includes('材料力学'))).toBe(true)
    expect(summaries.some((s) => s.includes('大学英语'))).toBe(true)
    expect(summaries.some((s) => s.includes('毛泽东思想'))).toBe(true)
    expect(summaries.some((s) => s.includes('体育'))).toBe(true)
    expect(summaries.some((s) => s.includes('工程材料'))).toBe(true)
    expect(summaries.some((s) => s.includes('形势与政策'))).toBe(true)
    expect(summaries.some((s) => s.includes('现代企业管理'))).toBe(true)
    expect(summaries.some((s) => s.includes('中华诗词'))).toBe(true)
    expect(summaries.some((s) => s.includes('智慧农机'))).toBe(true)
    expect(summaries.some((s) => s.includes('汽车单片机'))).toBe(true)
  })
})
