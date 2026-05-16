# Doc2ICS Android 版 — 手机上文档转日历工具

## 概述

**原生 Android 应用**，利用 Android 系统级能力（ContentProvider、Intent、CalendarContract、Storage Access Framework），实现手机上的文档 → ICS 一键转换。

---

## 1. 平台特性与技术选型

### 1.1 Android 平台独有的优势

| 特性 | 说明 |
|------|------|
| **SAF（Storage Access Framework）** | 用户选择文件，无需存储权限 |
| **Android CalendarContract** | 可直接将事件写入系统日历 |
| **Intent 系统** | 支持"分享到 Doc2ICS"、"打开方式"等系统级集成 |
| **ContentProvider** | 访问系统文件、媒体库 |
| **WorkManager** | 后台处理大文件，保活+重试 |
| **FileProvider** | 生成 ICS 文件分享给其他 App |
| **Notification** | 转换进度通知、完成通知 |
| **Jetpack Compose** | Material Design 3 原生 UI |
| **多窗口 / 分屏** | 边看文档边编辑事件 |

### 1.2 Android 市场数据

```
Android 在全球市场份额：约 70%
中国 Android 市场份额：约 80%+
最佳触达场景：用户在手机上收到 PDF/DOCX 附件 → 一键转为日历事件
```

### 1.3 技术栈

```
层级              技术选型
──────────────────────────────────────────────
语言              Kotlin 2.0+
UI                Jetpack Compose + Material Design 3
架构              MVVM + Clean Architecture
异步              Kotlin Coroutines + Flow
依赖注入          Hilt / Koin
PDF 解析          iText (Android 版) / pdfjet / Apache PDFBox Android
DOCX 解析         Apache POI (Android 移植) / 自研轻量 XML 解析
XLSX 解析         Apache POI / GSpreadsheet / 自研
OCR               ML Kit Text Recognition (Google 官方，离线)
ICS 生成          biweekly (Java) / 自建 ICS 构建器
日期识别          自研正则 + java.time
数据库            Room (缓存映射模板/配置)
后台任务          WorkManager + Foreground Service
图片处理          Coil (异步加载)
测试              JUnit5 + Compose UI Test + MockK
```

### 1.4 与桌面版的对比

| 维度 | Android 版 | 桌面版 (Python/PySide) |
|------|-----------|----------------------|
| 便携性 | ✅ 随身携带 | ❌ 需电脑 |
| 拍照扫描 | ✅ 调用相机拍文件做 OCR | ❌ 需要扫描仪 |
| 系统日历集成 | ✅ 直接写入系统日历 | 需导入 .ics 文件 |
| Intent 集成 | ✅ "分享到" 和 "打开方式" | ❌ 无 |
| 大文件处理 | ⚠️ 手机内存限制 | ✅ 无限制 |
| OCR 引擎 | ML Kit（离线，无需下载额外数据） | Tesserocr 系统级 |
| 输入方式 | 文件管理器/分享/相机拍照 | 文件浏览器 |

---

## 2. 核心依赖详解

### 2.1 文档解析（Android）

| 库 | 说明 | 优点 | 缺点 |
|----|------|------|------|
| **iText 7 (Community)** | PDF 操作库，支持 Android | 功能全，文本+图片提取 | AGPL 协议（需注意） |
| **Apache PDFBox Android** | PDFBox 的 Android 移植 | 纯 Java，协议友好 (Apache) | 较慢 |
| **Apache POI** | Office 文档解析 (DOCX/XLSX) | 功能完整，社区成熟 | 库较大 (~5MB) |
| **GSpreadsheet** | 轻量级 Excel 读取 | 小巧，只读，适合 Android | 仅支持 XLSX |
| **自研 XML 解析** | 用 XmlPullParser 读 DOCX/XLSX | 零依赖，极轻量 | 功能有限 |

**推荐方案：**

```
PDF    → iText 7 Community（功能最强）
DOCX   → Apache POI 精简版（仅提取文本）
XLSX   → GSpreadsheet 或自研 XML 解析
扫描件  → ML Kit OCR Pipeline
```

