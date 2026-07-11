# visual-inspector-mcp

[![نسخه](https://img.shields.io/badge/version-1.1.0-blue)](package.json)
[![مجوز: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)

[English](README.md) | **فارسی**

یک سرور [MCP](https://modelcontextprotocol.io) که به Claude Code — یا هر کلاینت سازگار با MCP — اجازه می‌دهد صفحات وب را **واقعاً ببیند و با آن‌ها تعامل کند**، به‌جای اینکه فقط سورس کد را بخواند. این سرور یک مرورگر Chromium بدون رابط گرافیکی پایدار (از طریق [Playwright](https://playwright.dev)) اجرا می‌کند و اسکرین‌شات‌ها را به‌عنوان تصاویر اینلاین برمی‌گرداند که مدل می‌تواند مستقیماً در نتیجه ابزار مشاهده کند.

> «این آیکون اشتباه به نظر می‌رسد» → ایجنت از آیکون اسکرین‌شات می‌گیرد و آن را می‌بیند، به‌جای اینکه از روی CSS حدس بزند.

## چرا این ابزار وجود دارد

ایجنت‌های کدنویسی در خواندن و نوشتن کد عالی هستند، اما نسبت به آنچه آن کد واقعاً رندر می‌کند کورند. یک آیکون تراز نشده، رنگی که با طراحی مطابقت ندارد، یک لایه‌بندی ریسپانسیو که در عرض خاصی خراب می‌شود، یک مودال که دکمه بستن خودش را می‌پوشاند — هیچ‌کدام از این‌ها از روی سورس قابل مشاهده نیستند. این سرور آن شکاف را با مجموعه‌ای از ابزارهای کوچک و قابل ترکیب پر می‌کند که حول یک نشست مرورگر پایدار ساخته شده‌اند — از جمله تعامل کامل با فرم‌ها، تا ایجنت بتواند قبل از مشاهده نتیجه، فیلدها را پر کند، کلید بزند و فرم‌ها را ارسال کند.

## ابزارها

| ابزار | توضیح |
|---|---|
| `navigate` | بارگذاری یک URL (سرور dev، `file://`، یا هر سایت عمومی) در صفحه پایدار. برای تماس‌های بعدی باز می‌ماند. URL *حل‌شده* + عنوان را برمی‌گرداند. |
| `screenshot` | اسکرین‌شات از صفحه جاری، یا یک عنصر با سلکتور CSS / Playwright locator. از viewport، full-page و element-scoped پشتیبانی می‌کند. PNG بی‌افت پیش‌فرض است؛ JPEG گزینه‌ای برای صفحات بزرگ با تصاویر سنگین است. |
| `click` | کلیک روی یک عنصر برای رسیدن به حالت UI (باز کردن مودال، منو، تب) قبل از اسکرین‌شات. |
| `fill` | تنظیم مقدار یک input/textarea/select با سلکتور (`locator.fill` — پاک کرده و تایپ می‌کند، رویدادهای input/change مورد نیاز کامپوننت‌های کنترل‌شده React را dispatch می‌کند). برای پر کردن چند فیلد در یک فراخوانی از `fields` استفاده کنید. |
| `type` | تایپ در یک فیلد یک کلید در هر بار (`locator.pressSequentially`)، که یک keydown/keypress/keyup به ازای هر کاراکتر فیر می‌کند — برای inputهایی که handler آن‌ها به کلیدزنی واقعی نیاز دارد و به `fill` واکنش نشان نمی‌دهد. `clear` و `delay` اختیاری. |
| `press` | فشار دادن یک کلید صفحه‌کلید مثل `Enter` (ارسال فرم)، `Tab` یا `Escape`، روی یک `selector` مشخص یا عنصر فوکوس‌شده. از سینتکس کلید Playwright پشتیبانی می‌کند (مثلاً `Control+A`). |
| `resize` | تغییر اندازه viewport برای بررسی یک breakpoint ریسپانسیو، مستقل از navigate یا screenshot — بدون reload کردن صفحه. |
| `console_logs` | پیام‌های console مرورگر و خطاهای صفحه، برای مرتبط کردن یک مشکل بصری با یک خطای JS. از `limit` و فیلتر فقط-خطا پشتیبانی می‌کند. |

مرجع کامل پارامترها در توضیحات خود ابزارها (قابل مشاهده برای هر کلاینت MCP) و در [`index.js`](index.js) موجود است.

## پیش‌نیازها

- [Node.js](https://nodejs.org) نسخه ۱۸ یا بالاتر
- حدود ۲۰۰ مگابایت فضای آزاد دیسک (Playwright در هنگام نصب یک build Chromium دانلود می‌کند)

## نصب

```bash
git clone https://github.com/MatinMHF/visual-inspector-mcp.git
cd visual-inspector-mcp
npm install        # وابستگی‌ها را نصب می‌کند و Chromium را از طریق postinstall دانلود می‌کند
```

## پیکربندی

### Claude Code

```bash
claude mcp add --scope user visual-inspector -- node /مسیر/مطلق/به/visual-inspector-mcp/index.js
```

`--scope user` آن را برای هر پروژه‌ای ثبت می‌کند. برای محدود کردن به مخزن جاری از `--scope project` استفاده کنید. پس از اضافه کردن، Claude Code را راه‌اندازی مجدد کنید.

در **Windows PowerShell**، جداکننده `--` را داخل کوتیشن قرار دهید:

```powershell
claude mcp add --scope user visual-inspector "--" node "C:/مسیر/به/visual-inspector-mcp/index.js"
```

تأیید اتصال:

```bash
claude mcp list
```

### Claude Desktop (یا هر کلاینت با `claude_desktop_config.json`)

به فایل `claude_desktop_config.json` خود اضافه کنید:

```json
{
  "mcpServers": {
    "visual-inspector": {
      "command": "node",
      "args": ["/مسیر/مطلق/به/visual-inspector-mcp/index.js"]
    }
  }
}
```

### سایر کلاینت‌های MCP

این یک سرور MCP استاندارد stdio است — `node index.js` از طریق stdin/stdout با MCP ارتباط برقرار می‌کند. هر کلاینتی که از stdio-transport MCP پشتیبانی می‌کند می‌تواند آن را اجرا کند.

## استفاده

پس از پیکربندی، به‌طور طبیعی بخواهید:

> «به localhost:3000/settings برو و از آیکون ذخیره در نوار ابزار اسکرین‌شات بگیر — درست به نظر می‌رسد؟»

> «به عرض ۳۷۵×۶۶۷ تغییر اندازه بده و ببین ناوبری موبایل بعد از کلیک روی منوی همبرگر چطور به نظر می‌رسد.»

> «فرم ثبت‌نام را با داده‌های آزمایشی پر کن و ارسال کن — آیا خطایی وجود دارد؟»

> «آیا خطاهای console در صفحه پرداخت وجود دارد؟»

ترتیب‌های معمول ابزار:

```js
// بررسی بصری
navigate({ url: "http://localhost:3000/settings" })
screenshot({ selector: "#save-icon" })   // فقط عنصر مورد نظر را جدا کن
console_logs({ level: "error" })         // خطاهای JS مرتبط را بررسی کن

// تعامل با فرم
navigate({ url: "http://localhost:3000/signup" })
fill({ fields: [{ selector: "#name", value: "Ada" }, { selector: "#email", value: "ada@example.com" }] })
press({ key: "Enter", selector: "[type=submit]" })
screenshot({})                           // نتیجه را ببین

// بررسی ریسپانسیو
resize({ width: 375, height: 667 })
screenshot({ fullPage: true })
```

## نکته امنیتی

این سرور به کلاینت AI متصل قابلیت ناوبری در یک مرورگر واقعی (headless) به هر URL داده‌شده را می‌دهد — از جمله `localhost` و سایر آدرس‌های شبکه محلی شما. برای استفاده توسعه محلی قابل اعتماد از طریق stdio طراحی شده است. آن را از طریق transport شبکه در معرض نگذارید یا به کلاینت غیرقابل اعتماد ندهید.

## توسعه

```bash
npm test        # smoke-test.mjs را اجرا می‌کند: سرور را به‌عنوان subprocess راه‌اندازی کرده و
                # هر ابزار + پارامتر را از طریق پروتکل واقعی MCP آزمایش می‌کند
```

`smoke-test.mjs` در CI نیز در هر push/PR اجرا می‌شود.

## تاریخچه تغییرات

### v1.1.0
- اضافه شدن ابزار `fill` — تنظیم مقدار input/textarea/select (از `fields[]` دسته‌ای پشتیبانی می‌کند)
- اضافه شدن ابزار `type` — تایپ به‌ازای هر کلید برای inputهایی که به رویدادهای keydown واقعی نیاز دارند
- اضافه شدن ابزار `press` — ارسال کلیدهای صفحه‌کلید (`Enter`، `Tab`، `Escape`، `Control+A`، ...)
- گسترش smoke test با پوشش کامل تعامل با فرم

### v1.0.0
- انتشار اولیه: `navigate`، `screenshot`، `click`، `resize`، `console_logs`

## مجوز

[MIT](LICENSE)
