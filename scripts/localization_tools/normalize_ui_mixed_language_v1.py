from pathlib import Path
import re


ROOT = Path("frontend/src")


WORDS = [
    "已",
    "中",
    "任务",
    "上传",
    "下载",
    "失败",
    "成功",
    "状态",
    "设置",
    "视频",
    "项目",
    "账户",
    "账号",
    "删除",
    "创建",
    "保存",
    "取消",
    "确认",
    "处理",
    "完成",
    "错误",
]


IGNORE = [
    "config",
    "services",
    "icons",
]


count_files = 0
count_lines = 0


for file in ROOT.rglob("*"):

    if file.suffix not in [".ts", ".tsx"]:
        continue


    path = str(file)

    if any(x in path for x in IGNORE):
        continue


    try:
        text=file.read_text(
            encoding="utf-8"
        )
    except:
        continue


    found=[]


    for i,line in enumerate(text.splitlines(),1):

        s=line.strip()

        if s.startswith("//"):
            continue


        for w in WORDS:

            if w in s:

                found.append(
                    f"{i}: {s}"
                )

                break


    if found:

        count_files+=1

        print()
        print("="*70)
        print(file)

        for x in found:
            print(x)

        count_lines+=len(found)



print()
print("="*70)
print("FILES:",count_files)
print("LINES:",count_lines)