```kotlin
// iText 7 Android 版 — PDF 文本提取
class PdfParser(private val context: Context) {

    fun extractText(uri: Uri): String {
        val reader = PdfReader(context.contentResolver.openInputStream(uri))
        val document = PdfDocument(reader)
        val text = StringBuilder()

        for (i in 1..document.numberOfPages) {
            val page = document.getPage(i)
            val strategy = SimpleTextExtractionStrategy()
            text.append(PdfTextExtractor.getTextFromPage(page, strategy))
        }

        document.close()
        return text.toString()
    }
}
```

### 2.2 OCR — ML Kit（Google 官方，离线）

ML Kit 是 Google 的移动端机器学习 SDK，**完全离线运行**，无需下载额外数据包。

```kotlin
// ML Kit Text Recognition — 扫描件 OCR
class OcrHelper(private val context: Context) {

    private val recognizer = TextRecognition.getClient(
        ChineseTextRecognizerOptions.Builder().build()  // 中文识别
        // 或 KoreanTextRecognizerOptions, JapaneseTextRecognizerOptions 等
    )

    suspend fun recognizeText(uri: Uri): String = withContext(Dispatchers.IO) {
        val inputImage = InputImage.fromFilePath(context, uri)
        val result = recognizer.process(inputImage).await()
        result.textBlocks.joinToString("\n") { it.text }
    }

    // PDF → 图片 → OCR（扫描件 PDF）
    suspend fun recognizePdf(pdfUri: Uri): String {
        // 使用 PdfRenderer 将 PDF 转图片
        val fd = context.contentResolver.openFileDescriptor(pdfUri, "r")!!
        val pdfRenderer = PdfRenderer(fd)
        val text = StringBuilder()

        for (i in 0 until pdfRenderer.pageCount) {
            val page = pdfRenderer.openPage(i)
            val bitmap = Bitmap.createBitmap(page.width, page.height, Bitmap.Config.ARGB_8888)
            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)

            val inputImage = InputImage.fromBitmap(bitmap, 0)
            val result = recognizer.process(inputImage).await()
            text.append(result.text).append("\n")
            page.close()
        }

        pdfRenderer.close()
        return text.toString()
    }
}
```

**ML Kit 优势对比：**

| 维度 | ML Kit | Tesseract.js | EasyOCR |
|------|--------|-------------|---------|
| 离线运行 | ✅ 原生离线 | ✅ WASM 需加载 | ❌ 需 PyTorch |
| 包体积 | 自带（随 Google Play Services） | +5MB WASM | 不适用 |
| Android 集成 | ✅ 官方 SDK | ❌ 需 WebView | ❌ 不适用 |
| 中文支持 | ✅ 专用模型 | ✅ 需语言包 | ✅ |
| 速度 | ★★★★★ | ★★★☆☆ | 不适用 |
| 准确率 | ★★★★☆ | ★★★☆☆ | 不适用 |

### 2.3 ICS 生成 — biweekly（Java）

```kotlin
// biweekly — RFC 5545 兼容的 ICS 生成器
class IcsGenerator {

    fun generate(events: List<CalendarEvent>): String {
        val ical = Biweekly()

        events.forEach { event ->
            val vevent = VEvent()
            vevent.setSummary(event.summary)
            vevent.setDateStart(DateStart(event.start, false))
            vevent.setDateEnd(DateEnd(event.end, false))
            vevent.setLocation(event.location)
            vevent.setDescription(event.description)

            if (event.timezone != null) {
                val tz = TimezoneComponent()
                tz.setId(event.timezone)
                ical.addComponent(tz)
            }

            ical.addComponent(vevent)
        }

        return Biweekly.write(ical).go()
    }
}

data class CalendarEvent(
    val summary: String,
    val start: Date,
    val end: Date?,
    val location: String?,
    val description: String?,
    val timezone: String? = "Asia/Shanghai"
)
```

### 2.4 日期识别（自研正则 + java.time）

Android 上 chrono-node 不可用（纯 JS），使用 `java.time` + 正则：

