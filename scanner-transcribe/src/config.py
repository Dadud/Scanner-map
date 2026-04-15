import os
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
TRANSCRIPTION_MODE = os.getenv('TRANSCRIPTION_MODE', 'local')
TRANSCRIPTION_DEVICE = os.getenv('TRANSCRIPTION_DEVICE', 'cpu')
WHISPER_MODEL = os.getenv('WHISPER_MODEL', 'base')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
ENABLE_TONE_DETECTION = os.getenv('ENABLE_TONE_DETECTION', 'false').lower() == 'true'