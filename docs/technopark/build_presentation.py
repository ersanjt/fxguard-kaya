#!/usr/bin/env python3
"""Build YTÜ Yıldız Teknopark Firma ve Proje Sunumu PDF."""
from __future__ import annotations

import os

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

OUT = os.path.join(os.path.dirname(__file__), "ERST-IT-Kaya-CRM-Firma-ve-Proje-Sunumu.pdf")

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\arial.ttf",
    r"C:\Windows\Fonts\segoeui.ttf",
    r"C:\Windows\Fonts\calibri.ttf",
]
BOLD_CANDIDATES = [
    r"C:\Windows\Fonts\arialbd.ttf",
    r"C:\Windows\Fonts\segoeuib.ttf",
    r"C:\Windows\Fonts\calibrib.ttf",
]

NAVY = HexColor("#0f1729")
ACCENT = HexColor("#10b981")
MUTED = HexColor("#94a3b8")
TEXT = HexColor("#e2e8f0")
LINE = HexColor("#2d3f5f")


def register_fonts() -> None:
    font_path = next((p for p in FONT_CANDIDATES if os.path.exists(p)), None)
    if not font_path:
        raise SystemExit("No TTF font found")
    bold_path = next((p for p in BOLD_CANDIDATES if os.path.exists(p)), font_path)
    pdfmetrics.registerFont(TTFont("UI", font_path))
    pdfmetrics.registerFont(TTFont("UI-Bold", bold_path))


def bg(c: canvas.Canvas, w: float, h: float) -> None:
    c.setFillColor(NAVY)
    c.rect(0, 0, w, h, fill=1, stroke=0)
    c.setFillColor(ACCENT)
    c.rect(0, 0, 8 * mm, h, fill=1, stroke=0)


def footer(c: canvas.Canvas, w: float, page: int, total: int = 10) -> None:
    c.setFillColor(MUTED)
    c.setFont("UI", 9)
    c.drawString(18 * mm, 10 * mm, "ERST IT Solutions  |  Kaya CRM  |  YTÜ Yıldız Teknopark Başvurusu")
    c.drawRightString(w - 14 * mm, 10 * mm, f"{page}/{total}")


def title(c: canvas.Canvas, text: str, y: float) -> None:
    c.setFillColor(white)
    c.setFont("UI-Bold", 26)
    c.drawString(18 * mm, y, text)
    c.setStrokeColor(ACCENT)
    c.setLineWidth(2.5)
    c.line(18 * mm, y - 4 * mm, 70 * mm, y - 4 * mm)


def bullet(c: canvas.Canvas, lines: list[str], x: float, y: float, size: int = 12, leading: float = 7.2 * mm) -> None:
    c.setFont("UI", size)
    yy = y
    for line in lines:
        c.setFillColor(ACCENT)
        c.circle(x + 1.8 * mm, yy + 1.5 * mm, 1.1 * mm, fill=1, stroke=0)
        c.setFillColor(TEXT)
        c.drawString(x + 6 * mm, yy, line)
        yy -= leading


