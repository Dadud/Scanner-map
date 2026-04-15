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

ENABLE_TONE_DETECTION = os.getenv('ENABLE_TONE_DETECTION', 'false').lower() == 'true'
TONE_DETECTION_TYPE = os.getenv('TONE_DETECTION_TYPE', 'auto')

ENABLE_AUTH = os.getenv('ENABLE_AUTH', 'false').lower() == 'true'
JWT_SECRET = os.getenv('JWT_SECRET', 'scanner-map-change-me-in-production')

STORAGE_MODE = os.getenv('STORAGE_MODE', 'local')
S3_BUCKET = os.getenv('S3_BUCKET', '')
S3_REGION = os.getenv('S3_REGION', 'us-east-1')
S3_ACCESS_KEY = os.getenv('S3_ACCESS_KEY', '')
S3_SECRET_KEY = os.getenv('S3_SECRET_KEY', '')

DISCORD_TOKEN = os.getenv('DISCORD_TOKEN', '')
DISCORD_ALERT_CHANNEL_ID = os.getenv('DISCORD_ALERT_CHANNEL_ID', '')
DISCORD_SUMMARY_CHANNEL_ID = os.getenv('DISCORD_SUMMARY_CHANNEL_ID', '')

GEOCODING_PROVIDER = os.getenv('GEOCODING_PROVIDER', 'locationiq')
LOCATIONIQ_API_KEY = os.getenv('LOCATIONIQ_API_KEY', '')
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')

AI_PROVIDER = os.getenv('AI_PROVIDER', 'ollama')
OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llama3')
OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')