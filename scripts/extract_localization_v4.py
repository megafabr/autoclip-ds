from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

SOURCE_EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx'}
SKIP_DIRECTORIES = {'.git', '.idea', '.vscode', '__pycache__', 'node_modules', 'dist', 'build', 'coverage'}

CHINESE_RE = re.compile(r'[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]')
RUSSIAN_RE = re.compile(r'[А-Яа-яЁё]')
LATIN_RE = re.compile(r'[A-Za-z]')

JSX_TEXT_RE = re.compile(r'>([^<>{}\n][^<>{}]*)<')

ATTRIBUTE_RE = re.compile(
    r'''(?P<name>title|placeholder|label|tab|tooltip|description|message|okText|cancelText|confirmText|emptyText|alt|aria-label|addonBefore|addonAfter|extra)\s*=\s*(?P<quote>["'])(?P<value>.*?)(?P=quote)''',
    re.DOTALL,
)

ATTRIBUTE_EXPR_RE = re.compile(
    r'''(?P<name>title|placeholder|label|tab|tooltip|description|message|okText|cancelText|confirmText|emptyText|alt|aria-label|addonBefore|addonAfter|extra)\s*=\s*\{\s*(?P<quote>["'`])(?P<value>(?:\\.|(?!\2).)*?)(?P=quote)\s*\}''',
    re.DOTALL,
)

FUNCTION_RE = re.compile(
    r'''(?P<function>message\.(?:success|error|warning|info|loading)|notification\.(?:success|error|warning|info)|Modal\.(?:confirm|info|warning|error|success))\s*\(\s*(?P<quote>["'`])(?P<value>(?:\\.|(?!\2).)*?)(?P=quote)''',
    re.DOTALL,
)

OBJECT_FIELD_RE = re.compile(
    r'''(?P<name>title|label|text|description|emptyText)\s*:\s*(?P<quote>["'`])(?P<value>(?:\\.|(?!\2).)*?)(?P=quote)''',
    re.DOTALL,
)

COMMENT_RE = re.compile(r'//.*?$|/\*.*?\*/|\{/\*.*?\*/\}', re.MULTILINE | re.DOTALL)

DEBUG_PREFIXES = ('console.log', 'console.warn', 'console.error', 'console.info', 'console.debug')

MOJIBAKE_MARKERS = (
    'Р В°','Р В±','Р Р†','Р С–','Р Т‘','Р Вµ','Р В¶','Р В·','Р С‘','Р в„–','Р С”','Р В»','Р С','Р Р…','Р С•','Р С—',
    'Р С›','Р Сџ','Р РЋ','Р Сћ','РЎР‚','РЎРѓ','РЎвЂљ','РЎС“','РЎвЂћ','РЎвЂ¦','РЎвЂ ','РЎвЂЎ','РЎв‚¬','РЎвЂ°','РЎРЉ','РЎвЂ№','РЎРЊ','РЎР‹','РЎРЏ','пїЅ'
)

PROTECTED_NAMES = {
    'OpenAI', 'Google Gemini', 'DeepSeek', 'SiliconFlow', 'DashScope',
    'Bilibili', 'AutoClip Desktop', 'DS OS', 'LLM API', 'Speech API'
}

MODEL_PATTERNS = (
    r'^gpt-[a-z0-9.\-]+(?:\s*\([^)]*\))?$',
    r'^gemini-[a-z0-9.\-]+(?:\s*\([^)]*\))?$',
    r'^deepseek-[a-z0-9.\-]+(?:\s*\([^)]*\))?$',
    r'^qwen-[a-z0-9.\-]+(?:\s*\([^)]*\))?$',
    r'^claude-[a-z0-9.\-]+(?:\s*\([^)]*\))?$',
    r'^whisper-[a-z0-9.\-]+(?:\s*\([^)]*\))?$',
    r'^llama-[a-z0-9.\-]+(?:\s*\([^)]*\))?$',
    r'^mistral-[a-z0-9.\-]+(?:\s*\([^)]*\))?$',
)

