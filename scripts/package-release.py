#!/usr/bin/env python3
"""Package a verified standalone release; never include private signing material."""
from pathlib import Path
import hashlib
import os
import zipfile

root = Path(__file__).resolve().parent.parent
folder = root / 'artifacts' / 'package'
apk = folder / 'FOLIO-1.0.apk'
assert apk.is_file() and apk.stat().st_size > 1_000_000, 'Built APK missing or too small'
certificate = folder / 'signing-certificate.txt'
assert certificate.is_file(), 'Signing verification evidence missing'
architectures = os.environ.get('FOLIO_ARCHITECTURES', 'arm64-v8a')
readme = f'''FOLIO — локальный книжный дневник
Версия: 1.0.0 (versionCode 2)
Package ID: app.folio.reading
Тип сборки: standalone release APK. Expo Go и Metro не нужны.
Минимальная версия Android: Android 7.0 (API 24).
Архитектуры: {architectures}
SHA-256 APK: {hashlib.sha256(apk.read_bytes()).hexdigest()}

УСТАНОВКА
Распакуйте ZIP, откройте FOLIO-1.0.apk и разрешите установку из этого источника.
Приложение работает локально, без регистрации. Поиск во внешних каталогах
и загрузка удалённых обложек требуют сети; ручное ведение библиотеки — нет.

СОХРАННОСТЬ ДАННЫХ И ПОДПИСЬ
Обновление поверх старой версии возможно только при совпадении подписи.
Сертификат этой сборки включён в signing-certificate.txt.
Прежний приватный release keystore не находится в репозитории. CI использует
FOLIO_KEYSTORE_BASE64 и соответствующие signing secrets, если они настроены.
Иначе создаётся новый ключ; совместимость с подписью 0.1 не гарантируется.
Если Android отклоняет обновление из-за подписи, НЕ удаляйте установленную
версию и НЕ очищайте её данные: это удалит локальную SQLite-библиотеку.
Для обновления необходимо повторить сборку с оригинальным ключом.
Приватный ключ и пароли никогда не включаются в ZIP или Git.

ПРОВЕРКИ
Перед сборкой CI выполняет TypeScript и автоматические тесты. Публикация
выполняется после установки APK на Android-эмулятор, запуска, проверки
вкладок, добавления книги офлайн и сохранения после перезапуска.
Подробные доказательства доступны в артефакте FOLIO-Android-smoke-evidence
соответствующего GitHub Actions run.
'''
(folder / 'README.txt').write_text(readme, encoding='utf-8')
archive = root / 'artifacts' / 'FOLIO-1.0-Android.zip'
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    for item in (apk, folder / 'README.txt', certificate):
        z.write(item, item.name)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
print(str(archive), archive.stat().st_size, 'bytes')
