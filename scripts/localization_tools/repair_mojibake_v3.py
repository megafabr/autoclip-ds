from pathlib import Path
import shutil


ROOT = Path("frontend/src")

REPORT = Path(
    "localization_reports/repaired_v3.txt"
)


BAD = [
    "Рџ",
    "Рђ",
    "Рќ",
    "РЎ",
    "Р’",
    "дё",
    "ж",
    "Џ",
    "Ќ",
    "и",
    "е"
]


def bad_score(text):

    score = 0

    for x in BAD:
        score += text.count(x)

    return score


def try_fix(text):

    candidates = []


    encodings = [
        ("latin1", "utf-8"),
        ("cp1252", "utf-8"),
        ("cp1251", "utf-8"),
    ]


    for a,b in encodings:

        try:

            x = text.encode(a).decode(b)

            candidates.append(x)

        except:
            pass


    if not candidates:
        return text


    old_score = bad_score(text)

    best = text
    best_score = old_score


    for x in candidates:

        s = bad_score(x)

        if s < best_score:

            best = x
            best_score = s


    return best



def process(path):

    text = path.read_text(
        encoding="utf-8",
        errors="ignore"
    )


    before = bad_score(text)

    if before < 3:
        return False


    fixed = try_fix(text)


    after = bad_score(fixed)


    if after >= before:
        return False


    backup = path.with_suffix(
        path.suffix + ".bak"
    )

    shutil.copy2(
        path,
        backup
    )


    path.write_text(
        fixed,
        encoding="utf-8"
    )


    print(
        "FIX:",
        path,
        before,
        "->",
        after
    )


    return True



def main():

    fixed=[]


    for p in list(ROOT.rglob("*.tsx")) + list(ROOT.rglob("*.ts")):

        try:

            if process(p):
                fixed.append(str(p))

        except Exception as e:
            print(
                "ERR",
                p,
                e
            )


    REPORT.write_text(
        "\n".join(fixed),
        encoding="utf-8"
    )


    print()
    print("="*50)
    print(
        "Fixed:",
        len(fixed)
    )



if __name__=="__main__":
    main()