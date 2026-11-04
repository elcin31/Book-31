#!/usr/bin/env bash
# Standalone release: bundles JS/assets into the APK, no Metro server needed.
set -euo pipefail
cd "$(dirname "$0")/.."
export CI=1
if [[ -z "${JAVA_HOME:-}" && -d "$PWD/.toolchains/jdk-17.0.21+9" ]]; then
  export JAVA_HOME="$PWD/.toolchains/jdk-17.0.21+9"
fi
if [[ -n "${JAVA_HOME:-}" ]]; then export PATH="$JAVA_HOME/bin:$PATH"; fi
if [[ -z "${ANDROID_HOME:-}" && -d "$PWD/.android-sdk" ]]; then export ANDROID_HOME="$PWD/.android-sdk"; fi
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
if [[ -z "${ANDROID_SDK_ROOT:-}" ]]; then echo 'Set ANDROID_HOME to an Android SDK with platform 36, build-tools 36, NDK 27.1.12297006.' >&2; exit 1; fi
# A private local key is retained for updates. Never put .keys in version control.
if [[ -z "${FOLIO_KEYSTORE:-}" ]]; then
  mkdir -p .keys
  if [[ ! -f .keys/signing.env ]]; then
    (umask 077; python3 - <<'PY'
from pathlib import Path
import secrets
p=secrets.token_hex(24)
Path('.keys/signing.env').write_text('export FOLIO_STORE_PASSWORD='+p+'\nexport FOLIO_KEY_PASSWORD='+p+'\nexport FOLIO_KEY_ALIAS=folio\n')
PY
    )
  fi
  source .keys/signing.env
  export FOLIO_KEYSTORE="$PWD/.keys/folio-release.jks"
  if [[ ! -f "$FOLIO_KEYSTORE" ]]; then
    keytool -genkeypair -noprompt -keystore "$FOLIO_KEYSTORE" -storepass:env FOLIO_STORE_PASSWORD -keypass:env FOLIO_KEY_PASSWORD -alias "$FOLIO_KEY_ALIAS" -dname 'CN=FOLIO Personal Release, O=FOLIO, C=US' -keyalg RSA -keysize 2048 -validity 10000 >/dev/null 2>&1
    chmod 600 "$FOLIO_KEYSTORE"
  fi
fi
npx expo prebuild --platform android --no-install
printf 'sdk.dir=%s\n' "$ANDROID_SDK_ROOT" > android/local.properties
# Enable Gradle HTTP proxy only when provided by the managed build environment.
# Credentials stay in inherited environment; this writes no credentials.
if [[ -n "${HTTPS_PROXY:-}" ]]; then
  read -r FOLIO_PROXY_HOST FOLIO_PROXY_PORT < <(node -e 'const u=new URL(process.env.HTTPS_PROXY);console.log(u.hostname+" "+(u.port||"80"))')
  export GRADLE_OPTS="${GRADLE_OPTS:-} -Dhttps.proxyHost=$FOLIO_PROXY_HOST -Dhttps.proxyPort=$FOLIO_PROXY_PORT -Dhttp.proxyHost=$FOLIO_PROXY_HOST -Dhttp.proxyPort=$FOLIO_PROXY_PORT"
fi
(cd android && ./gradlew --no-daemon --max-workers=2 assembleRelease -PreactNativeArchitectures="${FOLIO_ARCHITECTURES:-arm64-v8a}")
mkdir -p artifacts/package
cp android/app/build/outputs/apk/release/app-release.apk artifacts/package/FOLIO-1.0.apk
"$ANDROID_SDK_ROOT/build-tools/36.0.0/apksigner" verify --verbose --print-certs artifacts/package/FOLIO-1.0.apk | tee artifacts/package/signing-certificate.txt
python3 scripts/package-release.py
