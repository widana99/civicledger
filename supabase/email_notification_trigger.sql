-- ============================================================================
-- CivicLedger — Automated Email Notification to Citizen Gmail (Resend API)
-- ============================================================================
-- Jalankan skrip ini di SQL Editor Dashboard Supabase Anda.
-- ============================================================================

-- 1. Aktifkan ekstensi HTTP (pg_net) bawaan Supabase
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Buat tabel konfigurasi sistem untuk menyimpan API Key Resend (Aman & Terenkripsi di DB)
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Hanya service_role yang bisa membaca API key
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Masukkan API Key Resend Anda
INSERT INTO system_settings (key, value)
VALUES 
  ('resend_api_key', 'YOUR_RESEND_API_KEY_HERE'),
  ('sender_email', 'CivicLedger Kota <onboarding@resend.dev>')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;


-- ============================================================================
-- 3. Fungsi Pengiriman Email Otomatis dengan Pesan Hangat & Informatif
-- ============================================================================

CREATE OR REPLACE FUNCTION send_email_notification_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_resend_api_key TEXT;
  v_sender_email TEXT;
  v_reporter_email TEXT;
  v_reporter_name TEXT;
  v_ticket_id TEXT;
  v_title TEXT;
  v_address TEXT;
  v_petugas_name TEXT;
  v_status_label TEXT;
  v_status_color TEXT;
  v_status_badge_bg TEXT;
  v_headline TEXT;
  v_status_desc TEXT;
  v_next_step TEXT;
  v_email_subject TEXT;
  v_email_html TEXT;
  v_report_url TEXT;
  v_step_progress_html TEXT;
  v_cta_text TEXT;
  v_request_id BIGINT;