@dataclass(frozen=True)
class Finding:
    file: str
    line: int
    column: int
    classification: str
    source_type: str
    text: str
    context: str
    suggested_key: str


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description='V4: РёР·РІР»РµРєР°РµС‚ С‚РѕР»СЊРєРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєРёРµ UI-СЃС‚СЂРѕРєРё.')
    p.add_argument('--root', default='frontend/src')
    p.add_argument('--json-output', default='localization_report_v4.json')
    p.add_argument('--text-output', default='localization_report_v4.txt')
    p.add_argument('--draft-output', default='ru_draft_v4.ts')
    p.add_argument('--include-latin', action='store_true', help='Р’РєР»СЋС‡РёС‚СЊ Р°РЅРіР»РёР№СЃРєРёРµ UI-СЃС‚СЂРѕРєРё.')
    return p.parse_args()


def iter_files(root: Path) -> Iterable[Path]:
    for path in root.rglob('*'):
        if path.is_file() and path.suffix.lower() in SOURCE_EXTENSIONS:
            if not any(part in SKIP_DIRECTORIES for part in path.parts):
                yield path


def read_text(path: Path) -> tuple[str, str]:
    for enc in ('utf-8', 'utf-8-sig', 'utf-16', 'gb18030', 'cp1251', 'latin-1'):
        try:
            return path.read_text(encoding=enc), enc
        except UnicodeDecodeError:
            continue
    raise RuntimeError(f'РќРµ СѓРґР°Р»РѕСЃСЊ РѕРїСЂРµРґРµР»РёС‚СЊ РєРѕРґРёСЂРѕРІРєСѓ: {path}')


def strip_comments(text: str) -> str:
    return COMMENT_RE.sub(lambda m: ''.join('\n' if c == '\n' else ' ' for c in m.group(0)), text)


def normalize(value: str) -> str:
    value = value.replace('\\n', ' ').replace('\\t', ' ').replace('&nbsp;', ' ')
    return re.sub(r'\s+', ' ', value).strip()


def looks_mojibake(value: str) -> bool:
    return 'пїЅ' in value or sum(value.count(m) for m in MOJIBAKE_MARKERS) >= 2


def classify(value: str) -> str:
    if looks_mojibake(value):
        return 'mojibake'
    if CHINESE_RE.search(value):
        return 'chinese'
    if RUSSIAN_RE.search(value):
        return 'russian'
    if LATIN_RE.search(value):
        return 'latin'
    return 'other'


def in_console_call(text: str, offset: int) -> bool:
    line_start = text.rfind('\n', 0, offset) + 1
    before = text[line_start:offset]
    return any(prefix in before for prefix in DEBUG_PREFIXES)


def is_model_name(value: str) -> bool:
    v = value.strip().lower()
    return any(re.fullmatch(p, v, flags=re.IGNORECASE) for p in MODEL_PATTERNS)


def is_path_or_api(value: str) -> bool:
    pats = (
        r'^https?://\S+$', r'^mailto:\S+$', r'^[A-Za-z]:\\', r'^/Users/',
        r'^/home/', r'^/var/', r'^/tmp/', r'^/[A-Za-z0-9_.\-/]+$',
        r'^(?:GET|POST|PUT|PATCH|DELETE)\s+/'
    )
    return any(re.search(p, value.strip()) for p in pats)


