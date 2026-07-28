from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


source = ROOT / "frontend" / "src" / "pages" / "HomePage.tsx"


text = source.read_text(
    encoding="utf-8"
)


# сохраняем оригинал без потери кодировки
out = ROOT / "homepage_source_dump.txt"

out.write_text(
    text,
    encoding="utf-8"
)


print("Готово")
print(source)
print("Создан:", out)