from pathlib import Path


ROOT = Path("frontend/src")


def repair_file(path):

    data = path.read_bytes()

    try:
        text = data.decode("utf-8")

    except UnicodeDecodeError:
        return False


    fixed = False


    # исправляем типичный mojibake
    if "Р" in text or "С" in text:

        try:
            new = text.encode(
                "latin1"
            ).decode(
                "utf-8"
            )

            text = new
            fixed = True

        except:
            pass


    if fixed:

        path.write_text(
            text,
            encoding="utf-8"
        )

        print(
            "FIX:",
            path
        )

        return True


    return False



def main():

    count=0

    for file in ROOT.rglob("*"):

        if file.suffix in [
            ".tsx",
            ".ts",
            ".js"
        ]:

            if repair_file(file):
                count+=1


    print(
        "Fixed:",
        count
    )


if __name__=="__main__":
    main()