from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.post("/signature")
async def get_upload_signature():
    """Phase 1 stub. Plan 01-02 wires Cloudinary signature generation."""
    raise HTTPException(status_code=501, detail="Cloudinary signature endpoint not yet implemented")
