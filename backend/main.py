"""Точка входа FastAPI-приложения в web-режиме."""

import logging
import sys
from pathlib import Path

from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.app_factory import create_app


app = create_app(mode="web")
logger = logging.getLogger(__name__)

FRONTEND_DIST = Path("/app/frontend/dist")


if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"

    if assets_dir.exists():
        app.mount(
            "/assets",
            StaticFiles(directory=str(assets_dir)),
            name="frontend-assets",
        )

    @app.get("/", include_in_schema=False)
    async def serve_frontend_root():
        """Возвращает главную страницу frontend."""
        return FileResponse(FRONTEND_DIST / "index.html")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        """
        Возвращает статический файл frontend либо index.html
        для маршрутов React Router.
        """
        requested_file = (FRONTEND_DIST / full_path).resolve()

        try:
            requested_file.relative_to(FRONTEND_DIST.resolve())
        except ValueError:
            return FileResponse(FRONTEND_DIST / "index.html")

        if requested_file.is_file():
            return FileResponse(requested_file)

        return FileResponse(FRONTEND_DIST / "index.html")
else:
    logger.warning("Frontend не найден: %s", FRONTEND_DIST)


if __name__ == "__main__":
    import uvicorn

    port = 8000

    if len(sys.argv) > 1:
        for index, argument in enumerate(sys.argv):
            if argument == "--port" and index + 1 < len(sys.argv):
                try:
                    port = int(sys.argv[index + 1])
                except ValueError:
                    logger.error("Некорректный номер порта: %s", sys.argv[index + 1])
                    port = 8000

    logger.info("Запуск сервера на порту %s", port)
    uvicorn.run(app, host="0.0.0.0", port=port)