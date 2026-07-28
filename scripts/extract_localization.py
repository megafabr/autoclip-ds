from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable


SOURCE_EXTENSIONS = {
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".html",
    ".css",
    ".scss",
    ".less",
    ".json",
}

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

# Китайские иероглифы.
CHINESE_RE = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")

# Частые признаки текста, повреждённого неправильной кодировкой.
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
    "з»",
    "и®",
    "зЅ",
    "зі",
    "џи",
    "®ѕ",
    "Ѕ®",
)

# Строковые литералы в TS/JS/JSX.
STRING_LITERAL_RE = re.compile(
    r"""
    (?P<quote>["'`])
    (?P<value>
        (?:
            \\\.
            |
            (?! (?P=quote) ). 
        )*?
    )
    (?P=quote)
    """,
    re.VERBOSE,
)

# Текст между JSX-тегами.
JSX_TEXT_RE = re.compile(r">(?P<value>[^<>{}\n][^<>{}]*)<")

# Комментарии, чтобы не засорять основной отчёт.
COMMENT_PATTERNS = (
    re.compile(r"//.*?$", re.MULTILINE),
    re.compile(r"/\*.*?\*/", re.DOTALL),
    re.compile(r"\{/\*.*?\*/\}", re.DOTALL),
)


@dataclass(frozen=True)
class Finding:
    file: str
    line: int
    column: int
    kind: str
    text: str
    context: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Ищет китайский текст и признаки повреждённой кодировки "
            "во frontend/src."
        )
    )

    parser.add_argument(
        "--root",
        default="frontend/src",
        help="Папка для сканирования. По умолчанию: frontend/src",
    )

    parser.add_argument(
        "--output",
        default="localization_report.json",
        help="JSON-отчёт. По умолчанию: localization_report.json",
    )

    parser.add_argument(
        "--text-output",
        default="localization_report.txt",
        help="Текстовый отчёт. По умолчанию: localization_report.txt",
    )

    parser.add_argument(
        "--include-comments",
        action="store_true",
        help="Не удалять комментарии перед анализом.",
    )

    parser.add_argument(
        "--all-lines",
        action="store_true",
        help=(
            "Дополнительно проверять всю строку целиком, "
            "а не только строковые литералы и JSX-текст."
        ),
    )

    return parser.parse_args()


def iter_source_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*"):
        if not path.is_file():
            continue

        if any(part in SKIP_DIRECTORIES for part in path.parts):
            continue

        if path.suffix.lower() not in SOURCE_EXTENSIONS:
            continue

        yield path


def read_text_safely(path: Path) -> tuple[str, str]:
    encodings = (
        "utf-8",
        "utf-8-sig",
        "utf-16",
        "cp1251",
        "gb18030",
        "latin-1",
    )

    for encoding in encodings:
        try:
            return path.read_text(encoding=encoding), encoding
        except UnicodeDecodeError:
            continue
        except OSError as exc:
            raise RuntimeError(f"Не удалось прочитать {path}: {exc}") from exc

    raise RuntimeError(f"Не удалось определить кодировку файла: {path}")


def strip_comments(text: str) -> str:
    result = text

    for pattern in COMMENT_PATTERNS:
        result = pattern.sub(lambda match: preserve_newlines(match.group(0)), result)

    return result


def preserve_newlines(value: str) -> str:
    return "".join("\n" if char == "\n" else " " for char in value)


