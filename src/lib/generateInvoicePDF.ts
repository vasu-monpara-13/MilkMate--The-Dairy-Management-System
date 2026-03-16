import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type InvoiceRow = {
  delivery_date: string | null;
  time_slot: string | null;
  qty: number;
  rate: number;
  amount: number;
};

function formatINR(v: number) {
  try {
    return Number(v || 0).toLocaleString("en-IN");
  } catch {
    return String(Number(v || 0));
  }
}

function safeText(v: string | null | undefined) {
  return String(v ?? "").trim() || "-";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(+d)) return value;
  return d.toLocaleDateString("en-GB");
}

export function generateInvoicePDF(
  invoiceNumber: string,
  customerName: string,
  phone: string,
  email: string,
  rows: InvoiceRow[],
  totalLitres: number,
  totalAmount: number
) {
  const doc = new jsPDF("p", "mm", "a4");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const green: [number, number, number] = [12, 207, 61];
  const greenDark: [number, number, number] = [10, 125, 42];
  const dark: [number, number, number] = [31, 41, 55];
  const muted: [number, number, number] = [100, 116, 139];
  const border: [number, number, number] = [226, 232, 240];
  const soft: [number, number, number] = [248, 250, 252];
  const amber: [number, number, number] = [245, 158, 11];

  const paidStatus = totalAmount <= 0 ? "PAID" : "UNPAID";

  const allDates = rows
    .map((r) => r.delivery_date)
    .filter(Boolean)
    .map((d) => new Date(String(d)))
    .filter((d) => !Number.isNaN(+d))
    .sort((a, b) => +a - +b);

  const periodFrom = allDates.length ? formatDate(allDates[0].toISOString()) : "-";
  const periodTo = allDates.length ? formatDate(allDates[allDates.length - 1].toISOString()) : "-";

  // Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Header band
  doc.setFillColor(...green);
  doc.roundedRect(10, 10, pageWidth - 20, 30, 6, 6, "F");

  // Brand
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.text("MilkMate Dairy", 16, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Premium Dairy Billing Invoice", 16, 29);

  // Invoice meta
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Invoice No: ${safeText(invoiceNumber)}`, pageWidth - 72, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Invoice Date: ${formatDate(new Date().toISOString())}`, pageWidth - 72, 27);
  doc.text(`Period: ${periodFrom} to ${periodTo}`, pageWidth - 72, 33);

  // Bill to card
  doc.setFillColor(...soft);
  doc.setDrawColor(...border);
  doc.roundedRect(10, 48, pageWidth - 20, 34, 4, 4, "FD");

  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Bill To", 16, 58);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Customer: ${safeText(customerName)}`, 16, 65);
  doc.text(`Phone: ${safeText(phone)}`, 16, 71);
  doc.text(`Email: ${safeText(email)}`, 95, 65);
  doc.text(`Payment Status: ${paidStatus}`, 95, 71);

  // ===== FIXED STATUS BADGE =====
  // old issue: badge was too close to right edge, so text got clipped
  const badgeW = paidStatus === "PAID" ? 24 : 32;
  const badgeH = 10;
  const badgeX = pageWidth - badgeW - 20; // safe right margin
  const badgeY = 51; // inside bill card

  if (paidStatus === "PAID") {
    doc.setFillColor(...greenDark);
  } else {
    doc.setFillColor(...amber);
  }

  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(paidStatus, badgeX + badgeW / 2, badgeY + 6.5, {
    align: "center",
  });
  // ===== END FIX =====

  // Table rows
  const tableRows = rows.map((r, index) => [
    String(index + 1),
    formatDate(r.delivery_date),
    safeText(r.time_slot),
    Number(r.qty || 0).toFixed(1),
    `Rs ${formatINR(Number(r.rate || 0))}`,
    `Rs ${formatINR(Number(r.amount || 0))}`,
  ]);

  autoTable(doc, {
    startY: 90,
    head: [["#", "Date", "Shift", "Qty (L)", "Rate", "Amount"]],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: green,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      fontSize: 10,
    },
    bodyStyles: {
      textColor: dark,
      fontSize: 10,
      cellPadding: 3,
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      lineColor: border,
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "center", cellWidth: 30 },
      2: { halign: "center", cellWidth: 30 },
      3: { halign: "right", cellWidth: 24 },
      4: { halign: "right", cellWidth: 36 },
      5: { halign: "right", cellWidth: 36 },
    },
    margin: { left: 10, right: 10 },
  });

  const finalY = ((doc as any).lastAutoTable?.finalY || 130) + 8;

  // Notes box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...border);
  doc.roundedRect(10, finalY, 105, 38, 4, 4, "FD");

  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Notes", 15, finalY + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...muted);
  doc.text(
    "This invoice is generated from delivered milk entries recorded in MilkMate.",
    15,
    finalY + 18,
    { maxWidth: 92 }
  );
  doc.text("Thank you for choosing MilkMate Dairy.", 15, finalY + 26);

  // Totals box
  doc.setFillColor(...soft);
  doc.setDrawColor(...border);
  doc.roundedRect(pageWidth - 85, finalY, 75, 42, 4, 4, "FD");

  doc.setTextColor(...muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Total Litres", pageWidth - 78, finalY + 11);
  doc.text("Invoice Rows", pageWidth - 78, finalY + 21);
  doc.text("Grand Total", pageWidth - 78, finalY + 32);

  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.text(`${Number(totalLitres || 0).toFixed(1)} L`, pageWidth - 16, finalY + 11, {
    align: "right",
  });
  doc.text(`${rows.length}`, pageWidth - 16, finalY + 21, {
    align: "right",
  });

  doc.setTextColor(...greenDark);
  doc.setFontSize(13);
  doc.text(`Rs ${formatINR(Number(totalAmount || 0))}`, pageWidth - 16, finalY + 32, {
    align: "right",
  });

  // Signature section
  const signY = finalY + 58;
  doc.setDrawColor(...border);
  doc.line(pageWidth - 72, signY, pageWidth - 20, signY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text("Authorized Signature", pageWidth - 46, signY + 6, { align: "center" });

  // Footer
  doc.setFontSize(8.5);
  doc.text("MilkMate • Fresh Dairy Management System", pageWidth / 2, pageHeight - 10, {
    align: "center",
  });

  doc.save(`${invoiceNumber}.pdf`);
}