from pathlib import Path
import re


pattern = re.compile(
    r"[\u4e00-\u9fff]"
)


root = Path(
    "frontend/src"
)


found = 0


for file in root.rglob("*.tsx"):

    text = file.read_text(
        encoding="utf-8"
    )

    if pattern.search(text):

        print(file)

        found += 1


print()
print(
    "FILES WITH CHINESE:",
    found
)