```kotlin
class DateExtractor {

    // 常见日期格式正则
    private val datePatterns = listOf(
        Regex("""\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?"""),  // 2024-01-15
        Regex("""\d{1,2}[-/月]\d{1,2}[日]?"""),               // 01/15
        Regex("""\d{4}年\d{1,2}月\d{1,2}日"""),               // 2024年1月15日
        Regex("""\d{1,2}:\d{2}"""),                              // 14:30
        Regex("""(上午|下午|早上|晚上)\s*\d{1,2}:\d{2}""")      // 下午2:30
    )

    fun extractEvents(text: String): List<ExtractedDate> {
        val results = mutableListOf<ExtractedDate>()

        datePatterns.forEach { pattern ->
            pattern.findAll(text).forEach { match ->
                results.add(ExtractedDate(
                    text = match.value,
                    position = match.range,
                    parsed = tryParse(match.value)
                ))
            }
        }

        return results
    }

    private fun tryParse(dateStr: String): LocalDateTime? {
        return try {
            // 使用 DateTimeFormatter 尝试多种格式
            val formatters = listOf(
                DateTimeFormatter.ofPattern("yyyy-MM-dd[ HH:mm]"),
                DateTimeFormatter.ofPattern("yyyy/MM/dd[ HH:mm]"),
                DateTimeFormatter.ofPattern("yyyy年M月d日[ H:mm]"),
            )
            formatters.forEach { fmt ->
                try {
                    return LocalDateTime.parse(dateStr, fmt)
                } catch (_: Exception) {}
            }
            null
        } catch (_: Exception) { null }
    }
}
```

---

## 3. Android 系统级集成

### 3.1 Intent 过滤器 — "用 Doc2ICS 打开"

```xml
<!-- AndroidManifest.xml — 注册 Intent 过滤器 -->
<activity android:name=".ui.ConversionActivity"
    android:exported="true">

    <!-- 从文件管理器打开 PDF/DOCX/XLSX -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="application/pdf" />
        <data android:mimeType="application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
        <data android:mimeType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
    </intent-filter>

    <!-- 从其他 App "分享到" Doc2ICS -->
    <intent-filter>
        <action android:name="android.intent.action.SEND" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="application/pdf" />
        <data android:mimeType="application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
        <data android:mimeType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
    </intent-filter>

    <!-- 相机拍照 → OCR → ICS -->
    <intent-filter>
        <action android:name="android.media.action.IMAGE_CAPTURE" />
        <category android:name="android.intent.category.DEFAULT" />
    </intent-filter>
</activity>
```

```kotlin
// 接收 Intent 数据
class ConversionActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        when (intent?.action) {
            Intent.ACTION_VIEW -> handleViewIntent(intent)
            Intent.ACTION_SEND -> handleSendIntent(intent)
        }
    }

    private fun handleViewIntent(intent: Intent) {
        val uri = intent.data ?: return
        // 开始转换流程
    }

    private fun handleSendIntent(intent: Intent) {
        val uri = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM) ?: return
        // 开始转换流程
    }
}
```

### 3.2 直接写入系统日历

```kotlin
// 写入 Android 系统日历 — 用户无需手动导入
class CalendarWriter(private val context: Context) {

    fun addToCalendar(event: CalendarEvent): Boolean {
        val resolver = context.contentResolver

        // 获取默认日历 ID
        val calendarUri = CalendarContract.Calendars.CONTENT_URI
        val cursor = resolver.query(calendarUri, null, null, null, null)
        val calendarId = cursor?.use {
            if (it.moveToFirst()) {
                it.getLong(it.getColumnIndex(CalendarContract.Calendars._ID))
            } else null
        } ?: return false

        // 插入事件
        val values = ContentValues().apply {
            put(CalendarContract.Events.DTSTART, event.start.time)
            put(CalendarContract.Events.DTEND, event.end?.time ?: event.start.time)
            put(CalendarContract.Events.TITLE, event.summary)
            put(CalendarContract.Events.DESCRIPTION, event.description)
            put(CalendarContract.Events.EVENT_LOCATION, event.location)
            put(CalendarContract.Events.CALENDAR_ID, calendarId)
            put(CalendarContract.Events.EVENT_TIMEZONE, "Asia/Shanghai")
        }

        val inserted = resolver.insert(CalendarContract.Events.CONTENT_URI, values)
        return inserted != null
    }
}
```

