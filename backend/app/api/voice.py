from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.voice_service import transcribe_audio

router = APIRouter()


@router.post("/voice/transcribe")
async def transcribe_voice(file: UploadFile = File(...)):
    # Validate extension type roughly
    allowed_exts = [".webm", ".mp3", ".wav", ".ogg", ".m4a"]
    if not any(
        file.filename.lower().endswith(ext) for ext in allowed_exts
    ) and not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Invalid audio format")

    try:
        result = await transcribe_audio(file)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
