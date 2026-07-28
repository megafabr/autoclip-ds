from pathlib import Path

path = Path(
    "frontend/src/components/CollectionCard.tsx"
)

text = path.read_text(encoding="utf-8")


replacements = {

    # labels
    "合集类型标签":
        "Collection type label",

    "AI 推荐":
        "AI Recommended",

    "AI推荐":
        "AI Recommended",

    "手动创建":
        "Manual Created",

    "片段":
        "Clips",

    "合集":
        "Collection",

    "播放":
        "Play",

    "下载":
        "Download",

    "投稿":
        "Upload",

    "暂无描述":
        "No description",

    "更新合集标题":
        "Update collection title",

    # comments
    "按照collection.clip_ids的顺序排列clips":
        "Sort clips according to collection.clip_ids order",

    "左下角片段数量":
        "Bottom left clip count",

    "右下角总时长":
        "Bottom right total duration",

    "内容区域 - 固定高度":
        "Content area - fixed height",

    "允许flex子项收缩":
        "Allow flex items to shrink",

    "标题区域 - 固定高度":
        "Title area - fixed height",

    "合集描述 - 固定高度":
        "Collection description - fixed height",

    "操作按钮 - 固定在底部":
        "Action buttons - fixed bottom",

    "开发中，敬请期待":
        "Coming soon",

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