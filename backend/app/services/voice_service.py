import logging
import os
import tempfile

from fastapi import UploadFile
from openai import AsyncOpenAI

from app.core.config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def transcribe_audio(file: UploadFile) -> dict:
    """
    Transcribes audio using OpenAI Whisper model.
    """
    contents = await file.read()

    # Extract extension. Whisper requires standard formats.
    _, ext = os.path.splitext(file.filename)
    if not ext:
        ext = ".wav"

    # Write to temp file because Whisper API requires a file handle
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_audio:
        temp_audio.write(contents)
        temp_path = temp_audio.name

    try:
        with open(temp_path, "rb") as audio:
            response = await client.audio.transcriptions.create(
                model="whisper-1", file=audio, response_format="verbose_json"
            )
        return {"text": response.text, "language": response.language}
    except Exception as e:
        logging.error(f"Whisper transcription error: {e}")
        raise
    finally:
        os.unlink(temp_path)
