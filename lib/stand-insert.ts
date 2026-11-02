import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";

// The printable stand insert: a 4×6 inch PDF for a standard acrylic sign holder, with the venue's
// logo, the tap line, the QR code for /t/<slug> and a small "Powered by Bayline".

const W = 4 * 72;
const H = 6 * 72;
const MIDNIGHT = rgb(2 / 255, 7 / 255, 10 / 255);
const GRAY = rgb(0.4, 0.43, 0.45);

const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
// The built-in PDF fonts only cover Latin-1; drop anything else (emoji) rather than fail.
const latin1 = (s: string) => s.replace(/[^\x20-\x7e\xa0-\xff]/g, "").trim();

function centered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = MIDNIGHT) {
  page.drawText(text, { x: (W - font.widthOfTextAtSize(text, size)) / 2, y, size, font, color });
}

export type InsertVenue = { name: string; card_bg: string; logo_png?: Uint8Array | null };

export async function standInsertPdf(venue: InsertVenue, url: string) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${latin1(venue.name)} stand insert`);
  pdf.setCreator("Bayline");
  const page = pdf.addPage([W, H]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({ x: 0, y: H - 10, width: W, height: 10, color: /^#[0-9a-f]{6}$/i.test(venue.card_bg) ? hex(venue.card_bg) : MIDNIGHT });

  // Logo (or the name), in a 200×64pt box near the top.
  const logo = venue.logo_png ? await pdf.embedPng(venue.logo_png).catch(() => null) : null;
  if (logo) {
    const s = Math.min(200 / logo.width, 64 / logo.height);
    page.drawImage(logo, { x: (W - logo.width * s) / 2, y: H - 34 - logo.height * s, width: logo.width * s, height: logo.height * s });
  } else {
    let size = 26;
    const name = latin1(venue.name).toUpperCase();
    while (size > 12 && bold.widthOfTextAtSize(name, size) > W - 40) size--;
    centered(page, name, H - 74, bold, size);
  }

  centered(page, "Tap your phone here", H - 140, bold, 24);
  centered(page, "for a free rewards card", H - 164, regular, 16);

  // QR code as vector squares, 156pt wide with a thin frame.
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" }).modules;
  const box = 156;
  const cell = box / qr.size;
  const qx = (W - box) / 2;
  const qy = 78;
  page.drawRectangle({ x: qx - 10, y: qy - 10, width: box + 20, height: box + 20, borderColor: MIDNIGHT, borderWidth: 2 });
  for (let r = 0; r < qr.size; r++) {
    for (let c = 0; c < qr.size; c++) {
      if (qr.get(r, c)) page.drawRectangle({ x: qx + c * cell, y: qy + box - (r + 1) * cell, width: cell + 0.05, height: cell + 0.05, color: MIDNIGHT });
    }
  }
  centered(page, "Or scan the code with your camera.", 48, regular, 10, GRAY);
  centered(page, "No app needed. Adds a card to Apple or Google Wallet.", 34, regular, 8, GRAY);
  centered(page, "Powered by Bayline", 14, regular, 7, GRAY);

  return pdf.save();
}