**权限要求：**
```xml
<uses-permission android:name="android.permission.WRITE_CALENDAR" />
<uses-permission android:name="android.permission.READ_CALENDAR" />
```

### 3.3 分享 ICS 到其他 App

```kotlin
// 生成 ICS 文件并通过 Intent 分享
fun shareICS(context: Context, content: String, filename: String) {
    val file = File(context.cacheDir, filename)
    file.writeText(content)

    val uri = FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        file
    )

    val shareIntent = Intent(Intent.ACTION_SEND).apply {
        type = "text/calendar"
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }

    context.startActivity(Intent.createChooser(shareIntent, "分享到日历"))
}
```

### 3.4 WorkManager 后台处理大文件

```kotlin
// 后台转换 Worker（支持配置变更后继续执行）
class ConversionWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val uriString = inputData.getString("file_uri") ?: return@withContext Result.failure()
        val uri = Uri.parse(uriString)

        return@withContext try {
            // 1. 文档解析
            val text = when (getFileType(uri)) {
                "pdf" -> pdfParser.extractText(uri)
                "docx" -> docxParser.extractText(uri)
                "xlsx" -> xlsxParser.extractData(uri)
                else -> throw IllegalArgumentException("Unsupported format")
            }

            // 2. 事件提取
            val events = dateExtractor.extractEvents(text)

            // 3. ICS 生成
            val icsContent = icsGenerator.generate(events)

            // 4. 保存结果
            saveToFile(icsContent)

            // 5. 发送通知
            showCompletionNotification()

            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    private fun showCompletionNotification() {
        val notification = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
            .setContentTitle("转换完成")
            .setContentText("ICS 文件已生成")
            .setSmallIcon(R.drawable.ic_done)
            .setAutoCancel(true)
            .build()

        val manager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, notification)
    }
}
```

---

## 4. UI 设计（Jetpack Compose + Material Design 3）

### 4.1 页面流

```
┌─────────────────────┐
│  主屏幕 (Home)       │
│  ┌─────────────────┐│
│  │ 📄 选择文件       ││  ← SAF 文件选择器
│  │ 📸 拍照识别       ││  ← 相机拍照 → OCR
│  │ 📥 从剪贴板导入   ││  ← 接收共享 Intent
│  └─────────────────┘│
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  预览 (Preview)      │
│  ┌─────────────────┐│
│  │ [文档内容预览]    ││
│  │ 高亮识别的事件     ││
│  │ 日期: 2024-01-15 ││
│  │ 时间: 14:30      ││
│  └─────────────────┘│
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  编辑 (Edit Events)  │
│  ┌─────────────────┐│
│  │ 事件 1: 团队周会  ││
│  │ 开始: 01/15 14:30││
│  │ 结束: 01/15 15:30││
│  │ 地点: 会议室 A   ││
│  ├─────────────────┤│
│  │ 事件 2: 项目评审  ││
│  │ ...              ││
│  └─────────────────┘│
│  [+ 添加事件]         │
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  导出 (Export)       │
│  ┌─────────────────┐│
│  │ 📁 保存到本地     ││
│  │ 📅 写入系统日历   ││
│  │ 📤 分享 ICS 文件 ││
│  │ 💾 保存为模板     ││
│  └─────────────────┘│
└─────────────────────┘
```

### 4.2 Compose UI 核心组件

```kotlin
// 文件选择按钮
@Composable
fun FileSelector(
    onPdfSelected: (Uri) -> Unit,
    onDocxSelected: (Uri) -> Unit,
    onCameraCapture: () -> Unit
) {
    var showSheet by remember { mutableStateOf(false) }

    Button(onClick = { showSheet = true }) {
        Icon(Icons.Default.FileUpload, null)
        Spacer(Modifier.width(8.dp))
        Text("选择文件")
    }

    if (showSheet) {
        ModalBottomSheet(onDismissRequest = { showSheet = false }) {
            Column(Modifier.padding(16.dp)) {
                // SAF 文件选择器
                FileTypeItem("PDF 文档", R.drawable.ic_pdf) {
                    pickFile("application/pdf")
                }
                FileTypeItem("Word 文档", R.drawable.ic_docx) {
                    pickFile("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                }
                FileTypeItem("Excel 表格", R.drawable.ic_xlsx) {
                    pickFile("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                }
                Divider()
                FileTypeItem("拍照识别", R.drawable.ic_camera) {
                    launchCamera()
                }
            }
        }
    }
}

// 使用 SAF（无需存储权限）
@OptIn(ActivityResultContracts::class)
@Composable
fun rememberFileLauncher(onResult: (Uri) -> Unit): ManagedActivityResultLauncher<Array<String>, Uri?> {
    return rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri -> uri?.let(onResult) }
}
```

