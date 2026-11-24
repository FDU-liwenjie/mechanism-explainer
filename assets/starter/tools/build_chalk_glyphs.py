#!/usr/bin/env python3
"""Bundle Hanzi Writer stroke medians for a board lesson. Rendering stays offline."""
import argparse
import concurrent.futures
from datetime import date
import json
from pathlib import Path
import tempfile
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
VERSION = '2.0.1'
BASE = f'https://cdn.jsdelivr.net/npm/hanzi-writer-data@{VERSION}/'


def is_han(char):
    return any(lo <= ord(char) <= hi for lo, hi in (
        (0x3400, 0x4DBF), (0x4E00, 0x9FFF), (0xF900, 0xFAFF), (0x20000, 0x323AF)))


def read_character(char, data_dir):
    name = char + '.json'
    if data_dir:
        content = (data_dir / name).read_bytes()
    else:
        with urllib.request.urlopen(BASE + urllib.parse.quote(name), timeout=20) as response:
            content = response.read()
    medians = json.loads(content)['medians']
    if not medians or any(not stroke or any(len(p) != 2 for p in stroke) for stroke in medians):
        raise ValueError(f'{name} contains invalid stroke medians')
    return char, medians


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--text', action='append', default=[], help='Board text (repeatable)')
    parser.add_argument('--text-file', action='append', type=Path, default=[], help='UTF-8 board labels (repeatable)')
    parser.add_argument('--data-dir', type=Path, help='Offline folder containing Hanzi Writer Data character JSONs')
    parser.add_argument('--output', type=Path, default=ROOT / 'src/chalk/glyphs.json')
    args = parser.parse_args()
    if not args.text and not args.text_file:
        parser.error('supply --text or --text-file')
    text = ''.join(args.text) + ''.join(p.read_text(encoding='utf-8') for p in args.text_file)
    document = json.loads(args.output.read_text(encoding='utf-8')) if args.output.exists() else {}
    glyphs = document.get('glyphs', document)
    missing = sorted({c for c in text if is_han(c)} - glyphs.keys())
    if missing:
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            jobs = {pool.submit(read_character, char, args.data_dir): char for char in missing}
            for future in concurrent.futures.as_completed(jobs):
                try:
                    char, medians = future.result()
                except (ValueError, KeyError, OSError, urllib.error.URLError) as error:
                    parser.exit(1, f'Could not load stroke data for {jobs[future]}: {error}\n')
                glyphs[char] = medians
    if not missing and 'notice' in document:
        print(f'{len(glyphs)} bundled characters: {args.output}')
        return
    notice = (f'{date.today().isoformat()}: This subset combines only the unaltered stroke medians of '
              f'Hanzi Writer Data {VERSION} (Make Me a Hanzi; original fonts copyright (C) 1999 '
              'Arphic Technology Co., Ltd.). Distributed and modifiable under the Arphic Public License. '
              'See public/chalk/ARPHICPL.TXT.')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=args.output.parent, delete=False) as out:
        json.dump({'notice': notice, 'glyphs': glyphs}, out, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
        out.write('\n')
    generated = Path(out.name)
    generated.chmod(0o644)
    generated.replace(args.output)
    print(f'{len(glyphs)} bundled characters ({len(missing)} added): {args.output}')


if __name__ == '__main__':
    main()
