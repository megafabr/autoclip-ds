from pathlib import Path

FILE = Path("frontend/src/components/ProjectCard.tsx")

replacements = {
    "尝试下一个Path": "Try next Path",

    "自动启动 pending 状态的Project（但不包括下载中的Project）。":
        "Auto start pending projects (except downloading projects).",

    "关键：每个Project最多只自动尝试一次，且失败时不弹 toast。":
        "Key: each project is auto-tried only once, no toast on failure.",

    "之前这里把 isRetrying 放进依赖、又在 handleRetry 里翻转 isRetrying，":
        "Previously isRetrying was added to dependencies and toggled in handleRetry.",

    "导致 effect 反复触发 → 对一个还没下载完的 B站Project疯狂 POST /process（返回":
        "This caused repeated effects and POST /process requests for unfinished Bilibili projects (returning",

    "满屏「Retry failed」。下载完成后后端会自动启动":
        "many Retry failed messages. Backend starts automatically after download.",

    "流水线，所以这里只需做一次「尽力而为」的启动即可。":
        "pipeline, so only one best-effort start is needed.",

    "让父组件统一处理 toast / 刷新。但「静默自动启动」绝不能触发父组件，":
        "Let parent component handle toast / refresh. Silent auto start must not trigger parent.",

    "否则会走 handleRetryProject → loadProjects → 列表重挂载 → 再次自动启动":
        "Otherwise flow becomes handleRetryProject → loadProjects → remount → auto start again.",

    "的死循环。只有用户手动点重试才通知父组件。":
        "infinite loop. Only manual retry notifies parent.",

    "更新时间和Action buttons - 移动到封面底部":
        "Update time and action buttons - move to cover bottom",

    "Status and statistics — Calm Premium，见 DESIGN.md":
        "Status and statistics — Calm Premium, see DESIGN.md",

    "灰色 mono 元信息（N clips · M collections）":
        "gray mono metadata (N clips · M collections)",
}

text = FILE.read_text(encoding="utf-8")

count = 0

for old, new in replacements.items():
    if old in text:
        text = text.replace(old, new)
        count += 1

FILE.write_text(text, encoding="utf-8")

print("Готово")
print("Заменено:", count)
print(FILE)