import os
from faster_whisper import WhisperModel

model = None

def load_model():
    global model
    device = os.getenv('TRANSCRIPTION_DEVICE', 'cpu')
    model_size = os.getenv('WHISPER_MODEL', 'base')
    compute_type = 'float16' if device == 'cuda' else 'int8'
    model = WhisperModel(model_size, device=device, compute_type=compute_type)
    print(f"Whisper model '{model_size}' loaded on {device}")

async def transcribe(audio_path: str) -> str:
    if not model:
        load_model()
    segments, _ = model.transcribe(audio_path, beam_size=5, vad_filter=True)
    return ' '.join([s.text for s in segments])