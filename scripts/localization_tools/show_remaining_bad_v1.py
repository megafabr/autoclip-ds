from pathlib import Path
import re


FILES = [
    "frontend/src/components/BilibiliAccountManager.tsx",
    "frontend/src/components/BilibiliManager.tsx",
    "frontend/src/components/FirstRunWizard.tsx",
    "frontend/src/components/UploadToBilibili.tsx",
    "frontend/src/pages/HomePage.tsx",
    "frontend/src/pages/SettingsPage.tsx",
    "frontend/src/components/CollectionPreviewModal.tsx",
]


pattern = re.compile(
    r"[РРЃЌЏдёж][^\n]{3,}"
)


for file in FILES:

    p = Path(file)

    print("\n")
    print("="*70)
    print(file)

    if not p.exists():
        continue


    lines = p.read_text(
        encoding="utf-8",
        errors="ignore"
    ).splitlines()


    count = 0


    for i,line in enumerate(lines,1):

        if pattern.search(line):

            print(
                f"{i}: {line.strip()}"
            )

            count += 1


            if count >= 20:
                break