---

## 5. 项目结构

```
doc2ics-android/
├── build.gradle.kts                 # 根构建文件
├── settings.gradle.kts
├── gradle/
│   └── libs.versions.toml           # Version Catalog
│
├── app/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/doc2ics/
│       │   ├── Doc2IcsApplication.kt     # Application + Hilt
│       │   │
│       │   ├── ui/
│       │   │   ├── theme/
│       │   │   │   ├── Theme.kt
│       │   │   │   ├── Color.kt
│       │   │   │   └── Type.kt
│       │   │   ├── navigation/
│       │   │   │   └── NavGraph.kt
│       │   │   ├── screens/
│       │   │   │   ├── home/
│       │   │   │   │   ├── HomeScreen.kt
│       │   │   │   │   └── HomeViewModel.kt
│       │   │   │   ├── preview/
│       │   │   │   │   ├── PreviewScreen.kt
│       │   │   │   │   └── PreviewViewModel.kt
│       │   │   │   ├── edit/
│       │   │   │   │   ├── EditScreen.kt
│       │   │   │   │   └── EditViewModel.kt
│       │   │   │   └── export/
│       │   │   │       ├── ExportScreen.kt
│       │   │   │       └── ExportViewModel.kt
│       │   │   └── components/
│       │   │       ├── FileSelector.kt
│       │   │       ├── EventCard.kt
│       │   │       ├── DatePickerDialog.kt
│       │   │       └── ProgressDialog.kt
│       │   │
│       │   ├── core/
│       │   │   ├── parsers/
│       │   │   │   ├── PdfParser.kt          # iText
│       │   │   │   ├── DocxParser.kt         # Apache POI
│       │   │   │   └── XlsxParser.kt         # GSpreadsheet
│       │   │   ├── ocr/
│       │   │   │   └── OcrHelper.kt          # ML Kit
│       │   │   ├── extractor/
│       │   │   │   └── DateExtractor.kt      # 日期提取
│       │   │   ├── generator/
│       │   │   │   └── IcsGenerator.kt       # biweekly
│       │   │   └── calendar/
│       │   │       └── CalendarWriter.kt     # 写入系统日历
│       │   │
│       │   ├── data/
│       │   │   ├── local/
│       │   │   │   ├── AppDatabase.kt        # Room
│       │   │   │   ├── dao/
│       │   │   │   │   ├── MappingDao.kt
│       │   │   │   │   └── HistoryDao.kt
│       │   │   │   └── entity/
│       │   │   │       ├── MappingEntity.kt
│       │   │   │       └── HistoryEntity.kt
│       │   │   └── repository/
│       │   │       ├── ConversionRepository.kt
│       │   │       └── MappingRepository.kt
│       │   │
│       │   ├── worker/
│       │   │   └── ConversionWorker.kt       # WorkManager
│       │   │
│       │   └── di/
│       │       ├── AppModule.kt              # Hilt 模块
│       │       ├── ParserModule.kt
│       │       └── WorkerModule.kt
│       │
│       └── res/
│           ├── drawable/
│           │   ├── ic_pdf.xml
│           │   ├── ic_docx.xml
│           │   ├── ic_xlsx.xml
│           │   └── ic_launcher.xml
│           ├── values/
│           │   ├── strings.xml
│           │   └── themes.xml
│           └── xml/
│               └── file_paths.xml            # FileProvider
│
├── test/                                     # 单元测试
│   ├── PdfParserTest.kt
│   ├── DateExtractorTest.kt
│   └── IcsGeneratorTest.kt
│
└── androidTest/                              # 仪器化测试
    └── ConversionFlowTest.kt
```

---

## 6. 依赖配置

### 6.1 Gradle Version Catalog

