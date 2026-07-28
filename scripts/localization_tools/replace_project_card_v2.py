from pathlib import Path

FILE = Path("frontend/src/components/ProjectCard.tsx")

replacements = {

    # comments
    "添加CSS动画样式": "Add CSS animation styles",
    "将样式注入到页面": "Inject styles into page",
    "优先使用后端提供的缩略图": "Prefer backend thumbnail",
    "项目没有视频路径": "Project has no video path",
    "检查缓存": "Check cache",
    "尝试多个可能的视频文件路径": "Try multiple possible video paths",
    "设置合适的缩略图尺寸": "Set suitable thumbnail size",
    "缓存缩略图": "Cache thumbnail",
    "如果localStorage空间不足，清理旧缓存": "Clear old cache if localStorage is full",
    "所有视频路径都加载失败": "All video paths failed",
    "生成缩略图时发生错误": "Error generating thumbnail",

    # messages
    "视频加载超时": "Video loading timeout",
    "视频元数据加载成功": "Video metadata loaded",
    "无法获取canvas上下文": "Unable to get canvas context",
    "视频加载失败": "Video loading failed",
    "重试失败，请稍后再试": "Retry failed, please try again",
    "项目正在导入中，请稍后再查看详情": "Project is importing, check later",
    "项目处理中，请完成后再查看": "Project is processing, check after completion",
    "生成封面中…": "Generating cover...",
    "确定要删除这个项目吗？": "Delete this project?",
    "删除后无法恢复": "Cannot be recovered after deletion",
    "确定": "Confirm",
    "取消": "Cancel",
    "开始处理": "Start processing",
    "重新提交任务": "Resubmit task",
    "下载功能开发中...": "Download feature under development",

    # UI
    "缩略图加载状态": "Thumbnail loading status",
    "分类标签 - 左上角": "Category label - top left",
    "操作按钮": "Action buttons",
    "删除按钮": "Delete button",
    "项目名称 - 始终在顶部": "Project name - always on top",
    "切片": "clips",
    "合集": "collections",
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