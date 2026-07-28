from pathlib import Path
import sys
import re


ROOT = Path(__file__).resolve().parents[2]

COMPONENT_DIR = ROOT / "frontend" / "src"


def main():
    if len(sys.argv) < 2:
        print("Использование:")
        print("python extract_component.py ComponentName")
        return

    name = sys.argv[1]

    candidates = [
        COMPONENT_DIR / "components" / f"{name}.tsx",
        COMPONENT_DIR / "pages" / f"{name}.tsx",
        COMPONENT_DIR / "utils" / f"{name}.tsx",
    ]

    source = None

    for path in candidates:
        if path.exists():
            source = path
            break

    if not source:
        print("Файл не найден:")
        for p in candidates:
            print(p)
        return


    text = source.read_text(
        encoding="utf-8"
    )

    lines = text.splitlines()

    result = []

    pattern = re.compile(
        r"[\u4e00-\u9fff]"
    )

    for i, line in enumerate(lines, start=1):
        if pattern.search(line):
            result.append(
                f"{i}: {line}"
            )


    report = (
        ROOT /
        f"{name.lower()}_localization.txt"
    )

    report.write_text(
        "\n".join(result),
        encoding="utf-8"
    )


    print("Готово")
    print(f"Файл: {source.relative_to(ROOT)}")
    print(f"Найдено строк: {len(result)}")
    print(f"Отчёт: {report}")


if __name__ == "__main__":
    main()