```toml
# gradle/libs.versions.toml
[versions]
kotlin = "2.0.21"
compose-bom = "2024.12.01"
hilt = "2.52"
itext = "8.0.5"
mlkit = "16.0.1"
room = "2.6.1"

[libraries]
compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "compose-bom" }
compose-material3 = { group = "androidx.compose.material3", name = "material3" }
compose-navigation = { group = "androidx.navigation", name = "navigation-compose", version = "2.8.5" }

itext-core = { group = "com.itextpdf", name = "itext7-core", version.ref = "itext" }
mlkit-text-recognition-chinese = { group = "com.google.mlkit", name = "text-recognition-chinese", version.ref = "mlkit" }
biweekly = { group = "net.sf.biweekly", name = "biweekly", version = "0.6.7" }

hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-compiler = { group = "com.google.dagger", name = "hilt-compiler", version.ref = "hilt" }

room-runtime = { group = "androidx.room", name = "room-runtime", version.ref = "room" }
room-ktx = { group = "androidx.room", name = "room-ktx", version.ref = "room" }
room-compiler = { group = "androidx.room", name = "room-compiler", version.ref = "room" }
```

### 6.2 核心依赖清单

```kotlin
// app/build.gradle.kts
dependencies {
    // Compose
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.navigation:navigation-compose:2.8.5")

    // PDF 解析
    implementation("com.itextpdf:itext7-core:8.0.5") {
        exclude(group = "org.slf4j")
    }

    // Office 解析
    implementation("org.apache.poi:poi-ooxml:5.3.0") {  // DOCX/XLSX
        exclude(group = "org.apache.xmlbeans")
    }

    // OCR
    implementation("com.google.mlkit:text-recognition-chinese:16.0.0")  // 中文
    implementation("com.google.mlkit:text-recognition:16.0.0")          // 英文

    // ICS 生成
    implementation("net.sf.biweekly:biweekly:0.6.7")

    // DI
    implementation("com.google.dagger:hilt-android:2.52")
    kapt("com.google.dagger:hilt-compiler:2.52")

    // 本地存储
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    kapt("androidx.room:room-compiler:2.6.1")

    // 后台任务
    implementation("androidx.work:work-runtime-ktx:2.10.0")

    // 图片加载
    implementation("io.coil-kt:coil-compose:2.7.0")
}
```

---

## 7. Android 特有功能

### 7.1 相机拍照 → OCR → ICS（最常用场景）

用户拍一张通知/会议日程照片 → 自动 OCR → 提取日期 → 生成 ICS：

```kotlin
class CameraToIcsViewModel @Inject constructor(
    private val ocrHelper: OcrHelper,
    private val dateExtractor: DateExtractor,
    private val icsGenerator: IcsGenerator
) : ViewModel() {

    private val _state = MutableStateFlow(CameraToIcsState())
    val state: StateFlow<CameraToIcsState> = _state.asStateFlow()

    fun onPhotoCaptured(uri: Uri) {
        viewModelScope.launch {
            _state.update { it.copy(status = Status.OcrProcessing) }

            // 1. OCR
            val text = ocrHelper.recognizeText(uri)

            _state.update { it.copy(recognizedText = text, status = Status.Extracting) }

            // 2. 提取日期
            val dates = dateExtractor.extractEvents(text)

            _state.update { it.copy(extractedDates = dates, status = Status.Ready) }
        }
    }
}
```

### 7.2 深色模式

```kotlin
@Composable
fun Doc2IcsTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) darkColorScheme() else lightColorScheme()
    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
```

### 7.3 离线优先

```
所有核心功能完全离线：
├─ 文档解析（iText/POI 本地库）
├─ OCR（ML Kit 离线模型）
├─ 日期识别（java.time 本地）
├─ ICS 生成（biweekly 本地）
└─ 日历写入（CalendarContract 本地）

云端功能（可选）：
├─ AI 增强识别（调用 LLM API）
├─ 映射模板云同步
└─ 自动更新检查
```

---

## 8. 权限清单

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_CALENDAR" />
<uses-permission android:name="android.permission.READ_CALENDAR" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

**注意：Android 10+ 使用 SAF（Storage Access Framework）无需存储权限。**

