from pathlib import Path


FILE = Path(
    r"frontend\src\components\FirstRunWizard.tsx"
)


REPLACEMENTS = {

    "message.error('иЇ·йЂ‰ж‹©LLMжЏђдѕ›е•†е№¶иѕ“е…ҐAPI Key')":
        "message.error('Пожалуйста, выберите LLM провайдера и введите API Key')",

    "message.error('иЇ·йЂ‰ж‹©иЇ­йџіиЇ†е€«ж–№жЎ€')":
        "message.error('Пожалуйста, выберите вариант распознавания речи')",

    "message.success('й…ЌзЅ®е®Њж€ђ!ж¬ўиїЋдЅїз”ЁAutoClip')":
        "message.success('Настройка завершена! Добро пожаловать в DS OS')",

    "message.error('й…ЌзЅ®дїќе­е¤±иґҐпјЊиЇ·й‡ЌиЇ•')":
        "message.error('Ошибка сохранения настроек, попробуйте снова')",

    "message.info('е·Іи·іиї‡AIжЁЎећ‹й…ЌзЅ®пјЊиї›е…ҐиЇ­йџіиЇ†е€«й…ЌзЅ®', 3)":
        "message.info('AI модель настроена, переход к настройке распознавания речи', 3)",

    "message.info('е·Іи·іиї‡иЇ­йџіиЇ†е€«й…ЌзЅ®пјЊе®Њж€ђеђ‘еЇј', 3)":
        "message.info('Распознавание речи настроено, завершаем настройку', 3)",

    "message.warning('иЇ·е…€иѕ“е…ҐAPI Key')":
        "message.warning('Сначала введите API Key')",

    "message.success('APIиїћжЋҐжµ‹иЇ•ж€ђеЉџ!')":
        "message.success('Проверка API соединения успешна!')",

    "ж¬ўиїЋдЅїз”Ё AutoClip":
        "Добро пожаловать в DS OS",

    "и®©ж€‘д»¬еї«йЂџй…ЌзЅ®ж‚Ёзљ„AIи§†йў‘е€‡з‰‡е·Ґе…·":
        "Давайте быстро настроим ваш AI инструмент обработки видео",

    "дёЉдёЂж­Ґ":
        "Следующий шаг",

    "зЁЌеђЋи®ѕзЅ®":
        "Настроить позже",

    "ејЂе§‹дЅїз”Ё":
        "Начать использование",

    "ж­ЈењЁдїќе­й…ЌзЅ®е№¶е€›е»єз¤єдѕ‹йЎ№з›®...":
        "Сохраняем настройки и создаём пример проекта..."

}


def main():

    text = FILE.read_text(
        encoding="utf-8"
    )

    count = 0

    for old, new in REPLACEMENTS.items():

        if old in text:
            text = text.replace(
                old,
                new
            )
            count += 1


    FILE.write_text(
        text,
        encoding="utf-8"
    )


    print("Готово")
    print("Заменено:", count)
    print(FILE)


if __name__ == "__main__":
    main()