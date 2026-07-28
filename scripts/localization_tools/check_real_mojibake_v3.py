from pathlib import Path
import re


ROOT = Path("frontend/src")


BAD_PATTERNS = [
    r"Р[А-Яа-я]",
    r"[д][ё]",
    r"[ж][а-я]",
    r"[ЌЏЂЃ]",
    r"[¦]",
]


def check(text):

    result = []

    for p in BAD_PATTERNS:

        if re.search(p, text):
            result.append(p)

    return result



count_files = 0
count_lines = 0


for file in ROOT.rglob("*"):

    if file.suffix not in [".tsx", ".ts"]:
        continue


    lines = file.read_text(
        encoding="utf-8",
        errors="ignore"
    ).splitlines()


    bad=[]


    for n,line in enumerate(lines,1):

        found = check(line)

        if found:

            bad.append(
                f"{n}: {line.strip()}"
            )


    if bad:

        count_files += 1

        print()
        print("="*60)
        print(file)

        for x in bad[:20]:
            print(x)

        count_lines += len(bad)



print()
print("="*60)
print("FILES:", count_files)
print("LINES:", count_lines)