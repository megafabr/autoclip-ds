from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable


SOURCE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx"}

SKIP_DIRECTORIES = {
    "node_modules",
    "dist",
    "build",
    ".git",
    ".idea",
    ".vscode",
    "__pycache__",
    "coverage",
}

# Атрибуты, в которых обычно находится видимый пользователю текст.
UI_ATTRIBUTES = {
    "title",
    "placeholder",
    "label",
    "tab",
    "tooltip",
    "description",
    "message",
    "okText",
    "cancelText",
    "confirmText",
    "emptyText",
    "alt",
    "aria-label",
}

# Вызовы, которые показывают сообщения пользователю.
UI_FUNCTIONS = {
    "message.success",
    "message.error",
    "message.warning",
    "message.info",
    "message.loading",
    "notification.success",
    "notification.error",
    "notification.warning",
    "notification.info",
    "Modal.confirm",
    "Modal.info",
    "Modal.warning",
    "Modal.error",
    "Modal.success",
}

CHINESE_RE = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")
CYRILLIC_RE = re.compile(r"[А-Яа-яЁё]")
LATIN_RE = re.compile(r"[A-Za-z]")

# Частые признаки повреждённого UTF-8.
MOJIBAKE_RE = re.compile(
    r"(?:"
    r"Р[\x80-\xBFА-Яа-я]|"
    r"С[\x80-\xBFА-Яа-я]|"
    r"з[іЇЅ»]|"
    r"и[®Її]|"
    r"е[ЃЉ¤€]|"
    r"й[Ў™‡—]|"
    r"ж[—ЂІ]|"
    r"д[ёЅ]|"
    r"пј|"
    r" "
    r")"
)

STRING_RE = re.compile(
    r"""
    (?P<quote>["'`])
    (?P<value>
        (?:
            \\.
            |
            (?! (?P=quote) ).
        )*?
    )
    (?P=quote)
    """,
    re.VERBOSE | re.DOTALL,
)

JSX_TEXT_RE = re.compile(
    r"""
    >
    (?P<value>
        [^<>{}\n][^<>{}]*
    )
    <
    """,
    re.VERBOSE,
)
ATTRIBUTE_RE = re.compile(
    r"""
    (?P<name>
        title|placeholder|label|tab|tooltip|description|message|
        okText|cancelText|confirmText|emptyText|alt|aria-label
    )
    \s*=\s*
    (?P<quote>["'])
    (?P<value>.*?)
    (?P=quote)
    """,
    re.VERBOSE | re.DOTALL,
)

FUNCTION_CALL_RE = re.compile(
    r"""
    (?P<function>
        message\.(?:success|error|warning|info|loading)|
        notification\.(?:success|error|warning|info)|
        Modal\.(?:confirm|info|warning|error|success)
    )
    \s*\(
    \s*
    (?P<quote>["'`])
    (?P<value>
        (?:
            \\.
            |
            (?! (?P=quote) ).
        )*?
    )
    (?P=quote)
    """,
    re.VERBOSE | re.DOTALL,
)

COMMENT_RE = re.compile(
    r"//.*?$|/\*.*?\*/|\{/\*.*?\*/\}",
    re.MULTILINE | re.DOTALL,
)


@dataclass(frozen=True)
class Finding:
    file: str
    line: int
    column: int
    source_type: str
    classification: str
    text: str
    context: str
    suggested_key: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Извлекает только вероятные пользовательские строки интерфейса."
    )

    parser.add_argument(
        "--root",
        default="frontend/src",
        help="Папка исходников. По умолчанию: frontend/src",
    )

    parser.add_argument(
        "--output",
        default="localization_report_v2.json",
        help="JSON-отчёт.",
    )

    parser.add_argument(
        "--text-output",
        default="localization_report_v2.txt",
        help="Текстовый отчёт.",
    )

    parser.add_argument(
        "--draft-output",
        default="ru_draft.ts",
        help="Черновик словаря TypeScript.",
    )

    return parser.parse_args()


def iter_source_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*"):
        if not path.is_file():
            continue

        if path.suffix.lower() not in SOURCE_EXTENSIONS:
            continue

        if any(part in SKIP_DIRECTORIES for part in path.parts):
            continue

        yield path


