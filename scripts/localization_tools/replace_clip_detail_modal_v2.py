from pathlib import Path

path = Path(
    "frontend/src/components/ClipDetailModal.tsx"
)

text = path.read_text(encoding="utf-8")


replacements = {

    "左侧视频Play器":
        "Left video player",

    "Score: {(clip.final_score * 100).toFixed(0)}分":
        "Score: {(clip.final_score * 100).toFixed(0)}",

    "更新clip的Title":
        "Update clip Title",

    "Title已更新":
        "Title updated",

    "这里可以触发父组件的更新回调":
        "Trigger parent component update callback here",

    "时间戳信息":
        "Timestamp Information",

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