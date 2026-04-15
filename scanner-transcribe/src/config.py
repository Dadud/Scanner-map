import os
from dotenv import load_dotenv
load_dotenv()

TRANSCRIPTION_MODE = os.getenv('TRANSCRIPTION_MODE', 'local')
TRANSCRIPTION_DEVICE = os.getenv('TRANSCRIPTION_DEVICE', 'cpu')
WHISPER_MODEL = os.getenv('WHISPER_MODEL', 'base')
FASTER_WHISPER_URL = os.getenv('FASTER_WHISPER_URL', 'http://localhost:8001')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
OPENAI_TRANSCRIPTION_MODEL = os.getenv('OPENAI_TRANSCRIPTION_MODEL', 'whisper-1')

REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
API_PORT = int(os.getenv('API_PORT', '8001'))
