from pathlib import Path


ROOT = Path("frontend/src")


FILES = [
    "components/ProjectTaskManager.tsx",
    "components/RealTimeStatus.tsx",
    "components/SimpleProgressBar.tsx",
    "components/SimpleProjectCard.tsx",
    "components/SpeechRecognitionConfig.tsx",
    "components/TaskProgress.tsx",
    "components/TaskProgressDisplay.tsx",
    "components/TaskProgressModal.tsx",
    "components/UnifiedStatusBar.tsx",
    "components/UploadModal.tsx",
    "components/UploadQueueManager.tsx",
    "components/UploadTaskManager.tsx",
    "pages/ProcessingPage.tsx",
    "pages/ProjectDetailPage.tsx",
    "pages/UploadStatusPage.tsx",
    "stores/useSimpleProgressStore.ts",
]


REPLACE = {

    # status
    "已Completed": "Completed",
    "已Success": "Success",
    "已Delete": "Deleted",
    "已Cancel": "Cancelled",

    "Waiting中": "Waiting",
    "进行中": "Processing",
    "执行中": "Running",

    "处理Completed": "Processing completed",
    "处理Failed": "Processing failed",

    # tasks
    "任务List": "Task list",
    "任务Details": "Task details",
    "任务Details弹窗": "Task details modal",

    "任务ID": "Task ID",
    "创建Time": "Created time",

    "任务Name": "Task name",

    "Delete任务": "Delete task",

    "Confirm要Delete": "Confirm delete",
    "ConfirmCancel": "Confirm cancel",

    # upload
    "Upload task已创建": "Upload task created",
    "Upload task创建Success": "Upload task created successfully",

    "Upload任务": "Upload task",
    "UploadFailed": "Upload failed",

    "BilibiliUpload功能正在开发中":
        "Bilibili upload feature is under development",

    # video/project
    "Project处理Completed":
        "Project processing completed",

    "ProjectDetails":
        "Project details",

    "Video处理Completed":
        "Video processing completed",

    "Video已Success处理Completed":
        "Video processed successfully",

    "Video处理进度":
        "Video processing progress",

    # collection
    "Collection创建Success":
        "Collection created successfully",

    "Collection已Delete":
        "Collection deleted",

    "Clip已Add到Collection":
        "Clip added to collection",

    # models
    "Download中":
        "Downloading",

    "已Download":
        "Downloaded",

    # API
    "API KeySave":
        "API key save",

}


changed = 0


for rel in FILES:

    path = ROOT / rel

    if not path.exists():
        continue


    text = path.read_text(
        encoding="utf-8"
    )

    old = text


    for a,b in REPLACE.items():
        text = text.replace(a,b)


    if old != text:

        path.write_text(
            text,
            encoding="utf-8"
        )

        changed += 1
        print("Changed:", rel)


print()
print("="*60)
print("Files changed:", changed)