"""SOULDAWN — Utility helpers: colors, banners, price formatting."""
from __future__ import annotations

# ======================== ЦВЕТА ========================
C_BG      = "0A0A0A"
C_surf    = "141414"
C_card    = "111111"
C_dark    = "1a1a1a"
C_mid     = "2a2a2a"
C_copper  = "C97B3D"
C_copper_lt = "D4945A"
C_cream   = "E8E4E0"
C_red     = "8B2500"
C_white   = "F5F0EB"
C_muted   = "8A8078"


def _url(text: str, bg: str = C_BG, fg: str = C_copper, w: int = 1200, h: int = 400) -> str:
    return f"https://placehold.co/{w}x{h}/{bg}/{fg}.png?text={text.replace(' ', '+')}&font=inter"


BANNERS = {
    "welcome":   _url("SOULDAWN"),
    "catalog":   _url("SOULDAWN COLLECTION 2026"),
    "info":      _url("SOULDAWN INFO"),
    "support":   _url("SOULDAWN SUPPORT"),
    "links":     _url("SOULDAWN LINKS"),
    "delivery":  _url("SOULDAWN SHIPPING"),
    "returns":   _url("SOULDAWN RETURNS"),
    "sizes":     _url("SOULDAWN SIZE GUIDE", C_cream, C_BG),
    "payment":   _url("SOULDAWN PAYMENT"),
    "quality":   _url("SOULDAWN QUALITY", C_copper, C_BG),
    "contact":   _url("SOULDAWN CONTACT"),
    "ai":        _url("SOUL DAWN AI ASSISTANT", C_copper, C_BG),
    "operator":  _url("SOULDAWN MESSAGE"),
    "confirm":   _url("SOULDAWN CONFIRM", C_copper, C_BG),
    "sent_ok":   _url("SOULDAWN SENT OK", C_copper, C_BG),
    "sent_fail": _url("SOULDAWN ERROR", C_red, C_white),
    "offline":   _url("SOULDAWN OFFLINE", C_red, C_white),
    "order":     _url("SOULDAWN MY ORDER"),
    "promo":     _url("SOULDAWN HOT DROP", C_copper, C_BG),
    "pay_wait":  _url("SOULDAWN PAYMENT PENDING", C_copper, C_BG),
    "pay_ok":    _url("SOULDAWN PAID", C_copper, C_BG),
    "pay_fail":  _url("SOULDAWN PAYMENT FAILED", C_red, C_white),
}


def divider() -> str:
    return "━" * 22


def brand() -> str:
    return "SOULDAWN"


def _fmt_price(amount: int) -> str:
    """8990 -> '8 990 ₽', 125000 -> '125 000 ₽'"""
    s = str(amount)
    parts: list[str] = []
    while len(s) > 3:
        parts.append(s[-3:])
        s = s[:-3]
    parts.append(s)
    return " ".join(reversed(parts)) + " ₽"
