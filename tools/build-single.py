#!/usr/bin/env python3
"""Собирает открытку и конструктор в один самодостаточный HTML-файл.

Два выхода:
  dist/card.html     — полноценный документ, можно открыть с диска или залить куда угодно
  dist/artifact.html — то же без обёртки doctype/html/body (для хостингов, которые её добавляют сами)

Роутинг внутри одного файла: #make — конструктор, любой другой хэш — открытка.
Разметка обеих страниц хранится строками и вставляется только для активного вида,
потому что id частично пересекаются (например, #message есть и там, и там).
"""

import base64
import json
import mimetypes
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def body_of(html):
    return re.search(r'<body>(.*?)\n<script', html, re.S).group(1).strip()


def _data_uri(path, mime):
    return 'data:%s;base64,%s' % (mime, base64.b64encode(path.read_bytes()).decode())


def inline_images(html):
    """Картинки из assets/img превращаем в data:URI — иначе один файл перестаёт быть одним."""
    def sub(m):
        rel = m.group(1)
        mime = mimetypes.guess_type(rel)[0] or 'application/octet-stream'
        return 'src="%s"' % _data_uri(ROOT / rel, mime)
    return re.sub(r'src="(assets/img/[^"]+)"', sub, html)


def inline_fonts(css):
    """То же со шрифтами: без них однофайловая версия осталась бы без начертаний."""
    def sub(m):
        name = m.group(1)
        return 'url(%s)' % _data_uri(ROOT / 'assets' / 'fonts' / name, 'font/woff2')
    return re.sub(r'url\(\.\./fonts/([^)]+)\)', sub, css)


def main():
    css = inline_fonts(read('assets/css/style.css'))
    shared = read('assets/js/shared.js')

    card_view = inline_images(body_of(read('index.html'))).replace('href="create.html"', 'href="#make"')
    create_view = body_of(read('create.html'))

    views = {'card': card_view, 'create': create_view}
    scripts = {'card': read('assets/js/card.js'), 'create': read('assets/js/create.js')}

    content = f"""<title>Открытка Чарос</title>
<meta name="description" content="Поздравительная открытка с подарком, тортом и списком пожеланий.">
<meta name="theme-color" content="#17171d">
<style>
{css}
</style>

<div id="app"></div>

<script>
{shared}

const VIEWS = {json.dumps(views, ensure_ascii=False)};
const SCRIPTS = {json.dumps(scripts, ensure_ascii=False)};

/* Смена вида — это всегда перезагрузка: скрипты видов рассчитаны на свежий DOM. */
addEventListener('hashchange', () => location.reload());

const view = location.hash.replace(/^#/, '').startsWith('make') ? 'create' : 'card';
document.getElementById('app').innerHTML = VIEWS[view];
new Function(SCRIPTS[view])();
</script>"""

    dist = ROOT / 'dist'
    dist.mkdir(exist_ok=True)
    (dist / 'artifact.html').write_text(content, encoding='utf-8')
    (dist / 'card.html').write_text(
        '<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        + content.replace('</style>', '</style>\n</head>\n<body>', 1)
        + '\n</body>\n</html>\n',
        encoding='utf-8')

    for name in ('card.html', 'artifact.html'):
        size = (dist / name).stat().st_size
        print(f'dist/{name}: {size / 1024:.1f} КБ')


if __name__ == '__main__':
    main()