---

## 9. 参考项目

| 项目 | 可借鉴点 |
|------|---------|
| [ICSExtractor](https://github.com/franz-sw/ICSExtractor) | XLSX→ICS 的交互式字段映射设计 |
| [ICSx⁵](https://github.com/bitfireAT/icsx5) | **Android 上 ICS 管理**：订阅 Webcal/本地 ICS，CalDAV 同步，Kotlin + 336 stars |
| [iCalDAV](https://github.com/icaldav/icaldav) | **Kotlin 的 CalDAV 客户端**：含 `icaldav-android` 模块，CalendarContract 映射 |
| [ical4android](https://github.com/bitfireAT/ical4android) | Android CalendarProvider + iCalendar 双向映射 |
| [CalendarIcsAdapter](https://github.com/k3b/CalendarIcsAdapter) | Android 日历 ↔ ICS 导入导出，Intent 集成参考 |
| [GMap2ICal](https://github.com/ryanw-mobile/GMap2ICal) | Kotlin Compose Desktop + ICS 生成，MVVM 架构参考 |
| [KashCal](https://github.com/KashCal/KashCal) | 多日历聚合 App，Jetpack Compose 架构参考 |
| [kitsy](https://github.com/imxade/kitsy) | PWA 文件处理工具，Web Worker + WASM 架构 |

---

## 10. 开发计划

### Phase 1：项目搭建与核心引擎（1 周）
- [ ] Kotlin + Compose 项目初始化
- [ ] Hilt 依赖注入配置
- [ ] iText PDF 解析
- [ ] Apache POI DOCX 解析
- [ ] GSpreadsheet XLSX 解析
- [ ] ML Kit OCR 集成
- [ ] biweekly ICS 生成
- [ ] 单元测试覆盖

### Phase 2：UI 与交互（2 周）
- [ ] HomeScreen — 文件选择 + 拍照入口
- [ ] PreviewScreen — 文档内容预览，事件高亮
- [ ] EditScreen — 事件编辑器（CRUD）
- [ ] ExportScreen — 导出选项
- [ ] Material Design 3 主题
- [ ] 深色模式

### Phase 3：系统集成（1 周）
- [ ] SAF 文件选择器
- [ ] Intent 过滤器（VIEW + SEND）
- [ ] 相机集成 + OCR 管线
- [ ] CalendarContract 直接写入
- [ ] FileProvider 分享 ICS
- [ ] WorkManager 后台处理
- [ ] Notification 通知

### Phase 4：数据持久化（1 周）
- [ ] Room 数据库
- [ ] 映射模板保存/加载
- [ ] 转换历史记录
- [ ] 最近文件列表

### Phase 5：发布准备（1 周）
- [ ] 应用图标 + 品牌设计
- [ ] 混淆配置 (ProGuard)
- [ ] Play Store 发布材料
- [ ] 崩溃监控 (Firebase Crashlytics)
- [ ] 性能优化（启动速度、包体积）
- [ ] 多语言（中文/英文）
- [ ] 分屏/多窗口适配

---

## 11. 打包与发布

```bash
# 构建 Release APK
./gradlew assembleRelease

# 构建 App Bundle（推荐上传 Play Store）
./gradlew bundleRelease

# 输出路径
# app/build/outputs/apk/release/
# app/build/outputs/bundle/release/
```

**最低支持版本：Android 8.0 (API 26)**
**目标版本：Android 15 (API 35)**
**包体积目标：<15MB（不含 ML Kit 模型）**

---

## 12. 用户场景示例

```
场景 1：微信收到课程表 PDF
  → 下载 → 用 "Doc2ICS" 打开 → 自动识别课程事件 → 一键写入系统日历
  
场景 2：拍一张会议通知照片
  → 打开 Doc2ICS → 拍照 → OCR 自动识别 → 生成 ICS → 分享到日历

场景 3：收到会议议程 Word 文档
  → 文件管理器选择 → 用 Doc2ICS 打开 → 提取各议题时间 → 批量生成事件

场景 4：月度排班 Excel 表格
  → 选择 Excel 文件 → 自动识别排班结构 → 映射日期列/人员列 → 导出 ICS
```
