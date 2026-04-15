import os
import asyncio
import json
import redis.asyncio as redis
from fastapi import FastAPI
from config import REDIS_URL, ENABLE_TONE_DETECTION
from transcriber import load_model, transcribe

app = FastAPI()
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

@app.on_event("startup")
async def startup():
    load_model()

@app.post("/transcribe")
async def transcribe_audio(data: dict):
    audio_url = data.get("audioUrl")
    call_id = data.get("callId")

    try:
        text = await transcribe(audio_url)
        result = {"callId": call_id, "transcription": text, "success": True}
        await redis_client.publish("transcription:complete", json.dumps(result))
        return result
    except Exception as e:
        return {"callId": call_id, "error": str(e), "success": False}

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)