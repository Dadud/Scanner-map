import asyncio
from fastapi import FastAPI
from .transcriber import load_model
from .transcription_service import handle_transcription_request, run_transcription_listener

app = FastAPI()
listener_task = None

@app.on_event("startup")
async def startup():
    global listener_task
    load_model()
    if listener_task is None or listener_task.done():
        listener_task = asyncio.create_task(run_transcription_listener())


@app.on_event("shutdown")
async def shutdown():
    global listener_task
    if listener_task is not None:
        listener_task.cancel()
        try:
            await listener_task
        except asyncio.CancelledError:
            pass

@app.post("/transcribe")
async def transcribe_audio(data: dict):
    return await handle_transcription_request(data)

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
