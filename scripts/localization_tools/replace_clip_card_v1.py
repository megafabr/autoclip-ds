from pathlib import Path

path = Path(
    "frontend/src/components/ClipCard.tsx"
)

text = path.read_text(encoding="utf-8")


replacements = {

    # функции / сообщения
    "生成视频缩略图": "Generate video thumbnail",
    "获取第1秒的视频帧作为缩略图": "Get first second frame as thumbnail",

    "下载方法，它会处理文件名": "Download method handles filename",
    "下载失败": "Download failed",

    "暂无内容要点": "No key points available",

    # UI
    "播放": "Play",
    "下载": "Download",
    "投币": "Upload",
    "投币到B站": "Upload to Bilibili",

    "视频预览": "Video Preview",
    "视频片段": "Video Clip",

    "未命名片段": "Unnamed Clip",

    "开发中，敬请期待": "Coming soon",

    "更新clip的标题": "Update clip title",

    "投币成功": "Upload successful",

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