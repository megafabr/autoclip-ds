from pathlib import Path

FILE = Path("frontend/src/components/ProjectCard.tsx")

replacements = {
    # category names
    "默认": "Default",
    "知识科普": "Knowledge",
    "商业财经": "Business",
    "观点评论": "Opinion",
    "经验分享": "Experience",
    "演讲脱口秀": "Speech",
    "内容解说": "Content Review",
    "娱乐内容": "Entertainment",

    # comments
    "获取分类信息": "Get category information",
    "缩略图缓存管理": "Thumbnail cache management",
    "生成项目视频缩略图（带缓存）": "Generate project video thumbnail with cache",
}

text = FILE.read_text(encoding="utf-8")

count = 0

for old, new in replacements.items():
    if old in text:
        text = text.replace(old, new)
        count += 1

FILE.write_text(text, encoding="utf-8")

print("Готово")
print("Заменено:", count)
print(FILE)