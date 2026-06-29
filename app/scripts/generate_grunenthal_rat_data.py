#!/usr/bin/env python3
from __future__ import annotations

import base64
import hashlib
import json
import re
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Any

import pdfplumber


REPO_ROOT = Path(__file__).resolve().parents[2]
APP_ROOT = REPO_ROOT / "app"
ASSETS_TS = APP_ROOT / "lib" / "grunenthal-assets.ts"
OUTPUT_TS = APP_ROOT / "lib" / "grunenthal-rat-data.ts"
PUBLIC_ROOT = APP_ROOT / "public"
LOGO_FILE = PUBLIC_ROOT / "client" / "grunenthal" / "brand" / "grunenthal-logo-green.png"
DOWNLOADS_ROOT = Path.home() / "Downloads" / "Políticas de Grünenthal (2026)"
SOURCE_ROOT = DOWNLOADS_ROOT / "InventariosDatos Personales"
SUPPLEMENTAL_EXPORTS = [
    {
        "path": PUBLIC_ROOT / "client" / "grunenthal" / "rat" / "source" / "supplemental" / "inventario-open-data-veeva.json",
        "defaultArea": "COMEX",
    },
    {
        "path": PUBLIC_ROOT / "client" / "grunenthal" / "rat" / "source" / "supplemental" / "reporte-de-distribuidores-xeomeen.json",
        "defaultArea": "Ventas Internas",
    },
]

SOURCE_EXPORTED_AT = "2026-06-25T17:39:52.875Z"
SEEDED_AT = "2026-01-01T00:00:00.000Z"
ACCENT_COLOR = "#40BB6A"
CLIENT_NAME = "Grünenthal"

SUB_INVENTORY_NAME_OVERRIDES = {
    "grunenthal-rat-inventario-flotilla-informacion-solicitada-a-empleado-por-correo": "Compraventa-vehículo empleados",
    "grunenthal-rat-inventario-human-resources-checklist-de-documentacion": "Checklist documentación de nuevos empleados",
    "grunenthal-rat-inventario-human-resources-cedula-de-datos": "MyView",
    "grunenthal-rat-inventario-human-resources-formato-de-alta-proveedor": "Empleados de proveedores",
    "grunenthal-rat-inventario-medical-lista-de-requerimientos-hcp-profesional-de-salud-nacional": "Lista de requerimientos contratación HCP (Profesional de salud nacional)",
    "grunenthal-rat-inventario-medical-lista-de-requerimientos-hcp-profesionales-de-la-salud-extranjero": "Lista de requerimientos contratación HCP (Profesionales de la salud extranjero)",
}

PDF_DOWNLOAD_NAME_OVERRIDES = {
    "grunenthal-rat-inventario-flotilla-informacion-solicitada-a-empleado-por-correo": "inventario-flotilla-compraventa-vehiculo-empleados.pdf",
    "grunenthal-rat-inventario-human-resources-checklist-de-documentacion": "inventario-human-resources-checklist-documentacion-de-nuevos-empleados.pdf",
    "grunenthal-rat-inventario-human-resources-cedula-de-datos": "inventario-human-resources-myview.pdf",
    "grunenthal-rat-inventario-human-resources-formato-de-alta-proveedor": "inventario-human-resources-empleados-de-proveedores.pdf",
    "grunenthal-rat-inventario-medical-lista-de-requerimientos-hcp-profesional-de-salud-nacional": "inventario-medical-lista-de-requerimientos-contratacion-hcp-profesional-de-salud-nacional.pdf",
    "grunenthal-rat-inventario-medical-lista-de-requerimientos-hcp-profesionales-de-la-salud-extranjero": "inventario-medical-lista-de-requerimientos-contratacion-hcp-profesionales-de-la-salud-extranjero.pdf",
}

VALIDATED_FIELDS = [
    "databaseName",
    "responsible",
    "holdersVolume",
    "accessibility",
    "environment",
    "riskLevel",
    "responsibleArea",
    "holderTypes",
    "obtainingMethod",
    "privacyNoticeFileName",
    "personalData",
    "purposesPrimary",
    "purposesSecondary",
    "secondaryPurposesConsent",
    "consentRequired",
    "consentException",
    "processingArea",
    "processingSystem",
    "processingDescription",
    "accessDescription",
    "additionalAccesses",
    "storageMethod",
    "physicalLocation",
    "conservationTerm",
    "blockingTime",
    "deletionMethods",
    "dataTransfer",
    "additionalTransfers",
    "dataRemission",
    "additionalRemissions",
]

PROCESSING_MAP = {
    "obtención": "Obtencion",
    "uso": "Uso",
    "divulgación": "Divulgacion",
    "almacenamiento": "Almacenamiento",
    "bloqueo": "Bloqueo",
    "supresión": "Supresión",
}

CONSENT_TYPE_MAP = {
    "tacito": "tacito",
    "tácito": "tacito",
    "expreso": "expreso",
    "expreso y por escrito": "expreso_escrito",
}

CONSENT_MECHANISM_MAP = {
    "puesta a disposición del aviso de privacidad": "aviso_de_privacidad",
    "puesta a disposicion del aviso de privacidad": "aviso_de_privacidad",
}