BEGIN
  -- Ambil konfigurasi API Key
  SELECT value INTO v_resend_api_key FROM system_settings WHERE key = 'resend_api_key';
  SELECT value INTO v_sender_email FROM system_settings WHERE key = 'sender_email';

  -- Jika API key belum diset atau masih placeholder, lewati pengiriman
  IF v_resend_api_key IS NULL OR v_resend_api_key = 're_YOUR_RESEND_API_KEY_HERE' THEN
    RETURN NEW;
  END IF;

  -- Ambil data laporan, nama petugas (jika ada), dan data profil pelapor
  SELECT 
    r.ticket_id, 
    r.title, 
    COALESCE(r.address, 'Lokasi terdaftar pada peta'),
    p.email,
    COALESCE(p.full_name, 'Warga Sahabat Kota'),
    COALESCE(pt.full_name, 'Tim Teknis Dinas Terkait')
  INTO 
    v_ticket_id, 
    v_title, 
    v_address, 
    v_reporter_email, 
    v_reporter_name,
    v_petugas_name
  FROM reports r
  JOIN profiles p ON p.id = r.reporter_id
  LEFT JOIN profiles pt ON pt.id = r.assigned_petugas_id
  WHERE r.id = NEW.report_id;

  -- Jika email pelapor tidak ditemukan, lewati
  IF v_reporter_email IS NULL OR v_reporter_email = '' THEN
    RETURN NEW;
  END IF;

  -- Susun Copywriting Ramah, Detail, Menghibur, dan Enjoy Berdasarkan Status
  CASE NEW.to_status
    WHEN 'verified' THEN
      v_status_label    := '✓ TERVERIFIKASI RESMI';
      v_status_color    := '#0EA58D';
      v_status_badge_bg := '#E6F7F5';
      v_headline        := 'Kabar Baik! Laporan Anda Sudah Divalidasi Tim Kota ✨';
      v_status_desc     := 'Terima kasih banyak atas kepedulian Anda ikut menjaga kenyamanan dan ketertiban kota kita! Laporan Anda telah selesai ditinjau oleh Tim Verifikator dan dinyatakan valid sesuai data lapangan.';
      v_next_step       := '📌 <strong>Langkah Berikutnya:</strong> Tiket Anda langsung masuk ke antrean prioritas dinas terkait untuk penjadwalan regu dan penugasan armada petugas.';
      v_email_subject   := '✨ [' || v_ticket_id || '] Kabar Baik! Laporan Anda Telah Terverifikasi — CivicLedger';
      v_cta_text        := 'Pantau Progres Tiket Anda →';
      v_step_progress_html := '<div style="display:flex; justify-content:space-between; margin:20px 0; font-size:11px; text-align:center;">
        <div style="flex:1; color:#0EA58D; font-weight:bold;">● 1. Terverifikasi<br><span style="font-size:9px; color:#64748b;">(Saat Ini)</span></div>
        <div style="flex:1; color:#94a3b8;">○ 2. Penugasan</div>
        <div style="flex:1; color:#94a3b8;">○ 3. Pengerjaan</div>
        <div style="flex:1; color:#94a3b8;">○ 4. Selesai</div>
      </div>';

    WHEN 'assigned' THEN
      v_status_label    := '👷 PETUGAS DITERJUNKAN';
      v_status_color    := '#2563EB';
      v_status_badge_bg := '#EFF6FF';
      v_headline        := 'Regu Lapangan Sudah Meluncur ke Lokasi! 🚚💨';
      v_status_desc     := 'Aspirasi Anda langsung direspon cepat! Dinas teknis telah resmi mengalokasikan <strong>' || v_petugas_name || '</strong> untuk menangani permasalahan ini secara langsung.';
      v_next_step       := '📌 <strong>Langkah Berikutnya:</strong> Petugas sedang membawa perlengkapan teknis menuju titik koordinat yang Anda laporkan untuk memulai tahapan eksekusi.';
      v_email_subject   := '👷 [' || v_ticket_id || '] Petugas Sedang Meluncur ke Lokasi Anda — CivicLedger';
      v_cta_text        := 'Lihat Detail Penugasan Petugas →';
      v_step_progress_html := '<div style="display:flex; justify-content:space-between; margin:20px 0; font-size:11px; text-align:center;">
        <div style="flex:1; color:#10B981;">✓ 1. Terverifikasi</div>
        <div style="flex:1; color:#2563EB; font-weight:bold;">● 2. Ditugaskan<br><span style="font-size:9px; color:#64748b;">(Saat Ini)</span></div>
        <div style="flex:1; color:#94a3b8;">○ 3. Pengerjaan</div>
        <div style="flex:1; color:#94a3b8;">○ 4. Selesai</div>
      </div>';

    WHEN 'in_progress' THEN
      v_status_label    := '⚡ SEDANG DIKERJAKAN';
      v_status_color    := '#7C3AED';
      v_status_badge_bg := '#F5F3FF';
      v_headline        := 'Aksi Nyata Sedang Berlangsung di Lokasi! 🛠️';
      v_status_desc     := 'Petugas kami saat ini sudah tiba di lokasi dan sedang bekerja keras melakukan penanganan fisik fasilitas umum. Kami memastikan perbaikan dikerjakan dengan standar mutu terbaik dan aman.';
      v_next_step       := '📌 <strong>Langkah Berikutnya:</strong> Setelah perbaikan tuntas, petugas akan mengunggah foto bukti hasil pengerjaan (before & after) langsung ke kamar kendali laporan Anda.';
      v_email_subject   := '⚡ [' || v_ticket_id || '] Pengerjaan Sedang Berlangsung di Lapangan — CivicLedger';
      v_cta_text        := 'Buka Kamar Kendali Laporan →';
      v_step_progress_html := '<div style="display:flex; justify-content:space-between; margin:20px 0; font-size:11px; text-align:center;">
        <div style="flex:1; color:#10B981;">✓ 1. Terverifikasi</div>
        <div style="flex:1; color:#10B981;">✓ 2. Ditugaskan</div>
        <div style="flex:1; color:#7C3AED; font-weight:bold;">● 3. Dikerjakan<br><span style="font-size:9px; color:#64748b;">(Saat Ini)</span></div>
        <div style="flex:1; color:#94a3b8;">○ 4. Selesai</div>
      </div>';

    WHEN 'completed' THEN
      v_status_label    := '🎉 SELESAI TUNTAS';
      v_status_color    := '#059669';
      v_status_badge_bg := '#ECFDF5';
      v_headline        := 'Hore! Fasilitas Kota Kita Sudah Kembali Prima! 🎉🥳';
      v_status_desc     := 'Kabar gembira untuk kita semua! Pengerjaan atas laporan Anda telah <strong>selesai 100%</strong>. Lingkungan kini kembali aman, rapi, dan nyaman berkat inisiatif hebat Anda melaporkannya ke CivicLedger.';
      v_next_step       := '⭐ <strong>Yuk Beri Nilai!</strong> Petugas telah mengunggah foto bukti penyelesaian. Luangkan 5 detik untuk melihat hasilnya dan beri rating bintang (1–5 ⭐) untuk mengapresiasi kerja keras petugas kita!';
      v_email_subject   := '🎉 [' || v_ticket_id || '] Hore! Laporan Anda Telah Tuntas Selesai Ditangani — CivicLedger';
      v_cta_text        := 'Lihat Bukti Foto & Beri Rating ⭐ →';
      v_step_progress_html := '<div style="display:flex; justify-content:space-between; margin:20px 0; font-size:11px; text-align:center;">
        <div style="flex:1; color:#10B981;">✓ 1. Terverifikasi</div>
        <div style="flex:1; color:#10B981;">✓ 2. Ditugaskan</div>
        <div style="flex:1; color:#10B981;">✓ 3. Dikerjakan</div>
        <div style="flex:1; color:#059669; font-weight:bold;">✓ 4. Selesai 🎉<br><span style="font-size:9px; color:#059669;">(Tuntas)</span></div>
      </div>';

    WHEN 'rejected' THEN
      v_status_label    := '⚠️ PERLU PENYESUAIAN';
      v_status_color    := '#DC2626';
      v_status_badge_bg := '#FEF2F2';
      v_headline        := 'Pemberitahuan Terkait Laporan Anda 📝';
      v_status_desc     := 'Terima kasih atas partisipasi aktif Anda. Setelah ditinjau saksama oleh tim verifikator kota, laporan ini belum dapat kami proses saat ini dengan catatan admin: <em>"' || COALESCE(NEW.note, 'Informasi atau foto belum memenuhi kriteria verifikasi teknis.') || '"</em>';
      v_next_step       := '💡 <strong>Solusi:</strong> Jangan berkecil hati! Anda dapat memperbarui data atau membuat laporan baru dengan menyertakan foto yang lebih jelas agar segera dapat kami tindak lanjuti.';
      v_email_subject   := '📋 [' || v_ticket_id || '] Catatan Pembaruan Laporan Anda — CivicLedger';
      v_cta_text        := 'Lihat Detail & Perbarui Laporan →';
      v_step_progress_html := '';
    ELSE
      RETURN NEW; -- Jangan kirim email untuk status pending awal
  END CASE;

  -- URL tautan langsung ke detail kamar kendali laporan pelapor
  v_report_url := 'https://civicledger.id/reports/' || NEW.report_id::TEXT;

  -- Susun Desain Email HTML Premium, Hangat, Modern, & Menyenangkan
  v_email_html := '<!DOCTYPE html>
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
    .status-pill { display: inline-block; padding: 6px 16px; border-radius: 30px; font-weight: 800; font-size: 12px; color: ' || v_status_color || '; background-color: ' || v_status_badge_bg || '; border: 1px solid ' || v_status_color || '; margin-bottom: 18px; letter-spacing: 0.5px; }
    .headline { font-size: 19px; font-weight: 800; color: #0f172a; margin: 0 0 14px; line-height: 1.4; }
    .greeting { font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 8px; }
    .desc { font-size: 13.5px; line-height: 1.65; color: #475569; margin: 0 0 18px; }
    .next-box { background: #f8fafc; border-left: 4px solid ' || v_status_color || '; padding: 14px 16px; border-radius: 0 12px 12px 0; margin-bottom: 22px; font-size: 12.5px; color: #334155; line-height: 1.5; }
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
      <div class="status-pill">' || v_status_label || '</div>
      
      <div class="headline">' || v_headline || '</div>
      <div class="greeting">Halo, ' || v_reporter_name || ' 👋</div>
      
      <p class="desc">
        ' || v_status_desc || '
      </p>

      ' || v_step_progress_html || '

      <div class="next-box">
        ' || v_next_step || '
      </div>
      
      <div class="ticket-box">
        <div class="ticket-title">📋 Ringkasan Tiket Laporan Anda:</div>
        <table class="ticket-table">
          <tr>
            <td class="label-col">Nomor Tiket:</td>
            <td class="val-col" style="font-family:monospace; color:#0EA58D;">' || v_ticket_id || '</td>
          </tr>
          <tr>
            <td class="label-col">Judul Laporan:</td>
            <td class="val-col">' || v_title || '</td>
          </tr>
          <tr>
            <td class="label-col">Lokasi Kejadian:</td>
            <td class="val-col" style="font-weight:500;">' || v_address || '</td>
          </tr>
          <tr>
            <td class="label-col">Waktu Update:</td>
            <td class="val-col" style="font-weight:500;">' || to_char(now() AT TIME ZONE 'Asia/Jakarta', 'DD Mon YYYY, HH24:MI') || ' WIB</td>
          </tr>
        </table>
      </div>

      <div class="btn-container">
        <a href="' || v_report_url || '" class="btn">
          ' || v_cta_text || '
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
        © ' || to_char(now(), 'YYYY') || ' CivicLedger Republik Indonesia. Hak Cipta Dilindungi.
      </span>
    </div>
  </div>
</body>
</html>';

  -- 4. Kirim HTTP Request ke Resend API menggunakan pg_net
  SELECT extensions.net_http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_resend_api_key
    ),
    body := jsonb_build_object(
      'from', v_sender_email,
      'to', jsonb_build_array(v_reporter_email),
      'subject', v_email_subject,
      'html', v_email_html
    )
  ) INTO v_request_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Mencegah error email menggagalkan proses database
  RAISE WARNING 'Gagal mengirimkan notifikasi email: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 4. Pasang Trigger pada tabel status_logs
-- ============================================================================
DROP TRIGGER IF EXISTS trg_send_email_on_status_change ON status_logs;

CREATE TRIGGER trg_send_email_on_status_change
  AFTER INSERT ON status_logs
  FOR EACH ROW
  EXECUTE FUNCTION send_email_notification_on_status_change();
