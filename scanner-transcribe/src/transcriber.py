import os
import asyncio
from faster_whisper import WhisperModel
from config import TRANSCRIPTION_DEVICE, WHISPER_MODEL

class Transcriber:
    def __init__(self):
        self.model = None
        self.model_size = WHISPER_MODEL
        self.device = TRANSCRIPTION_DEVICE

    def load_model(self):
        if self.device == 'cuda':
            compute_type = 'float16'
        else:
            compute_type = 'int8'

        self.model = WhisperModel(
            self.model_size,
            device=self.device,
            compute_type=compute_type
        )
        print(f"Whisper model '{self.model_size}' loaded on {self.device}")

    async def transcribe(self, audio_path: str, language: str = None) -> str:
        if not self.model:
            self.load_model()

        segments, info = self.model.transcribe(
            audio_path,
            language=language,
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        transcript_parts = []
        for segment in segments:
            transcript_parts.append(segment.text)

        full_transcript = ' '.join(transcript_parts).strip()
        return full_transcript

transcriber = Transcriber()
