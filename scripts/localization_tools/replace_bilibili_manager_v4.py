from pathlib import Path

FILE = Path(
    "frontend/src/components/BilibiliManager.tsx"
)

replacements = {

    # comments
    "// Удалить账号":
        "// Удаление аккаунта",

    "// Отправить上传":
        "// Отправка загрузки",


    # development message
    "开发中，敬请期待":
        "Функция находится в разработке, ожидайте",


    # cookie placeholder
    '请从浏览器开发者工具中复制Cookie，格式如：SESSDATA=xxx; bili_jct=xxx; DedeUserID=xxx':
        'Скопируйте Cookie из инструментов разработчика браузера, формат: SESSDATA=xxx; bili_jct=xxx; DedeUserID=xxx',

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