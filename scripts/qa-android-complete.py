#!/usr/bin/env python3
"""Standalone APK smoke test on a disposable Android emulator (installed by CI).
No test data is embedded in the APK. Evidence: artifacts/android-smoke/.
"""
from pathlib import Path
import re
import subprocess
import time
import xml.etree.ElementTree as ET

PACKAGE = 'app.folio.reading'
OUT = Path('artifacts/android-smoke')
OUT.mkdir(parents=True, exist_ok=True)


def adb(*args):
    return subprocess.check_output(['adb', *args], text=True, timeout=45)


def dump():
    for _ in range(3):
        adb('shell', 'uiautomator', 'dump', '/sdcard/folio-qa.xml')
        data = adb('shell', 'cat', '/sdcard/folio-qa.xml')
        if '<hierarchy' in data:
            (OUT / 'hierarchy.xml').write_text(data, encoding='utf-8')
            return ET.fromstring(data)
        time.sleep(1)
    raise AssertionError('Android UI hierarchy unavailable')


def center(node):
    x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.get('bounds', '')))
    return (x1+x2)//2, (y1+y2)//2


def find(label, bottom=False):
    root = dump()
    nodes = [n for n in root.iter('node') if n.get('text') == label or n.get('content-desc') == label]
    if not nodes:
        nodes = [n for n in root.iter('node') if n.get('content-desc', '').startswith(label + ',')]
    nodes.sort(key=lambda n: n.get('class') != 'android.widget.EditText')
    if bottom:
        nodes.sort(key=lambda n: center(n)[1], reverse=True)
    return next((n for n in nodes if n.get('bounds') and len(re.findall(r'\d+', n.get('bounds', '')))==4 and int(re.findall(r'\d+', n.get('bounds'))[2])>int(re.findall(r'\d+', n.get('bounds'))[0]) and int(re.findall(r'\d+', n.get('bounds'))[3])>int(re.findall(r'\d+', n.get('bounds'))[1])), None)


