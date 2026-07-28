from pathlib import Path


FILE = Path(
    "frontend/src/components/BilibiliDownload.tsx"
)


replacements = {

    "加载Video category配置":
        "Load video category configuration",

    "加载Video category失败":
        "Failed to load video category",

    "清除之前的Error信息":
        "Clear previous error information",

    "解析成功，清除Error信息":
        "Parsing succeeded, clear error information",

    "自动填充项目名称":
        "Automatically fill project name",

    "重置Status":
        "Reset status",

    "轮询任务Status失败":
        "Task status polling failed",

    "检查响应是否包含项目ID（新的优化后的响应格式）":
        "Check whether response contains project ID (optimized response format)",

    "B站":
        "Bilibili",

    "项目创建成功，正在后台下载中，您可以继续添加其他项目":
        "Project created successfully. Downloading in background, you can continue adding projects",

    "请粘贴B站或YouTube视频链接，支持：":
        "Paste Bilibili or YouTube video link, supported:",

    "清除之前的解析结果和Error信息":
        "Clear previous parsing result and error information",

    "失去焦点时自动解析":
        "Automatically parse when focus is lost",

    "显示解析成功的视频信息":
        "Display successfully parsed video information",

    "只有解析成功后才显示项目名称和分类":
        "Show project name and category only after successful parsing",

    "UP主":
        "Uploader",

    "频道":
        "Channel",

    "时长":
        "Duration",

    "选择浏览器可获取登录Status，用于下载AI字幕。如不选择将只能下载公开字幕。":
        "Selecting browser can obtain login status for downloading AI subtitles. Without selection only public subtitles can be downloaded.",

    "导入中...":
        "Importing...",

    "下载进度":
        "Download progress",

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