# Doc2ICS — 文档转日历工具

将 **PDF、Word（.docx）、Excel（.xlsx）** 文件转换为标准 **ICS（iCalendar）** 日历文件。

支持**扫描件 OCR**（Tesserocr / EasyOCR）、智能日期识别、图形化映射界面。

---

## 目录

1. [项目概述](#1-项目概述)
2. [开源库全景图](#2-开源库全景图)
   - [文档解析库](#21-文档解析库)
   - [OCR 引擎](#22-ocr-引擎)
   - [日期/时间提取库](#23-日期时间提取库)
   - [ICS 生成库](#24-ics-生成库)
   - [GUI 框架](#25-gui-框架)
3. [完整的开源参考项目](#3-完整的开源参考项目)
4. [技术方案对比](#4-技术方案对比)
5. [推荐方案：Python + PyQt6 + Tesserocr](#5-推荐方案python--pyqt6--tesserocr)
6. [架构设计](#6-架构设计)
7. [OCR 集成设计](#7-ocr-集成设计)
8. [开发计划](#8-开发计划)
9. [项目结构](#9-项目结构)
10. [安装与环境配置](#10-安装与环境配置)
11. [快速原型](#11-快速原型)

---

## 1. 项目概述

### 目标
开发一款**桌面 GUI 工具**，让用户从 PDF、Word、Excel 文件中**智能提取时间事件信息**，生成 RFC 5545 兼容的 `.ics` 文件。

### 核心挑战
- PDF/Word/Excel **没有标准的事件表示方式**
- 扫描件 PDF 需要 **OCR** 才能提取文本
- 需要从自然语言中**智能识别日期、时间、标题**
- 用户需要**可视化确认和修正**映射关系

### 核心工作流

```
输入文件 ─► 文档解析 ─► 智能识别 ─► 用户确认 ─► ICS 生成
(PDF/DOCX/XLSX)   (OCR↓)     (日期+事件)   (映射修正)   (.ics)
```

---

## 2. 开源库全景图

### 2.1 文档解析库

#### PDF 解析

| 库名 | Stars | 协议 | 说明 | 选用建议 |
|------|-------|------|------|----------|
| **PyMuPDF** (fitz) | 8.5k+ | AGPL/商业 | 高性能 C 引擎，文本/表格/图片提取，支持 Office 格式（Pro 版） | **通用文本提取首选** |
| **pdfplumber** | 5.5k+ | MIT | 基于 pdfminer，**表格提取能力最强** | **课表/排班类 PDF 首选** |
| **pypdf** (原 PyPDF2) | 8k+ | BSD | 纯 Python，文本提取稳定 | 轻量场景 |
| **pdfminer.six** | 6k+ | MIT | 底层 PDF 解析，精确度高 | 需要精细控制时 |
| **pdf2image** | 5k+ | MIT | PDF → 图片（OCR 前置步骤） | **OCR 流程必需** |

**推荐组合：**
- 普通 PDF → **PyMuPDF** 直接提取文本
- 含表格 PDF → **pdfplumber** 提取表格
- 扫描件 PDF → **pdf2image** → **OCR 引擎**

#### Word 解析

| 库名 | Stars | 协议 | 说明 |
|------|-------|------|------|
| **python-docx** | 5k+ | MIT | 读写 .docx，支持段落、表格、样式 |
| **textract** | 2.5k+ | MIT | 统一接口包装多种格式 |
| **python-docx2txt** | 400+ | MIT | 纯文本提取，更简洁 |

**推荐：`python-docx`**

#### Excel 解析

| 库名 | Stars | 协议 | 说明 |
|------|-------|------|------|
| **openpyxl** | 6k+ | MIT | 读写 .xlsx，完美支持表格/公式/样式 |
| **pandas** | 45k+ | BSD | `pd.read_excel()` 一行读取 |
| **xlrd / xlwt** | — | BSD | 旧版 .xls 格式（维护模式） |
| **pyxlsb** | — | Apache | 读取 .xlsb 二进制 Excel |

**推荐：`openpyxl` + `pandas`**

---

### 2.2 OCR 引擎

当输入是**扫描件 PDF**（不可选中的文本）时，需要 OCR。

| 引擎 | Python 封装 | 准确率 | 速度 | GPU | 体积 | 语言 | 推荐场景 |
|------|------------|--------|------|-----|------|------|----------|
| **Tesseract 5** | **pytesseract / tesserocr** | 89-93% | ★★★★★ | 否 | ~10MB | 100+ | CPU 环境，印刷体文档 |
| **EasyOCR** | easyocr | **96-97%** | ★★★☆☆ | **是** | ~500MB | 80+ | **精度优先，有 GPU** |
| **PaddleOCR** | paddleocr | 91-93% | ★★★★☆ | 是 | ~300MB | 80+ | 中文场景最优 |
| **KerasOCR** | keras-ocr | 72-89% | ★★☆☆☆ | 是 | ~200MB | 有限 | 学术研究 |

#### OCR 对比详情

```
指标               Tesseract 5        EasyOCR
──────────────────────────────────────────────
平均准确率          89.3%              96.8%
处理速度(单图)       0.82s             2.45s
字符错误            4/100             0/100
依赖体积            ~10MB             ~500MB
GPU 支持            否                 是
安装复杂度          简单               中等
```

#### OCR 推荐策略（3 级）

```
1️⃣ 首选：pdfplumber/PyMuPDF 直接提取文本（数字 PDF，最快）

2️⃣ 次选：TesserOCR 引擎
   └─ python-tesserocr（C++ 直接绑定，比 pytesseract 快 2-3x）
   └─ 适用：清晰印刷体、CPU 环境

3️⃣ 备选：EasyOCR 引擎
   └─ 适用：扫描质量差、手写体、有 GPU 加速
```

**核心依赖链（OCR 管线）：**

```python
# 扫描件 PDF → 图片 → OCR → 文本
from pdf2image import convert_from_path
import tesserocr                          # 或 easyocr

# step 1: PDF 每页转图片
images = convert_from_path("扫描件.pdf", dpi=300)

# step 2: OCR 识别每页
for img in images:
    text = tesserocr.image_to_text(img)   # 直接传 PIL Image，无需临时文件
```

---

### 2.3 日期/时间提取库

| 库名 | Stars | 说明 |
|------|-------|------|
| **dateparser** | 2.5k+ | 支持 200+ 语言，`search_dates()` 从长文本中发现日期 |
| **datefinder** | 1.3k+ | 专为从非结构化文本中提取日期设计 |
| **python-dateutil** | 官网 | `dateutil.parser.parse()` 解析任意格式日期字符串 |
| **duckling** | 3.5k+ | Facebook 的 NLP 日期/时间实体提取 |

**推荐组合：**
- 文本中搜索日期 → **dateparser.search_dates()**
- 已知字符串解析 → **dateutil.parser.parse()**（备用 **dateparser.parse()**）
- 英文为主 → **datefinder**（更轻量）

```python
# dateparser — 从长文本中发现所有日期
import dateparser
matches = dateparser.search.search_dates(
    "Meeting on Jan 15, 2024 at 14:30. Deadline: 2024-03-01."
)
# 输出: [('Jan 15, 2024 at 14:30', datetime(...)), ('2024-03-01', datetime(...))]

# dateutil — 解析单个日期字符串
from dateutil.parser import parse
dt = parse("next Monday at 3pm", default=datetime.now())
```

---

### 2.4 ICS 生成库

| 库名 | 语言 | Stars | 说明 | 选用建议 |
|------|------|-------|------|----------|
| **ics.py** | Python | 1.2k+ | **最 Pythonic**，API 简洁 | **Python 项目首选** |
| **icalendar** | Python | 700+ | RFC 5545 完整实现，2005 年起 | 需要完整 RFC 支持 |
| **allenporter/ical** | Python | 42 | 新生代，专注重复事件 | 复杂 RRULE 场景 |
| **ical-generator** | TS | 846 | Node.js 最佳 ICS 生成库 | Node.js 项目 |
| **ics** (adamgibbons) | TS | 470+ | Node.js 简单生成 | 轻量 Node.js |
| **datebook** | TS | 339 | 支持多日历 URL 生成 | Web 前端 |

```python
# ics.py — 创建 ICS
from ics import Calendar, Event
from datetime import datetime

cal = Calendar()
e = Event()
e.summary = "团队周会"
e.begin = datetime(2024, 6, 6, 14, 0)
e.end = datetime(2024, 6, 6, 15, 0)
e.location = "会议室 A"
e.description = "每周同步"
cal.events.add(e)

with open("meeting.ics", "w", newline="") as f:
    f.write(cal.serialize())
```

---

### 2.5 GUI 框架

| 框架 | 学习曲线 | 打包体积 | 外观 | 授权 | 推荐场景 |
|------|----------|----------|------|------|----------|
| **Tkinter** | ★☆☆☆☆ | ~10MB | 较旧 | Python 内置 | 简单工具，快速原型 |
| **CustomTkinter** | ★★☆☆☆ | ~15MB | 现代 | MIT | Tkinter 现代外观 |
| **PyQt6 / PySide6** | ★★★☆☆ | ~50-150MB | 原生 | GPL/LGPL | **专业桌面应用** |
| **wxPython** | ★★★☆☆ | ~20-40MB | 原生 | wxWindows | 轻量原生应用 |
| **PySimpleGUI** | ★☆☆☆☆ | ~15MB | 一般 | LGPL | 快速开发 |
| **Flet** | ★★☆☆☆ | ~30MB | 现代(Flutter) | Apache | 现代跨平台 |
| **Kivy** | ★★★☆☆ | ~30MB | 自绘 | MIT | 多点触控 |

**推荐策略：**

```
快速原型 / 个人工具  →  Tkinter + ttkbootstrap
专业桌面应用         →  PySide6（LGPL 友好授权）
现代外观 + 轻量      →  CustomTkinter
```

---

## 3. 完整的开源参考项目

从 GitHub 上找到的**直接相关**的开源项目，可以作为代码参考和架构借鉴：

| 项目 | 功能 | 语言 | Stars | 可借鉴点 |
|------|------|------|-------|----------|
| [Timetable-to-Calendar](https://github.com/Al-rimi/Timetable-to-Calendar) | PDF 课表 → ICS | Python | 4 | **完整架构**：pdfplumber 解析 + Tkinter GUI + PyInstaller 打包 + `ics` 库生成。含 `build_ics()` 核心函数、`gui_win.py` 参考实现 |
| [ICSExtractor](https://github.com/franz-sw/ICSExtractor) | XLSX 排班表 → ICS | Kotlin | — | **交互式字段映射思路**：用户选择"哪列是日期/哪列是人员"，Compose Multiplatform |
| [icsConverter](https://github.com/n8henrie/icsConverter) | CSV → ICS | Python | 47 | 经典 CSV 映射设计，有 Web 版参考 |
| [csv2ical](https://github.com/rlan/csv2ical) | CSV → ICS | Python | — | 轻量 CLI，RFC 5545 兼容输出参考 |
| [yaml2ics](https://github.com/scientific-python/yaml2ics) | YAML → ICS | Python | — | 结构化数据 → ICS 模板，含 `timezone` / `rrule` 支持 |
| [calendar-converter](https://github.com/acmutd/calendar-converter) | 电子表格 → ICS | TS | — | 管道式架构：`fetch → convert → serialize` |
| [csv-ical](https://github.com/albertyw/csv-ical) | CSV ↔ ICS 互转 | Python | 62 | **双向转换**、CI/CD 配置参考 |
| [PlanningToCalendarIOS](https://github.com/DanielZanchi/PlanningToCalendarIOS) | Excel → ICS | Swift | — | 排班表转 ICS 的思路 |
| [DocStrange](https://github.com/NanoNets/docstrange) | 文档结构化提取 | Python | — | 文档 → Markdown/JSON，表提取引擎参考 |
| [ical-generator](https://github.com/sebbo2002/ical-generator) | ICS 生成 | TS | 846 | Node.js 端最佳实践参考 |
| [ical-builder-ts](https://github.com/jmbriccola/ical-builder-ts) | TS 类型化 ICS 构建 | TS | — | 完整的 RFC 5545 类型定义参考 |
| [Datebook](https://github.com/jshor/datebook) | 多日历 URL + ICS | TS | 339 | 支持 Google Calendar URL 生成 |
| [ics_calendar_utils](https://github.com/ronschaeffer/ics_calendar_utils) | 通用事件→ICS | Python | — | `EventProcessor` + `ICSGenerator` 组件化设计模式 |
| [yaml2ics](https://github.com/scientific-python/yaml2ics) | YAML 日历→ICS | Python | — | 时区处理、重复事件模板 |

---

## 4. 技术方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **A. Python + PySide6 + Tesserocr** | 生态最完整、专业外观、OCR 强、可打包 | 打包体积 ~80MB | ★★★★★ |
| **B. Python + Tkinter + pytesseract** | 零额外依赖、启动快、打包小 (~15MB) | 界面陈旧、OCR 需系统装 Tesseract | ★★★★☆ |
| **C. Node.js + Electron + ical-generator** | 现代 Web UI、跨平台 | OCR 集成困难、打包 ~150MB | ★★★☆☆ |
| **D. Web App (Python Flask + HTML5)** | 无需安装、远程访问 | 需服务器、处理大文件慢 | ★★☆☆☆ |

---

## 5. 推荐方案：Python + PySide6 + Tesserocr

```
技术栈：
  Python 3.10+
  UI: PySide6 (Qt for Python, LGPL 授权)
  PDF:  pdfplumber + PyMuPDF + pdf2image
  Word: python-docx
  Excel: openpyxl + pandas
  OCR:  tesserocr (C++ 直接绑定) + EasyOCR (备选)
  日期: dateparser + dateutil
  ICS:  ics.py

打包工具：PyInstaller + NSIS (Windows 安装包)
```

---

## 6. 架构设计

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            UI 层 (PySide6)                                   │
│  ┌─────────────┐  ┌──────────────────┐  ┌───────────────────┐              │
│  │ 文件选择面板   │  │ 字段映射/预览面板   │  │ 导出面板           │              │
│  │ - 拖拽/浏览   │  │ - 智能识别字段     │  │ - 导出 ICS         │              │
│  │ - PDF/DOCX/  │  │ - 用户手动修正     │  │ - "在日历中打开"    │              │
│  │   XLSX 过滤   │  │ - 表格/文本预览    │  │ - 批量导出          │              │
│  └──────┬───────┘  └───────┬──────────┘  └──────────┬─────────┘              │
└─────────┼──────────────────┼────────────────────────┼────────────────────────┘
          │                  │                        │
┌─────────▼──────────────────▼────────────────────────▼────────────────────────┐
│                             核心引擎层                                         │
│                                                                              │
│  ┌──────────────────┐  ┌────────────────────┐  ┌─────────────────────────┐  │
│  │  文档解析引擎      │  │  事件识别引擎        │  │  ICS 生成器             │  │
│  │                  │  │                    │  │                         │  │
│  │  PDF ──┬─文本提取  │  │  dateparser        │  │  ics.py → RFC 5545     │  │
│  │         └─表格提取  │  │  正则匹配           │  │  时区处理               │  │
│  │                  │  │  表格结构分析        │  │  RRULE(可选)           │  │
│  │  DOCX ──文本/表格  │  │  字段映射建议       │  │                         │  │
│  │                  │  │                    │  │                         │  │
│  │  XLSX ──表格读取   │  │                    │  │                         │  │
│  └────────┬─────────┘  └────────┬───────────┘  └────────────┬────────────┘  │
└───────────┼────────────────────┼──────────────────────────┼─────────────────┘
            │                    │                          │
┌───────────▼────────────────────▼──────────────────────────▼─────────────────┐
│                           OCR 管线                                           │
│                                                                             │
│  ┌──────────┐  ┌────────────────┐  ┌────────────┐  ┌─────────────────────┐  │
│  │ 扫描件 PDF│─►│ pdf2image      │─►│ Tesserocr  │─►│ 清洗后文本流          │  │
│  │ (图片)    │  │ (300 DPI, 灰度) │  │ EasyOCR    │  │ (送入事件识别引擎)    │  │
│  └──────────┘  └────────────────┘  └────────────┘  └─────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 事件数据模型

```python
@dataclass
class CalendarEvent:
    summary: str                    # 事件标题（必需）
    dtstart: datetime               # 开始时间（必需）
    dtend: datetime | None          # 结束时间（可选，dtstart + duration 替代）
    duration: timedelta | None      # 持续时间
    location: str | None            # 地点
    description: str | None         # 描述
    timezone: str | None            # 时区，如 "Asia/Shanghai"
    rrule: str | None               # 重复规则，如 "FREQ=WEEKLY;BYDAY=MO"
    uid: str | None                 # 唯一标识
    categories: list[str] | None    # 分类标签
    alarms: list[Alarm] | None      # 提醒
```

---

## 7. OCR 集成设计

### 7.1 自动检测：数字 PDF vs 扫描件

```python
def detect_pdf_type(pdf_path: str) -> str:
    """自动判断 PDF 类型: 'digital' | 'scanned' | 'mixed'"""
    doc = fitz.open(pdf_path)
    text_len = sum(len(page.get_text().strip()) for page in doc)
    doc.close()

    if text_len > 100:       # 有可提取文本
        return "digital"
    else:
        return "scanned"     # 需要 OCR
```

### 7.2 OCR 管线实现

```python
# scan_ocr.py — 扫描件 OCR 管线
from pdf2image import convert_from_path
from PIL import Image

class OcrPipeline:
    """支持多引擎的 OCR 管线"""

    def __init__(self, engine: str = "tesserocr"):
        self.engine = engine
        if engine == "tesserocr":
            import tesserocr
            self._api = tesserocr.PyTessBaseAPI()
        elif engine == "easyocr":
            import easyocr
            self._reader = easyocr.Reader(["ch_sim", "en"])

    def process_pdf(self, pdf_path: str, dpi: int = 300) -> str:
        images = convert_from_path(pdf_path, dpi=dpi)
        texts = []
        for img in images:
            text = self._ocr_image(img)
            texts.append(text)
        return "\n\n".join(texts)

    def _ocr_image(self, img: Image.Image) -> str:
        if self.engine == "tesserocr":
            import tesserocr
            with tesserocr.PyTessBaseAPI() as api:
                api.SetImage(img)
                return api.GetUTF8Text()
        elif self.engine == "easyocr":
            result = self._reader.readtext(img)
            return " ".join([item[1] for item in result])
```

### 7.3 OCR 优化建议

```
最佳实践：
├─ PDF 转图像用 300 DPI（平衡质量与速度）
├─ 先转为灰度图（image.convert('L')）
├─ 二值化阈值处理（adaptive threshold）
├─ EasyOCR 有 GPU 时自动加速，无 GPU 时用 Tesserocr
└─ 中文文档用 easyocr(ch_sim + en) 或 PaddleOCR
```

---

## 8. 开发计划

### Phase 1：项目骨架与核心引擎（2 周）

- [x] 调研开源库与参考项目（已完成）
- [ ] 搭建项目骨架（目录结构、`pyproject.toml`、虚拟环境）
- [ ] 定义 `CalendarEvent` 数据模型
- [ ] 实现 `pdf_parser.py` — PDF 文本 + 表格提取
- [ ] 实现 `docx_parser.py` — Word 文本 + 表格提取
- [ ] 实现 `xlsx_parser.py` — Excel 数据读取
- [ ] 实现 `scan_ocr.py` — 扫描件 OCR 管线
- [ ] 实现 `ics_generator.py` — 事件列表 → ICS

### Phase 2：智能识别引擎（1 周）

- [ ] 实现 `event_extractor.py` — 从文本中提取事件
  - [ ] dateparser.search_dates() 自动发现日期
  - [ ] 正则匹配常见时间格式（14:30、2:30pm、9:00-17:00）
  - [ ] 相邻文本组合（"Meeting\nJan 15\n14:00" → 完整事件）
  - [ ] 多事件文档拆分
- [ ] 表格结构分析（哪列是日期？哪列是标题？）
- [ ] `MappedEvent` — 带字段映射置信度的事件
- [ ] 预设映射模板保存/加载（JSON/YAML）

### Phase 3：GUI 界面（3 周）

- [ ] PySide6 主窗口布局
- [ ] 文件选择面板（拖拽 + 浏览，格式过滤）
- [ ] 文件类型自动检测（PDF 数字/扫描件）
- [ ] 预览面板（PDF 渲染 / 表格预览 / OCR 文本）
- [ ] 字段映射面板（表格列→事件字段的下拉选择）
- [ ] 事件列表（可编辑的行列表）
- [ ] 导出配置（时区、文件名、RRULE）
- [ ] 导出进度条 + 日志

### Phase 4：打包与发布（1 周）

- [ ] PyInstaller 打包为 Windows .exe
- [ ] NSIS 安装包制作
- [ ] 应用图标、版本信息
- [ ] 错误处理与用户反馈
- [ ] 自动更新检查（可选）

### Phase 5：增强功能（可选）

- [ ] 批量处理（文件夹批量转换）
- [ ] 多文件合并为一个 .ics
- [ ] 往复事件支持（RRULE：每周/每月等）
- [ ] AI 辅助识别（LLM API 提高识别准确率）
- [ ] 深色模式
- [ ] 多语言界面（中/英）
- [ ] 导入手动修正后的 ICS

---

## 9. 项目结构

```
doc2ics/
├── main.py                       # 应用入口
├── pyproject.toml                # 项目配置 + 依赖
├── requirements.txt              # pip 依赖锁
├── README.md
│
├── core/
│   ├── __init__.py
│   ├── event_model.py            # CalendarEvent 数据模型
│   ├── doc_parser/
│   │   ├── __init__.py
│   │   ├── pdf_parser.py         # PyMuPDF + pdfplumber 解析
│   │   ├── docx_parser.py        # python-docx 解析
│   │   └── xlsx_parser.py        # openpyxl + pandas 解析
│   ├── ocr_engine/
│   │   ├── __init__.py
│   │   ├── ocr_pipeline.py       # OCR 管线（自动检测/引擎选择）
│   │   └── preprocess.py         # 图像预处理（灰度/二值化/去噪）
│   ├── event_extractor.py        # 日期+事件智能识别
│   └── ics_generator.py          # ics.py 生成 ICS
│
├── gui/
│   ├── __init__.py
│   ├── app.py                    # PySide6 主窗口
│   ├── widgets/
│   │   ├── file_panel.py         # 文件选择面板
│   │   ├── preview_panel.py      # 预览面板
│   │   ├── mapping_panel.py      # 字段映射面板
│   │   ├── event_table.py        # 事件编辑表格
│   │   └── export_panel.py       # 导出面板
│   ├── dialogs/
│   │   ├── settings_dialog.py    # 设置对话框
│   │   └── about_dialog.py       # 关于对话框
│   ├── resources/
│   │   ├── icons/                # 图标资源
│   │   └── styles.qss            # Qt 样式表
│   └── __init__.py
│
├── utils/
│   ├── __init__.py
│   ├── date_utils.py             # 日期解析工具
│   ├── file_utils.py             # 文件操作工具
│   └── config.py                 # 配置管理
│
├── tests/
│   ├── test_pdf_parser.py
│   ├── test_docx_parser.py
│   ├── test_xlsx_parser.py
│   ├── test_ocr_pipeline.py
│   ├── test_event_extractor.py
│   └── test_ics_generator.py
│
└── docs/                         # 文档
    ├── architecture.md
    └── user-guide.md
```

---

## 10. 安装与环境配置

### 10.1 Python 环境

```bash
# 创建虚拟环境
python -m venv venv
.\venv\Scripts\Activate   # Windows
source venv/bin/activate  # Linux/macOS

# 安装核心依赖
pip install PyMuPDF pdfplumber pdf2image
pip install python-docx openpyxl pandas
pip install ics
pip install dateparser python-dateutil
pip install PySide6

# OCR 引擎（二选一或都装）
# 选项 A: Tesserocr（更快，需系统装 Tesseract）
pip install tesserocr
# 选项 B: EasyOCR（精度更高，自带模型）
pip install easyocr

# 打包工具
pip install pyinstaller
```

### 10.2 Tesseract OCR 系统安装

```bash
# Windows
# 1. 下载安装: https://github.com/UB-Mannheim/tesseract/wiki
# 2. 添加环境变量 PATH: C:\Program Files\Tesseract-OCR\
# 3. 安装中文语言包

# Linux
sudo apt install tesseract-ocr tesseract-ocr-chi-sim

# macOS
brew install tesseract tesseract-lang
```

### 10.3 Poppler（pdf2image 依赖）

```bash
# Windows
# 下载 poppler: https://github.com/oschwartz10612/poppler-windows/releases
# 添加到 PATH

# Linux
sudo apt install poppler-utils

# macOS
brew install poppler
```

---

## 11. 快速原型

### 核心流程代码示意

```python
# main.py — 核心工作流原型

from core.doc_parser.pdf_parser import extract_text_and_tables
from core.doc_parser.docx_parser import extract_text_from_docx
from core.doc_parser.xlsx_parser import extract_data_from_xlsx
from core.ocr_engine.ocr_pipeline import OcrPipeline
from core.event_extractor import extract_events
from core.ics_generator import generate_ics


def convert_file(input_path: str, output_path: str, timezone: str = "Asia/Shanghai"):
    """
    将文件转换为 ICS。
    自动检测文件类型和 PDF 是否为扫描件。
    """
    # 1. 文件类型判断
    ext = Path(input_path).suffix.lower()

    if ext == ".pdf":
        text = handle_pdf(input_path)
    elif ext == ".docx":
        text = extract_text_from_docx(input_path)
    elif ext in (".xlsx", ".xls"):
        data = extract_data_from_xlsx(input_path)
        text = data  # 结构化表格交给 extract_events
    else:
        raise ValueError(f"不支持的文件格式: {ext}")

    # 2. 智能识别事件
    events = extract_events(text)

    # 3. 生成 ICS
    generate_ics(events, output_path, timezone=timezone)

    return len(events)


def handle_pdf(pdf_path: str) -> str:
    """处理 PDF：数字直接提取，扫描件走 OCR"""
    import fitz
    doc = fitz.open(pdf_path)
    text_len = sum(len(p.get_text().strip()) for p in doc)
    doc.close()

    if text_len > 100:
        # 数字 PDF
        text, tables = extract_text_and_tables(pdf_path)
        return text + "\n".join(str(t) for t in tables)
    else:
        # 扫描件 — 走 OCR
        ocr = OcrPipeline(engine="tesserocr")
        return ocr.process_pdf(pdf_path)


if __name__ == "__main__":
    n = convert_file("课程表.pdf", "课程表.ics")
    print(f"成功生成 {n} 个事件")
```

---

## 参考资源

- [RFC 5545 — iCalendar 核心规范](https://datatracker.ietf.org/doc/html/rfc5545)
- [ics.py 文档](https://icspy.readthedocs.io/)
- [PyMuPDF 文档](https://pymupdf.readthedocs.io/)
- [pdfplumber 文档](https://github.com/jsvine/pdfplumber)
- [Tesserocr 文档](https://github.com/sirfz/tesserocr)
- [EasyOCR 文档](https://github.com/JaidedAI/EasyOCR)
- [dateparser 文档](https://dateparser.readthedocs.io/)
- [PySide6 文档](https://doc.qt.io/qtforpython/)
- [Timetable-to-Calendar — 最直接参考项目](https://github.com/Al-rimi/Timetable-to-Calendar)
- [icalendar 规范工具](https://icalendar.org/)