def normalize_text(value: str) -> str:
    value = value.replace("\\n", " ")
    value = value.replace("\\t", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def contains_chinese(value: str) -> bool:
    return bool(CHINESE_RE.search(value))


def mojibake_score(value: str) -> int:
    score = 0

    for marker in MOJIBAKE_MARKERS:
        score += value.count(marker)

    # Дополнительные признаки повреждённой кириллицы/китайского UTF-8.
    suspicious_pairs = re.findall(r"[РСзёи][^\s]{0,3}", value)
    score += len(suspicious_pairs)

    replacement_count = value.count(" ")
    score += replacement_count * 3

    return score


def classify_text(value: str) -> str | None:
    has_chinese = contains_chinese(value)
    score = mojibake_score(value)

    if has_chinese and score > 0:
        return "chinese+mojibake"

    if has_chinese:
        return "chinese"

    if score >= 2:
        return "mojibake"

    return None


def offset_to_line_column(text: str, offset: int) -> tuple[int, int]:
    line = text.count("\n", 0, offset) + 1
    last_newline = text.rfind("\n", 0, offset)
    column = offset + 1 if last_newline == -1 else offset - last_newline
    return line, column


def get_context_line(text: str, line_number: int) -> str:
    lines = text.splitlines()

    if line_number < 1 or line_number > len(lines):
        return ""

    return lines[line_number - 1].strip()


def collect_from_matches(
    *,
    original_text: str,
    searchable_text: str,
    path: Path,
    root: Path,
    pattern: re.Pattern[str],
    findings: list[Finding],
) -> None:
    for match in pattern.finditer(searchable_text):
        raw_value = match.group("value")
        value = normalize_text(raw_value)

        if not value:
            continue

        kind = classify_text(value)
        if kind is None:
            continue

        value_offset = match.start("value")
        line, column = offset_to_line_column(searchable_text, value_offset)
        context = get_context_line(original_text, line)

        findings.append(
            Finding(
                file=str(path.relative_to(root.parent)),
                line=line,
                column=column,
                kind=kind,
                text=value,
                context=context,
            )
        )


def collect_from_lines(
    *,
    original_text: str,
    path: Path,
    root: Path,
    findings: list[Finding],
) -> None:
    for line_number, raw_line in enumerate(original_text.splitlines(), start=1):
        value = normalize_text(raw_line)

        if not value:
            continue

        kind = classify_text(value)
        if kind is None:
            continue

        findings.append(
            Finding(
                file=str(path.relative_to(root.parent)),
                line=line_number,
                column=1,
                kind=f"line:{kind}",
                text=value,
                context=raw_line.strip(),
            )
        )


def deduplicate(findings: list[Finding]) -> list[Finding]:
    seen: set[tuple[str, int, str, str]] = set()
    result: list[Finding] = []

    for finding in findings:
        key = (
            finding.file,
            finding.line,
            finding.kind,
            finding.text,
        )

        if key in seen:
            continue

        seen.add(key)
        result.append(finding)

    return result


def sort_findings(findings: list[Finding]) -> list[Finding]:
    return sorted(
        findings,
        key=lambda item: (
            item.file.lower(),
            item.line,
            item.column,
            item.kind,
        ),
    )


def build_summary(
    *,
    findings: list[Finding],
    scanned_files: int,
    encoding_map: dict[str, str],
) -> dict:
    by_kind: dict[str, int] = {}
    by_file: dict[str, int] = {}

    for finding in findings:
        by_kind[finding.kind] = by_kind.get(finding.kind, 0) + 1
        by_file[finding.file] = by_file.get(finding.file, 0) + 1

    return {
        "scanned_files": scanned_files,
        "total_findings": len(findings),
        "by_kind": dict(sorted(by_kind.items())),
        "by_file": dict(
            sorted(
                by_file.items(),
                key=lambda item: (-item[1], item[0].lower()),
            )
        ),
        "encodings": encoding_map,
    }


def write_json_report(
    output_path: Path,
    summary: dict,
    findings: list[Finding],
) -> None:
    payload = {
        "summary": summary,
        "findings": [asdict(item) for item in findings],
    }

    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def write_text_report(
    output_path: Path,
    summary: dict,
    findings: list[Finding],
) -> None:
    lines: list[str] = []

    lines.append("DS OS — отчёт локализации")
    lines.append("=" * 80)
    lines.append(f"Просканировано файлов: {summary['scanned_files']}")
    lines.append(f"Найдено фрагментов: {summary['total_findings']}")
    lines.append("")

    lines.append("По типам:")
    for kind, count in summary["by_kind"].items():
        lines.append(f"  {kind}: {count}")

    lines.append("")
    lines.append("По файлам:")
    for file_name, count in summary["by_file"].items():
        lines.append(f"  {count:4d}  {file_name}")

    lines.append("")
    lines.append("=" * 80)
    lines.append("НАЙДЕННЫЕ ФРАГМЕНТЫ")
    lines.append("=" * 80)

    current_file: str | None = None

    for finding in findings:
        if finding.file != current_file:
            current_file = finding.file
            lines.append("")
            lines.append(f"[{current_file}]")
            lines.append("-" * 80)

        lines.append(
            f"{finding.line}:{finding.column} "
            f"[{finding.kind}] {finding.text}"
        )

        if finding.context and finding.context != finding.text:
            lines.append(f"    {finding.context}")

    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()

    root = Path(args.root).resolve()

    if not root.exists():
        print(f"Ошибка: папка не найдена: {root}", file=sys.stderr)
        return 1

    if not root.is_dir():
        print(f"Ошибка: путь не является папкой: {root}", file=sys.stderr)
        return 1

    findings: list[Finding] = []
    encoding_map: dict[str, str] = {}
    scanned_files = 0

    for path in iter_source_files(root):
        scanned_files += 1

        try:
            original_text, encoding = read_text_safely(path)
        except RuntimeError as exc:
            print(f"Предупреждение: {exc}", file=sys.stderr)
            continue

        relative_name = str(path.relative_to(root.parent))
        encoding_map[relative_name] = encoding

        searchable_text = (
            original_text
            if args.include_comments
            else strip_comments(original_text)
        )

        collect_from_matches(
            original_text=original_text,
            searchable_text=searchable_text,
            path=path,
            root=root,
            pattern=STRING_LITERAL_RE,
            findings=findings,
        )

        collect_from_matches(
            original_text=original_text,
            searchable_text=searchable_text,
            path=path,
            root=root,
            pattern=JSX_TEXT_RE,
            findings=findings,
        )

        if args.all_lines:
            collect_from_lines(
                original_text=original_text,
                path=path,
                root=root,
                findings=findings,
            )

    findings = deduplicate(findings)
    findings = sort_findings(findings)

    summary = build_summary(
        findings=findings,
        scanned_files=scanned_files,
        encoding_map=encoding_map,
    )

    json_output = Path(args.output).resolve()
    text_output = Path(args.text_output).resolve()

    write_json_report(json_output, summary, findings)
    write_text_report(text_output, summary, findings)

    print()
    print("Сканирование завершено.")
    print(f"Просканировано файлов: {summary['scanned_files']}")
    print(f"Найдено фрагментов: {summary['total_findings']}")
    print(f"JSON-отчёт: {json_output}")
    print(f"Текстовый отчёт: {text_output}")
    print()

    if summary["by_file"]:
        print("Файлы с наибольшим количеством строк:")

        for file_name, count in list(summary["by_file"].items())[:15]:
            print(f"  {count:4d}  {file_name}")
    else:
        print("Китайский текст и признаки повреждённой кодировки не найдены.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())