from pathlib import Path

FILE = Path("frontend/src/components/ProjectCard.tsx")

replacements = {
    "B站 imports": "Bilibili imports",
}

text = FILE.read_text(encoding="utf-8")

count = 0

for old, new in replacements.items():
    if old in text:
        text = text.replace(old, new)
        count += 1

FILE.write_text(text, encoding="utf-8")

print("Готово")
print("Заменено:", count)
print(FILE)