import { Report, Profile, ReportStatus } from '../types';

// Email dispatch is executed either via secure local dev endpoint or delegated to Supabase DB Trigger (pg_net)
const SENDER_EMAIL = 'CivicLedger Kota <onboarding@resend.dev>';

interface SendStatusEmailParams {
  report: Report;
  newStatus: ReportStatus;
  reporterEmail?: string | null;
  reporterName?: string | null;
  petugasName?: string | null;
  adminNote?: string | null;
}

export async function sendReportStatusEmail({
  report,
  newStatus,
  reporterEmail,
  reporterName = 'Warga Sahabat Kota',
  petugasName = 'Tim Teknis Dinas Terkait',
  adminNote,
}: SendStatusEmailParams): Promise<{ success: boolean; error?: string; id?: string }> {
  // If no reporter email provided, we cannot send
  if (!reporterEmail || !reporterEmail.includes('@')) {
    console.warn('[EmailService] No valid recipient email:', reporterEmail);
    return { success: false, error: 'Alamat email pelapor tidak valid.' };
  }

  const name = reporterName || 'Warga Sahabat Kota';
  const ticketId = report.ticket_id;
  const title = report.title;
  const address = report.address || 'Lokasi terdaftar pada peta';
  const officer = petugasName || 'Tim Teknis Dinas Terkait';
  const reportUrl = `${window.location.origin}/reports/${report.id}`;

  let statusLabel = '';
  let statusColor = '';
  let statusBadgeBg = '';
  let headline = '';
  let statusDesc = '';
  let nextStep = '';
  let emailSubject = '';
  let ctaText = 'Buka Kamar Kendali Laporan →';
  let stepProgressHtml = '';

  switch (newStatus) {
    case 'verified':
      statusLabel = '✓ TERVERIFIKASI RESMI';
      statusColor = '#0EA58D';
      statusBadgeBg = '#E6F7F5';
      headline = 'Kabar Baik! Laporan Anda Sudah Divalidasi Tim Kota ✨';
      statusDesc = 'Terima kasih banyak atas kepedulian Anda ikut menjaga kenyamanan dan ketertiban kota kita! Laporan Anda telah selesai ditinjau oleh Tim Verifikator dan dinyatakan valid sesuai data lapangan.';
      nextStep = '📌 <strong>Langkah Berikutnya:</strong> Tiket Anda langsung masuk ke antrean prioritas dinas terkait untuk penjadwalan regu dan penugasan armada petugas.';
      emailSubject = `✨ [${ticketId}] Kabar Baik! Laporan Anda Telah Terverifikasi — CivicLedger`;
      ctaText = 'Pantau Progres Tiket Anda →';
      stepProgressHtml = `
        <div style="display:flex; justify-content:space-between; margin:20px 0; font-size:11px; text-align:center;">
          <div style="flex:1; color:#0EA58D; font-weight:bold;">● 1. Terverifikasi<br><span style="font-size:9px; color:#64748b;">(Saat Ini)</span></div>
          <div style="flex:1; color:#94a3b8;">○ 2. Penugasan</div>
          <div style="flex:1; color:#94a3b8;">○ 3. Pengerjaan</div>
          <div style="flex:1; color:#94a3b8;">○ 4. Selesai</div>
        </div>`;
      break;

    case 'assigned':
      statusLabel = '👷 PETUGAS DITERJUNKAN';
      statusColor = '#2563EB';
      statusBadgeBg = '#EFF6FF';
      headline = 'Regu Lapangan Sudah Meluncur ke Lokasi! 🚚💨';
      statusDesc = `Aspirasi Anda langsung direspon cepat! Dinas teknis telah resmi mengalokasikan <strong>${officer}</strong> untuk menangani permasalahan ini secara langsung.`;
      nextStep = '📌 <strong>Langkah Berikutnya:</strong> Petugas sedang membawa perlengkapan teknis menuju titik koordinat yang Anda laporkan untuk memulai tahapan eksekusi.';
      emailSubject = `👷 [${ticketId}] Petugas Sedang Meluncur ke Lokasi Anda — CivicLedger`;
      ctaText = 'Lihat Detail Penugasan Petugas →';
      stepProgressHtml = `
        <div style="display:flex; justify-content:space-between; margin:20px 0; font-size:11px; text-align:center;">
          <div style="flex:1; color:#10B981;">✓ 1. Terverifikasi</div>
          <div style="flex:1; color:#2563EB; font-weight:bold;">● 2. Ditugaskan<br><span style="font-size:9px; color:#64748b;">(Saat Ini)</span></div>
          <div style="flex:1; color:#94a3b8;">○ 3. Pengerjaan</div>
          <div style="flex:1; color:#94a3b8;">○ 4. Selesai</div>
        </div>`;
      break;

    case 'in_progress':
      statusLabel = '⚡ SEDANG DIKERJAKAN';
      statusColor = '#7C3AED';
      statusBadgeBg = '#F5F3FF';
      headline = 'Aksi Nyata Sedang Berlangsung di Lokasi! 🛠️';
      statusDesc = 'Petugas kami saat ini sudah tiba di lokasi dan sedang bekerja keras melakukan penanganan fisik fasilitas umum. Kami memastikan perbaikan dikerjakan dengan standar mutu terbaik dan aman.';
      nextStep = '📌 <strong>Langkah Berikutnya:</strong> Setelah perbaikan tuntas, petugas akan mengunggah foto bukti hasil pengerjaan (before & after) langsung ke kamar kendali laporan Anda.';
      emailSubject = `⚡ [${ticketId}] Pengerjaan Sedang Berlangsung di Lapangan — CivicLedger`;
      ctaText = 'Buka Kamar Kendali Laporan →';
      stepProgressHtml = `
        <div style="display:flex; justify-content:space-between; margin:20px 0; font-size:11px; text-align:center;">
          <div style="flex:1; color:#10B981;">✓ 1. Terverifikasi</div>
          <div style="flex:1; color:#10B981;">✓ 2. Ditugaskan</div>
          <div style="flex:1; color:#7C3AED; font-weight:bold;">● 3. Dikerjakan<br><span style="font-size:9px; color:#64748b;">(Saat Ini)</span></div>
          <div style="flex:1; color:#94a3b8;">○ 4. Selesai</div>
        </div>`;
      break;

    case 'completed':
      statusLabel = '🎉 SELESAI TUNTAS';
      statusColor = '#059669';
      statusBadgeBg = '#ECFDF5';
      headline = 'Hore! Fasilitas Kota Kita Sudah Kembali Prima! 🎉🥳';
      statusDesc = 'Kabar gembira untuk kita semua! Pengerjaan atas laporan Anda telah <strong>selesai 100%</strong>. Lingkungan kini kembali aman, rapi, dan nyaman berkat inisiatif hebat Anda melaporkannya ke CivicLedger.';
      nextStep = '⭐ <strong>Yuk Beri Nilai!</strong> Petugas telah mengunggah foto bukti penyelesaian. Luangkan 5 detik untuk melihat hasilnya dan beri rating bintang (1–5 ⭐) untuk mengapresiasi kerja keras petugas kita!';
      emailSubject = `🎉 [${ticketId}] Hore! Laporan Anda Telah Tuntas Selesai Ditangani — CivicLedger`;
      ctaText = 'Lihat Bukti Foto & Beri Rating ⭐ →';
      stepProgressHtml = `
        <div style="display:flex; justify-content:space-between; margin:20px 0; font-size:11px; text-align:center;">
          <div style="flex:1; color:#10B981;">✓ 1. Terverifikasi</div>
          <div style="flex:1; color:#10B981;">✓ 2. Ditugaskan</div>
          <div style="flex:1; color:#10B981;">✓ 3. Dikerjakan</div>
          <div style="flex:1; color:#059669; font-weight:bold;">✓ 4. Selesai 🎉<br><span style="font-size:9px; color:#059669;">(Tuntas)</span></div>
        </div>`;
      break;

    case 'rejected':
      statusLabel = '⚠️ PERLU PENYESUAIAN';
      statusColor = '#DC2626';
      statusBadgeBg = '#FEF2F2';
      headline = 'Pemberitahuan Terkait Laporan Anda 📝';
      statusDesc = `Terima kasih atas partisipasi aktif Anda. Setelah ditinjau saksama oleh tim verifikator kota, laporan ini belum dapat kami proses saat ini dengan catatan admin: <em>"${adminNote || 'Informasi atau foto belum memenuhi kriteria verifikasi teknis.'}"</em>`;
      nextStep = '💡 <strong>Solusi:</strong> Jangan berkecil hati! Anda dapat memperbarui data atau membuat laporan baru dengan menyertakan foto yang lebih jelas agar segera dapat kami tindak lanjuti.';
      emailSubject = `📋 [${ticketId}] Catatan Pembaruan Laporan Anda — CivicLedger`;
      ctaText = 'Lihat Detail & Perbarui Laporan →';
      stepProgressHtml = '';
      break;

    default:
      return { success: false, error: 'Status tidak memerlukan notifikasi email.' };
  }

  const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 12px; color: #1e293b; -webkit-font-smoothing: antialiased; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.06); }
    .header { background: #0b132b; color: #ffffff; padding: 28px 24px; text-align: center; border-bottom: 3px solid #d4a843; }
    .header-logo { display: inline-block; background: #d4a843; color: #0b132b; font-weight: 900; font-size: 16px; padding: 4px 12px; border-radius: 8px; margin-bottom: 8px; letter-spacing: 1px; }
    .header h1 { margin: 0; font-size: 18px; letter-spacing: 0.5px; font-weight: 800; }
    .header p { margin: 4px 0 0; font-size: 11px; color: #94a3b8; font-family: monospace; }
    .content { padding: 32px 28px; }
    .status-pill { display: inline-block; padding: 6px 16px; border-radius: 30px; font-weight: 800; font-size: 12px; color: ${statusColor}; background-color: ${statusBadgeBg}; border: 1px solid ${statusColor}; margin-bottom: 18px; letter-spacing: 0.5px; }
    .headline { font-size: 19px; font-weight: 800; color: #0f172a; margin: 0 0 14px; line-height: 1.4; }
    .greeting { font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 8px; }
    .desc { font-size: 13.5px; line-height: 1.65; color: #475569; margin: 0 0 18px; }
    .next-box { background: #f8fafc; border-left: 4px solid ${statusColor}; padding: 14px 16px; border-radius: 0 12px 12px 0; margin-bottom: 22px; font-size: 12.5px; color: #334155; line-height: 1.5; }
    .ticket-box { background: #f8fafc; border-radius: 14px; padding: 18px; margin: 20px 0; border: 1px solid #e2e8f0; }
    .ticket-title { font-weight: 800; font-size: 12px; color: #0b132b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px; }
    .ticket-table { width: 100%; font-size: 12.5px; border-collapse: collapse; }
    .ticket-table td { padding: 6px 0; vertical-align: top; }
    .label-col { color: #64748b; width: 35%; }
    .val-col { font-weight: 700; color: #0f172a; text-align: right; }
    .btn-container { text-align: center; margin: 28px 0 16px; }
    .btn { display: inline-block; background: #0b132b; color: #ffffff !important; text-decoration: none; padding: 15px 32px; border-radius: 14px; font-weight: 800; font-size: 13px; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(11,19,43,0.25); }
    .footer { text-align: center; padding: 24px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafbfc; }
    .footer-highlight { color: #0EA58D; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="header-logo">CL CIVICLEDGER</div>
      <h1>SISTEM KOTA CERDAS BERKELANJUTAN</h1>
      <p>Pemberitahuan Resmi Layanan Pengaduan Warga</p>
    </div>
    
    <div class="content">
      <div class="status-pill">${statusLabel}</div>
      
      <div class="headline">${headline}</div>
      <div class="greeting">Halo, ${name} 👋</div>
      
      <p class="desc">
        ${statusDesc}
      </p>

      ${stepProgressHtml}

      <div class="next-box">
        ${nextStep}
      </div>
      
      <div class="ticket-box">
        <div class="ticket-title">📋 Ringkasan Tiket Laporan Anda:</div>
        <table class="ticket-table">
          <tr>
            <td class="label-col">Nomor Tiket:</td>
            <td class="val-col" style="font-family:monospace; color:#0EA58D;">${ticketId}</td>
          </tr>
          <tr>
            <td class="label-col">Judul Laporan:</td>
            <td class="val-col">${title}</td>
          </tr>
          <tr>
            <td class="label-col">Lokasi Kejadian:</td>
            <td class="val-col" style="font-weight:500;">${address}</td>
          </tr>
          <tr>
            <td class="label-col">Waktu Update:</td>
            <td class="val-col" style="font-weight:500;">${new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WIB</td>
          </tr>
        </table>
      </div>

      <div class="btn-container">
        <a href="${reportUrl}" class="btn">
          ${ctaText}
        </a>
      </div>

      <p style="font-size: 11px; color: #64748b; text-align: center; margin-top: 20px; line-height: 1.5;">
        Kunjungi portal Anda kapan saja untuk memantau update real-time, mengunduh Tanda Terima Resmi digital, atau berkomunikasi dengan tim dinas.
      </p>
    </div>

    <div class="footer">
      Email ini dikirimkan secara otomatis oleh <span class="footer-highlight">CivicLedger Smart City Tech</span>.<br>
      Terima kasih telah berpartisipasi aktif membangun kota yang lebih baik, aman, dan nyaman bersama kami! 🌱<br>
      <span style="font-size: 10px; color: #cbd5e1; margin-top: 8px; display: inline-block;">
        © ${new Date().getFullYear()} CivicLedger Republik Indonesia. Hak Cipta Dilindungi.
      </span>
    </div>
  </div>
</body>
</html>`;

  const plainText = `${statusLabel}\n${headline}\n\nHalo, ${name}\n${statusDesc}\n\nNomor Tiket: ${ticketId}\nJudul Laporan: ${title}\nLokasi: ${address}\n\nLihat progres: ${reportUrl}`;

  // 1. Try sending via local Gmail SMTP server (Google App Password) - No domain restrictions!
  try {
    const smtpRes = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: reporterEmail,
        subject: emailSubject,
        html: emailHtml,
        text: plainText,
      }),
    });

    if (smtpRes.ok) {
      const smtpData = await smtpRes.json();
      console.log('[EmailService] Sent successfully via Gmail SMTP:', smtpData);
      return { success: true, id: smtpData?.messageId };
    }
  } catch (smtpErr) {
    // In production, email notifications are dispatched asynchronously by Supabase database trigger (pg_net)
    console.info('[EmailService] Local SMTP endpoint not engaged; email dispatch securely delegated to database trigger.');
  }

  // Gracefully return success to caller since Supabase status_logs trigger handles async dispatch
  return { success: true, id: 'delegated-to-backend-trigger' };
}
