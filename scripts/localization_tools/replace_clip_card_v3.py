from pathlib import Path

path = Path(
    "frontend/src/components/ClipCard.tsx"
)

text = path.read_text(encoding="utf-8")


replacements = {

    '或 "HH:MM:SS.mmm"':
        'or "HH:MM:SS.mmm"',

    '（通常转写文本很长且包含标点符号）':
        '(usually transcript text is long and contains punctuation)',

    '克制玻璃胶囊 + mono 数字':
        'calm glass capsule + mono number',

    '玻璃胶囊 + mono':
        'glass capsule + mono',

    'Upload到B站':
        'Upload to Bilibili',

    'Upload成功后可以刷新数据或显示提示':
        'After upload success refresh data or show notification',

    'Upload成功':
        'Upload successful',

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