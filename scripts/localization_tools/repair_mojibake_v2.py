from pathlib import Path
import shutil
import re


ROOT = Path("frontend/src")

REPORT_DIR = Path("localization_reports")
REPORT_DIR.mkdir(exist_ok=True)

REPORT = REPORT_DIR / "repaired_files.txt"


# Симптомы неправильной кодировки
BAD_MARKERS = [
    "Р’",
    "Рђ",
    "Рќ",
    "РЎ",
    "Рџ",
    "Ð",
    "Ñ",
    "дё",
    "ж",
    "Џ",
]


def is_mojibake(text: str) -> bool:
    """
    Проверяем, похож ли текст на сломанную кодировку
    """

    score = 0

    for marker in BAD_MARKERS:
        score += text.count(marker)

    return score >= 3


def repair_text(text: str):
    """
    Восстановление UTF-8 -> Windows-1252/latin1 ошибок
    """

    attempts = [
        ("latin1", "utf-8"),
        ("cp1252", "utf-8"),
    ]

    best = text
    best_score = count_bad(text)

    for src, dst in attempts:
        try:
            fixed = text.encode(src).decode(dst)

            score = count_bad(fixed)

            if score < best_score:
                best = fixed
                best_score = score

        except Exception:
            pass

    return best


def count_bad(text):

    score = 0

    for marker in BAD_MARKERS:
        score += text.count(marker)

    return score


def process_file(path: Path):

    original = path.read_text(
        encoding="utf-8",
        errors="ignore"
    )

    if not is_mojibake(original):
        return False


    repaired = repair_text(original)


    if repaired == original:
        return False


    backup = path.with_suffix(
        path.suffix + ".backup"
    )

    shutil.copy2(
        path,
        backup
    )


    path.write_text(
        repaired,
        encoding="utf-8"
    )


    return True



def main():

    repaired_files = []


    files = list(ROOT.rglob("*.tsx")) + list(ROOT.rglob("*.ts"))


    for file in files:

        try:

            if process_file(file):

                repaired_files.append(
                    str(file)
                )

                print(
                    "FIXED:",
                    file
                )

        except Exception as e:

            print(
                "ERROR:",
                file,
                e
            )


    REPORT.write_text(
        "\n".join(repaired_files),
        encoding="utf-8"
    )


    print()
    print("=" * 60)
    print(
        "Fixed:",
        len(repaired_files)
    )
    print(
        "Report:",
        REPORT
    )


if __name__ == "__main__":
    main()