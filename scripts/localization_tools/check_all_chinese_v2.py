from pathlib import Path
import re


ROOT = Path("frontend/src")
REPORT = Path("localization_reports/chinese_remaining_report.txt")


pattern = re.compile(r"[\u4e00-\u9fff]")


def scan_file(path):

    results = []

    try:
        lines = path.read_text(
            encoding="utf-8"
        ).splitlines()

    except:
        return results


    for num, line in enumerate(lines, 1):

        if pattern.search(line):

            results.append(
                f"""
LINE {num}:
{line.strip()}

"""
            )

    return results



def main():

    REPORT.parent.mkdir(
        exist_ok=True
    )

    report = []

    files = 0
    lines = 0


    for file in ROOT.rglob("*.tsx"):

        found = scan_file(file)

        if found:

            files += 1
            lines += len(found)

            report.append(
                "\n" +
                "="*70 +
                "\n"
                + str(file)
                + "\n"
            )

            report.extend(found)


    REPORT.write_text(
        "\n".join(report),
        encoding="utf-8"
    )


    print(
        f"FILES: {files}"
    )

    print(
        f"LINES: {lines}"
    )

    print(
        f"REPORT: {REPORT}"
    )


if __name__ == "__main__":
    main()