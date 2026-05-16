# Doc2ICS Web 版 — 纯浏览器端 PWA 文档转日历工具

## 概述

**纯前端 PWA（Progressive Web App）**，所有处理在浏览器本地完成，**不上传任何文件到服务器**。支持安装到桌面离线使用。

---

## 1. 平台特性与技术选型

### 1.1 Web 平台独有的优势

| 特性 | 说明 |
|------|------|
| **零安装** | 打开浏览器即可使用，URL 即入口 |
| **PWA 离线** | Service Worker 缓存，安装后可离线运行 |
| **WebAssembly** | WASM 在浏览器中运行 C/C++ 引擎，性能接近原生 |
| **Web Worker** | 后台线程处理大文件，不阻塞 UI |
| **File System Access API** | 读写本地文件系统（Chromium 浏览器） |
| **Web Share API** | 原生分享 ICS 文件到日历 App |
| **本地存储** | IndexedDB 保存配置和映射模板 |
| **跨平台** | Windows / macOS / Linux / ChromeOS / 移动端均可 |

### 1.2 技术栈

```
层级         技术选型
──────────────────────────────────────────────
UI 框架      React 18 + TypeScript
构建工具     Vite 6 + pnpm
PWA          vite-plugin-pwa
路由         React Router v7
样式         Tailwind CSS 4 + shadcn/ui
PDF 解析     pdfjs-dist（Mozilla 官方） + pdf-lib
DOCX 解析    officeParser（支持浏览器端，含 OCR）
XLSX 解析    SheetJS (xlsx) + ExcelJS
OCR          Tesseract.js（浏览器内 WASM 版 Tesseract）
ICS 生成     ical-generator 或 datebook
日期识别     chrono-node + date-fns
WASM 工具    @matbee/libreoffice-converter（可选，LibreOffice in WASM）
测试         Vitest + Playwright
部署         Netlify / Vercel / Cloudflare Pages / GitHub Pages
```

### 1.3 与桌面版的对比

| 维度 | Web 版 (PWA) | 桌面版 (Python/PySide) |
|------|-------------|----------------------|
| 安装 | 浏览器打开即用 | 需下载安装包 ~80MB |
| 离线 | ✅ 安装 PWA 后可离线 | ✅ 原生离线 |
| 大文件处理 | ⚠️ 浏览器内存限制 | ✅ 无限制 |
| OCR 精度 | Tesseract.js（略低于原生） | Tesserocr（C++ 绑定） |
| 文件系统访问 | 受限（需用户选择） | 完全访问 |
| 跨平台 | ✅ 任何有浏览器的设备 | Windows 优先 |
| 更新 | 刷新即更新 | 需重新下载安装包 |
| 隐私 | ✅ 100% 本地，不上传 | ✅ 完全本地 |

---

## 2. 核心依赖详解

### 2.1 文档解析（浏览器端）

| 库 | Stars | 说明 |
|----|-------|------|
| **pdfjs-dist** | 50k+ | Mozilla 官方 PDF.js，浏览器端渲染和文本提取 |
| **officeParser** | 150+ | **浏览器端解析 DOCX/XLSX/PPTX/PDF**，输出 AST，内置 Tesseract.js OCR |
| **SheetJS (xlsx)** | 36k+ | 浏览器端 Excel 读写，支持 XLSX/XLS/XLSM/CSV |
| **ExcelJS** | 14k+ | 浏览器端 Excel 读写，更好的样式支持 |
| **pdf-lib** | 7k+ | 纯 JS PDF 创建和修改 |

**核心优势：`officeParser`** 一个库覆盖 DOCX/PPTX/XLSX/PDF/ODT/ODS 全部格式，浏览器端无需额外配置。

```typescript
// officeParser 浏览器端用法
import officeParser from 'officeParser';

// 直接传入 File 对象或 ArrayBuffer
const ast = await officeParser.parseOffice(file, {
    newlineDelimiter: '\n',
    ocr: false,  // 如需 OCR 设为 true
});

// 获取纯文本
const text = ast.toText();

// 或遍历结构化 AST
for (const node of ast.nodes) {
    if (node.type === 'paragraph') {
        console.log(node.text);
    }
}
```

### 2.2 OCR（浏览器端 Tesseract.js）

Tesseract.js 是 Tesseract OCR 引擎的 **WebAssembly 编译版本**，完全在浏览器内运行。

```bash
npm install tesseract.js
```

```typescript
import Tesseract from 'tesseract.js';

async function ocrImage(imageFile: File): Promise<string> {
    const { data } = await Tesseract.recognize(
        imageFile,
        'chi_sim+eng',           // 中文 + 英文
        {
            logger: (m) => console.log(m),  // 进度显示
            workerPath: '/tesseract-worker.js',
            corePath: '/tesseract-core.wasm',
        }
    );
    return data.text;
}
```

