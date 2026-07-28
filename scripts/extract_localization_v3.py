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
    ".git",
    ".idea",
    ".vscode",
    "__pycache__",
    "node_modules",
    "dist",
    "build",
    "coverage",
}

UI_ATTRIBUTE_NAMES = {
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

UI_FUNCTION_NAMES = {
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

CHINESE_RE = re.compile(
    r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]"
)

RUSSIAN_RE = re.compile(r"[А-Яа-яЁё]")
LATIN_RE = re.compile(r"[A-Za-z]")

JSX_TEXT_RE = re.compile(
    r">([^<>{}\n][^<>{}]*)<"
)

ATTRIBUTE_RE = re.compile(
    r"""
    (?P<name>
        title|
        placeholder|
        label|
        tab|
        tooltip|
        description|
        message|
        okText|
        cancelText|
        confirmText|
        emptyText|
        alt|
        aria-label
    )
    \s*=\s*
    (?P<quote>["'])
    (?P<value>.*?)
    (?P=quote)
    """,
    re.VERBOSE | re.DOTALL,
)

FUNCTION_RE = re.compile(
    r"""
    (?P<function>
        message\.(?:success|error|warning|info|loading)|
        notification\.(?:success|error|warning|info)|
        Modal\.(?:confirm|info|warning|error|success)
    )
    \s*
    \(
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

MOJIBAKE_MARKERS = (
    "Р°",
    "Р±",
    "РІ",
    "Рі",
    "Рґ",
    "Рµ",
    "Р¶",
    "Р·",
    "Рё",
    "Р№",
    "Рє",
    "Р»",
    "Рј",
    "РЅ",
    "Рѕ",
    "Рї",
    "Рћ",
    "Рџ",
    "РЎ",
    "Рў",
    "СЂ",
    "СЃ",
    "С‚",
    "Сѓ",
    "С„",
    "С…",
    "С†",
    "С‡",
    "С€",
    "С‰",
    "СЊ",
    "С‹",
    "СЌ",
    "СЋ",
    "СЏ",
    "з›",
    "зЅ",
    "з»",
    "ж—",
    "жњ",
    "ж‰",
    "ж€",
    "еЉ",
    "е€",
    "е¤",
    "е®",
    "еј",
    "еЃ",
    "иЇ",
    "иї",
    "и®",
    "йЎ",
    "й™",
    "й—",
    "пј",
    " ",
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


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Ищет пользовательские строки в React/TypeScript "
            "и создаёт отчёт локализации."
        )
    )

    parser.add_argument(
        "--root",
        default="frontend/src",
        help="Папка исходников. По умолчанию: frontend/src",
    )

    parser.add_argument(
        "--json-output",
        default="localization_report_v3.json",
        help="Путь к JSON-отчёту.",
    )

    parser.add_argument(
        "--text-output",
        default="localization_report_v3.txt",
        help="Путь к текстовому отчёту.",
    )

    parser.add_argument(
        "--draft-output",
        default="ru_draft_v3.ts",
        help="Путь к черновику словаря.",
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
        except OSError as exc:
            raise RuntimeError(
                f"Не удалось прочитать файл {path}: {exc}"
            ) from exc

    raise RuntimeError(
        f"Не удалось определить кодировку файла: {path}"
    )


def preserve_newlines(value: str) -> str:
    return "".join(
        "\n" if character == "\n" else " "
        for character in value
    )


def strip_comments(text: str) -> str:
    return COMMENT_RE.sub(
        lambda match: preserve_newlines(match.group(0)),
        text,
    )


def normalize_text(value: str) -> str:
    value = value.replace("\\n", " ")
    value = value.replace("\\t", " ")
    value = value.replace("&nbsp;", " ")
    value = re.sub(r"\s+", " ", value)

    return value.strip()


def classify_text(value: str) -> str:
    if looks_like_mojibake(value):
        return "mojibake"

    if CHINESE_RE.search(value):
        return "chinese"

    if RUSSIAN_RE.search(value):
        return "russian"

    if LATIN_RE.search(value):
        return "latin"

    return "other"


def looks_like_mojibake(value: str) -> bool:
    if " " in value:
        return True

    score = 0

    for marker in MOJIBAKE_MARKERS:
        score += value.count(marker)

    return score >= 2


def is_css_or_technical(value: str) -> bool:
    value = value.strip()

    if not value:
        return True

    exact_values = {
        "all",
        "auto",
        "none",
        "normal",
        "inherit",
        "initial",
        "unset",
        "transparent",
        "relative",
        "absolute",
        "fixed",
        "sticky",
        "block",
        "inline",
        "flex",
        "grid",
        "row",
        "column",
        "center",
        "left",
        "right",
        "top",
        "bottom",
        "true",
        "false",
        "null",
        "undefined",
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
    }

    if value in exact_values:
        return True

    technical_patterns = (
        r"^-?\d+(?:\.\d+)?$",
        r"^-?\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%|s|ms)$",
        r"^(?:-?\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%|s|ms)?\s+){1,4}"
        r"-?\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%|s|ms)?$",
        r"^#[0-9a-fA-F]{3,8}$",
        r"^rgba?\(",
        r"^hsla?\(",
        r"^var\(--",
        r"^calc\(",
        r"^repeat\(",
        r"^minmax\(",
        r"^translate",
        r"^rotate",
        r"^scale",
        r"^linear-gradient\(",
        r"^radial-gradient\(",
        r"^https?://",
        r"^mailto:",
        r"^[A-Za-z]:\\",
        r"^/[A-Za-z0-9_.\-/]+$",
        r"^[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+$",
        r"^[A-Z0-9_]{3,}$",
    )

    for pattern in technical_patterns:
        if re.search(pattern, value):
            return True

    technical_fragments = (
        "var(--",
        "rgba(",
        "rgb(",
        "linear-gradient(",
        "radial-gradient(",
        "repeat(",
        "minmax(",
        " solid ",
        " dashed ",
        " ease",
        " cubic-bezier(",
        "translate(",
        "translateX(",
        "translateY(",
        "scale(",
        "rotate(",
    )

    if any(fragment in value for fragment in technical_fragments):
        return True

    if re.fullmatch(r"[A-Za-z0-9_./:\\-]+", value):
        if " " not in value and len(value) < 100:
            return True

    return False


def is_probable_ui_text(value: str) -> bool:
    value = normalize_text(value)

    if not value:
        return False

    if is_css_or_technical(value):
        return False

    classification = classify_text(value)

    if classification in {
        "mojibake",
        "chinese",
        "russian",
    }:
        return True

    if classification == "latin":
        words = re.findall(r"[A-Za-z]+", value)

        if len(words) >= 2:
            return True

        if len(value) >= 18:
            return True

    return False


def offset_to_line_column(
    text: str,
    offset: int,
) -> tuple[int, int]:
    line = text.count("\n", 0, offset) + 1
    previous_newline = text.rfind("\n", 0, offset)

    if previous_newline == -1:
        column = offset + 1
    else:
        column = offset - previous_newline

    return line, column


def get_line_context(
    original_text: str,
    line_number: int,
) -> str:
    lines = original_text.splitlines()

    if 1 <= line_number <= len(lines):
        return lines[line_number - 1].strip()

    return ""


def transliterate_russian(value: str) -> str:
    mapping = {
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

    result: list[str] = []

    for character in value.lower():
        result.append(mapping.get(character, character))

    return "".join(result)


def slugify(value: str) -> str:
    value = normalize_text(value)
    value = transliterate_russian(value)
    value = re.sub(r"[^a-z0-9]+", "_", value)
    value = value.strip("_")

    if not value:
        return "text"

    if value[0].isdigit():
        value = f"text_{value}"

    return value[:50]


def build_suggested_key(
    path: Path,
    root: Path,
    value: str,
) -> str:
    relative_path = path.relative_to(root)
    path_parts = list(relative_path.with_suffix("").parts)

    if path_parts and path_parts[0] in {
        "pages",
        "components",
    }:
        path_parts = path_parts[1:]

    namespace_parts = [
        slugify(part)
        for part in path_parts
        if part
    ]

    namespace = ".".join(namespace_parts)
    text_part = slugify(value)

    if namespace:
        return f"{namespace}.{text_part}"

    return text_part


def append_finding(
    findings: list[Finding],
    path: Path,
    root: Path,
    original_text: str,
    searchable_text: str,
    value: str,
    offset: int,
    source_type: str,
) -> None:
    normalized = normalize_text(value)

    if not is_probable_ui_text(normalized):
        return

    line, column = offset_to_line_column(
        searchable_text,
        offset,
    )

    findings.append(
        Finding(
            file=str(path.relative_to(root.parent)),
            line=line,
            column=column,
            classification=classify_text(normalized),
            source_type=source_type,
            text=normalized,
            context=get_line_context(original_text, line),
            suggested_key=build_suggested_key(
                path,
                root,
                normalized,
            ),
        )
    )


def scan_jsx_text(
    findings: list[Finding],
    path: Path,
    root: Path,
    original_text: str,
    searchable_text: str,
) -> None:
    for match in JSX_TEXT_RE.finditer(searchable_text):
        append_finding(
            findings=findings,
            path=path,
            root=root,
            original_text=original_text,
            searchable_text=searchable_text,
            value=match.group(1),
            offset=match.start(1),
            source_type="jsx-text",
        )


def scan_attributes(
    findings: list[Finding],
    path: Path,
    root: Path,
    original_text: str,
    searchable_text: str,
) -> None:
    for match in ATTRIBUTE_RE.finditer(searchable_text):
        attribute_name = match.group("name")

        append_finding(
            findings=findings,
            path=path,
            root=root,
            original_text=original_text,
            searchable_text=searchable_text,
            value=match.group("value"),
            offset=match.start("value"),
            source_type=f"attribute:{attribute_name}",
        )


def scan_ui_functions(
    findings: list[Finding],
    path: Path,
    root: Path,
    original_text: str,
    searchable_text: str,
) -> None:
    for match in FUNCTION_RE.finditer(searchable_text):
        function_name = match.group("function")

        append_finding(
            findings=findings,
            path=path,
            root=root,
            original_text=original_text,
            searchable_text=searchable_text,
            value=match.group("value"),
            offset=match.start("value"),
            source_type=f"function:{function_name}",
        )


def scan_file(
    path: Path,
    root: Path,
    text: str,
) -> list[Finding]:
    findings: list[Finding] = []
    searchable_text = strip_comments(text)

    scan_jsx_text(
        findings,
        path,
        root,
        text,
        searchable_text,
    )

    scan_attributes(
        findings,
        path,
        root,
        text,
        searchable_text,
    )

    scan_ui_functions(
        findings,
        path,
        root,
        text,
        searchable_text,
    )

    return findings


def deduplicate_findings(
    findings: list[Finding],
) -> list[Finding]:
    result: list[Finding] = []
    seen: set[tuple[str, int, str, str]] = set()

    for finding in findings:
        identity = (
            finding.file,
            finding.line,
            finding.source_type,
            finding.text,
        )

        if identity in seen:
            continue

        seen.add(identity)
        result.append(finding)

    return result


def assign_unique_keys(
    findings: list[Finding],
) -> list[Finding]:
    key_counter: Counter[str] = Counter()
    result: list[Finding] = []

    for finding in findings:
        base_key = finding.suggested_key
        key_counter[base_key] += 1

        if key_counter[base_key] == 1:
            final_key = base_key
        else:
            final_key = (
                f"{base_key}_{key_counter[base_key]}"
            )

        result.append(
            Finding(
                file=finding.file,
                line=finding.line,
                column=finding.column,
                classification=finding.classification,
                source_type=finding.source_type,
                text=finding.text,
                context=finding.context,
                suggested_key=final_key,
            )
        )

    return result


def sort_findings(
    findings: list[Finding],
) -> list[Finding]:
    classification_priority = {
        "mojibake": 0,
        "chinese": 1,
        "russian": 2,
        "latin": 3,
        "other": 4,
    }

    return sorted(
        findings,
        key=lambda item: (
            classification_priority.get(
                item.classification,
                99,
            ),
            item.file.lower(),
            item.line,
            item.column,
        ),
    )


def build_summary(
    findings: list[Finding],
    scanned_files: int,
    encoding_map: dict[str, str],
) -> dict:
    by_classification = Counter(
        item.classification
        for item in findings
    )

    by_source_type = Counter(
        item.source_type
        for item in findings
    )

    by_file = Counter(
        item.file
        for item in findings
    )

    return {
        "scanned_files": scanned_files,
        "total_findings": len(findings),
        "by_classification": dict(
            sorted(by_classification.items())
        ),
        "by_source_type": dict(
            sorted(by_source_type.items())
        ),
        "by_file": dict(
            sorted(
                by_file.items(),
                key=lambda item: (
                    -item[1],
                    item[0].lower(),
                ),
            )
        ),
        "encodings": encoding_map,
    }


def write_json_report(
    path: Path,
    summary: dict,
    findings: list[Finding],
) -> None:
    payload = {
        "summary": summary,
        "findings": [
            asdict(finding)
            for finding in findings
        ],
    }

    path.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def write_text_report(
    path: Path,
    summary: dict,
    findings: list[Finding],
) -> None:
    lines: list[str] = [
        "DS OS — отчёт локализации V3",
        "=" * 90,
        f"Просканировано файлов: {summary['scanned_files']}",
        (
            "Найдено пользовательских строк: "
            f"{summary['total_findings']}"
        ),
        "",
        "По классификации:",
    ]

    for classification, count in (
        summary["by_classification"].items()
    ):
        lines.append(
            f"  {classification}: {count}"
        )

    lines.extend(
        [
            "",
            "По типу источника:",
        ]
    )

    for source_type, count in (
        summary["by_source_type"].items()
    ):
        lines.append(
            f"  {source_type}: {count}"
        )

    lines.extend(
        [
            "",
            "Файлы с наибольшим количеством строк:",
        ]
    )

    for file_name, count in list(
        summary["by_file"].items()
    )[:30]:
        lines.append(
            f"  {count:4d}  {file_name}"
        )

    lines.extend(
        [
            "",
            "=" * 90,
            "НАЙДЕННЫЕ СТРОКИ",
            "=" * 90,
        ]
    )

    current_file: str | None = None

    for finding in findings:
        if finding.file != current_file:
            current_file = finding.file

            lines.extend(
                [
                    "",
                    f"[{current_file}]",
                    "-" * 90,
                ]
            )

        lines.append(
            f"{finding.line}:{finding.column} "
            f"[{finding.classification}] "
            f"[{finding.source_type}]"
        )
        lines.append(
            f"  key:  {finding.suggested_key}"
        )
        lines.append(
            f"  text: {finding.text}"
        )

        if finding.context:
            lines.append(
                f"  code: {finding.context}"
            )

        lines.append("")

    path.write_text(
        "\n".join(lines),
        encoding="utf-8",
    )


def escape_typescript_string(value: str) -> str:
    return (
        value
        .replace("\\", "\\\\")
        .replace("'", "\\'")
        .replace("\r", "")
        .replace("\n", "\\n")
    )


def write_draft_dictionary(
    path: Path,
    findings: list[Finding],
) -> None:
    lines: list[str] = [
        "// Автоматически создано extract_localization_v3.py",
        "// Это черновик, а не готовый перевод.",
        "// Строки mojibake и chinese нужно перевести вручную.",
        "",
        "const ruDraft = {",
    ]

    for finding in findings:
        flat_key = finding.suggested_key.replace(
            ".",
            "_",
        )

        escaped_value = escape_typescript_string(
            finding.text
        )

        lines.append(
            f"  // {finding.file}:{finding.line} "
            f"[{finding.classification}]"
        )
        lines.append(
            f"  {flat_key}: '{escaped_value}',"
        )
        lines.append("")

    lines.extend(
        [
            "} as const",
            "",
            "export default ruDraft",
            "",
        ]
    )

    path.write_text(
        "\n".join(lines),
        encoding="utf-8",
    )


def main() -> int:
    args = parse_arguments()

    root = Path(args.root).resolve()

    if not root.exists():
        print(
            f"Ошибка: папка не найдена: {root}",
            file=sys.stderr,
        )
        return 1

    if not root.is_dir():
        print(
            f"Ошибка: путь не является папкой: {root}",
            file=sys.stderr,
        )
        return 1

    findings: list[Finding] = []
    encoding_map: dict[str, str] = {}
    scanned_files = 0

    for path in iter_source_files(root):
        scanned_files += 1

        try:
            text, encoding = read_text_safely(path)
        except RuntimeError as exc:
            print(
                f"Предупреждение: {exc}",
                file=sys.stderr,
            )
            continue

        relative_name = str(
            path.relative_to(root.parent)
        )

        encoding_map[relative_name] = encoding

        findings.extend(
            scan_file(
                path=path,
                root=root,
                text=text,
            )
        )

    findings = deduplicate_findings(findings)
    findings = sort_findings(findings)
    findings = assign_unique_keys(findings)

    summary = build_summary(
        findings=findings,
        scanned_files=scanned_files,
        encoding_map=encoding_map,
    )

    json_output = Path(
        args.json_output
    ).resolve()

    text_output = Path(
        args.text_output
    ).resolve()

    draft_output = Path(
        args.draft_output
    ).resolve()

    write_json_report(
        json_output,
        summary,
        findings,
    )

    write_text_report(
        text_output,
        summary,
        findings,
    )

    write_draft_dictionary(
        draft_output,
        findings,
    )

    print()
    print("Сканирование V3 завершено.")
    print(
        f"Просканировано файлов: "
        f"{summary['scanned_files']}"
    )
    print(
        f"Найдено пользовательских строк: "
        f"{summary['total_findings']}"
    )
    print(f"JSON-отчёт: {json_output}")
    print(f"Текстовый отчёт: {text_output}")
    print(f"Черновик словаря: {draft_output}")
    print()

    if summary["by_file"]:
        print(
            "Файлы с наибольшим количеством строк:"
        )

        for file_name, count in list(
            summary["by_file"].items()
        )[:20]:
            print(
                f"  {count:4d}  {file_name}"
            )
    else:
        print(
            "Пользовательские строки не найдены."
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())