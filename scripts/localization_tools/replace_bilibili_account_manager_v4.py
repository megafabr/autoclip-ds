from pathlib import Path

FILE = Path(
    "frontend/src/components/BilibiliAccountManager.tsx"
)

replacements = {

    "开始Вход по QR-коду":
        "Начать вход по QR-коду",

    "Вход по QR-коду可能触发B站风控机制，建议优先使用способ импорта Cookie。":
        "Вход по QR-коду может вызвать проверку безопасности Bilibili. Рекомендуется использовать импорт Cookie.",

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