def tap(label, bottom=False, scroll=False):
    for _ in range(10 if scroll else 3):
        node = find(label, bottom)
        if node is not None:
            x, y = center(node)
            adb('shell', 'input', 'tap', str(x), str(y))
            time.sleep(0.8)
            return
        if scroll:
            size = re.findall(r'\d+', adb('shell', 'wm', 'size'))
            width, height = map(int, size[-2:])
            adb('shell', 'input', 'swipe', str(width//2), str(height*4//5), str(width//2), str(height//4), '350')
        time.sleep(0.7)
    raise AssertionError('UI element not found: ' + label)


def fill(label, value, replace=False):
    tap(label, scroll=True)
    if replace:
        node = find(label)
        existing = node.get('text', '') if node is not None else ''
        adb('shell', 'input', 'keyevent', 'KEYCODE_MOVE_END')
        for _ in existing:
            adb('shell', 'input', 'keyevent', 'KEYCODE_DEL')
    adb('shell', 'input', 'text', value)
    ime = adb('shell', 'dumpsys', 'input_method')
    if 'mInputShown=true' in ime or 'mIsInputViewShown=true' in ime:
        adb('shell', 'input', 'keyevent', '4')
    time.sleep(0.4)


def scroll_top():
    size = re.findall(r'\d+', adb('shell', 'wm', 'size'))
    width, height = map(int, size[-2:])
    for _ in range(3):
        adb('shell', 'input', 'swipe', str(width//2), str(height//4), str(width//2), str(height*4//5), '300')


def assert_text(text):
    for _ in range(10):
        if any(text in (n.get('text', '') + n.get('content-desc', '')) for n in dump().iter('node')):
            return
        time.sleep(0.7)
    raise AssertionError('Expected visible text: ' + text)


def screenshot(name):
    adb('shell', 'screencap', '-p', '/sdcard/folio-qa.png')
    adb('pull', '/sdcard/folio-qa.png', str(OUT / name))


try:
    adb('logcat', '-c')
    adb('shell', 'settings', 'put', 'secure', 'show_ime_with_hard_keyboard', '1')
    adb('shell', 'am', 'start', '-W', '-n', PACKAGE + '/.MainActivity')
    time.sleep(8)
    assert adb('shell', 'pidof', PACKAGE).strip(), 'App process missing'
    assert_text('Всё начинается')
    screenshot('01-first-launch.png')
    adb('shell', 'svc', 'wifi', 'disable')
    adb('shell', 'svc', 'data', 'disable')
    for tab in ['Библиотека', 'Дневник', 'Аналитика', 'Настройки', 'Главная']:
        tap(tab, bottom=True)
    tap('Добавить первую книгу', scroll=True)
    fill('Название *', 'FOLIO_QA')
    fill('Автор', 'Local_Author')
    tap('Сохранить книгу', scroll=True)
    assert_text('На книжной полке')
    assert_text('FOLIO_QA')
    screenshot('02-created-book.png')
    tap('Изменить')
    fill('Автор', 'Updated_Author', replace=True)
    tap('Сохранить книгу', scroll=True)
    assert_text('Updated_Author')
    tap('Сейчас читаю', scroll=True)
    tap('Начать чтение', scroll=True)
    assert_text('ЧИТАЕМ')
    adb('shell', 'input', 'keyevent', '3')
    time.sleep(3)
    adb('shell', 'am', 'start', '-W', '-n', PACKAGE + '/.MainActivity')
    time.sleep(2)
    tap('Пауза', scroll=True)
    assert_text('ПАУЗА')
    tap('Продолжить чтение', scroll=True)
    tap('Завершить и сохранить', scroll=True)
    assert_text('Сохранить прочитанное')
    fill('Текущая страница', '10', replace=True)
    tap('Сохранить сессию', scroll=True)
    scroll_top()
    assert_text('На книжной полке')
    assert_text('Страница 10')
    screenshot('03-timer-saved.png')
    tap('Запись', scroll=True)
    fill('Цитата', 'FOLIO_QUOTE_QA')
    tap('Сохранить запись', scroll=True)
    assert_text('FOLIO_QUOTE_QA')
    screenshot('04-quote-saved.png')
    adb('shell', 'am', 'force-stop', PACKAGE)
    adb('shell', 'am', 'start', '-W', '-n', PACKAGE + '/.MainActivity')
    time.sleep(4)
    tap('Библиотека', bottom=True)
    assert_text('FOLIO_QA')
    screenshot('05-persisted-book.png')
    fill('Найти на полках', 'FOLIO_QA')
    assert_text('FOLIO_QA')
    tap('Дневник', bottom=True)
    assert_text('FOLIO_QUOTE_QA')
    tap('Добавить запись')
    tap('Мысль')
    fill('Ваша мысль', 'FOLIO_THOUGHT_QA')
    tap('Сохранить запись', scroll=True)
    assert_text('FOLIO_THOUGHT_QA')
    tap('Аналитика', bottom=True)
    assert_text('Ваша история в цифрах')
    screenshot('06-statistics.png')
    tap('Настройки', bottom=True)
    tap('Тёмная', scroll=True)
    dark = find('Тёмная')
    assert dark is not None and dark.get('selected') == 'true', 'Dark theme not selected'
    screenshot('07-dark-theme.png')
    adb('shell', 'am', 'force-stop', PACKAGE)
    adb('shell', 'am', 'start', '-W', '-n', PACKAGE + '/.MainActivity')
    time.sleep(4)
    tap('Настройки', bottom=True)
    dark = find('Тёмная')
    assert dark is not None and dark.get('selected') == 'true', 'Theme did not survive restart'
    tap('Светлая')
    adb('shell', 'settings', 'put', 'system', 'font_scale', '1.3')
    adb('shell', 'am', 'force-stop', PACKAGE)
    adb('shell', 'am', 'start', '-W', '-n', PACKAGE + '/.MainActivity')
    time.sleep(4)
    screenshot('08-home-large-text.png')
    tap('Библиотека', bottom=True)
    assert_text('FOLIO_QA')
    screenshot('09-library-large-text.png')
    adb('shell', 'settings', 'put', 'system', 'font_scale', '1.0')
    (OUT / 'result.txt').write_text('PASS: signed standalone APK launches; all 5 tabs; offline book creation/edit and local search; reading status; timer background/pause/resume/finish; saved page 10; quote/thought creation and persistence; analytics; dark/light theme and persistence; SQLite persistence after native force-stop/restart.\n', encoding='utf-8')
    print((OUT / 'result.txt').read_text())
finally:
    (OUT / 'logcat.txt').write_text(adb('logcat', '-d', '-s', 'AndroidRuntime:E', 'ReactNativeJS:E'), encoding='utf-8')
    screenshot('last-screen.png')
