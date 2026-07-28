from pathlib import Path

FILE = Path("frontend/src/components/ProjectCard.tsx")

replacements = {
    "使用后端提供的缩略图": "Using backend thumbnail",
    "尝试加载视频": "Trying to load video",
    "秒超时": "seconds timeout",
    "取视频1/4处或5秒处的帧": "Take frame at 1/4 video position or 5 seconds",
    "保留最多50个缩略图缓存": "Keep maximum 50 thumbnail caches",
    "如果成功加载，跳出循环": "Break loop after successful load",
    "路径": "Path",
    "加载失败": "load failed",
    "尝试下一个路径": "Try next path",

    "检查是否是下载状态 - 根据下载进度判断": "Check download status based on progress",
    "状态标准化处理": "Normalize status",
    "调试信息": "Debug information",
    "计算进度百分比": "Calculate progress percentage",
    "下载中显示实际下载进度": "Show actual download progress",
    "pending状态显示5%进度，表示等待处理": "Pending status shows 5% progress",

    "对于PENDING状态的项目，使用startProcessing；对于其他状态，使用retryProcessing":
        "Use startProcessing for PENDING status, retryProcessing for others",

    "重试失败": "Retry failed",
    "自动启动（silent）失败不打扰用户；只有用户手动点重试才提示":
        "Silent auto start failure does not notify user",

    "导入中状态的项目不能点击进入详情页":
        "Importing projects cannot open details",
    "处理中状态的项目不能点击进入详情页":
        "Processing projects cannot open details",

    "无缩略图时的Default显示":
        "Default display without thumbnail",

    "移除右上角状态指示器 - 可读性差且冗余":
        "Remove top-right status indicator - poor readability",

    "失败状态：只显示重试和Delete button":
        "Failed status: show retry and delete only",

    "其他状态：显示下载、重试和Delete button":
        "Other states: show download, retry and delete",

    "重试按钮 - 在处理中和等待中状态显示，允许用户Resubmit task":
        "Retry button - available during processing and pending",

    "下载按钮 - 仅在完成状态显示":
        "Download button - only visible when completed",

    "实现下载功能":
        "Implement download feature",

    "状态和统计信息":
        "Status and statistics",

    "进行中 / 失败：细进度线或终态点，占满宽度":
        "Processing / failed: progress line or final point",

    "项目":
        "Project",

    "状态变化":
        "status changed",

    "下载进度更新":
        "download progress updated",

    "已完成：● 已完成":
        "Completed: ● Completed",

    "详细进度显示已隐藏 - 只在状态块中显示百分比":
        "Detailed progress hidden - percentage shown in status block",
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