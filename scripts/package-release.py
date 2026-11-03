#!/usr/bin/env python3
from pathlib import Path
import zipfile
import os
root=Path(__file__).resolve().parent.parent
folder=root/'artifacts'/'package'
apk=folder/'FOLIO-0.1.apk'
assert apk.is_file() and apk.stat().st_size > 1_000_000, 'Built APK missing or too small'
readme='''FOLIO — локальный книжный дневник
Версия: 0.1.0
Тип сборки: standalone release APK, подписан локальным ключом FOLIO.
Минимальная версия Android: Android 7.0 (API 24).
Архитектура: arm64-v8a (включая Xiaomi Redmi Note 12).

УСТАНОВКА
1. Распакуйте ZIP на телефоне.
2. Откройте FOLIO-0.1.apk и разрешите установку из этого источника.
3. Запустите FOLIO. Регистрация не требуется.
Для обновления используйте APK, подписанный тем же ключом. Создатель сборки
должен сохранить приватную папку .keys. Ключ и пароли не публикуются в Git.
CI без настроенных signing secrets создаёт новый ключ на каждый запуск;
такие APK не обновляют друг друга поверх установленной версии.

ВОЗМОЖНОСТИ
Локальная SQLite-библиотека, ручное добавление и редактирование книг,
необязательный поиск в каталогах, свои обложки, статусы и прогресс,
таймер с паузой и восстановлением, ручные сессии, заметки и цитаты,
календарь активности, статистика и годовая цель, светлая/тёмная/автотема.
Все основные функции работают без интернета. Библиотека при первом запуске пустая.

ОГРАНИЧЕНИЯ ВЕРСИИ 0.1
Нет встроенной EPUB-читалки, облачной синхронизации и экспорта/импорта базы.
Данные хранятся на устройстве; удаление приложения или очистка данных их удаляет.
Поиск книг и загрузка обложек зависят от внешних каталогов и сети.
Таймер учитывает время сворачивания, но не показывает системное уведомление.
Сессия, проходящая через полночь, относится к дате её начала.
Запуск на Android-устройстве не проверен: в среде нет телефона или эмулятора.
Этот APK предназначен для 64-битных Android-смартфонов.
'''
if 'x86_64' in os.environ.get('FOLIO_ARCHITECTURES',''):
    readme=readme.replace('Архитектура: arm64-v8a (включая Xiaomi Redmi Note 12).','Архитектуры: arm64-v8a (включая Xiaomi Redmi Note 12) и x86_64 (эмулятор).').replace('Этот APK предназначен для 64-битных Android-смартфонов.','Этот APK предназначен для 64-битных Android-смартфонов и x86_64 эмулятора.')
(folder/'README.txt').write_text(readme,encoding='utf-8')
archive=root/'artifacts'/'FOLIO-0.1-Android.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED) as z:
    z.write(apk,apk.name)
    z.write(folder/'README.txt','README.txt')
print(str(archive),archive.stat().st_size,'bytes')
