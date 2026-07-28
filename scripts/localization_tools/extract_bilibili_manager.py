from pathlib import Path
import re

FILE = Path("frontend/src/components/BilibiliManager.tsx")
REPORT = Path("bilibili_manager_localization.txt")

# Ищем китайские символы
CHINESE_RE = re.compile(r"[\u4e00-\u9fff]+")


def extract_lines(text):
    result = []

    for i, line in enumerate(text.splitlines(), start=1):
        if CHINESE_RE.search(line):
            result.append(f"{i}: {line.strip()}")

    return result


def main():
    if not FILE.exists():
        print("Файл не найден:")
        print(FILE)
        return

    text = FILE.read_text(encoding="utf-8")

    lines = extract_lines(text)

    REPORT.write_text(
        "\n".join(lines),
        encoding="utf-8"
    )

    print("Готово")
    print(f"Файл: {FILE}")
    print(f"Найдено строк: {len(lines)}")
    print(f"Отчёт: {REPORT}")


if __name__ == "__main__":
    main()