**OCR 注意事项：**
- 首次加载需下载 WASM 文件（~5MB）
- 浏览器端精度略低于原生 Tesseract（约 85-90% vs 89-93%）
- 可通过 Service Worker 预缓存 WASM 文件

### 2.3 PDF 解析（双策略）

```typescript
// 策略 A：pdfjs-dist 提取文本（数字 PDF）
import * as pdfjsLib from 'pdfjs-dist';

async function extractTextFromPdf(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return text;
}

// 策略 B：检查是否为扫描件
// 如果 page.getTextContent() 返回空或极少内容，则启用 Tesseract.js OCR
```

### 2.4 ICS 生成

```typescript
// 使用 ical-generator（TypeScript 原生支持）
import { ICalCalendar } from 'ical-generator';

const cal = new ICalCalendar({
    name: '我的日历',
    timezone: 'Asia/Shanghai',
});

// 添加事件
cal.createEvent({
    start: new Date('2024-06-06T14:00:00'),
    end: new Date('2024-06-06T15:00:00'),
    summary: '团队周会',
    description: '每周同步',
    location: '会议室 A',
});

// 导出为字符串
const icsContent = cal.toString();

// 或使用 datebook（也支持 Google Calendar URL）
import { ICalendar, GoogleCalendar } from 'datebook';

const config = {
    title: '团队周会',
    start: new Date('2024-06-06T14:00:00'),
    end: new Date('2024-06-06T15:00:00'),
    location: '会议室 A',
};
```

### 2.5 日期识别（chrono-node）

```typescript
import * as chrono from 'chrono-node';

// 从文本中提取所有日期
const results = chrono.parse('Meeting on Jan 15, 2024 at 14:30. Deadline: 2024-03-01.');
results.forEach(r => {
    console.log(r.text, r.start.date(), r.end?.date());
});

// 支持中文
import * as chronoZh from 'chrono-node/dist/locales/zh';
const cnResults = chronoZh.zh.standalone.parse('2024年1月15日下午2点30分开会');
```

---

## 3. 浏览器端 OCR 管线

```
扫描件 PDF (*.pdf)
    │
    ▼
pdfjs-dist 渲染每页为图片
    │
    ▼
Tesseract.js (WebAssembly)
    ├─ 灰度/二值化预处理 (OffscreenCanvas)
    ├─ 语言包: chi_sim + eng
    └─ 输出文本
    │
    ▼
chrono-node 提取日期事件
    │
    ▼
ical-generator → .ics 文件
```

### Web Worker 架构

所有耗时操作在 Web Worker 中执行，主线程仅负责 UI：

```typescript
// worker.ts — 在 Web Worker 中运行
import { parseOffice } from 'officeParser';
import * as chrono from 'chrono-node';
import { ICalCalendar } from 'ical-generator';

self.onmessage = async (e: MessageEvent) => {
    const { file, type } = e.data;

    // 1. 解析文档（在 Worker 中，不阻塞 UI）
    const ast = await parseOffice(file, { ocr: false });
    const text = ast.toText();

    // 2. 提取日期事件
    const dates = chrono.parse(text);
    const events = dates.map(d => ({
        summary: extractContext(text, d.index),
        start: d.start.date(),
        end: d.end?.date(),
    }));

    // 3. 生成 ICS
    const cal = new ICalCalendar();
    events.forEach(e => cal.createEvent(e));

    // 4. 返回结果到主线程
    self.postMessage({ ics: cal.toString(), events });
};
```

---

## 4. PWA 特性

### 4.1 Service Worker 策略

```javascript
// vite.config.ts — PWA 配置
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['**/*.wasm', '**/*.worker.js'],
            workbox: {
                globPatterns: ['**/*.{js,css,html,wasm,worker.js}'],
                maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50MB for WASM
            },
            manifest: {
                name: 'Doc2ICS',
                short_name: 'Doc2ICS',
                description: '文档转日历工具',
                theme_color: '#2563eb',
                icons: [...],
            },
        }),
    ],
});
```

### 4.2 离线能力

| 场景 | 策略 |
|------|------|
| Tesseract.js WASM 文件 | Service Worker 预缓存 |
| 核心 JS/CSS | Cache First |
| 用户配置/映射模板 | IndexedDB 持久化 |
| 生成的 ICS 文件 | 临时 Blob URL，或 File System Access API 保存 |

### 4.3 文件保存与分享

