from pathlib import Path

path = Path(
    "frontend/src/components/ClipDetailModal.tsx"
)

text = path.read_text(encoding="utf-8")


replacements = {

    # UI
    "切片详情": "Clip Details",

    "播放":
        "Play",

    "暂停":
        "Pause",

    "下载切片":
        "Download Clip",

    "评分":
        "Score",

    "内容要点":
        "Key Points",

    "时间信息":
        "Time Information",

    "开始时间":
        "Start Time",

    "结束时间":
        "End Time",

    "未命名片段":
        "Unnamed Clip",

    "标题":
        "Title",

    # comments
    "移除小数点后的毫秒部分，只保留时分秒":
        "Remove milliseconds, keep hours minutes seconds",

    "根据分数区间设置不同的颜色":
        "Set colors based on score ranges",

    "绿色 - 优秀":
        "Green - Excellent",

    "蓝色 - 良好":
        "Blue - Good",

    "橙色 - 一般":
        "Orange - Average",

    "红橙色 - 较差":
        "Orange Red - Poor",

    "红色 - 差":
        "Red - Bad",

    "头部":
        "Header",

    "左侧视频播放器":
        "Left video player",

    "视频信息":
        "Video Information",

    "操作按钮":
        "Action Buttons",

    "右侧详细信息":
        "Right Details",

    "内容要点:":
        "Key Points:",

    "更新clip的标题":
        "Update clip title",

    "标题已更新":
        "Title updated",

}


count = 0

for old, new in replacements.items():
    if old in text:
        text = text.replace(old, new)
        count += 1


path.write_text(
    text,
    encoding="utf-8"
)


print("Готово")
print("Заменено:", count)
print(path)