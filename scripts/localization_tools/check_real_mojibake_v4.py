from pathlib import Path
import re


ROOT = Path("frontend/src")


# реальные признаки испорченной UTF-8
BAD_CHARS = [
    "Ѓ",
    "Ќ",
    "Џ",
    "Ђ",
    "Њ",
    " ",
    "Ã",
    "Â",
    "Ð",
    "Ñ",
    "ð",
]


def is_bad(line):

    hits = []

    for ch in BAD_CHARS:
        if ch in line:
            hits.append(ch)

    return hits



files = 0
lines = 0


for file in ROOT.rglob("*"):

    if file.suffix not in [".tsx", ".ts"]:
        continue


    try:
        content = file.read_text(
            encoding="utf-8"
        )

    except Exception:
        continue


    bad=[]


    for num,line in enumerate(content.splitlines(),1):

        found = is_bad(line)

        if found:

            bad.append(
                f"{num}: {line.strip()}"
            )


    if bad:

        files += 1

        print()
        print("="*60)
        print(file)

        for item in bad:
            print(item)

        lines += len(bad)



print()
print("="*60)
print("FILES:", files)
print("LINES:", lines)