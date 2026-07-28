from pathlib import Path

FILE = Path("frontend/src/components/FirstRunWizard.tsx")

old = "Large (1550MB) - 最Высокая точность"
new = "Large (1550MB) - максимальная точность"

text = FILE.read_text(encoding="utf-8")

if old in text:
    text = text.replace(old, new)
    count = 1
else:
    count = 0

FILE.write_text(text, encoding="utf-8")

print("Готово")
print(f"Заменено: {count}")
print(FILE)