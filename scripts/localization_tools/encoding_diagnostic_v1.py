from pathlib import Path


ROOT = Path("frontend/src")


def check(text):

    score = {
        "mojibake_ru": 0,
        "broken_cn": 0,
        "normal_cn": 0
    }

    if "Р" in text and "С" in text:
        score["mojibake_ru"] += 1

    bad_cn = [
        "дё",
        "ж",
        "е",
        "Ѓ",
        "Џ",
        "ґ"
    ]

    for x in bad_cn:
        if x in text:
            score["broken_cn"] += 1


    for ch in text:
        if "\u4e00" <= ch <= "\u9fff":
            score["normal_cn"] += 1
            break


    return score



def main():

    for file in ROOT.rglob("*.tsx"):

        text=file.read_text(
            encoding="utf-8",
            errors="ignore"
        )

        s=check(text)

        if any(s.values()):

            print(
                "\n",
                file
            )

            print(s)


if __name__=="__main__":
    main()