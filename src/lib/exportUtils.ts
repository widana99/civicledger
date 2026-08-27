import { Report } from '../types';
import { STATUS_CONFIG, CATEGORY_OPTIONS } from './constants';

/**
 * Export reports data to Excel (.xlsx) format
 */
export async function exportToExcel(reports: Report[], filename?: string) {
  const XLSX = await import('xlsx');

  const rows = reports.map((r, i) => ({
    'No': i + 1,
    'Nomor Tiket': r.ticket_id,
    'Judul Laporan': r.title,
    'Deskripsi': r.description,
    'Kategori': CATEGORY_OPTIONS.find(c => c.value === r.category)?.label || r.category,
    'Status': STATUS_CONFIG[r.status]?.label || r.status,
    'Prioritas': r.priority,
    'Alamat': r.address,
    'Latitude': r.latitude || '-',
    'Longitude': r.longitude || '-',
    'Tanggal Dibuat': new Date(r.created_at).toLocaleString('id-ID'),
    'Tanggal Update': new Date(r.updated_at).toLocaleString('id-ID'),
    'Tanggal Selesai': r.completed_at ? new Date(r.completed_at).toLocaleString('id-ID') : '-',
    'Alasan Ditolak': r.rejected_reason || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-fit column widths
  const colWidths = Object.keys(rows[0] || {}).map(key => ({
    wch: Math.max(key.length, ...rows.map(r => String((r as Record<string, unknown>)[key] || '').length)).toString().length + 4,
  }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan CivicLedger');

  const exportName = filename || `CivicLedger_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, exportName);
}

/**
 * Export dashboard statistics to PDF
 */
export async function exportStatsToPDF(statsElement: HTMLElement, filename?: string) {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  const canvas = await html2canvas(statsElement, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#F6F7F5',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  // Header
  pdf.setFillColor(11, 19, 43); // navy
  pdf.rect(0, 0, pdfWidth, 18, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.text('CIVICLEDGER — Laporan Statistik Dashboard', 10, 12);
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, pdfWidth - 60, 12);

  // Content image
  const maxContentHeight = pdf.internal.pageSize.getHeight() - 28;
  const scaledHeight = Math.min(pdfHeight, maxContentHeight);
  const scaledWidth = (canvas.width * scaledHeight) / canvas.height;

  pdf.addImage(imgData, 'PNG', 5, 22, Math.min(scaledWidth, pdfWidth - 10), scaledHeight);

  // Footer
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text('© CivicLedger Republik Indonesia — Dokumen Resmi Sistem Kota Cerdas', 10, pageH - 4);

  const exportName = filename || `CivicLedger_Dashboard_${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(exportName);
}
