"""Gerador de BR Code (Pix estático) compatível com QR Code de pagamento.

Referência: manual BACEN do BR Code (EMV MPM).
"""

from __future__ import annotations


def _tlv(tag: str, value: str) -> str:
    return f"{tag}{len(value):02d}{value}"


def _crc16_ccitt(payload: str) -> str:
    crc = 0xFFFF
    for ch in payload.encode("utf-8"):
        crc ^= ch << 8
        for _ in range(8):
            crc = (crc << 1) ^ 0x1021 if crc & 0x8000 else crc << 1
            crc &= 0xFFFF
    return f"{crc:04X}"


def _sanitize(text: str, max_len: int) -> str:
    text = "".join(c for c in text if ord(c) < 128)
    return text[:max_len].strip() or "-"


def build_static_pix(
    *,
    pix_key: str,
    amount_cents: int,
    receiver_name: str,
    receiver_city: str,
    txid: str = "***",
    description: str = "",
) -> str:
    """Retorna o payload EMV do BR Code para uso direto em QR Code.

    amount_cents = 0 significa QR sem valor fixo (pagador digita).
    """
    merchant_account = _tlv("00", "br.gov.bcb.pix") + _tlv("01", pix_key)
    if description:
        merchant_account += _tlv("02", _sanitize(description, 40))

    payload = (
        _tlv("00", "01")
        + _tlv("26", merchant_account)
        + _tlv("52", "0000")
        + _tlv("53", "986")
    )
    if amount_cents > 0:
        payload += _tlv("54", f"{amount_cents / 100:.2f}")
    payload += _tlv("58", "BR")
    payload += _tlv("59", _sanitize(receiver_name, 25))
    payload += _tlv("60", _sanitize(receiver_city, 15))
    payload += _tlv("62", _tlv("05", _sanitize(txid, 25)))

    base = payload + "6304"
    return base + _crc16_ccitt(base)
