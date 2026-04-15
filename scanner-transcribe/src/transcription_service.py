import os
import asyncio
import json
import tempfile
from pathlib import Path
from transcriber import transcriber
from tone_detector import tone_detector
from config import TRANSCRIPTION_MODE, REDIS_URL, ENABLE_TONE_DETECTION, TONE_DETECTION_TYPE

import redis.asyncio as redis

redis_client = redis.from_url(REDIS_URL, decode_responses=True)

async def process_audio(audio_path: str, call_id: str, talkgroup_id: str):
    result = {
        'callId': call_id,
        'transcription': None,
        'toneDetection': None,
        'error': None,
        'success': True
    }

    try:
        enable_tone = os.getenv('ENABLE_TONE_DETECTION', 'false').lower() == 'true'
        tone_mode = os.getenv('TONE_DETECTION_TYPE', 'auto')

        if enable_tone:
            tone_result = tone_detector.detect(audio_path, mode=tone_mode)
            result['toneDetection'] = tone_result

            if tone_result['has_tone']:
                print(f"[Tone Detection] {tone_result['tone_type']} detected with {tone_result['confidence']:.2f} confidence")
            else:
                print(f"[Tone Detection] No tone detected")

        segments, info = transcriber.model.transcribe(
            audio_path,
            beam_size=5,
            vad_filter=True
        )

        transcript = " ".join([s.text for s in segments])
        result['transcription'] = transcript
        result['language'] = info.language if hasattr(info, 'language') else None

        print(f"[Transcription] Completed: {len(transcript)} chars")

    except Exception as e:
        result['error'] = str(e)
        result['success'] = False
        print(f"[Error] {e}")

    await redis_client.publish('transcription:complete', json.dumps(result))
    return result

async def handle_transcription_request(data: dict):
    audio_url = data.get('audioUrl') or data.get('audio_path')
    call_id = data.get('callId') or data.get('call_id')
    talkgroup_id = data.get('talkgroupId') or data.get('talkgroup_id')

    if not audio_url or not call_id:
        return {'error': 'Missing audio_url or call_id', 'success': False}

    result = await process_audio(audio_url, call_id, talkgroup_id)
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

if __name__ == '__main__':
    transcriber.load_model()
    asyncio.run(main())