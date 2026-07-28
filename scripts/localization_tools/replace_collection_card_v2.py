from pathlib import Path

path = Path(
    "frontend/src/components/CollectionCard.tsx"
)

text = path.read_text(encoding="utf-8")


replacements = {

    "右上角Collection type label":
        "Top right collection type label",

    "左下角Clips数量":
        "Bottom left clip count",

    " 个Clips":
        " Clips",

    "更新Collection标题":
        "Update Collection title",

    "Collection描述 - 固定高度":
        "Collection description - fixed height",

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