from pathlib import Path


FILE = Path(
    "frontend/src/components/BilibiliDownload.tsx"
)


replacements = {
    "请粘贴Bilibili或YouTube视频链接，支持：":
        "Paste Bilibili or YouTube video link. Supported:",
}


def main():

    text = FILE.read_text(encoding="utf-8")

    count = 0

    for old, new in replacements.items():
        if old in text:
            text = text.replace(old, new)
            count += 1

    FILE.write_text(text, encoding="utf-8")

    print("Готово")
    print(f"Заменено: {count}")
    print(FILE)


if __name__ == "__main__":
    main()