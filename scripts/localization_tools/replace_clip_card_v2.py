from pathlib import Path

path = Path(
    "frontend/src/components/ClipCard.tsx"
)

text = path.read_text(encoding="utf-8")


replacements = {

    # comments
    "获取第1秒的帧作为缩略图":
        "Get first second frame as thumbnail",

    "直接调用API":
        "Direct API call",

    "更新本地状态":
        "Update local state",

    "解析时间格式":
        "Parse time format",

    "获取要显示的简介内容":
        "Get description content",

    "优先显示推荐理由（这是AI生成的内容要点）":
        "Prefer recommendation reason (AI generated key points)",

    "如果没有推荐理由，尝试从content中获取非转写文本的内容要点":
        "If no recommendation reason, try getting key points from content",

    "过滤掉可能是转写文本的内容":
        "Filter possible transcript text",

    "如果文本长度超过100字符或包含大量标点符号，可能是转写文本":
        "Text over 100 chars or many symbols may be transcript",

    "最后回退到outline（大纲）":
        "Fallback to outline",

    "右上角推荐分数":
        "Top right recommendation score",

    "左下角时间区间":
        "Bottom left time range",

    "右下角视频时长":
        "Bottom right video duration",

    "内容区域 - 固定高度":
        "Content area - fixed height",

    "允许flex子项收缩":
        "Allow flex items to shrink",

    "标题区域 - 固定高度":
        "Title area - fixed height",

    "内容要点 - 固定高度":
        "Key points area - fixed height",

    "操作按钮 - 固定在底部":
        "Action buttons - fixed bottom",

    "投稿":
        "Upload",

    "视频Play模态框":
        "Video Play modal",

    "Download视频":
        "Download video",

    "投稿到B站":
        "Upload to Bilibili",

    "为关闭按钮留出空间":
        "Reserve space for close button",

    "Play器标题已更新":
        "Player title updated",

    "这里可以触发父组件的更新回调":
        "Trigger parent component update callback here",

    "确保不会与关闭按钮重叠":
        "Ensure no overlap with close button",

    "B站管理弹窗":
        "Bilibili management modal",

    "投稿成功后可以刷新数据或显示提示":
        "After upload success refresh data or show notification",

    "投稿成功":
        "Upload successful",
}


count = 0

for old, new in replacements.items():
    if old in text:
        text = text.replace(old, new)
        count += 1


path.write_text(text, encoding="utf-8")

print("Готово")
print("Заменено:", count)
print(path)