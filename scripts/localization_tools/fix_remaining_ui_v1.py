from pathlib import Path


FILES = [
    "frontend/src/components/BilibiliAccountManager.tsx",
    "frontend/src/components/BilibiliManager.tsx",
    "frontend/src/components/FirstRunWizard.tsx",
    "frontend/src/components/UploadToBilibili.tsx",
    "frontend/src/pages/HomePage.tsx",
    "frontend/src/pages/SettingsPage.tsx",
    "frontend/src/components/CollectionPreviewModal.tsx",
]


REPLACE = {

    # Chinese broken fragments
    "дё‹иЅЅ": "Download",
    "дё‹иЅЅи§†йў‘": "Download Video",
    "ж’­ж”ѕ": "Play",
    "жљ‚еЃњ": "Pause",

    "жЉ•зЁї": "Upload",
    "жЉ•зЁїе€°Bз«™": "Upload to Bilibili",

    "еЃҐеє·": "Health",
    "еЃҐеє·Account": "Account Health",

    "жЈЂжџҐ": "Check",
    "жЈЂжџҐAccount": "Check Account",

    "жњЄе‘ЅеђЌз‰‡ж®µ": "Untitled Clip",

    "еЏ–ж¶€": "Cancel",
    "зЎ®е®љ": "Confirm",

    "ж·»еЉ ": "Add",
    "е€ й™¤": "Delete",

    "ж›ґж–°": "Refresh",
    "ж›ґж–°жЃЃжЂЃ": "Refresh Status",

    "ејЂе§‹": "Start",
    "з»“жќџ": "End",

    "ж—¶й—ґ": "Time",

    "å…³é—­": "Close",
    "е…ій—­": "Close",

    "合集": "Collection",
    "切片": "Clip",
    "片段": "Clip",

    "AI推荐": "AI Recommended",
    "手动创建": "Manual Created",

    # Mojibake Russian remnants
    "Р’РІРµРґРёС‚Рµ": "Enter",
    "РђРєРєР°СѓРЅС‚": "Account",
    "РћС€РёР±РєР°": "Error",

}


def process_file(path):

    p = Path(path)

    if not p.exists():
        return False


    text = p.read_text(
        encoding="utf-8",
        errors="ignore"
    )


    old = text


    for a,b in REPLACE.items():
        text = text.replace(a,b)


    if text != old:

        p.write_text(
            text,
            encoding="utf-8"
        )

        print(
            "FIXED:",
            path
        )

        return True


    return False



def main():

    count = 0

    for file in FILES:

        if process_file(file):
            count += 1


    print()
    print("="*50)
    print(
        "Files changed:",
        count
    )



if __name__ == "__main__":
    main()