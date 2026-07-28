from pathlib import Path

path = Path("frontend/src/components/CollectionPreviewModal.tsx")

text = path.read_text(encoding="utf-8")

replacements = {

    # comments
    "从store中获取最新的collection状态":
        "Get latest collection state from store",

    "按照latestCollection.clip_ids的顺序排列clips":
        "Sort clips according to latestCollection.clip_ids order",

    "拖拽开始":
        "Drag started",

    "拖拽结束":
        "Drag ended",

    "无论如何都要清除拖拽状态":
        "Always clear drag state",

    "拖拽Cancel或无目标位置":
        "Drag cancelled or no target position",

    "检查是否真的有位置变化":
        "Check whether position actually changed",

    "位置未变化，跳过更新":
        "Position unchanged, skip update",

    "原始顺序":
        "Original order",

    "新顺序":
        "New order",

    "显示加载状态":
        "Show loading state",

    "更新当前播放索引":
        "Update current playback index",

    "调整当前播放索引":
        "Adjust current playback index",

    # UI
    "正在移除切片...":
        "Removing clip...",

    "移除切片失败":
        "Failed to remove clip",

    "头部标题栏":
        "Header",

    "个切片":
        "clips",

    "开发中，敬请期待":
        "Coming soon",

    "删除":
        "Delete",

    "关闭合集预览":
        "Close collection preview",

    "关闭":
        "Close",

    "主体内容":
        "Main content",

    "左侧视频播放器":
        "Left video player",

    "视频信息栏 - 移到视频下方":
        "Video information bar - moved below video",

    "这里可以触发父组件的更新回调":
        "Can trigger parent update callback here",

    "标题已更新":
        "Title updated",

    "右侧切片列表":
        "Right clip list",

    "Confirm要从合集中移除这个切片吗？":
        "Confirm remove this clip from collection?",

    "Add Clip模态框":
        "Add Clip modal",

    "投稿弹窗":
        "Upload modal",

    "视频片段":
        "Video clip",

    "Upload successful后可以刷新数据或显示提示":
        "Refresh data or show notification after successful upload",

    "合集Upload successful":
        "Collection upload successful",
}

count = 0

for old, new in replacements.items():
    if old in text:
        text = text.replace(old, new)
        count += 1

path.write_text(text, encoding="utf-8")

print("Заменено:", count)
print(path)