from pathlib import Path
import re
import json


FILE = Path(
    r"frontend\src\components\FirstRunWizard.tsx"
)

OUT = Path(
    "first_run_wizard_localization.txt"
)


CHINESE_RE = re.compile(r"[\u4e00-\u9fff]")


def main():

    text = FILE.read_text(
        encoding="utf-8"
    )

    lines = text.splitlines()

    result = []

    for i, line in enumerate(lines, start=1):

        if CHINESE_RE.search(line):

            result.append({
                "line": i,
                "text": line.strip()
            })


    OUT.write_text(
        "\n".join(
            f"{x['line']}: {x['text']}"
            for x in result
        ),
        encoding="utf-8"
    )


    print("Готово")
    print("Файл:", FILE)
    print("Найдено строк:", len(result))
    print("Отчёт:", OUT)


if __name__ == "__main__":
    main()