#!/usr/bin/env python3
"""Original FOLIO artwork. Requires cairosvg only when regenerating bundled PNGs."""
from pathlib import Path
import cairosvg
root = Path(__file__).resolve().parent.parent / 'assets'
root.mkdir(exist_ok=True)
ink='#182D2C'
cream='#F5EBDD'
# Large book leaves form an unmistakable silhouette; the spine is negative space.
book = '''<path d="M 278,337 C 356,321 431,344 491,389 L 491,684 C 426,635 357,618 278,632 Z" fill="{color}"/>
<path d="M 533,389 C 593,344 668,321 746,337 L 746,632 C 667,618 598,635 533,684 Z" fill="{color}"/>
<path d="M 247,376 L 247,668 C 334,645 420,667 491,719 L 491,745 C 413,694 323,678 233,703 L 218,693 L 218,382 Z" fill="{color}"/>
<path d="M 777,376 L 777,668 C 690,645 604,667 533,719 L 533,745 C 611,694 701,678 791,703 L 806,693 L 806,382 Z" fill="{color}"/>'''
# Bookmark extends above the right leaf, a quiet signature visible at launcher sizes.
bookmark='<path d="M 645,300 L 679,300 L 679,386 L 662,375 L 645,386 Z" fill="#C5A578"/>'
def svg(body, background=False):
    return '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">'+ ('<rect width="1024" height="1024" fill="'+ink+'"/>' if background else '')+body+'</svg>'
items={
 'icon':svg(book.format(color=cream)+bookmark,True),
 'adaptive-foreground':svg('<g transform="translate(82 70) scale(.84)">'+book.format(color=cream)+bookmark+'</g>'),
 'adaptive-background':svg('',True),
 'adaptive-monochrome':svg('<g transform="translate(82 70) scale(.84)">'+book.format(color='#FFFFFF')+'</g>'),
 'splash':svg(book.format(color=cream)+bookmark),
}
for name, source in items.items():
    (root/(name+'.svg')).write_text(source)
    cairosvg.svg2png(bytestring=source.encode(),write_to=str(root/(name+'.png')),output_width=1024,output_height=1024)
