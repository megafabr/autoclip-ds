from pathlib import Path
import json
import re


ROOT = Path("frontend/src")


def load_dictionary():
    result = {}

    for f in Path("scripts/localization_tools/dictionaries").glob("*.json"):
        data = json.loads(
            f.read_text(encoding="utf-8")
        )
        result.update(data)

    return result


def localize_file(path, dictionary):

    text = path.read_text(encoding="utf-8")

    original = text
    count = 0

    # длинные фразы сначала
    for old in sorted(dictionary, key=len, reverse=True):
        new = dictionary[old]

        if old in text:
            text = text.replace(old, new)
            count += 1

    if text != original:
        path.write_text(
            text,
            encoding="utf-8"
        )

    return count


def scan():

    files = list(ROOT.rglob("*.tsx"))

    dictionary = load_dictionary()

    total = 0

    print(f"Files: {len(files)}")

    for file in files:

        count = localize_file(
            file,
            dictionary
        )

        if count:
            print(
                f"{file.name}: {count}"
            )
            total += count

    print()
    print(
        "TOTAL replacements:",
        total
    )


if __name__ == "__main__":
    scan()