def is_technical(value: str) -> bool:
    v = value.strip()
    if not v:
        return True
    if v in {'all','auto','none','normal','inherit','initial','unset','transparent','relative','absolute','fixed','sticky','block','inline','flex','grid','row','column','center','left','right','top','bottom','true','false','null','undefined','GET','POST','PUT','PATCH','DELETE'}:
        return True
    pats = (
        r'^-?\d+(?:\.\d+)?$',
        r'^-?\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%|s|ms)$',
        r'^(?:-?\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%|s|ms)?\s+){1,4}-?\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%|s|ms)?$',
        r'^#[0-9a-fA-F]{3,8}$', r'^rgba?\(', r'^hsla?\(', r'^var\(--', r'^calc\(',
        r'^repeat\(', r'^minmax\(', r'^translate', r'^rotate', r'^scale',
        r'^linear-gradient\(', r'^radial-gradient\(', r'^[A-Z0-9_]{3,}$',
        r'^\$\{.*\}$', r'^\([^)]*\):\s*Promise', r'^api\.(?:get|post|put|patch|delete)\(',
        r'^HTTP\s+\$\{'
    )
    if any(re.search(p, v) for p in pats):
        return True
    fragments = ('var(--','rgba(','rgb(','linear-gradient(','radial-gradient(','repeat(','minmax(',' solid ',' dashed ',' ease',' cubic-bezier(','translate(','translateX(','translateY(','scale(','rotate(','Promise<','Partial<','useState<')
    if any(f in v for f in fragments):
        return True
    if re.fullmatch(r'[A-Za-z0-9_./:\\-]+', v) and ' ' not in v and len(v) < 120:
        return True
    return False


def probable_ui(value: str, source_type: str, include_latin: bool) -> bool:
    v = normalize(value)
    if not v or v in PROTECTED_NAMES or is_model_name(v) or is_path_or_api(v) or is_technical(v):
        return False
    c = classify(v)
    if c in {'mojibake', 'chinese', 'russian'}:
        return True
    if c == 'latin' and include_latin:
        words = re.findall(r'[A-Za-z]+', v)
        return len(words) >= 2 or (len(v) >= 18 and source_type.startswith(('attribute:', 'function:', 'object-field:')))
    return False


def line_col(text: str, offset: int) -> tuple[int, int]:
    line = text.count('\n', 0, offset) + 1
    prev = text.rfind('\n', 0, offset)
    return line, (offset + 1 if prev == -1 else offset - prev)


def context_line(text: str, line_no: int) -> str:
    lines = text.splitlines()
    return lines[line_no - 1].strip() if 1 <= line_no <= len(lines) else ''


def translit_ru(value: str) -> str:
    m = {'Р°':'a','Р±':'b','РІ':'v','Рі':'g','Рґ':'d','Рµ':'e','С‘':'e','Р¶':'zh','Р·':'z','Рё':'i','Р№':'y','Рє':'k','Р»':'l','Рј':'m','РЅ':'n','Рѕ':'o','Рї':'p','СЂ':'r','СЃ':'s','С‚':'t','Сѓ':'u','С„':'f','С…':'h','С†':'c','С‡':'ch','С€':'sh','С‰':'sch','СЉ':'','С‹':'y','СЊ':'','СЌ':'e','СЋ':'yu','СЏ':'ya'}
    return ''.join(m.get(c, c) for c in value.lower())


def slug(value: str) -> str:
    v = re.sub(r'[^a-z0-9]+', '_', translit_ru(normalize(value))).strip('_') or 'text'
    return ('text_' + v if v[0].isdigit() else v)[:60]


def suggested_key(path: Path, root: Path, value: str) -> str:
    parts = list(path.relative_to(root).with_suffix('').parts)
    if parts and parts[0] in {'pages','components','services','utils'}:
        parts = parts[1:]
    ns = '.'.join(slug(p) for p in parts if p)
    return f'{ns}.{slug(value)}' if ns else slug(value)


def add_finding(findings: list[Finding], path: Path, root: Path, original: str, searchable: str, value: str, offset: int, source_type: str, include_latin: bool) -> None:
    v = normalize(value)
    if in_console_call(searchable, offset):
        return
    if not probable_ui(v, source_type, include_latin):
        return
    line, column = line_col(searchable, offset)
    findings.append(Finding(
        file=str(path.relative_to(root.parent)),
        line=line,
        column=column,
        classification=classify(v),
        source_type=source_type,
        text=v,
        context=context_line(original, line),
        suggested_key=suggested_key(path, root, v),
    ))


