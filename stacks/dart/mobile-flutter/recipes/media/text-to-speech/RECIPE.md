---
schemaVersion: 1
id: text-to-speech
name: Text to Speech Synthesis Service
version: 1.0.0
language: dart
stack: mobile-flutter
category: media
standardType: tts
interfacePort: TtsServicePort
order: 55
tags:
  - tts
  - text-to-speech
  - voice
  - audio
  - synthesis
  - speech
dependsOn:
  - core-foundation
parameters:
  - key: TTS_DEFAULT_LANGUAGE
    label: Default TTS Language
    description: BCP-47 language tag (e.g. en-US, tr-TR)
    default: en-US
    secret: false
  - key: TTS_SPEECH_RATE
    label: Speech Rate (0.0 to 1.0)
    description: Speech rate playback speed
    default: "0.5"
    secret: false
packages:
  - name: flutter_tts
    version: ^4.2.0
    dev: false
verify:
  - flutter analyze
---
# Text to Speech Synthesis Service

Synthesizes spoken audio from text strings with configurable pitch, rate, and voice accents.

## Changelog

### 1.0.0
- First version.
