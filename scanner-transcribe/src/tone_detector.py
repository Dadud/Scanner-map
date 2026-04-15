import os
import numpy as np
from pydub import AudioSegment
from pydub.utils import get_array_type
import struct

class ToneDetector:
    def __init__(self):
        self.sample_rate = 8000
        self.two_tone_frequencies = [
            (2185.5, 1962.5),
            (2185.5, 2454.5),
            (1962.5, 2185.5),
            (2454.5, 2185.5)
        ]
        self.pulse_tone_duration_ms = 500
        self.long_tone_min_duration_ms = 3000

    def load_audio(self, audio_path: str) -> np.ndarray:
        audio = AudioSegment.from_file(audio_path)
        audio = audio.set_frame_rate(self.sample_rate).set_channels(1)

        samples = np.array(audio.get_array_of_samples(), dtype=np.float32)
        samples = samples / np.iinfo(np.int16).max

        return samples

    def detect_two_tone(self, audio: np.ndarray) -> bool:
        from scipy.signal import butter, filtfilt

        def bandpass_filter(data, lowcut, highcut, fs, order=5):
            nyq = 0.5 * fs
            low = lowcut / nyq
            high = highcut / nyq
            b, a = butter(order, [low, high], btype='band')
            return filtfilt(b, a, data)

        duration_ms = len(audio) / self.sample_rate * 1000

        for freq1, freq2 in self.two_tone_frequencies:
            low = min(freq1, freq2) - 50
            high = max(freq1, freq2) + 50

            filtered = bandpass_filter(audio, low, high, self.sample_rate)

            energy = np.sum(filtered ** 2) / len(filtered)

            if energy > 0.01 and duration_ms >= 300:
                return True

        return False

    def detect_pulsed_tone(self, audio: np.ndarray) -> bool:
        window_size = int(self.sample_rate * 0.1)
        num_windows = len(audio) // window_size

        energies = []
        for i in range(num_windows):
            window = audio[i * window_size:(i + 1) * window_size]
            energy = np.sum(window ** 2) / len(window)
            energies.append(energy)

        if not energies:
            return False

        mean_energy = np.mean(energies)
        threshold = mean_energy * 2

        pulses = 0
        in_pulse = False
        pulse_duration = 0

        for energy in energies:
            if energy > threshold:
                if not in_pulse:
                    in_pulse = True
                    pulse_duration = 1
                else:
                    pulse_duration += 1
            else:
                if in_pulse and 3 <= pulse_duration <= 7:
                    pulses += 1
                in_pulse = False
                pulse_duration = 0

        return pulses >= 2

    def detect_long_tone(self, audio: np.ndarray) -> bool:
        window_size = int(self.sample_rate * 0.5)
        num_windows = len(audio) // window_size

        energies = []
        for i in range(num_windows):
            window = audio[i * window_size:(i + 1) * window_size]
            energy = np.sum(window ** 2) / len(window)
            energies.append(energy)

        if not energies:
            return False

        mean_energy = np.mean(energies)
        threshold = mean_energy * 3

        continuous_windows = 0
        max_continuous = 0

        for energy in energies:
            if energy > threshold:
                continuous_windows += 1
                max_continuous = max(max_continuous, continuous_windows)
            else:
                continuous_windows = 0

        duration_ms = (max_continuous * window_size / self.sample_rate) * 1000
        return duration_ms >= self.long_tone_min_duration_ms

    def detect(self, audio_path: str, mode: str = 'auto') -> dict:
        audio = self.load_audio(audio_path)
        duration_ms = len(audio) / self.sample_rate * 1000

        result = {
            'has_tone': False,
            'tone_type': None,
            'duration_ms': duration_ms,
            'confidence': 0.0
        }

        if mode == 'two_tone':
            result['has_tone'] = self.detect_two_tone(audio)
            result['tone_type'] = 'two_tone' if result['has_tone'] else None
            result['confidence'] = 0.9 if result['has_tone'] else 0.0

        elif mode == 'pulsed':
            result['has_tone'] = self.detect_pulsed_tone(audio)
            result['tone_type'] = 'pulsed' if result['has_tone'] else None
            result['confidence'] = 0.85 if result['has_tone'] else 0.0

        elif mode == 'long':
            result['has_tone'] = self.detect_long_tone(audio)
            result['tone_type'] = 'long' if result['has_tone'] else None
            result['confidence'] = 0.8 if result['has_tone'] else 0.0

        elif mode == 'both':
            two_tone = self.detect_two_tone(audio)
            pulsed = self.detect_pulsed_tone(audio)
            long_tone = self.detect_long_tone(audio)

            result['has_tone'] = two_tone or pulsed or long_tone
            result['tone_type'] = 'two_tone' if two_tone else ('pulsed' if pulsed else ('long' if long_tone else None))
            result['confidence'] = max(0.9 if two_tone else 0, 0.85 if pulsed else 0, 0.8 if long_tone else 0)

        else:
            two_tone = self.detect_two_tone(audio)
            pulsed = self.detect_pulsed_tone(audio)
            long_tone = self.detect_long_tone(audio)

            result['has_tone'] = two_tone or pulsed or long_tone
            if two_tone:
                result['tone_type'] = 'two_tone'
                result['confidence'] = 0.9
            elif pulsed:
                result['tone_type'] = 'pulsed'
                result['confidence'] = 0.85
            elif long_tone:
                result['tone_type'] = 'long'
                result['confidence'] = 0.8

        return result

tone_detector = ToneDetector()