```typescript
// 使用 File System Access API 保存到本地（Chromium 浏览器）
async function saveICS(content: string, filename: string) {
    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{
                description: 'iCalendar File',
                accept: { 'text/calendar': ['.ics'] },
            }],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
    } catch (e) {
        // 降级方案：下载
        const blob = new Blob([content], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// 使用 Web Share API 分享 ICS 到日历 App
async function shareICS(content: string, filename: string) {
    if (navigator.share) {
        const blob = new Blob([content], { type: 'text/calendar' });
        const file = new File([blob], filename, { type: 'text/calendar' });
        await navigator.share({ files: [file] });
    }
}
```

---

## 5. 项目结构

```
doc2ics-web/
├── index.html
├── vite.config.ts              # Vite + PWA 配置
├── tsconfig.json
├── package.json
├── public/
│   ├── favicon.ico
│   ├── icons/                  # PWA 图标
│   └── wasm/                   # Tesseract.js WASM 文件
│
├── src/
│   ├── main.tsx                # 入口
│   ├── App.tsx                 # 路由 + 布局
│   │
│   ├── pages/
│   │   ├── Home.tsx            # 首页（文件拖拽上传）
│   │   ├── Preview.tsx         # 文档预览
│   │   ├── Mapping.tsx         # 字段映射
│   │   └── Export.tsx          # 导出页面
│   │
│   ├── core/
│   │   ├── workers/
│   │   │   ├── parse.worker.ts     # 文档解析 Worker
│   │   │   ├── ocr.worker.ts       # OCR Worker
│   │   │   └── ics.worker.ts       # ICS 生成 Worker
│   │   ├── parsers/
│   │   │   ├── pdfParser.ts        # pdfjs-dist
│   │   │   ├── officeParser.ts     # officeParser
│   │   │   └── excelParser.ts      # SheetJS
│   │   ├── ocr/
│   │   │   └── tesseractOCR.ts     # Tesseract.js 封装
│   │   ├── extractor/
│   │   │   └── eventExtractor.ts   # chrono-node 提取事件
│   │   └── generator/
│   │       └── icsGenerator.ts     # ical-generator 封装
│   │
│   ├── components/
│   │   ├── FileDrop.tsx            # 文件拖拽
│   │   ├── PreviewPanel.tsx        # 预览面板
│   │   ├── MappingPanel.tsx        # 字段映射
│   │   ├── EventTable.tsx          # 事件列表（可编辑）
│   │   └── ExportPanel.tsx         # 导出面板
│   │
│   ├── store/
│   │   └── appStore.ts             # Zustand 状态管理
│   │
│   ├── utils/
│   │   ├── fileUtils.ts            # 文件操作
│   │   ├── dateUtils.ts            # 日期工具
│   │   └── db.ts                   # IndexedDB 封装
│   │
│   └── styles/
│       └── globals.css             # Tailwind + shadcn/ui
│
├── tests/
│   ├── parser.test.ts
│   ├── ocr.test.ts
│   └── icsGenerator.test.ts
│
└── e2e/                           # Playwright 端到端测试
    └── conversion.spec.ts
```

---

## 6. 关键实现细节

### 6.1 文件类型自动检测

```typescript
// 检测 PDF 是数字 PDF 还是扫描件
async function detectPdfType(file: File): Promise<'digital' | 'scanned'> {
    const arrayBuffer = await file.slice(0, 1024 * 1024).arrayBuffer(); // 读前 1MB
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const content = await page.getTextContent();

    if (content.items.length > 10) {
        const totalChars = content.items.reduce((sum, item: any) => sum + item.str.length, 0);
        return totalChars > 100 ? 'digital' : 'scanned';
    }
    return 'scanned';
}
```

### 6.2 分片处理大文件

浏览器对大文件有内存限制。使用流式或分片处理：

```typescript
// 大文件分页处理
async function* processLargePdf(file: File, pageSize: number = 5) {
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const totalPages = pdf.numPages;

    for (let i = 1; i <= totalPages; i += pageSize) {
        const batch = [];
        for (let j = i; j < Math.min(i + pageSize, totalPages + 1); j++) {
            const page = await pdf.getPage(j);
            const content = await page.getTextContent();
            batch.push(content.items.map((item: any) => item.str).join(' '));
        }
        yield batch.join('\n');

        // 让出主线程
        await new Promise(resolve => setTimeout(resolve, 0));
    }
}
```

---

## 7. UI/UX 设计

### 7.1 页面流