def scan_file(path: Path, root: Path, text: str, include_latin: bool) -> list[Finding]:
    findings: list[Finding] = []
    searchable = strip_comments(text)

    for m in JSX_TEXT_RE.finditer(searchable):
        add_finding(findings, path, root, text, searchable, m.group(1), m.start(1), 'jsx-text', include_latin)

    for regex, prefix in ((ATTRIBUTE_RE, 'attribute'), (ATTRIBUTE_EXPR_RE, 'attribute-expression')):
        for m in regex.finditer(searchable):
            add_finding(findings, path, root, text, searchable, m.group('value'), m.start('value'), f"{prefix}:{m.group('name')}", include_latin)

    for m in FUNCTION_RE.finditer(searchable):
        add_finding(findings, path, root, text, searchable, m.group('value'), m.start('value'), f"function:{m.group('function')}", include_latin)

    for m in OBJECT_FIELD_RE.finditer(searchable):
        add_finding(findings, path, root, text, searchable, m.group('value'), m.start('value'), f"object-field:{m.group('name')}", include_latin)

    return findings


def dedupe(findings: list[Finding]) -> list[Finding]:
    out, seen = [], set()
    for f in findings:
        key = (f.file, f.line, f.source_type, f.text)
        if key not in seen:
            seen.add(key)
            out.append(f)
    return out


def unique_keys(findings: list[Finding]) -> list[Finding]:
    counter: Counter[str] = Counter()
    out: list[Finding] = []
    for f in findings:
        counter[f.suggested_key] += 1
        key = f.suggested_key if counter[f.suggested_key] == 1 else f'{f.suggested_key}_{counter[f.suggested_key]}'
        out.append(Finding(f.file, f.line, f.column, f.classification, f.source_type, f.text, f.context, key))
    return out


def build_summary(findings: list[Finding], scanned: int, encodings: dict[str, str]) -> dict:
    by_class = Counter(f.classification for f in findings)
    by_source = Counter(f.source_type for f in findings)
    by_file = Counter(f.file for f in findings)
    return {
        'version': 4,
        'scanned_files': scanned,
        'total_findings': len(findings),
        'by_classification': dict(sorted(by_class.items())),
        'by_source_type': dict(sorted(by_source.items())),
        'by_file': dict(sorted(by_file.items(), key=lambda x: (-x[1], x[0].lower()))),
        'encodings': encodings,
    }


