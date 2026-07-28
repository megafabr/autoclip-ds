from pathlib import Path


FILE = Path(
    "frontend/src/components/BilibiliDownload.tsx"
)


replacements = {

    # comments
    "使用从API导入的BilibiliDownloadTask类型":
        "Use BilibiliDownloadTask type imported from API",

    "添加视频分类配置":
        "Add video category configuration",

    "清理轮询":
        "Clear polling",

    "检查API配置":
        "Check API configuration",

    "检查响应是否包含项目ID（新的创建后的响应格式）":
        "Check whether response contains project ID (new response format)",

    "新格式：项目已创建，立即重置表单":
        "New format: project created, reset form immediately",

    "显示统一的成功提示":
        "Show unified success notification",

    "旧格式：继续轮询任务状态":
        "Old format: continue polling task status",

    "保持分类和浏览器选择，方便用户继续添加项目":
        "Keep category and browser selection for adding more projects",


    # errors / messages

    "添加视频分类失败":
        "Failed to add video category",

    "请输入正确的视频链接":
        "Please enter a valid video URL",

    "请输入正确的B站或YouTube视频链接":
        "Please enter a valid Bilibili or YouTube video URL",

    "视频下载完成！":
        "Video download completed!",

    "下载失败":
        "Download failed",

    "请输入视频链接":
        "Please enter video URL",

    "请输入有效的B站或YouTube视频链接":
        "Please enter a valid Bilibili or YouTube video URL",

    "创建下载任务失败":
        "Failed to create download task",

    "已停止监控下载任务":
        "Download task monitoring stopped",

    "视频信息解析成功":
        "Video information parsed successfully",

    "正在解析视频信息...":
        "Parsing video information...",

    "视频信息解析成功":
        "Video information parsed successfully",

    "未知":
        "Unknown",

    "新建项目":
        "New project",

    "项目创建成功，正在后台下载中...":
        "Project created successfully, downloading in background...",


    # UI

    "输入表单":
        "Input form",

    "视频信息解析成功":
        "Video information parsed successfully",

    "项目名称（可选）":
        "Project name (optional)",

    "留空将使用视频标题作为项目名称":
        "Leave empty to use video title as project name",

    "浏览器选择（获取AI字幕需要）":
        "Browser selection (required for AI subtitles)",

    "选择浏览器以获取cookie（可选）":
        "Select browser to get cookie (optional)",

    "选择浏览器可获取登录状态，用于下载AI字幕。如果不选择将只能下载公开字幕。":
        "Selecting browser allows getting login state for AI subtitle download. Without it only public subtitles are available.",

    "视频分类":
        "Video category",

    "操作按钮 - 只有解析成功后才显示":
        "Action buttons - shown only after successful parsing",

    "开始导入":
        "Start import",

    "停止监控":
        "Stop monitoring",

    "导入进度":
        "Import progress",

    "状态":
        "Status",

    "错误":
        "Error",

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