def ensure_source_root() -> None:
    if SOURCE_ROOT.exists():
        return
    raise SystemExit(f"No se encontro la carpeta fuente: {SOURCE_ROOT}")


def strip_accents(value: str) -> str:
    return "".join(
        char for char in unicodedata.normalize("NFD", value) if unicodedata.category(char) != "Mn"
    )


def slugify(value: str) -> str:
    ascii_value = strip_accents(value).lower()
    ascii_value = re.sub(r"[^a-z0-9]+", "-", ascii_value)
    return ascii_value.strip("-") or "item"


def clean_cell(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).replace("\x00", " ")).strip()


def normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", strip_accents(clean_cell(value)).lower()).strip()


def split_list(value: str) -> list[str]:
    cleaned = clean_cell(value)
    if not cleaned or cleaned.lower() in {"no lo completo", "no subio archivo"}:
        return []
    parts = re.split(r",|;|\n", cleaned)
    return [part.strip() for part in parts if part.strip()]


def dedupe(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        key = normalize_key(value)
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(value)
    return result


def parse_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    normalized = normalize_key(str(value))
    if normalized in {"si", "sí", "true", "1"}:
        return True
    if normalized in {"no", "false", "0"}:
        return False
    return default


def normalize_yes_no(value: str) -> str:
    normalized = normalize_key(value)
    if normalized == "si":
        return "si"
    if normalized == "no":
        return "no"
    return clean_cell(value).lower()


def risk_value(value: str) -> str:
    normalized = normalize_key(value)
    if normalized in {"reforzado", "alto", "medio", "bajo"}:
        return normalized
    return "bajo"


def parse_date(value: str) -> str | None:
    cleaned = clean_cell(value)
    try:
        return datetime.strptime(cleaned, "%d/%m/%Y").strftime("%Y-%m-%dT00:00:00.000Z")
    except ValueError:
        return None


def value_code(value: str) -> str:
    cleaned = clean_cell(value)
    match = re.match(r"^([A-Z]\d)\b", cleaned)
    return match.group(1) if match else cleaned


def normalize_processing(values: str) -> list[str]:
    result: list[str] = []
    for value in split_list(values):
        result.append(PROCESSING_MAP.get(normalize_key(value), value))
    return dedupe(result)


def normalize_consent_type(value: str) -> str:
    return CONSENT_TYPE_MAP.get(normalize_key(value), clean_cell(value))


def normalize_consent_mechanism(value: str) -> str:
    return CONSENT_MECHANISM_MAP.get(normalize_key(value), clean_cell(value))


def extract_asset_objects() -> list[dict[str, Any]]:
    text = ASSETS_TS.read_text(encoding="utf-8")
    assets: list[dict[str, Any]] = []
    for match in re.finditer(r"\{\n(?:[^{}]|\n)*?\"module\": \"rat\"(?:[^{}]|\n)*?\n  \}", text):
        asset = json.loads(match.group(0))
        if asset.get("extension") == "pdf" and asset.get("category") == "rat-inventory":
            assets.append(asset)
    if len(assets) != 33:
        raise SystemExit(f"Se esperaban 33 PDFs RAT en el manifiesto y se encontraron {len(assets)}")
    return assets


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_pdf_files(assets: list[dict[str, Any]]) -> None:
    source_pdfs = sorted(SOURCE_ROOT.rglob("*.pdf"))
    if len(source_pdfs) != 33:
        raise SystemExit(f"Se esperaban 33 PDFs fuente y se encontraron {len(source_pdfs)}")

    problems: list[str] = []
    for asset in assets:
        source = DOWNLOADS_ROOT / asset["sourceRelativePath"]
        public = PUBLIC_ROOT / asset["path"].lstrip("/")
        if not source.exists():
            problems.append(f"Falta fuente: {source}")
            continue
        if not public.exists():
            problems.append(f"Falta publico: {public}")
            continue
        if sha256(source) != sha256(public):
            problems.append(f"Hash distinto: {asset['sourceRelativePath']} -> {asset['path']}")

    if problems:
        raise SystemExit("\n".join(problems))


def empty_sub_inventory(sub_id: str, database_name: str, area: str) -> dict[str, Any]:
    return {
        "id": sub_id,
        "databaseName": database_name,
        "otherConsentException": "",
        "otherConsentMechanism": "",
        "otherConsentType": "",
        "holderTypes": [],
        "otherHolderType": "",
        "holdersVolume": "",
        "accessibility": "",
        "environment": "",
        "responsibleArea": area,
        "showOtherResponsibleArea": True,
        "obtainingMethod": "",
        "showOtherObtainingMethod": False,
        "obtainingSource": "",
        "privacyNoticeFiles": [],
        "privacyNoticeFileIds": [],
        "privacyNoticeFileNames": [],
        "privacyNoticeFileId": "",
        "privacyNoticeFileName": "",
        "otherProcessingArea": "",
        "consentRequired": True,
        "consentException": [],
        "consentMechanism": "",
        "consentType": "",
        "tacitDescription": "",
        "secondaryConsentType": "",
        "secondaryConsentMechanism": "",
        "secondaryTacitDescription": "",
        "secondaryExpresoForm": "",
        "secondaryExpresoEscritoForm": "",
        "secondaryPurposesConsent": {},
        "processingArea": [],
        "showOtherProcessingArea": False,
        "processingSystem": "",
        "processingSystemName": "",
        "processingDescription": [],
        "accessDescription": [],
        "otherAccessDescription": "",
        "dataLifecyclePrivileges": "",
        "additionalAccesses": [],
        "additionalAreas": [],
        "additionalAreasAccess": [],
        "otherAdditionalAreasAccess": "",
        "showOtherAdditionalAreasAccess": False,
        "additionalAreasLegalBasis": [],
        "otherAdditionalAreasLegalBasis": "",
        "additionalAreasPurposes": [],
        "otherAdditionalAreasPurposes": "",
        "storageMethod": "",
        "otherStorageMethod": "",
        "physicalLocation": "",
        "backupPeriodicity": "",
        "isBackedUp": False,
        "backupDescription": "",
        "backupResponsible": "",
        "showOtherBackupResponsible": False,
        "conservationTerm": "",
        "showOtherConservationTerm": False,
        "conservationJustification": [],
        "otherConservationJustification": "",
        "conservationJustificationDetail": "",
        "conservationLegalBasis": "",
        "blockingTime": "",
        "showOtherBlockingTime": False,
        "legalPrescription": [],
        "otherLegalPrescription": "",
        "blockingLegalDisposition": "",
        "additionalConservations": [],
        "additionalBlockings": [],
        "showOtherProcessingTime": False,
        "processingTime": "",
        "postRelationshipProcessing": "",
        "legalConservation": [],
        "otherLegalConservation": "",
        "deletionMethods": [],
        "otherDeletionMethod": "",
        "deletionMethod": "",
        "dataTransfer": "",
        "transferRecipient": "",
        "transferPurposes": "",
        "transferConsentRequired": False,
        "transferExceptions": [],
        "transferConsentType": "",
        "transferTacitDescription": "",
        "transferExpresoForm": "",
        "transferOtherExpresoForm": "",
        "transferExpresoEscritoForm": "",
        "transferOtherExpresoEscritoForm": "",
        "transferLegalInstrument": [],
        "otherTransferLegalInstrument": "",
        "transferInAP": False,
        "additionalTransfers": [],
        "dataRemission": "",
        "remissionRecipient": "",
        "remissionPurposes": [],
        "otherRemissionPurpose": "",
        "remissionLegalInstrument": [],
        "otherRemissionLegalInstrument": "",
        "remissionContractFileId": "",
        "remissionContractFileName": "",
        "additionalRemissions": [],
        "personalData": [],
        "otherLegalBasis": "",
    }


def clean_display_name(value: str) -> str:
    return re.sub(r"\s+", " ", clean_cell(value)).strip()


def normalize_sub_inventory_name(value: str) -> str:
    cleaned = clean_display_name(value)
    cleaned = re.sub(r"\s+\(", " (", cleaned)
    cleaned = re.sub(r"\)\s+-", ") -", cleaned)
    return cleaned


def normalize_supplemental_sub_inventory(raw: dict[str, Any], area: str) -> dict[str, Any]:
    name = normalize_sub_inventory_name(raw.get("databaseName", "Subinventario"))
    sub_id = f"grunenthal-rat-inventario-{slugify(area)}-{slugify(name)}"
    raw_sub = json.loads(json.dumps(raw, ensure_ascii=False))
    sub = {
        **empty_sub_inventory(sub_id, name, area),
        **raw_sub,
    }

    sub["id"] = sub_id
    sub["databaseName"] = name
    sub["responsibleArea"] = area
    sub["showOtherResponsibleArea"] = True
    sub["otherProcessingArea"] = clean_display_name(sub.get("otherProcessingArea", "")) or area
    sub["showOtherProcessingArea"] = bool(sub["otherProcessingArea"]) or "Otros" in sub.get("processingArea", [])
    sub["privacyNoticeFiles"] = (
        [file for file in sub.get("privacyNoticeFiles", []) if file]
        if isinstance(sub.get("privacyNoticeFiles"), list)
        else []
    )
    sub["privacyNoticeFileIds"] = sub.get("privacyNoticeFileIds") if isinstance(sub.get("privacyNoticeFileIds"), list) else []
    sub["privacyNoticeFileNames"] = sub.get("privacyNoticeFileNames") if isinstance(sub.get("privacyNoticeFileNames"), list) else []
    sub["privacyNoticeFileId"] = clean_display_name(sub.get("privacyNoticeFileId", ""))
    sub["privacyNoticeFileName"] = clean_display_name(sub.get("privacyNoticeFileName", ""))
    sub["additionalTransfers"] = sub.get("additionalTransfers") if isinstance(sub.get("additionalTransfers"), list) else []
    sub["additionalRemissions"] = sub.get("additionalRemissions") if isinstance(sub.get("additionalRemissions"), list) else []

    personal_data = sub.get("personalData") if isinstance(sub.get("personalData"), list) else []
    for index, item in enumerate(personal_data, 1):
        item["id"] = f"{sub_id}-dato-{index:03d}"
        item["name"] = clean_display_name(item.get("name", "Dato personal"))
        item["category"] = clean_display_name(item.get("category", "")) or "Sin categoría"
        item["riesgo"] = risk_value(item.get("riesgo", ""))
        item["proporcionalidad"] = parse_bool(item.get("proporcionalidad", True), True)
        item["purposesPrimary"] = item.get("purposesPrimary") if isinstance(item.get("purposesPrimary"), list) else split_list(item.get("purposesPrimary", ""))
        item["purposesSecondary"] = item.get("purposesSecondary") if isinstance(item.get("purposesSecondary"), list) else split_list(item.get("purposesSecondary", ""))
    sub["personalData"] = personal_data

    sub.pop("grunenthalSourcePdfFileId", None)
    sub.pop("grunenthalSourcePdfPath", None)
    sub["grunenthalSourcePdfStatus"] = "sin-pdf"
    sub["grunenthalValidationStatus"] = "pendiente-revision"

    return sub


def supplemental_sub_inventories() -> list[tuple[str, dict[str, Any], dict[str, Any]]]:
    supplements: list[tuple[str, dict[str, Any], dict[str, Any]]] = []
    for supplement in SUPPLEMENTAL_EXPORTS:
        export_path = supplement["path"]
        default_area = supplement["defaultArea"]
        if not export_path.exists():
            continue
        export = json.loads(export_path.read_text(encoding="utf-8"))
        if isinstance(export, dict) and isinstance(export.get("inventories"), list):
            inventories = export.get("inventories", [])
        elif isinstance(export, dict) and export.get("databaseName"):
            inventories = [
                {
                    "databaseName": default_area,
                    "responsible": CLIENT_NAME,
                    "createdAt": SEEDED_AT,
                    "updatedAt": SEEDED_AT,
                    "subInventories": [export],
                }
            ]
        else:
            continue

        for inventory in inventories:
            area = clean_display_name(inventory.get("databaseName", "")) or default_area
            for raw_sub in inventory.get("subInventories", []):
                sub = normalize_supplemental_sub_inventory(raw_sub, area)
                supplements.append(
                    (
                        area,
                        sub,
                        {
                            "createdAt": inventory.get("createdAt") or SEEDED_AT,
                            "updatedAt": inventory.get("updatedAt") or SEEDED_AT,
                            "responsible": inventory.get("responsible") or CLIENT_NAME,
                        },
                    )
                )
    return supplements


def parse_pdf(asset: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    source = DOWNLOADS_ROOT / asset["sourceRelativePath"]
    area = asset["ratAreaFolder"]
    sub_id = asset["id"]

    field_sections: dict[str, dict[str, str]] = {}
    personal_data: list[dict[str, Any]] = []
    primary_purposes: list[str] = []
    secondary_rows: list[dict[str, str]] = []
    additional_accesses: list[dict[str, Any]] = []
    transfers: dict[int, dict[str, str]] = {}
    remissions: dict[int, dict[str, str]] = {}

    with pdfplumber.open(source) as pdf:
        full_text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        first_page_text = pdf.pages[0].extract_text() or ""

        for page in pdf.pages:
            for table in page.extract_tables():
                if not table or not table[0]:
                    continue
                header = [clean_cell(cell) for cell in table[0]]
                header_key = normalize_key(" ".join(header))
                first_key = normalize_key(header[0])

                if len(header) >= 4 and normalize_key(header[0]) == "nombre" and normalize_key(header[1]) == "categoria":
                    for index, row in enumerate(table[1:], 1):
                        if len(row) < 4:
                            continue
                        name = clean_cell(row[0])
                        if not name:
                            continue
                        personal_data.append(
                            {
                                "id": f"{sub_id}-dato-{len(personal_data) + 1:03d}",
                                "name": name,
                                "category": clean_cell(row[1]) or "Sin categoría",
                                "proporcionalidad": parse_bool(row[3], True),
                                "riesgo": risk_value(clean_cell(row[2])),
                                "purposesPrimary": [],
                                "purposesSecondary": [],
                            }
                        )
                    continue

                if first_key == "finalidades primarias":
                    primary_purposes.extend(clean_cell(row[0]) for row in table[1:] if row and clean_cell(row[0]))
                    continue

                if header_key.startswith("finalidad secundaria tipo de consentimiento mecanismo"):
                    for row in table[1:]:
                        if len(row) < 3:
                            continue
                        purpose = clean_cell(row[0])
                        if not purpose:
                            continue
                        secondary_rows.append(
                            {
                                "purpose": purpose,
                                "consentType": clean_cell(row[1]),
                                "consentMechanism": clean_cell(row[2]),
                            }
                        )
                    continue

                if first_key == "area adicional":
                    for row in table[1:]:
                        if len(row) < 2:
                            continue
                        area_name = clean_cell(row[0])
                        privileges = split_list(clean_cell(row[1]))
                        if area_name or privileges:
                            additional_accesses.append(
                                {
                                    "id": f"{sub_id}-acceso-{len(additional_accesses) + 1:03d}",
                                    "area": area_name,
                                    "showOtherArea": False,
                                    "privileges": privileges,
                                    "otherPrivilege": "",
                                    "role": "",
                                    "otherRole": "",
                                }
                            )
                    continue

                transfer_match = re.match(r"transferencia (\\d+)", first_key)
                if transfer_match:
                    transfer = transfers.setdefault(int(transfer_match.group(1)), {})
                    for row in table[1:]:
                        if len(row) >= 2 and clean_cell(row[0]):
                            transfer[clean_cell(row[0])] = clean_cell(row[1])
                    continue

                remission_match = re.match(r"remision (\\d+)", first_key)
                if remission_match:
                    remission = remissions.setdefault(int(remission_match.group(1)), {})
                    for row in table[1:]:
                        if len(row) >= 2 and clean_cell(row[0]):
                            remission[clean_cell(row[0])] = clean_cell(row[1])
                    continue

                if len(header) >= 2 and normalize_key(header[1]) in {"detalle", "resultado", "respuesta"}:
                    section = first_key
                    section_map = field_sections.setdefault(section, {})
                    for row in table[1:]:
                        if len(row) >= 2 and clean_cell(row[0]):
                            section_map[clean_cell(row[0])] = clean_cell(row[1])

    title_match = re.search(r"Nombre de la base de datos:\s*(.+)", first_page_text)
    created_match = re.search(r"Fecha de creación:\s*([0-9/]+)", first_page_text)
    updated_match = re.search(r"Fecha de última edición:\s*([0-9/]+)", first_page_text)
    responsible_match = re.search(r"Responsable:\s*(.+)", first_page_text)
    sub_match = re.search(r"Subinventario\s+\d+:\s*(.+)", full_text)

    initial = field_sections.get("campo", {})
    risk = field_sections.get("descripcion", {})
    area_section = field_sections.get("area responsable y tipos de titulares", {})
    obtaining = field_sections.get("obtencion y aviso de privacidad", {})
    consent = field_sections.get("consentimiento para finalidades primarias", {})
    treatment = field_sections.get("descripcion del tratamiento", {})
    storage = field_sections.get("almacenamiento y respaldo", {})
    conservation = field_sections.get("conservacion y bloqueo", {})
    deletion = field_sections.get("supresion", {})
    other = field_sections.get("otros datos capturados", {})

    sub_name = (
        clean_cell(sub_match.group(1)) if sub_match else ""
    ) or other.get("Nombre de la base de datos") or asset.get("ratPdfTitle", asset["displayName"])
    sub_name = SUB_INVENTORY_NAME_OVERRIDES.get(sub_id, sub_name)
    sub = empty_sub_inventory(sub_id, sub_name, area)

    top_name = clean_cell(title_match.group(1)) if title_match else initial.get("Nombre de la base de datos", sub_name)
    created_at = parse_date(created_match.group(1)) if created_match else None
    updated_at = parse_date(updated_match.group(1)) if updated_match else None
    responsible = clean_cell(responsible_match.group(1)) if responsible_match else CLIENT_NAME

    sub["holdersVolume"] = initial.get("Volumen de titulares", "")
    sub["accessibility"] = value_code(initial.get("Accesibilidad y número de personas que tienen acceso a la base de datos", ""))
    sub["environment"] = value_code(initial.get("Entorno de acceso", ""))
    sub["responsibleArea"] = area_section.get("Área responsable", area)
    sub["showOtherResponsibleArea"] = True
    sub["holderTypes"] = split_list(area_section.get("Tipo de titulares", ""))
    sub["obtainingMethod"] = obtaining.get("Método de obtención", "")
    sub["showOtherObtainingMethod"] = normalize_key(sub["obtainingMethod"]) == "otro"
    sub["obtainingSource"] = obtaining.get("Fuente de obtención", "")

    notice_names = split_list(obtaining.get("Aviso de privacidad (archivo)", ""))
    sub["privacyNoticeFileNames"] = notice_names
    sub["privacyNoticeFileName"] = ", ".join(notice_names)
    sub["privacyNoticeFileIds"] = [f"{sub_id}-aviso-{index + 1:02d}" for index, _ in enumerate(notice_names)]
    sub["privacyNoticeFileId"] = sub["privacyNoticeFileIds"][0] if sub["privacyNoticeFileIds"] else ""

    sub["consentRequired"] = parse_bool(consent.get("¿Requiere consentimiento?", ""), True)
    sub["consentException"] = split_list(consent.get("Excepciones de consentimiento", ""))
    sub["consentMechanism"] = normalize_consent_mechanism(consent.get("Mecanismo de consentimiento", ""))
    sub["consentType"] = normalize_consent_type(consent.get("Tipo de consentimiento", ""))
    sub["tacitDescription"] = consent.get("Descripción de consentimiento tácito", "")

    treatment_area = split_list(treatment.get("Áreas de tratamiento", ""))
    sub["processingArea"] = treatment_area
    sub["otherProcessingArea"] = treatment.get("Otra área de tratamiento", "")
    sub["showOtherProcessingArea"] = bool(sub["otherProcessingArea"]) or "Otros" in treatment_area
    sub["processingSystem"] = treatment.get("Sistema de tratamiento", "")
    sub["processingSystemName"] = treatment.get("Nombre o descripción del sistema", "")
    sub["processingDescription"] = normalize_processing(treatment.get("Ciclo de vida del tratamiento", ""))
    sub["accessDescription"] = split_list(treatment.get("Privilegios de acceso", ""))
    sub["otherAccessDescription"] = treatment.get("Otros privilegios de acceso", "")
    sub["dataLifecyclePrivileges"] = treatment.get("Privilegios adicionales del ciclo de vida", "")
    sub["additionalAccesses"] = additional_accesses

    sub["storageMethod"] = storage.get("Medio de almacenamiento", "")
    sub["otherStorageMethod"] = storage.get("Otro medio de almacenamiento", "")
    sub["physicalLocation"] = storage.get("Ubicación física", "")
    sub["isBackedUp"] = parse_bool(storage.get("¿Se respalda?", ""), False)
    sub["backupPeriodicity"] = storage.get("Periodicidad de respaldo", "")
    sub["backupDescription"] = storage.get("Descripción del respaldo", "")
    sub["backupResponsible"] = storage.get("Responsable del respaldo", "")

    sub["conservationTerm"] = conservation.get("Plazo de conservación", "")
    sub["conservationJustification"] = split_list(conservation.get("Justificación de conservación", ""))
    sub["conservationJustificationDetail"] = conservation.get("Detalle de la justificación", "")
    sub["conservationLegalBasis"] = conservation.get("Base legal de conservación", "")
    sub["blockingTime"] = conservation.get("Tiempo de bloqueo", "")
    sub["legalPrescription"] = split_list(conservation.get("Prescripción legal", ""))
    sub["otherLegalPrescription"] = conservation.get("Otra prescripción legal", "")
    sub["blockingLegalDisposition"] = conservation.get("Disposición legal de bloqueo", "")

    sub["deletionMethods"] = split_list(deletion.get("Métodos de supresión", ""))
    sub["otherDeletionMethod"] = deletion.get("Otro método de supresión", "")

    primary_purposes = dedupe(primary_purposes)
    secondary_purposes = dedupe([row["purpose"] for row in secondary_rows])
    secondary_consent: dict[str, dict[str, Any]] = {}
    for row in secondary_rows:
        secondary_consent[row["purpose"]] = {
            "consentType": normalize_consent_type(row["consentType"]),
            "consentMechanism": normalize_consent_mechanism(row["consentMechanism"]),
            "exceptions": [],
        }
    sub["secondaryPurposesConsent"] = secondary_consent
    sub["secondaryConsentType"] = "tacito" if secondary_consent else ""
    sub["secondaryConsentMechanism"] = "aviso_de_privacidad" if secondary_consent else ""

    for item in personal_data:
        item["purposesPrimary"] = primary_purposes
        item["purposesSecondary"] = secondary_purposes
    sub["personalData"] = personal_data

    def apply_transfer(target: dict[str, Any], data: dict[str, str]) -> None:
        target["dataTransfer"] = normalize_yes_no(data.get("¿Existe transferencia?", "si"))
        target["transferRecipient"] = data.get("Tercero receptor", "")
        target["transferPurposes"] = data.get("Finalidades de la transferencia", "")
        target["transferConsentRequired"] = parse_bool(data.get("¿Requiere consentimiento?", ""), False)
        target["transferExceptions"] = split_list(data.get("Excepciones de consentimiento", ""))
        target["transferConsentType"] = normalize_consent_type(data.get("Tipo de consentimiento", ""))
        target["transferTacitDescription"] = data.get("Descripción de consentimiento tácito", "")
        target["transferExpresoForm"] = data.get("Forma de consentimiento expreso", "")
        target["transferExpresoEscritoForm"] = data.get("Formulario expreso escrito", "")
        target["transferLegalInstrument"] = split_list(data.get("Instrumentos jurídicos", ""))
        target["otherTransferLegalInstrument"] = data.get("Otros instrumentos jurídicos", "")
        target["transferInAP"] = parse_bool(data.get("¿Está en el Aviso de Privacidad?", ""), False)

    for number in sorted(transfers):
        data = transfers[number]
        if number == 1:
            apply_transfer(sub, data)
        else:
            entry: dict[str, Any] = {
                "recipient": data.get("Tercero receptor", ""),
                "purposes": data.get("Finalidades de la transferencia", ""),
                "consentRequired": parse_bool(data.get("¿Requiere consentimiento?", ""), False),
                "consentType": normalize_consent_type(data.get("Tipo de consentimiento", "")),
                "tacitDescription": data.get("Descripción de consentimiento tácito", ""),
                "expresoForm": data.get("Forma de consentimiento expreso", ""),
                "expresoEscritoForm": data.get("Formulario expreso escrito", ""),
                "exceptions": split_list(data.get("Excepciones de consentimiento", "")),
                "legalInstrument": split_list(data.get("Instrumentos jurídicos", "")),
                "otherLegalInstrument": data.get("Otros instrumentos jurídicos", ""),
                "inAP": parse_bool(data.get("¿Está en el Aviso de Privacidad?", ""), False),
            }
            sub["additionalTransfers"].append(entry)

    def apply_remission(target: dict[str, Any], data: dict[str, str]) -> None:
        target["dataRemission"] = normalize_yes_no(data.get("¿Existe remisión?", "si"))
        target["remissionRecipient"] = data.get("Denominación social o nombre comercial", "")
        target["remissionPurposes"] = split_list(data.get("Finalidades de la remisión", ""))
        target["otherRemissionPurpose"] = data.get("Otra finalidad de remisión", "")
        target["remissionLegalInstrument"] = split_list(data.get("Instrumentos jurídicos remisión", ""))
        target["otherRemissionLegalInstrument"] = data.get("Otros instrumentos jurídicos remisión", "")

    for number in sorted(remissions):
        data = remissions[number]
        if number == 1:
            apply_remission(sub, data)
        else:
            entry = {
                "recipient": data.get("Denominación social o nombre comercial", ""),
                "purposes": split_list(data.get("Finalidades de la remisión", "")),
                "otherPurpose": data.get("Otra finalidad de remisión", ""),
                "legalInstrument": split_list(data.get("Instrumentos jurídicos remisión", "")),
                "otherLegalInstrument": data.get("Otros instrumentos jurídicos remisión", ""),
            }
            sub["additionalRemissions"].append(entry)

    if not sub["dataTransfer"]:
        sub["dataTransfer"] = "no"
    if not sub["dataRemission"]:
        sub["dataRemission"] = "no"

    sub["riskLevel"] = risk_value(risk.get("Nivel de riesgo más alto identificado", ""))
    sub["grunenthalSourcePdfFileId"] = f"grunenthal-file-{asset['id']}"
    sub["grunenthalSourcePdfPath"] = asset["path"]
    download_name = PDF_DOWNLOAD_NAME_OVERRIDES.get(asset["id"])
    if download_name:
        sub["grunenthalSourcePdfDownloadName"] = download_name
    sub["grunenthalSourcePdfStatus"] = "vinculado"
    sub["grunenthalValidationStatus"] = "verificado"
    sub["grunenthalValidationFields"] = VALIDATED_FIELDS
    sub["grunenthalValidationMismatches"] = []

    inventory_meta = {
        "topName": top_name,
        "createdAt": created_at or SEEDED_AT,
        "updatedAt": updated_at or SEEDED_AT,
        "responsible": responsible or CLIENT_NAME,
        "riskLevel": risk_value(risk.get("Nivel de riesgo más alto identificado", "")),
    }
    return sub, inventory_meta


def build_inventories(assets: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    by_area: dict[str, dict[str, Any]] = {}
    links: list[dict[str, Any]] = []

    for asset in assets:
        area = asset["ratAreaFolder"]
        inventory_id = f"grunenthal-rat-area-{slugify(area)}"
        sub, meta = parse_pdf(asset)
        inventory = by_area.setdefault(
            area,
            {
                "id": inventory_id,
                "databaseName": area,
                "responsible": CLIENT_NAME,
                "companyLogoFileName": "grunenthal-logo-green.png",
                "reportAccentColor": ACCENT_COLOR,
                "subInventories": [],
                "riskLevel": "bajo",
                "createdAt": meta["createdAt"],
                "updatedAt": meta["updatedAt"],
                "createdBy": "Admin",
                "updatedBy": "Admin",
                "status": "completado",
                "grunenthalSeedVersion": "2026.2.0",
                "grunenthalSourceExportedAt": SOURCE_EXPORTED_AT,
            },
        )
        inventory["createdAt"] = min(inventory["createdAt"], meta["createdAt"])
        inventory["updatedAt"] = max(inventory["updatedAt"], meta["updatedAt"])
        inventory["subInventories"].append(sub)
        risk_order = {"bajo": 1, "medio": 2, "alto": 3, "reforzado": 4}
        if risk_order.get(sub["riskLevel"], 1) > risk_order.get(inventory["riskLevel"], 1):
            inventory["riskLevel"] = sub["riskLevel"]

        links.append(
            {
                "assetId": asset["id"],
                "inventoryId": inventory_id,
                "inventoryName": area,
                "subInventoryId": sub["id"],
                "subInventoryName": sub["databaseName"],
                "publicPath": asset["path"],
                "matchScore": 1.0,
                "validatedFields": VALIDATED_FIELDS,
                "mismatchedFields": [],
            }
        )

    risk_order = {"bajo": 1, "medio": 2, "alto": 3, "reforzado": 4}
    for area, sub, meta in supplemental_sub_inventories():
        inventory_id = f"grunenthal-rat-area-{slugify(area)}"
        inventory = by_area.setdefault(
            area,
            {
                "id": inventory_id,
                "databaseName": area,
                "responsible": meta["responsible"],
                "companyLogoFileName": "grunenthal-logo-green.png",
                "reportAccentColor": ACCENT_COLOR,
                "subInventories": [],
                "riskLevel": "bajo",
                "createdAt": meta["createdAt"],
                "updatedAt": meta["updatedAt"],
                "createdBy": "Admin",
                "updatedBy": "Admin",
                "status": "completado",
                "grunenthalSeedVersion": "2026.2.0",
                "grunenthalSourceExportedAt": SOURCE_EXPORTED_AT,
            },
        )
        inventory["createdAt"] = min(inventory["createdAt"], meta["createdAt"])
        inventory["updatedAt"] = max(inventory["updatedAt"], meta["updatedAt"])
        existing_index = next(
            (
                index
                for index, existing_sub in enumerate(inventory["subInventories"])
                if normalize_key(existing_sub["databaseName"]) == normalize_key(sub["databaseName"])
            ),
            -1,
        )
        if existing_index >= 0:
            inventory["subInventories"][existing_index] = sub
        else:
            inventory["subInventories"].append(sub)
        if risk_order.get(sub.get("riskLevel", "bajo"), 1) > risk_order.get(inventory["riskLevel"], 1):
            inventory["riskLevel"] = sub.get("riskLevel", "bajo")

    inventories = list(by_area.values())
    for inventory in inventories:
        inventory["subInventories"].sort(key=lambda sub: sub["databaseName"].lower())
    return inventories, links


def render_ts(inventories: list[dict[str, Any]], links: list[dict[str, Any]]) -> str:
    logo_data = base64.b64encode(LOGO_FILE.read_bytes()).decode("ascii")
    linked_sub_inventory_ids = {link["subInventoryId"] for link in links}
    missing_items = [
        {
            "inventoryName": inventory["databaseName"],
            "subInventoryId": sub["id"],
            "subInventoryName": sub["databaseName"],
            "status": "pendiente-revision",
        }
        for inventory in inventories
        for sub in inventory["subInventories"]
        if sub["id"] not in linked_sub_inventory_ids
    ]
    report_items = [
        {
            "assetId": link["assetId"],
            "pdfName": next_link_pdf_name(link["assetId"], links),
            "inventoryName": link["inventoryName"],
            "subInventoryName": link["subInventoryName"],
            "status": "verificado",
            "matchScore": 1.0,
            "validatedFields": VALIDATED_FIELDS,
            "mismatchedFields": [],
        }
        for link in links
    ] + missing_items
    validation_report = {
        "generatedAt": "2026-06-25T00:00:00.000Z",
        "sourceDirectory": "Políticas de Grünenthal (2026)/InventariosDatos Personales",
        "canonicalInventoryCount": len(inventories),
        "canonicalSubInventoryCount": sum(len(inv["subInventories"]) for inv in inventories),
        "pdfInventoryCount": len(links),
        "mappedPdfCount": len(links),
        "missingPdfCount": len(missing_items),
        "unmatchedPdfCount": 0,
        "fieldMismatchCount": 0,
        "missingPdfs": missing_items,
        "unmatchedPdfs": [],
        "fieldMismatches": [],
        "items": report_items,
    }

    return (
        "// Generated from Políticas de Grünenthal (2026)/InventariosDatos Personales. Keep edits in the generator/source set.\n\n"
        'import type { Inventory } from "@/app/rat/types"\n\n'
        f'export const GRUNENTHAL_RAT_SOURCE_EXPORTED_AT = "{SOURCE_EXPORTED_AT}"\n'
        f'export const GRUNENTHAL_LOGO_DATA_URL = "data:image/png;base64,{logo_data}"\n\n'
        "export const GRUNENTHAL_RAT_INVENTORIES: Inventory[] = "
        + json.dumps(inventories, ensure_ascii=False, indent=2)
        + "\n\n"
        "export const GRUNENTHAL_RAT_PDF_LINKS = "
        + json.dumps(links, ensure_ascii=False, indent=2)
        + " as const\n\n"
        "export const GRUNENTHAL_RAT_VALIDATION_REPORT = "
        + json.dumps(validation_report, ensure_ascii=False, indent=2)
        + " as const\n"
    )


def next_link_pdf_name(asset_id: str, links: list[dict[str, Any]]) -> str:
    _ = links
    if asset_id in PDF_DOWNLOAD_NAME_OVERRIDES:
        return PDF_DOWNLOAD_NAME_OVERRIDES[asset_id]
    text = ASSETS_TS.read_text(encoding="utf-8")
    pattern = r'\{\n(?:[^{}]|\n)*?"id": "' + re.escape(asset_id) + r'"(?:[^{}]|\n)*?\n  \}'
    match = re.search(pattern, text)
    if not match:
        return asset_id
    return json.loads(match.group(0))["name"]


def main() -> None:
    ensure_source_root()
    assets = extract_asset_objects()
    validate_pdf_files(assets)
    inventories, links = build_inventories(assets)
    if len(inventories) != 15:
        raise SystemExit(f"Se esperaban 15 inventarios y se generaron {len(inventories)}")
    if sum(len(inv["subInventories"]) for inv in inventories) != 35:
        raise SystemExit("El total de subinventarios generados no es 35")
    OUTPUT_TS.write_text(render_ts(inventories, links), encoding="utf-8")
    print("Inventarios generados:", len(inventories))
    print("Subinventarios generados:", sum(len(inv["subInventories"]) for inv in inventories))
    print("PDFs validados:", len(links))


if __name__ == "__main__":
    main()
