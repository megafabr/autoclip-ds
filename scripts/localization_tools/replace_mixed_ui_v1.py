from pathlib import Path


ROOT = Path("frontend/src")


REPLACEMENTS = {

    "Upload任务": "Upload task",
    "Upload任务创建Success": "Upload task created successfully",
    "Upload任务Failed": "Upload task failed",

    "Upload中": "Uploading",
    "Download中": "Downloading",

    "Processing任务": "Processing task",

    "Waiting中": "Waiting",

    "已Completed": "Completed",
    "已Cancel": "Cancelled",

    "Add任务": "Add task",
    "AddUpload任务": "Add upload task",

    "Cancel任务Failed": "Cancel task failed",
    "CancelUploadFailed": "Cancel upload failed",

    "重试任务Failed": "Retry task failed",

    "Confirm要": "Confirm",

    "ProjectDetails": "Project details",
    "ProjectList": "Project list",

    "VideoTitle": "Video title",
    "VideoDescription": "Video description",

    "AccountList": "Account list",

    "API KeySave": "API key save",

    "Collection创建Success": "Collection created successfully",
    "CollectionFailed": "Collection failed",

    "Clip已Add到Collection": "Clip added to collection",

}


TARGET_FILES = [
    "components/UploadModal.tsx",
    "components/UploadQueueManager.tsx",
    "components/UploadTaskManager.tsx",
    "pages/UploadStatusPage.tsx",
    "components/UnifiedStatusBar.tsx",
    "utils/statusUtils.tsx",
    "pages/ProcessingPage.tsx",
    "pages/ProjectDetailPage.tsx",
]


changed = 0


for rel in TARGET_FILES:

    file = ROOT / rel

    if not file.exists():
        continue


    text = file.read_text(
        encoding="utf-8"
    )

    old = text


    for a,b in REPLACEMENTS.items():
        text = text.replace(a,b)


    if text != old:

        file.write_text(
            text,
            encoding="utf-8"
        )

        changed += 1

        print("Changed:", file)


print()
print("="*50)
print("Files changed:", changed)