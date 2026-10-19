---
schemaVersion: 1
id: speech-to-text
name: Speech to Text Transcription Service
version: 1.0.1
language: dart
stack: mobile-flutter
category: media
standardType: stt
interfacePort: SttServicePort
order: 50
tags:
  - stt
  - speech-to-text
  - voice
  - audio
  - transcription
  - microphone
platformPermissions:
  - android.permission.RECORD_AUDIO
  - android.permission.INTERNET
  - NSSpeechRecognitionUsageDescription
  - NSMicrophoneUsageDescription
dependsOn:
  - core-foundation
parameters:
  - key: STT_LOCALE_ID
    label: Default Recognition Locale
    description: BCP-47 language tag for transcription (e.g. en_US, tr_TR)
    default: en_US
    secret: false
packages:
  - name: speech_to_text
    version: ^7.0.0
    dev: false
verify:
  - flutter analyze
---
# Speech to Text Transcription Service

Continuous and on-demand spoken audio recognition and transcription stream via device microphone.

## Instructions

### android/app/src/main/AndroidManifest.xml
Add <uses-permission android:name="android.permission.RECORD_AUDIO"/> and <uses-permission android:name="android.permission.INTERNET"/> to AndroidManifest.xml.

### ios/Runner/Info.plist
Add NSSpeechRecognitionUsageDescription and NSMicrophoneUsageDescription keys with descriptive strings to Info.plist.

## Changelog

### 1.0.1
- The locale goes through `SpeechListenOptions`; the `localeId` argument of `listen` is deprecated and failed `flutter analyze`.

### 1.0.0
- First version.
