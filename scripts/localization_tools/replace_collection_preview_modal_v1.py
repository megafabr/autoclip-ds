from pathlib import Path

path = Path("frontend/src/components/CollectionPreviewModal.tsx")

text = path.read_text(encoding="utf-8")

replacements = {
    "删除合集": "Delete Collection",
    "确定要删除这个合集吗？此操作不可撤销。": "Are you sure you want to delete this collection? This action cannot be undone.",
    "确定": "Confirm",
    "取消": "Cancel",

    "正在更新切片顺序...": "Updating clip order...",
    "切片顺序修改失败": "Failed to update clip order",

    "正在删除切片...": "Deleting clip...",
    "删除切片失败": "Failed to delete clip",

    "正在添加切片...": "Adding clip...",
    "添加切片失败": "Failed to add clip",

    "导出完整视频": "Export full video",
    "投稿到B站": "Upload to Bilibili",

    "暂无视频内容": "No video content",

    "未命名片段": "Untitled clip",

    "分": "pts",

    "上一个切片": "Previous clip",
    "下一个切片": "Next clip",

    "播放列表": "Playlist",
    "拖拽调整顺序": "Drag to reorder",

    "添加切片": "Add Clip",

    "从合集移除这个切片": "Remove this clip from collection?",

    "投稿成功": "Upload successful",
}

count = 0

for old, new in replacements.items():
    if old in text:
        text = text.replace(old, new)
        count += 1

path.write_text(text, encoding="utf-8")

print("Заменено:", count)
print(path)