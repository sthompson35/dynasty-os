import os
import sys
from importlib.util import find_spec
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

_REALTOR_AGENT_ROOT = Path(__file__).resolve().parents[3] / "realtor_agent"
if str(_REALTOR_AGENT_ROOT) not in sys.path:
    sys.path.insert(0, str(_REALTOR_AGENT_ROOT))

try:
    from sqlalchemy.orm import Session
    from realtor_agent.core.models import get_db  # noqa: E402
    from realtor_agent.core.sync.sync_service import UnderwritingSyncService  # noqa: E402
    SYNC_IMPORT_ERROR: Exception | None = None
except Exception as exc:  # pragma: no cover - depends on optional runtime package set
    Session = object  # type: ignore[assignment]
    UnderwritingSyncService = None  # type: ignore[assignment]
    SYNC_IMPORT_ERROR = exc

    def get_db():  # type: ignore[no-redef]
        raise HTTPException(status_code=503, detail=f"Excel sync dependencies unavailable: {SYNC_IMPORT_ERROR}")

router = APIRouter(prefix="/api/sync", tags=["Excel System Sync"])

_ALLOWED_WORKBOOK_EXTENSIONS = {".xlsx", ".xlsm"}
MULTIPART_AVAILABLE = find_spec("multipart") is not None or find_spec("python_multipart") is not None


if MULTIPART_AVAILABLE:
    @router.post("/import-sheet")
    async def import_excel_sheet(
        file: UploadFile = File(...),
        db: Session = Depends(get_db),
    ) -> dict:
        """Accept uploaded toolkits and synchronize them against Python definitions."""
        if UnderwritingSyncService is None:
            raise HTTPException(status_code=503, detail=f"Excel sync dependencies unavailable: {SYNC_IMPORT_ERROR}")

        filename = file.filename or ""
        suffix = Path(filename).suffix.lower()
        if suffix not in _ALLOWED_WORKBOOK_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Invalid workbook file extension type.")

        temp_path = ""
        try:
            with NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                temp_path = temp_file.name
                while chunk := await file.read(1024 * 1024):
                    temp_file.write(chunk)

            service = UnderwritingSyncService(db)
            results = service.sync_workbook_to_system(temp_path)
            return {"status": "success", "sync_metrics": results}
        finally:
            await file.close()
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
else:
    @router.post("/import-sheet")
    async def import_excel_sheet_unavailable() -> dict:
        raise HTTPException(status_code=503, detail="Excel sync upload requires python-multipart.")
