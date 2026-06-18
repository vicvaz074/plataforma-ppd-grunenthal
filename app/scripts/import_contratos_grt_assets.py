#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import mimetypes
import re
import shutil
import subprocess
import unicodedata
from pathlib import Path


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    ascii_value = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_value).strip("-").lower()
    return slug or "contrato"


def public_path(path: Path, public_root: Path) -> str:
    return "/" + path.relative_to(public_root).as_posix()


def run_soffice(soffice: str, docx_path: Path, out_dir: Path) -> Path:
    subprocess.run(
        [
            soffice,
            "--headless",
            "--convert-to",
            "pdf",
            "--outdir",
            str(out_dir),
            str(docx_path),
        ],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return out_dir / f"{docx_path.stem}.pdf"


def main() -> None:
    parser = argparse.ArgumentParser(description="Importa contratos GRt como assets publicos normalizados.")
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--public-root", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--manifest-out", required=True, type=Path)
    parser.add_argument("--soffice", default="soffice")
    args = parser.parse_args()

    source_dir = args.source
    public_root = args.public_root
    out_dir = args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    records = []
    seen_slugs: dict[str, int] = {}

    for source_path in sorted(source_dir.iterdir(), key=lambda item: item.name.lower()):
        if not source_path.is_file() or source_path.name.startswith("."):
            continue

        extension = source_path.suffix.lower()
        if extension not in {".pdf", ".docx"}:
            continue

        base_slug = slugify(source_path.stem)
        seen_slugs[base_slug] = seen_slugs.get(base_slug, 0) + 1
        slug = base_slug if seen_slugs[base_slug] == 1 else f"{base_slug}-{seen_slugs[base_slug]}"

        target_path = out_dir / f"{slug}{extension}"
        shutil.copy2(source_path, target_path)

        preview_path = target_path
        if extension == ".docx":
            generated_pdf = run_soffice(args.soffice, target_path, out_dir)
            preview_path = out_dir / f"{slug}-preview.pdf"
            generated_pdf.replace(preview_path)

        records.append(
            {
                "slug": slug,
                "sourceName": source_path.name,
                "fileName": target_path.name,
                "displayName": source_path.stem,
                "extension": extension.removeprefix("."),
                "mimeType": mimetypes.guess_type(target_path.name)[0] or "application/octet-stream",
                "size": target_path.stat().st_size,
                "path": public_path(target_path, public_root),
                "previewPdfPath": public_path(preview_path, public_root),
            }
        )

    args.manifest_out.parent.mkdir(parents=True, exist_ok=True)
    args.manifest_out.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Imported {len(records)} files")
    print(args.manifest_out)


if __name__ == "__main__":
    main()
