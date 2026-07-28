from pathlib import Path
import re


ROOT = Path("frontend/src")


# китайские иероглифы
CN = re.compile(r"[\u4e00-\u9fff]")


files = 0
lines = 0


for file in ROOT.rglob("*"):

    if file.suffix not in [".tsx", ".ts"]:
        continue

    try:
        text = file.read_text(
            encoding="utf-8"
        )
    except:
        continue


    found=[]


    for n,line in enumerate(text.splitlines(),1):

        # только строки где есть китайские символы
        if CN.search(line):

            # исключаем комментарии
            if line.strip().startswith("//"):
                continue

            found.append(
                f"{n}: {line.strip()}"
            )


    if found:

        files += 1

        print()
        print("="*70)
        print(file)

        for x in found:
            print(x)

        lines += len(found)


print()
print("="*70)
print("FILES:", files)
print("LINES:", lines)