def read_text_safely(path: Path) -> tuple[str, str]:
    encodings = (
        "utf-8",
        "utf-8-sig",
        "utf-16",
        "gb18030",
        "cp1251",
        "latin-1",
    )

    for encoding in encodings:
        try:
            return path.read_text(encoding=encoding), encoding
        except UnicodeDecodeError:
            continue

    raise RuntimeError(f"Не удалось определить кодировку: {path}")


def preserve_newlines(value: str) -> str:
    return "".join("\n" if char == "\n" else " " for char in value)


def strip_comments(text: str) -> str:
    return COMMENT_RE.sub(lambda match: preserve_newlines(match.group(0)), text)


def normalize(value: str) -> str:
    value = value.replace("\\n", " ")
    value = value.replace("\\t", " ")
    value = value.replace("&nbsp;", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def offset_to_line_column(text: str, offset: int) -> tuple[int, int]:
    line = text.count("\n", 0, offset) + 1
    last_newline = text.rfind("\n", 0, offset)

    if last_newline == -1:
        column = offset + 1
    else:
        column = offset - last_newline

    return line, column


def get_context(text: str, line_number: int) -> str:
    lines = text.splitlines()

    if 1 <= line_number <= len(lines):
        return lines[line_number - 1].strip()

    return ""


def classify_text(value: str) -> str:
    if " " in value or MOJIBAKE_RE.search(value):
        return "mojibake"

    if CHINESE_RE.search(value):
        return "chinese"

    if CYRILLIC_RE.search(value):
        return "russian"

    if LATIN_RE.search(value):
        return "latin"

    return "other"


def is_technical_string(value: str) -> bool:
    stripped = value.strip()

    if not stripped:
        return True

    technical_patterns = (
        r"^-?\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%|s|ms)?(?:\s+-?\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%|s|ms)?)*$",
        r"^(?:0|auto|none|inherit|initial|unset|transparent)$",
        r"^(?:flex|grid|block|inline|relative|absolute|fixed|sticky)$",
        r"^(?:row|column|center|left|right|top|bottom)$",
        r"^#[0-9a-fA-F]{3,8}$",
        r"^rgba?\(",
        r"^var\(--",
        r"^repeat\(",
        r"^minmax\(",
        r"^calc\(",
        r"^translate",
        r"^scale",
        r"^rotate",
        r"^all\s+\d",
        r"^\d+\s+\d+\s+\d+",
        r"^https?://",
        r"^/[A-Za-z0-9_./-]+$",
        r"^[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+$",
        r"^[A-Z0-9_]{3,}$",
    )

    for pattern in technical_patterns:
        if re.search(pattern, stripped):
            return True

    if stripped in {
        "all",
        "api",
        "id",
        "key",
        "value",
        "true",
        "false",
        "null",
        "undefined",
        "GET",
        "POST",
        "PUT",
        "DELETE",
    }:
        return True

    # CSS-подобные значения.
    if any(
        token in stripped
        for token in (
            "var(--",
            "rgba(",
            "linear-gradient(",
            "repeat(",
            "minmax(",
            "solid ",
            "dashed ",
            "ease",
            "box-shadow",
        )
    ):
        return True

    # Путь, имя файла или технический идентификатор.
    if re.fullmatch(r"[A-Za-z0-9_./:\\-]+", stripped):
        if " " not in stripped and len(stripped) < 80:
            return True

    return False


def is_probable_ui_text(value: str) -> bool:
    value = normalize(value)

    if not value:
        return False

    if is_technical_string(value):
        return False

    classification = classify_text(value)

    if classification in {"chinese", "mojibake", "russian"}:
        return True

    # Английские строки считаем UI только если в них есть пробел
    # или это достаточно длинная фраза.
    if classification == "latin":
        words = re.findall(r"[A-Za-z]+", value)
        return len(words) >= 2 or len(value) >= 18

    return False


def slugify_key(value: str) -> str:
    value = normalize(value).lower()

    translit_map = str.maketrans(
        {
            "а": "a",
            "б": "b",
            "в": "v",
            "г": "g",
            "д": "d",
            "е": "e",
            "ё": "e",
            "ж": "zh",
            "з": "z",
            "и": "i",
            "й": "y",
            "к": "k",
            "л": "l",
            "м": "m",
            "н": "n",
            "о": "o",
            "п": "p",
            "р": "r",
            "с": "s",
            "т": "t",
            "у": "u",
            "ф": "f",
            "х": "h",
            "ц": "c",
            "ч": "ch",
            "ш": "sh",
            "щ": "sch",
            "ъ": "",
            "ы": "y",
            "ь": "",
            "э": "e",
            "ю": "yu",
            "я": "ya",
        }
    )

    value = value.translate(translit_map)
    value = re.sub(r"[^a-z0-9]+", "_", value)
    value = value.strip("_")

    if not value:
        return "text"

    return value[:48]


def build_suggested_key(path: Path, root: Path, value: str) -> str:
    relative = path.relative_to(root)
    parts = list(relative.with_suffix("").parts)

    if parts and parts[0] in {"pages", "components"}:
        parts = parts[1:]

    namespace = ".".join(slugify_key(part) for part in parts)
    text_key = slugify_key(value)

    if namespace:
        return f"{namespace}.{text_key}"

    return text_key


def append_finding(
    *,
    findings: list[Finding],
    path: Path,
    root: Path,
    original_text: str,
    searchable_text: str,
    value: str,
    offset: int,
    source_type: str,
) -> None:
    normalized = normalize(value)

    if not is_probable_ui_text(normalized):
        return

    line, column = offset_to_line_column(searchable_text, offset)

    findings.append(
        Finding(
            file=str(path.relative_to(root.parent)),
            line=line,
            column=column,
            source_type=source_type,
            classification=classify_text(normalized),
            text=normalized,
            context=get_context(original_text, line),
            suggested_key=build_suggested_key(path, root, normalized),
        )
    )


def scan_file(path: Path, root: Path, text: str) -> list[Finding]:
    findings: list[Finding] = []
    searchable = strip_comments(text)

    # JSX-текст между тегами.
    for match in JSX_TEXT_RE.finditer(searchable):
        append_finding(
            findings=findings,
            path=path,
            root=root,
            original_text=text,
            searchable_text=searchable,
            value=match.group("value"),
            offset=match.start("value"),
            source_type="jsx-text",
        )

    # Атрибуты title="", placeholder="", tab="" и т. д.
    for match in ATTRIBUTE_RE.finditer(searchable):
        append_finding(
            findings=findings,
            path=path,
            root=root,
            original_text=text,
            searchable_text=searchable,
            value=match.group("value"),
            offset=match.start("value"),
            source_type=f"attribute:{match.group('name')}",
        )

    # message.success("...") и аналогичные вызовы.
    for match in FUNCTION_CALL_RE.finditer(searchable):
        append_finding(
            findings=findings,
            path=path,
            root=root,
            original_text=text,
            searchable_text=searchable,
            value=match.group("value"),
            offset=match.start("value"),
            source_type=f"function:{match.group('function')}",
        )

    return findings


def deduplicate(findings: list[Finding]) -> list[Finding]:
    seen: set[tuple[str, int, str, str]] = set()
    result: list[Finding] = []

    for finding in findings:
        key = (
            finding.file,
            finding.line,
            finding.source_type,
            finding.text,
        )

        if key in seen:
            continue

        seen.add(key)
        result.append(finding)

    return result


def sort_findings(findings: list[Finding]) -> list[Finding]:
    priority = {
        "mojibake": 0,
        "chinese": 1,
        "russian": 2,
        "latin": 3,
        "other": 4,
    }

    return sorted(
        findings,
        key=lambda item: (
            priority.get(item.classification, 9),
            item.file.lower(),
            item.line,
            item.column,
        ),
    )


def make_unique_keys(findings: list[Finding]) -> list[Finding]:
    counter: Counter[str] = Counter()
    result: list[Finding] = []

    for finding in findings:
        base = finding.suggested_key
        counter[base] += 1

        if counter[base] == 1:
            key = base
        else:
            key = f"{base}_{counter[base]}"

        result.append(
            Finding(
                file=finding.file,
                line=finding.line,
                column=finding.column,
                source_type=finding.source_type,
                classification=finding.classification,
                text=finding.text,
                context=finding.context,
                suggested_key=key,
            )
        )

    return result


def build_summary(
    findings: list[Finding],
    scanned_files: int,
    encodings: dict[str, str],
) -> dict:
    by_classification = Counter(item.classification for item in findings)
    by_file = Counter(item.file for item in findings)
    by_source_type = Counter(item.source_type for item in findings)

    return {
        "scanned_files": scanned_files,
        "total_findings": len(findings),
        "by_classification": dict(by_classification),
        "by_source_type": dict(by_source_type),
        "by_file": dict(
            sorted(
                by_file.items(),
                key=lambda item: (-item[1], item[0].lower()),
            )
        ),
        "encodings": encodings,
    }


def write_json_report(
    output: Path,
    summary: dict,
    findings: list[Finding],
) -> None:
    payload = {
        "summary": summary,
        "findings": [asdict(item) for item in findings],
    }

    output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def write_text_report(
    output: Path,
    summary: dict,
    findings: list[Finding],
) -> None:
    lines: list[str] = [
        "DS OS — отчёт локализации V2",
        "=" * 90,
        f"Просканировано файлов: {summary['scanned_files']}",
        f"Найдено пользовательских строк: {summary['total_findings']}",
        "",
        "По классификации:",
    ]

    for name, count in summary["by_classification"].items():
        lines.append(f"  {name}: {count}")

    lines.extend(["", "Файлы с наибольшим количеством строк:"])

    for file_name, count in list(summary["by_file"].items())[:30]:
        lines.append(f"  {count:4d}  {file_name}")

    lines.extend(["", "=" * 90, "НАЙДЕННЫЕ СТРОКИ", "=" * 90])

    current_file: str | None = None

    for finding in findings:
        if finding.file != current_file:
            current_file = finding.file
            lines.extend(["", f"[{current_file}]", "-" * 90])

        lines.append(
            f"{finding.line}:{finding.column} "
            f"[{finding.classification}] "
            f"[{finding.source_type}]"
        )
        lines.append(f"  key:  {finding.suggested_key}")
        lines.append(f"  text: {finding.text}")

        if finding.context:
            lines.append(f"  code: {finding.context}")

        lines.append("")

    output.write_text("\n".join(lines), encoding="utf-8")


def escape_ts_string(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace("'", "\\'")
        .replace("\r", "")
        .replace("\n", "\\n")
    )


def write_ru_draft(output: Path, findings: list[Finding]) -> None:
    lines = [
        "// Автоматически созданный черновик.",
        "// Значения с mojibake и китайским текстом нужно перевести вручную.",
        "",
        "const ruDraft = {",
    ]

    for finding in findings:
        key = finding.suggested_key.replace(".", "_")
        original = escape_ts_string(finding.text)

        lines.append(
            f"  // {finding.file}:{finding.line} "
            f"[{finding.classification}]"
        )
        lines.append(f"  {key}: '{original}',")
        lines.append("")

    lines.extend(
        [
            "} as const",
            "",
            "export default ruDraft",
            "",
        ]
    )

    output.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()

    if not root.exists():
        print(f"Ошибка: папка не найдена: {root}", file=sys.stderr)
        return 1

    findings: list[Finding] = []
    encodings: dict[str, str] = {}
    scanned_files = 0

    for path in iter_source_files(root):
        scanned_files += 1

        try:
            text, encoding = read_text_safely(path)
        except RuntimeError as exc:
            print(f"Предупреждение: {exc}", file=sys.stderr)
            continue

        encodings[str(path.relative_to(root.parent))] = encoding
        findings.extend(scan_file(path, root, text))

    findings = deduplicate(findings)
    findings = sort_findings(findings)
    findings = make_unique_keys(findings)

    summary = build_summary(
        findings=findings,
        scanned_files=scanned_files,
        encodings=encodings,
    )

    json_output = Path(args.output).resolve()
    text_output = Path(args.text_output).resolve()
    draft_output = Path(args.draft_output).resolve()

    write_json_report(json_output, summary, findings)
    write_text_report(text_output, summary, findings)
    write_ru_draft(draft_output, findings)

    print()
    print("Сканирование V2 завершено.")
    print(f"Просканировано файлов: {summary['scanned_files']}")
    print(f"Найдено пользовательских строк: {summary['total_findings']}")
    print(f"JSON-отчёт: {json_output}")
    print(f"Текстовый отчёт: {text_output}")
    print(f"Черновик словаря: {draft_output}")
    print()

    print("Файлы с наибольшим количеством строк:")

    for file_name, count in list(summary["by_file"].items())[:20]:
        print(f"  {count:4d}  {file_name}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())