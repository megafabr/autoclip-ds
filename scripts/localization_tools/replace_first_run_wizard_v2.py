from pathlib import Path


FILE = Path(
    r"frontend\src\components\FirstRunWizard.tsx"
)


REPLACEMENTS = {

    # errors
    "请选择LLM提供商并输入API Key":
        "Пожалуйста, выберите LLM провайдера и введите API Key",

    "请选择语音识别方案":
        "Пожалуйста, выберите вариант распознавания речи",

    "LLM配置保存失败，请重试":
        "Ошибка сохранения настроек LLM, попробуйте снова",

    "配置保存失败，请重试":
        "Ошибка сохранения настроек, попробуйте снова",

    "配置保存失败,请重试":
        "Ошибка сохранения настроек, попробуйте снова",


    # success
    "配置完成!欢迎使用AutoClip":
        "Настройка завершена! Добро пожаловать в DS OS",

    "API连接测试成功!":
        "Проверка API соединения успешна!",


    # info
    "已跳过AI模型配置,请稍后在配置页中进行设置":
        "Настройка AI модели пропущена, вы можете выполнить её позже в разделе настроек",

    "已跳过语音识别配置,请稍后在配置页中进行设置":
        "Настройка распознавания речи пропущена, вы можете выполнить её позже",


    # errors inside template
    "API连接测试失败:":
        "Ошибка проверки API:",

    "未知错误":
        "Неизвестная ошибка",

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