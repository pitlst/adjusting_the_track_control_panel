from pathlib import Path
import mimetypes
from litestar import Litestar, get
from litestar.static_files.config import StaticFilesConfig
from litestar.response import Response
import clickhouse_connect

mimetypes.add_type("application/javascript", ".js")


# client = clickhouse_connect.get_client(
#     host="10.24.5.59",
#     port=8123,
#     username="cheakf",
#     password="Swq8855830.",
#     database="default"
# )


@get("/")
async def index_html() -> Response:
    html_path = Path("static/index.html")
    html_content = html_path.read_text(encoding="utf-8")
    return Response(content=html_content, media_type="text/html")


@get("/favicon.ico")
async def favicon() -> Response:
    favicon_path = Path("static/favicon.ico")
    return Response(
        content=favicon_path.read_bytes(),
        media_type="image/x-icon"
    )


app = Litestar(
    route_handlers=[index_html, favicon],
    static_files_config=[
        StaticFilesConfig(path="/static", directories=["static"], name="static")
    ],
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=12382)
