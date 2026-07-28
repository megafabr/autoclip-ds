from pathlib import Path


path = Path(
    "frontend/src/pages/SettingsPage.tsx"
)


text = path.read_text(
    encoding="utf-8"
)


old = text


text = text.replace(
    "：</Text>",
    ":</Text>"
)


text = text.replace(
    "</Text>：",
    "</Text>:"
)


if text != old:
    path.write_text(
        text,
        encoding="utf-8"
    )
    print("FIXED:", path)
else:
    print("NO CHANGES")

