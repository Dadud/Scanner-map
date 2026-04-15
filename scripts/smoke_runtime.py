import json
import os
import time

import redis
import requests
import websocket


API_BASE = os.getenv("API_BASE", "http://localhost:3000")
UI_BASE = os.getenv("UI_BASE", "http://localhost")
TRANSCRIBE_BASE = os.getenv("TRANSCRIBE_BASE", "http://localhost:8001")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")


def expect(condition, message):
    if not condition:
        raise AssertionError(message)


def wait_for_http(url, timeout=120):
    deadline = time.time() + timeout
    last_error = None

    while time.time() < deadline:
        try:
            response = requests.get(url, timeout=5)
            if response.ok:
                return response
        except Exception as exc:
            last_error = exc
        time.sleep(2)

    raise RuntimeError(f"Timed out waiting for {url}: {last_error}")


def recv_json(ws, timeout=15):
    ws.settimeout(timeout)
    raw = ws.recv()
    return json.loads(raw)


def recv_until(ws, predicate, timeout=20):
    deadline = time.time() + timeout
    last_message = None
    while time.time() < deadline:
        message = recv_json(ws, timeout=max(1, int(deadline - time.time())))
        last_message = message
        if predicate(message):
            return message
    raise AssertionError(f"Timed out waiting for websocket message. Last message: {last_message}")


def wait_for_redis_message(pubsub, channel, predicate, timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        message = pubsub.get_message(ignore_subscribe_messages=True, timeout=1)
        if not message:
            continue
        if message.get("channel") != channel:
            continue
        data = json.loads(message["data"])
        if predicate(data):
            return data
    raise AssertionError(f"Timed out waiting for Redis message on {channel}")


def main():
    wait_for_http(f"{API_BASE}/api/health")
    wait_for_http(UI_BASE)
    wait_for_http(f"{TRANSCRIBE_BASE}/health")

    calls_response = requests.get(f"{API_BASE}/api/calls?limit=5", timeout=10)
    expect(calls_response.ok, "GET /api/calls failed")
    expect(isinstance(calls_response.json(), list), "/api/calls did not return a list")

    ws = websocket.create_connection("ws://localhost:3000/ws", timeout=10)
    ws.send(json.dumps({"type": "subscribe", "channel": "calls"}))
    recv_until(ws, lambda message: message.get("type") == "subscribed" and message.get("channel") == "calls")

    create_response = requests.post(
        f"{API_BASE}/api/calls",
        json={
            "talkgroupId": "smoke",
            "timestamp": "2026-04-15T18:00:00.000Z",
            "category": "smoke-test"
        },
        timeout=10,
    )
    expect(create_response.status_code == 201, f"POST /api/calls failed: {create_response.text}")
    call = create_response.json()
    call_id = call["id"]

    recv_until(ws, lambda message: message.get("type") == "newCall" and message.get("payload", {}).get("id") == call_id)

    update_response = requests.put(
        f"{API_BASE}/api/admin/markers/{call_id}/location",
        json={"lat": 42.0, "lon": -71.0, "address": "Smoke Test"},
        timeout=10,
    )
    expect(update_response.ok, f"PUT /api/admin/markers/{call_id}/location failed")
    recv_until(
        ws,
        lambda message: message.get("type") == "updatedCall"
        and message.get("payload", {}).get("id") == call_id
        and message.get("payload", {}).get("address") == "Smoke Test",
    )

    delete_response = requests.delete(f"{API_BASE}/api/admin/markers/{call_id}", timeout=10)
    expect(delete_response.status_code == 204, f"DELETE /api/admin/markers/{call_id} failed")
    recv_until(ws, lambda message: message.get("type") == "deletedCall" and message.get("payload", {}).get("id") == call_id)

    purge_create = requests.post(
        f"{API_BASE}/api/calls",
        json={
            "talkgroupId": "smoke",
            "timestamp": "2026-04-15T18:00:00.000Z",
            "category": "purge-test"
        },
        timeout=10,
    )
    expect(purge_create.status_code == 201, "failed to create call for purge test")
    recv_until(ws, lambda message: message.get("type") == "newCall")

    purge_response = requests.post(
        f"{API_BASE}/api/admin/calls/purge",
        json={"talkgroupId": "smoke", "olderThan": "2100-01-01T00:00:00.000Z"},
        timeout=10,
    )
    expect(purge_response.ok, f"POST /api/admin/calls/purge failed: {purge_response.text}")
    recv_until(ws, lambda message: message.get("type") == "purgedCalls")

    redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
    pubsub = redis_client.pubsub()
    pubsub.subscribe("transcription:complete")
    time.sleep(1)

    webhook_response = requests.post(
        f"{API_BASE}/api/webhook/call-upload",
        json={
            "talkgroupId": "smoke",
            "audioUrl": "/definitely/missing.wav",
            "category": "transcription-smoke"
        },
        timeout=10,
    )
    expect(webhook_response.status_code == 201, f"POST /api/webhook/call-upload failed: {webhook_response.text}")
    webhook_call_id = webhook_response.json()["callId"]

    transcription_event = wait_for_redis_message(
        pubsub,
        "transcription:complete",
        lambda data: data.get("callId") == webhook_call_id,
        timeout=60,
    )
    expect(transcription_event.get("success") is False, "transcription smoke should fail for missing audio path")

    ws.close()
    pubsub.close()
    redis_client.close()

    print("Runtime smoke passed")


if __name__ == "__main__":
    main()
