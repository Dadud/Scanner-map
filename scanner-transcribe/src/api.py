import os
import asyncio
import json
import redis.asyncio as redis
from fastapi import FastAPI, HTTPException
from pydub import AudioSegment
import tempfile
import numpy as np
from transcriber import transcriber
from config import REDIS_URL, API_PORT

app = FastAPI(title="Scanner Transcription Service")
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

@app.post("/transcribe")
async def transcribe_audio(data: dict):
    audio_url = data.get("audioUrl")
    call_id = data.get("callId")
    talkgroup_id = data.get("talkgroupId")

    if not audio_url or not call_id:
        raise HTTPException(status_code=400, detail="Missing required fields")

    try:
        segments, info = transcriber.model.transcribe(
            audio_url,
            beam_size=5,
            vad_filter=True
        )

        transcript = " ".join([s.text for s in segments])

        result = {
            "callId": call_id,
            "transcription": transcript,
            "language": info.language if hasattr(info, 'language') else None,
            "success": True
        }

        await redis_client.publish("transcription:complete", json.dumps(result))

        return result

    except Exception as e:
        return {
            "callId": call_id,
            "error": str(e),
            "success": False
        }

@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": transcriber.model is not None}

if __name__ == "__main__":
    import uvicorn
    transcriber.load_model()
    uvicorn.run(app, host="0.0.0.0", port=API_PORT)
