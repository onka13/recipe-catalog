---
schemaVersion: 1
id: admob-monetization
name: Google AdMob Mobile Ads & Consent
version: 1.0.0
language: dart
stack: mobile-flutter
category: monetization
standardType: monetization-ads
interfacePort: AdServicePort
order: 40
tags:
  - ads
  - admob
  - monetization
  - interstitial
  - banner
platformPermissions:
  - INTERNET
  - ACCESS_NETWORK_STATE
dependsOn:
  - core-foundation
parameters:
  - key: ADMOB_APP_ID_ANDROID
    label: AdMob Android App ID
    description: App ID from Google AdMob Console
    default: ca-app-pub-3940256099942544~3347511713
    secret: false
  - key: ADMOB_APP_ID_IOS
    label: AdMob iOS App ID
    description: App ID from Google AdMob Console
    default: ca-app-pub-3940256099942544~1458602516
    secret: false
  - key: ADMOB_INTERSTITIAL_UNIT_ID
    label: Interstitial Ad Unit ID
    description: Unit ID for full-screen interstitial ads
    default: ca-app-pub-3940256099942544/1033173712
    secret: false
packages:
  - name: google_mobile_ads
    version: ^5.1.0
    dev: false
verify:
  - flutter analyze
---
# Google AdMob Mobile Ads & Consent

Google AdMob mobile banner, interstitial ads, and Google UMP user consent workflow.

## Instructions

### android/app/src/main/AndroidManifest.xml
Inside the <application> element of android/app/src/main/AndroidManifest.xml, add: <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="{{ADMOB_APP_ID_ANDROID}}"/>

### lib/main.dart
In lib/main.dart: 1. Import package:{{PACKAGE_NAME}}/core/ads/admob_service_adapter.dart. 2. Call await AdMobServiceAdapter().initialize() inside main() before runApp().

## Changelog

### 1.0.0
- First version.
