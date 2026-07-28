from pathlib import Path
import re


ROOT = Path("frontend/src")
OUT = Path("localization_reports/ui_strings.txt")


patterns = [
    r'title="([^"]+)"',
    r'placeholder="([^"]+)"',
    r"description=\"([^\"]+)\"",
    r"message\.\w+\('([^']+)'",
    r">\s*([^<>{}\n]*[\u4e00-\u9fff][^<>{}\n]*)\s*<",
]


def main():

    result=[]

    for file in ROOT.rglob("*.tsx"):

        text=file.read_text(
            encoding="utf-8",
            errors="ignore"
        )

        found=[]

        for p in patterns:

            found += re.findall(
                p,
                text
            )


        if found:

            result.append(
                "\n"+
                "="*60+
                "\n"+
                str(file)
            )

            for x in sorted(set(found)):

                result.append(
                    "\n"+x
                )


    OUT.parent.mkdir(
        exist_ok=True
    )

    OUT.write_text(
        "\n".join(result),
        encoding="utf-8"
    )


    print(
        "DONE",
        OUT
    )


if __name__=="__main__":
    main()