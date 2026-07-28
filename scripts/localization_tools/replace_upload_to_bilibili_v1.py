from pathlib import Path

FILE = Path(
    "frontend/src/components/UploadToBilibili.tsx"
)

replacements = {
    "获取分区名称": "Получить название раздела",
    "未知分区": "Неизвестный раздел",
    "B站分区信息": "Информация о разделе Bilibili",
    "当前分区": "Текущий раздел",
    "支持的分区类型：动画、鬼畜、音乐、知识、舞蹈、影视、科技等":
        "Поддерживаемые типы разделов: анимация, монтаж, музыка, знания, танцы, кино, технологии и др.",
    "分区ID": "ID раздела",
    "未设置": "Не задано",
}

text = FILE.read_text(encoding="utf-8")
count = 0

for old, new in replacements.items():
    if old in text:
        text = text.replace(old, new)
        count += 1

FILE.write_text(text, encoding="utf-8")

print("Готово")
print(f"Заменено: {count}")
print(FILE)