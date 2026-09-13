#!/usr/bin/env bash
set -euo pipefail

ANDROID_SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ADB="$ANDROID_SDK/platform-tools/adb"
EMULATOR="$ANDROID_SDK/emulator/emulator"
AVD_NAME="${AVD_NAME:-Pixel_8}"

if "$ADB" devices | grep -q "device$"; then
  echo "Android emulator/device already running."
  exit 0
fi

echo "Starting Android emulator ($AVD_NAME)..."
nohup "$EMULATOR" -avd "$AVD_NAME" -no-snapshot-load > /tmp/android-emulator.log 2>&1 &

echo "Waiting for emulator to boot..."
for _ in $(seq 1 60); do
  if "$ADB" devices | grep -q "device$"; then
    echo "Emulator ready."
    exit 0
  fi
  sleep 3
done

echo "Timed out waiting for the emulator to boot. Check /tmp/android-emulator.log" >&2
exit 1