```
Home (拖拽上传)
    │
    ▼
Processing (加载动画 + 进度)
    │
    ▼
Preview (文档内容预览，高亮识别的事件)
    │
    ▼
Mapping (字段映射配置)
    ├─ 自动识别：系统猜测的字段映射
    ├─ 手动调整：下拉选择列→事件字段
    └─ 预设模板：保存/加载映射配置
    │
    ▼
Export (导出设置)
    ├─ 时区选择
    ├─ 文件名
    ├─ 重复事件设置
    └─ 导出 ICS / 复制到剪贴板 / 分享
```

### 7.2 技术参考项目

| 项目 | 可借鉴的 Web 端技术 |
|------|-------------------|
| [kitsy](https://github.com/imxade/kitsy) | **PWA 架构**：React + VitePWA + Web Worker 处理文件，纯浏览器端操作，零服务器 |
| [pdf-worker](https://github.com/fullo/pdf-worker) | **Vue 3 + Web Worker**：37 种 PDF 工具全在浏览器端，含 OCR (Tesseract.js)、PWA 离线、代码分割 |
| [officeParser](https://github.com/harshankur/officeParser) | **浏览器 AST 解析**：一个库解析 DOCX/XLSX/PDF，含内置 OCR |
| [LibreOffice WASM](https://github.com/matbeedotcom/libreoffice-document-converter) | LibreOffice 编译为 WASM 在浏览器中运行，支持 15+ 格式互转 |
| [embedpdf](https://github.com/embedpdf) | **Web Worker 渲染 PDF**：PDFium 引擎 WASM 编译，高性能渲染 |

---

## 8. 开发计划

### Phase 1：原型（1 周）
- [ ] Vite + React + TypeScript 项目初始化
- [ ] FileDrop 拖拽组件
- [ ] pdfjs-dist 集成 + Web Worker 解析
- [ ] ical-generator 集成
- [ ] 基本的 PDF→ICS 转换

### Phase 2：核心功能（2 周）
- [ ] officeParser 集成（DOCX/XLSX 支持）
- [ ] Tesseract.js 集成（扫描件 OCR）
- [ ] chrono-node 日期识别
- [ ] 字段映射 UI
- [ ] 事件列表编辑

### Phase 3：PWA 与体验（1 周）
- [ ] vite-plugin-pwa 配置
- [ ] Service Worker + 离线支持
- [ ] WASM 文件预缓存
- [ ] File System Access API 保存
- [ ] Web Share API 分享
- [ ] 分片处理大文件

### Phase 4：部署与优化（1 周）
- [ ] 代码分割 + 懒加载
- [ ] 性能优化（Worker 池）
- [ ] Playwright E2E 测试
- [ ] 部署到 Vercel/Netlify
- [ ] 错误边界 + 用户反馈
- [ ] 暗色模式

---

## 9. 部署

```bash
# 构建
pnpm build

# 部署到 Vercel
vercel --prod

# 或部署到 GitHub Pages
pnpm deploy
```

推荐部署平台：
- **Vercel** — React + Vite 最佳搭档，自动 HTTPS
- **Netlify** — PWA 友好，自动部署
- **Cloudflare Pages** — 全球 CDN，免费
- **GitHub Pages** — 免费静态托管

### 部署注意事项

```
⚠️ HTTPS 必须开启（PWA Service Worker 需要 HTTPS）
⚠️ 跨域隔离（OCR WASM 需要 SharedArrayBuffer）
  添加响应头：
    Cross-Origin-Opener-Policy: same-origin
    Cross-Origin-Embedder-Policy: require-corp
⚠️ WASM 文件较大（Tesseract.js ~5MB），建议预缓存
```

---

## 10. npm 依赖清单

```json
{
    "dependencies": {
        "react": "^18.3.0",
        "react-dom": "^18.3.0",
        "react-router-dom": "^7.0.0",
        "ical-generator": "^10.0.0",
        "datebook": "^8.0.0",
        "pdfjs-dist": "^5.0.0",
        "officeParser": "^6.0.0",
        "xlsx": "^0.18.0",
        "exceljs": "^4.4.0",
        "tesseract.js": "^6.0.0",
        "chrono-node": "^2.7.0",
        "date-fns": "^4.0.0",
        "zustand": "^5.0.0",
        "lucide-react": "^0.400.0",
        "clsx": "^2.1.0"
    },
    "devDependencies": {
        "vite": "^6.0.0",
        "vite-plugin-pwa": "^1.0.0",
        "@vitejs/plugin-react": "^4.0.0",
        "typescript": "^5.6.0",
        "tailwindcss": "^4.0.0",
        "@tailwindcss/vite": "^4.0.0",
        "shadcn-ui": "^0.9.0",
        "vitest": "^3.0.0",
        "playwright": "^1.50.0"
    }
}
```
