from pathlib import Path


FILES = {

"frontend/src/components/BilibiliAccountManager.tsx": {
    "Получение состояния здоровья аккаунтовошибка:": 
        "Получение состояния здоровья аккаунтов. Ошибка:",

    "QR-кодОшибка входа, попробуйте снова":
        "Ошибка входа по QR-коду, попробуйте снова",
},


"frontend/src/components/FirstRunWizard.tsx": {
    "WhisperОшибка загрузки модели:":
        "Ошибка загрузки модели Whisper:",
}

}


changed = 0


for filename, replacements in FILES.items():

    path = Path(filename)

    if not path.exists():
        print("NOT FOUND:", filename)
        continue

    text = path.read_text(encoding="utf-8")

    old = text

    for a,b in replacements.items():
        text=text.replace(a,b)

    if text != old:
        path.write_text(text,encoding="utf-8")
        print("FIXED:", filename)
        changed += 1


print()
print("="*50)
print("Files changed:", changed)