import os
from faster_whisper import WhisperModel

model = None
SUPPORTED_MODELS = {
    'tiny.en', 'tiny', 'base.en', 'base', 'small.en', 'small', 'medium.en', 'medium',
    'large-v1', 'large-v2', 'large-v3', 'large', 'distil-large-v2', 'distil-medium.en',
    'distil-small.en', 'distil-large-v3'
}

def load_model():
    global model
    device = os.getenv('TRANSCRIPTION_DEVICE', 'cpu')
    model_size = os.getenv('WHISPER_MODEL', 'base')
    if model_size not in SUPPORTED_MODELS:
        print(f"Unsupported whisper model '{model_size}', falling back to 'base'")
        model_size = 'base'
    compute_type = 'float16' if device == 'cuda' else 'int8'
    try:
        model = WhisperModel(model_size, device=device, compute_type=compute_type)
    except RuntimeError as exc:
        if device == 'cuda':
            print(f"CUDA model load failed ({exc}), falling back to CPU")
            device = 'cpu'
            model = WhisperModel(model_size, device=device, compute_type='int8')
        else:
            raise
    print(f"Whisper model '{model_size}' loaded on {device}")

async def transcribe(audio_path: str) -> str:
    if not model:
        load_model()
    segments, _ = model.transcribe(audio_path, beam_size=5, vad_filter=True)
    return ' '.join([s.text for s in segments])