def main() -> None:
    register_fonts()
    w, h = landscape(A4)
    c = canvas.Canvas(OUT, pagesize=landscape(A4))

    # 1 Kapak
    bg(c, w, h)
    c.setFillColor(ACCENT)
    c.setFont("UI-Bold", 14)
    c.drawString(18 * mm, h - 28 * mm, "YTÜ YILDIZ TEKNOPARK BAŞVURUSU")
    c.setFillColor(white)
    c.setFont("UI-Bold", 34)
    c.drawString(18 * mm, h - 48 * mm, "Kaya CRM")
    c.setFont("UI", 15)
    c.setFillColor(TEXT)
    c.drawString(18 * mm, h - 60 * mm, "WhatsApp Entegreli Çok Şubeli Müşteri ve Operasyon Yönetim Platformu")
    c.setStrokeColor(LINE)
    c.setLineWidth(1)
    c.line(18 * mm, h - 68 * mm, w - 18 * mm, h - 68 * mm)
    c.setFillColor(MUTED)
    c.setFont("UI", 12)
    c.drawString(18 * mm, h - 82 * mm, "ERST IT SOLUTIONS BİLİŞİM TEKNOLOJİLERİ SAN. VE TİC. LTD. ŞTİ.")
    c.drawString(18 * mm, h - 92 * mm, "Başvuran: Ersan Jahed Tabrizi")
    c.drawString(18 * mm, h - 102 * mm, "Yerleşke talebi: Maslak  |  40 m²  |  3 personel")
    c.setFillColor(ACCENT)
    c.setFont("UI-Bold", 12)
    c.drawString(18 * mm, 28 * mm, "Canlı ürün: https://kaya.fxguard.io")
    footer(c, w, 1)
    c.showPage()

    # 2 Firma
    bg(c, w, h)
    title(c, "1. Firma Bilgileri", h - 28 * mm)
    bullet(
        c,
        [
            "Firma: ERST IT SOLUTIONS Bilişim Teknolojileri San. ve Tic. Ltd. Şti.",
            "Kuruluş yılı: 2018",
            "Vergi dairesi: Esenyurt",
            "Faaliyet alanı: Yazılım geliştirme, bilişim teknolojileri, dijital çözümler",
            "Ürün odağı: CRM, WhatsApp entegrasyonu, operasyon yönetimi",
            "Başvuran: Ersan Jahed Tabrizi  |  ersanjahedtabrizi@gmail.com  |  0501 067 54 66",
        ],
        18 * mm,
        h - 48 * mm,
        size=13,
        leading=9 * mm,
    )
    footer(c, w, 2)
    c.showPage()

    # 3 Problem
    bg(c, w, h)
    title(c, "2. Problem", h - 28 * mm)
    bullet(
        c,
        [
            "WhatsApp iletişimi personel telefonlarında dağınık ilerliyor",
            "Merkezi konuşma geçmişi ve denetim eksik",
            "Departman / şube bazlı atama ve takip zor",
            "Yanıt süresi ve personel performansı ölçülemiyor",
            "Finansal hizmetlerde izlenebilirlik ve güven ihtiyacı yüksek",
        ],
        18 * mm,
        h - 48 * mm,
        size=14,
        leading=10 * mm,
    )
    footer(c, w, 3)
    c.showPage()

    # 4 Cozum
    bg(c, w, h)
    title(c, "3. Çözüm: Kaya CRM", h - 28 * mm)
    bullet(
        c,
        [
            "Web tabanlı personel portalı + CRM tek panelde",
            "WhatsApp Gateway ve Meta Cloud API entegrasyonu",
            "Müşteri, konuşma, ticket, task ve iç sohbet yönetimi",
            "Departman / şube / rol / yetki bazlı operasyon",
            "Canlı kur panosu, duyuru, BPM süreçleri",
            "White-label panel markalama (logo, renk, dil)",
        ],
        18 * mm,
        h - 48 * mm,
        size=13,
        leading=9 * mm,
    )
    footer(c, w, 4)
    c.showPage()

    # 5 Teknik
    bg(c, w, h)
    title(c, "4. Teknik Mimari", h - 28 * mm)
    bullet(
        c,
        [
            "Backend: Node.js API servisi",
            "WhatsApp Gateway servisi (anlık mesajlaşma katmanı)",
            "Meta Cloud API desteği",
            "RTL / çok dilli dashboard (FA / EN / TR)",
            "Android ve iOS istemci hazırlığı",
            "Canlı ortam: https://kaya.fxguard.io",
        ],
        18 * mm,
        h - 48 * mm,
        size=13,
        leading=9 * mm,
    )
    footer(c, w, 5)
    c.showPage()

    # 6 Ar-Ge
    bg(c, w, h)
    title(c, "5. Yenilik ve Ar-Ge Odakları", h - 28 * mm)
    bullet(
        c,
        [
            "Personel atıflı outbound mesajlama (gönderen adı + departman)",
            "Konuşma yönlendirme ve operasyon denetim katmanı",
            "Çok kiracılı / white-label panel mimarisi",
            "Gerçek zamanlı durum, aktivite ve yanıt takibi",
            "Gateway + Cloud hibrit WhatsApp entegrasyonu",
            "Faydalı model / yazılım tescili potansiyeli değerlendiriliyor",
        ],
        18 * mm,
        h - 48 * mm,
        size=13,
        leading=9 * mm,
    )
    footer(c, w, 6)
    c.showPage()

    # 7 Pazar
    bg(c, w, h)
    title(c, "6. Hedef Pazar ve Ölçekleme", h - 28 * mm)
    bullet(
        c,
        [
            "Döviz / exchange işletmeleri",
            "Finansal hizmet ve remittance firmaları",
            "Çok şubeli B2B destek ekipleri",
            "WhatsApp’ı ana kanal olarak kullanan operasyonlar",
            "Türkiye + MENA odaklı büyüme",
            "SaaS ve on-premise lisanslama modeli",
        ],
        18 * mm,
        h - 48 * mm,
        size=13,
        leading=9 * mm,
    )
    footer(c, w, 7)
    c.showPage()

    # 8 Durum
    bg(c, w, h)
    title(c, "7. Mevcut Durum", h - 28 * mm)
    bullet(
        c,
        [
            "Ürün production ortamında canlı kullanılmaktadır",
            "Aktif geliştirme ve sürekli iyileştirme devam ediyor",
            "Backend, gateway ve dashboard mimarisi hazır",
            "Mobil istemci çalışmaları sürüyor",
            "Teknopark’ta Ar-Ge ekibi ile hızlandırılmış ürünleştirme hedefleniyor",
        ],
        18 * mm,
        h - 48 * mm,
        size=13,
        leading=9.5 * mm,
    )
    footer(c, w, 8)
    c.showPage()

    # 9 Talep
    bg(c, w, h)
    title(c, "8. Teknopark Talebi", h - 28 * mm)
    bullet(
        c,
        [
            "Yerleşke: Maslak",
            "Kiralanacak alan: 40 m²",
            "Projede görev alacak personel: 3",
            "Hedef: Ar-Ge hızlandırma, ürün olgunlaştırma, uluslararası lisanslama",
            "Önceki teknopark deneyimi: Yok",
        ],
        18 * mm,
        h - 48 * mm,
        size=14,
        leading=10 * mm,
    )
    footer(c, w, 9)
    c.showPage()

    # 10 Iletisim
    bg(c, w, h)
    title(c, "9. İletişim", h - 28 * mm)
    c.setFillColor(TEXT)
    c.setFont("UI-Bold", 16)
    c.drawString(18 * mm, h - 55 * mm, "Ersan Jahed Tabrizi")
    c.setFont("UI", 14)
    c.drawString(18 * mm, h - 68 * mm, "ERST IT SOLUTIONS Bilişim Teknolojileri San. ve Tic. Ltd. Şti.")
    c.drawString(18 * mm, h - 80 * mm, "E-posta: ersanjahedtabrizi@gmail.com")
    c.drawString(18 * mm, h - 92 * mm, "Telefon: 0501 067 54 66")
    c.setFillColor(ACCENT)
    c.setFont("UI-Bold", 13)
    c.drawString(18 * mm, h - 110 * mm, "https://kaya.fxguard.io")
    c.setFillColor(MUTED)
    c.setFont("UI", 11)
    c.drawString(18 * mm, 28 * mm, "Teşekkür ederiz.")
    footer(c, w, 10)
    c.save()

    print(OUT)
    print(os.path.getsize(OUT), "bytes")


if __name__ == "__main__":
    main()
