from pathlib import Path


FILE = Path(
    r"frontend\src\pages\SettingsPage.tsx"
)


REPLACEMENTS = {

    "Система支持多шт.AI模型提供商：":
        "Система поддерживает несколько AI-провайдеров:",

    "移除重复的сообщение об успехе，обработка выполняется внутри SpeechRecognitionConfig":
        "Удаление повторного сообщения об успехе, обработка выполняется внутри SpeechRecognitionConfig",

}


def main():

    text = FILE.read_text(
        encoding="utf-8"
    )

    count = 0

    for old, new in REPLACEMENTS.items():
        if old in text:
            text = text.replace(old, new)
            count += 1

    FILE.write_text(
        text,
        encoding="utf-8"
    )

    print("Готово")
    print("Заменено:", count)


if __name__ == "__main__":
    main()