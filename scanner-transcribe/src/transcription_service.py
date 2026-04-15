import os
import asyncio
import json
import tempfile
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlretrieve

import redis.asyncio as redis

from . import transcriber
from .config import REDIS_URL
from .tone_detector import tone_detector

redis_client = redis.from_url(REDIS_URL, decode_responses=True)


async def resolve_audio_source(audio_source: str) -> tuple[str, str | None]:
    parsed = urlparse(audio_source)
    if parsed.scheme in {'http', 'https'}:
        suffix = Path(parsed.path).suffix or '.audio'
        fd, temp_path = tempfile.mkstemp(suffix=suffix)
        Path(temp_path).unlink(missing_ok=True)
        await asyncio.to_thread(urlretrieve, audio_source, temp_path)
        return temp_path, temp_path
    return audio_source, None

async def process_audio(audio_path: str, call_id: str, talkgroup_id: str):
    result = {
        'callId': call_id,
        'transcription': None,
        'toneDetection': None,
        'error': None,
        'success': True
    }

    temp_path = None

    try:
        resolved_audio_path, temp_path = await resolve_audio_source(audio_path)
        enable_tone = os.getenv('ENABLE_TONE_DETECTION', 'false').lower() == 'true'
        tone_mode = os.getenv('TONE_DETECTION_TYPE', 'auto')

        if enable_tone:
            tone_result = tone_detector.detect(resolved_audio_path, mode=tone_mode)
            result['toneDetection'] = tone_result

            if tone_result['has_tone']:
                print(f"[Tone Detection] {tone_result['tone_type']} detected with {tone_result['confidence']:.2f} confidence")
            else:
                print(f"[Tone Detection] No tone detected")

        transcript = await transcriber.transcribe(resolved_audio_path)
        result['transcription'] = transcript

        print(f"[Transcription] Completed: {len(transcript)} chars")

    except Exception as e:
        result['error'] = str(e)
        result['success'] = False
        print(f"[Error] {e}")
    finally:
        if temp_path:
            Path(temp_path).unlink(missing_ok=True)

    return result

async def handle_transcription_request(data: dict):
    audio_url = data.get('audioUrl') or data.get('audio_path')
    call_id = data.get('callId') or data.get('call_id')
    talkgroup_id = data.get('talkgroupId') or data.get('talkgroup_id')

    if not audio_url or not call_id:
        return {'error': 'Missing audio_url or call_id', 'success': False}

    result = await process_audio(audio_url, call_id, talkgroup_id)
    await redis_client.publish('transcription:complete', json.dumps(result))
    return result

async def main():
    pubsub = redis_client.pubsub()
    await pubsub.subscribe('transcription:request')

    print("[Transcription Service] Listening for requests...")

    async for message in pubsub.listen():
        if message['type'] == 'message':
            try:
                data = json.loads(message['data'])
                print(f"[Request] Processing call {data.get('callId')}")
                await handle_transcription_request(data)
            except json.JSONDecodeError as e:
                print(f"[Error] Invalid JSON: {e}")
            except Exception as e:
                print(f"[Error] {e}")


async def run_transcription_listener():
    await main()

if __name__ == '__main__':
    transcriber.load_model()
    asyncio.run(main())
