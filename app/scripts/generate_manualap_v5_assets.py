#!/usr/bin/env python3
"""Generate public ManualAP v5 assets for the privacy notices module.

The source DOCX is kept as the downloadable original. Individual notice DOCX
files are produced by slicing the source document body at top-level paragraph
ranges, preserving the package styles, numbering, relationships, media, tables,
headers, and footers. PDF previews are rendered with LibreOffice/soffice.
"""

from __future__ import annotations

import argparse
import copy
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W = f"{{{W_NS}}}"

MANUAL_DOCX_NAME = "manualap-grunentha-davara-v5.docx"
MANUAL_PDF_NAME = "manualap-grunentha-davara-v5-preview.pdf"

NOTICE_SLICES = [
    ("aviso-candidatos", 65, 140),
    ("aviso-empleados", 141, 239),
    ("aviso-empleados-proveedores", 240, 308),
    ("aviso-proveedores-persona-fisica", 309, 371),
    ("aviso-visitantes-cctv", 372, 435),
    ("aviso-healthcare-professional", 436, 521),
    ("aviso-healthcare-professional-educacion-medica", 522, 598),
    ("aviso-farmacovigilancia", 599, 663),
    ("aviso-donaciones", 664, 728),
    ("aviso-informacion-medica-quejas", 729, 802),
    ("aviso-plataformas", 803, 898),
]


def convert_to_pdf(input_path: Path, output_path: Path, soffice_path: str) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="manualap-soffice-") as profile_dir, tempfile.TemporaryDirectory(
        prefix="manualap-pdf-"
    ) as convert_dir:
        cmd = [
            soffice_path,
            f"-env:UserInstallation=file://{profile_dir}",
            "--invisible",
            "--headless",
            "--norestore",
            "--convert-to",
            "pdf",
            "--outdir",
            convert_dir,
            str(input_path),
        ]
        result = subprocess.run(cmd, check=False, text=True, capture_output=True)
        if result.returncode != 0:
            sys.stderr.write(result.stdout)
            sys.stderr.write(result.stderr)
            raise RuntimeError(f"LibreOffice failed to convert {input_path}")

        pdfs = sorted(Path(convert_dir).glob("*.pdf"))
        if not pdfs:
            raise RuntimeError(f"LibreOffice did not produce a PDF for {input_path}")
        shutil.move(str(pdfs[0]), output_path)


def read_document_xml(source: Path) -> bytes:
    with zipfile.ZipFile(source, "r") as package:
        return package.read("word/document.xml")


def paragraph_count(document_xml: bytes) -> int:
    root = ET.fromstring(document_xml)
    body = root.find(f".//{W}body")
    if body is None:
        raise RuntimeError("word/document.xml has no w:body")
    return sum(1 for child in list(body) if child.tag == f"{W}p")


def sliced_document_xml(document_xml: bytes, start: int, end: int) -> bytes:
    root = ET.fromstring(document_xml)
    body = root.find(f".//{W}body")
    if body is None:
        raise RuntimeError("word/document.xml has no w:body")

    source_children = list(body)
    section_props = None
    if source_children and source_children[-1].tag == f"{W}sectPr":
        section_props = copy.deepcopy(source_children[-1])
        source_children = source_children[:-1]

    kept = []
    current_paragraph = 0
    for child in source_children:
        if child.tag == f"{W}p":
            current_paragraph += 1
            if start <= current_paragraph <= end:
                kept.append(copy.deepcopy(child))
        elif start <= current_paragraph <= end:
            kept.append(copy.deepcopy(child))

    if not kept:
        raise RuntimeError(f"No body elements kept for paragraph range {start}-{end}")

    for child in list(body):
        body.remove(child)
    for child in kept:
        body.append(child)
    if section_props is not None:
        body.append(section_props)

    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def write_sliced_docx(source: Path, destination: Path, document_xml: bytes) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(source, "r") as src, zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as dst:
        for item in src.infolist():
            data = document_xml if item.filename == "word/document.xml" else src.read(item.filename)
            dst.writestr(item, data)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--soffice", default=shutil.which("soffice") or "/opt/homebrew/bin/soffice")
    args = parser.parse_args()

    source = args.source.expanduser().resolve()
    if not source.exists():
        raise FileNotFoundError(source)
    if not Path(args.soffice).exists() and shutil.which(args.soffice) is None:
        raise FileNotFoundError(f"soffice not found: {args.soffice}")

    out_dir = args.out.resolve()
    individual_dir = out_dir / "individual"
    out_dir.mkdir(parents=True, exist_ok=True)
    individual_dir.mkdir(parents=True, exist_ok=True)

    document_xml = read_document_xml(source)
    total_paragraphs = paragraph_count(document_xml)
    expected_last = NOTICE_SLICES[-1][2]
    if total_paragraphs < expected_last:
        raise RuntimeError(f"Expected at least {expected_last} top-level paragraphs, found {total_paragraphs}")

    manual_docx = out_dir / MANUAL_DOCX_NAME
    shutil.copy2(source, manual_docx)
    convert_to_pdf(manual_docx, out_dir / MANUAL_PDF_NAME, args.soffice)

    for slug, start, end in NOTICE_SLICES:
        notice_docx = individual_dir / f"{slug}.docx"
        write_sliced_docx(source, notice_docx, sliced_document_xml(document_xml, start, end))
        convert_to_pdf(notice_docx, individual_dir / f"{slug}-preview.pdf", args.soffice)

    print(f"Generated ManualAP v5 assets in {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