def write_reports(json_path: Path, text_path: Path, draft_path: Path, summary: dict, findings: list[Finding]) -> None:
    json_path.write_text(json.dumps({'summary': summary, 'findings': [asdict(f) for f in findings]}, ensure_ascii=False, indent=2), encoding='utf-8')

    lines = [
        'DS OS вЂ” РѕС‚С‡С‘С‚ Р»РѕРєР°Р»РёР·Р°С†РёРё V4', '=' * 90,
        f"РџСЂРѕСЃРєР°РЅРёСЂРѕРІР°РЅРѕ С„Р°Р№Р»РѕРІ: {summary['scanned_files']}",
        f"РќР°Р№РґРµРЅРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєРёС… СЃС‚СЂРѕРє: {summary['total_findings']}", '',
        'РџРѕ РєР»Р°СЃСЃРёС„РёРєР°С†РёРё:'
    ]
    for k, v in summary['by_classification'].items():
        lines.append(f'  {k}: {v}')
    lines += ['', 'РџРѕ С‚РёРїСѓ РёСЃС‚РѕС‡РЅРёРєР°:']
    for k, v in summary['by_source_type'].items():
        lines.append(f'  {k}: {v}')
    lines += ['', 'Р¤Р°Р№Р»С‹ СЃ РЅР°РёР±РѕР»СЊС€РёРј РєРѕР»РёС‡РµСЃС‚РІРѕРј СЃС‚СЂРѕРє:']
    for k, v in list(summary['by_file'].items())[:30]:
        lines.append(f'  {v:4d}  {k}')
    lines += ['', '=' * 90, 'РќРђР™Р”Р•РќРќР«Р• РЎРўР РћРљР', '=' * 90]

    current = None
    for f in findings:
        if f.file != current:
            current = f.file
            lines += ['', f'[{current}]', '-' * 90]
        lines += [
            f'{f.line}:{f.column} [{f.classification}] [{f.source_type}]',
            f'  key:  {f.suggested_key}',
            f'  text: {f.text}',
        ]
        if f.context:
            lines.append(f'  code: {f.context}')
        lines.append('')
    text_path.write_text('\n'.join(lines), encoding='utf-8')

    d = ['// РђРІС‚РѕРјР°С‚РёС‡РµСЃРєРё СЃРѕР·РґР°РЅРѕ extract_localization_v4.py', '// Р§РµСЂРЅРѕРІРёРє, РЅРµ РіРѕС‚РѕРІС‹Р№ РїРµСЂРµРІРѕРґ.', '', 'const ruDraftV4 = {']
    for f in findings:
        key = f.suggested_key.replace('.', '_')
        value = f.text.replace('\\', '\\\\').replace("'", "\\'").replace('\r', '').replace('\n', '\\n')
        d += [f'  // {f.file}:{f.line} [{f.classification}] [{f.source_type}]', f"  {key}: '{value}',", '']
    d += ['} as const', '', 'export default ruDraftV4', '']
    draft_path.write_text('\n'.join(d), encoding='utf-8')


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    if not root.exists() or not root.is_dir():
        print(f'РћС€РёР±РєР°: РїР°РїРєР° РЅРµ РЅР°Р№РґРµРЅР°: {root}', file=sys.stderr)
        return 1

    findings: list[Finding] = []
    encodings: dict[str, str] = {}
    scanned = 0

    for path in iter_files(root):
        scanned += 1
        try:
            text, enc = read_text(path)
        except RuntimeError as exc:
            print(f'РџСЂРµРґСѓРїСЂРµР¶РґРµРЅРёРµ: {exc}', file=sys.stderr)
            continue
        encodings[str(path.relative_to(root.parent))] = enc
        findings.extend(scan_file(path, root, text, args.include_latin))

    findings = dedupe(findings)
    priority = {'mojibake': 0, 'chinese': 1, 'russian': 2, 'latin': 3, 'other': 4}
    findings.sort(key=lambda f: (priority.get(f.classification, 99), f.file.lower(), f.line, f.column))
    findings = unique_keys(findings)

    summary = build_summary(findings, scanned, encodings)
    json_path = Path(args.json_output).resolve()
    text_path = Path(args.text_output).resolve()
    draft_path = Path(args.draft_output).resolve()
    write_reports(json_path, text_path, draft_path, summary, findings)

    print('\nРЎРєР°РЅРёСЂРѕРІР°РЅРёРµ V4 Р·Р°РІРµСЂС€РµРЅРѕ.')
    print(f"РџСЂРѕСЃРєР°РЅРёСЂРѕРІР°РЅРѕ С„Р°Р№Р»РѕРІ: {summary['scanned_files']}")
    print(f"РќР°Р№РґРµРЅРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєРёС… СЃС‚СЂРѕРє: {summary['total_findings']}")
    print(f'JSON-РѕС‚С‡С‘С‚: {json_path}')
    print(f'РўРµРєСЃС‚РѕРІС‹Р№ РѕС‚С‡С‘С‚: {text_path}')
    print(f'Р§РµСЂРЅРѕРІРёРє СЃР»РѕРІР°СЂСЏ: {draft_path}\n')

    if summary['by_file']:
        print('Р¤Р°Р№Р»С‹ СЃ РЅР°РёР±РѕР»СЊС€РёРј РєРѕР»РёС‡РµСЃС‚РІРѕРј СЃС‚СЂРѕРє:')
        for name, count in list(summary['by_file'].items())[:20]:
            print(f'  {count:4d}  {name}')
    else:
        print('РџРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєРёРµ СЃС‚СЂРѕРєРё РЅРµ РЅР°Р№РґРµРЅС‹.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
