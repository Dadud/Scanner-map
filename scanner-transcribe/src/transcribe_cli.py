import asyncio
import sys
import json
import argparse
from transcriber import transcriber

async def process_transcription(audio_path: str, call_id: str, talkgroup_id: str):
    try:
        print(f"Transcribing: {audio_path}", file=sys.stderr)
        text = await transcriber.transcribe(audio_path)
        print(f"Transcription complete: {len(text)} chars", file=sys.stderr)

        result = {
            'callId': call_id,
            'transcription': text,
            'success': True
        }

        print(json.dumps(result))
        sys.stdout.flush()

    except Exception as e:
        error_result = {
            'callId': call_id,
            'error': str(e),
            'success': False
        }
        print(json.dumps(error_result), file=sys.stderr)
        sys.stderr.flush()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--audio', required=True, help='Path to audio file')
    parser.add_argument('--call-id', required=True, help='Call ID')
    parser.add_argument('--talkgroup-id', required=True, help='Talkgroup ID')
    args = parser.parse_args()

    asyncio.run(process_transcription(args.audio, args.call_id, args.talkgroup_id))
