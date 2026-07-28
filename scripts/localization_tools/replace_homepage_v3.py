from pathlib import Path

FILE = Path(
    "frontend/src/pages/HomePage.tsx"
)

replacements = {
    "由 ProjectCard 在「用户手动点重试」且重试请求已成功后调用。":
        "Called by ProjectCard after user retry succeeds.",

    "ProjectCard.handleRetry 已经发过 start/retryProcessing 请求，这里只负责":
        "ProjectCard.handleRetry already sent start/retryProcessing request. Here we only:",

    "提示 + 刷新列表，绝不能再发一次重试请求（会和卡片自身的请求叠加，并制造":
        "show notification and refresh list. Never send another retry request (avoids duplicate requests:",

    "loadProjects→重挂载→自动启动 的循环）。":
        "loadProjects → remount → auto-start loop).",

    "导入中状态的项目不能点击进入详情页":
        "Projects in importing state cannot open details page",

    "其他状态可以正常进入详情页":
        "Other states can open details page normally",

    "按创建时间倒序排列，最新的在前面":
        "Sort by creation time descending, newest first",

    "处理完成后刷新项目列表":
        "Refresh project list after processing completed",

    "不再显示重复的toast提示，BilibiliDownload组件已经显示了统一的提示":
        "Do not show duplicate toast. BilibiliDownload already displays unified notification",
}


def main():
    text = FILE.read_text(encoding="utf-8")

    count = 0

    for old, new in replacements.items():
        if old in text:
            text = text.replace(old, new)
            count += 1

    FILE.write_text(text, encoding="utf-8")

    print("Готово")
    print(f"Заменено: {count}")
    print(FILE)


if __name__ == "__main__":
    main()