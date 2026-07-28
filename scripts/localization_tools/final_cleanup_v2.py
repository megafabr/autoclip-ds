from pathlib import Path


changes = {
    "frontend/src/components/BilibiliAccountManager.tsx": {
        "Вход по логину и паролюошибка:":
        "Ошибка входа по логину и паролю:"
    },

    "frontend/src/pages/SettingsPage.tsx": {
        "Web-режим：только показывает подсказку, без сохранения":
        "Web-режим: только показывает подсказку, без сохранения"
    }
}


count = 0


for file, repl in changes.items():

    path = Path(file)

    text = path.read_text(encoding="utf-8")
    old = text

    for a,b in repl.items():
        text = text.replace(a,b)

    if text != old:
        path.write_text(text, encoding="utf-8")
        print("FIXED:", file)
        count += 1


print()
print("="*50)
print("Files changed:", count)