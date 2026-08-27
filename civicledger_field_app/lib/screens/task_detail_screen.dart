import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';
import 'package:geolocator/geolocator.dart';
import '../core/theme/app_theme.dart';
import '../models/report_model.dart';
import '../services/supabase_service.dart';
import '../core/utils/navigation_helper.dart';
import '../widgets/before_after_slider.dart';
import '../widgets/officer_chat_sheet.dart';
import 'complete_task_screen.dart';

class TaskDetailScreen extends StatefulWidget {
  final String reportId;

  const TaskDetailScreen({
    super.key,
    required this.reportId,
  });

  @override
  State<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends State<TaskDetailScreen> {
  ReportModel? _report;
  bool _isLoading = true;
  bool _isActionLoading = false;
  Position? _currentPosition;

  @override
  void initState() {
    super.initState();
    _fetchReportDetail();
    _getLiveLocation();
  }

  Future<void> _getLiveLocation() async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium),
      );
      if (mounted) setState(() => _currentPosition = pos);
    } catch (_) {}
  }

  double? _getDistanceToTask() {
    if (_currentPosition == null || _report?.latitude == null || _report?.longitude == null) return null;
    return Geolocator.distanceBetween(
          _currentPosition!.latitude,
          _currentPosition!.longitude,
          _report!.latitude!,
          _report!.longitude!,
        ) /
        1000.0;
  }

  Future<void> _fetchReportDetail() async {
    setState(() => _isLoading = true);
    try {
      final data = await SupabaseService.instance.getReportDetail(widget.reportId);
      setState(() {
        _report = data;
      });
    } catch (_) {}
    setState(() => _isLoading = false);
  }

  Future<void> _handleStartWork() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Mulai Penanganan?',
          style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.w700),
        ),
        content: const Text(
          'Status akan diperbarui menjadi "Sedang Dikerjakan" dan warga pelapor akan mendapatkan notifikasi kedatangan Anda di lokasi.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.amber,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Mulai Kerjakan'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isActionLoading = true);
    try {
      await SupabaseService.instance.startWorkingOnReport(widget.reportId);
      await _fetchReportDetail();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Status penanganan berhasil dimulai! Warga telah dinotifikasi.'),
          backgroundColor: AppColors.amber,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal memperbarui status: $e'),
          backgroundColor: AppColors.rose,
        ),
      );
    } finally {
      if (mounted) setState(() => _isActionLoading = false);
    }
  }

  void _showChatSheet() {
    if (_report == null) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => OfficerChatSheet(
        reportId: _report!.id,
        ticketId: _report!.ticketId,
      ),
    );
  }

  void _showEscalationDialog() {
    final reasonController = TextEditingController();
    String selectedDept = 'Dinas PUPR (Alat Berat / Aspal)';
    String selectedUrgency = 'Tinggi';

    final deptList = [
      'Dinas PUPR (Alat Berat / Aspal)',
      'Dinas Lingkungan Hidup (Armada Sampah)',
      'Dinas Pemadam Kebakaran & Penyelamatan',
      'PLN (Kelistrikan & Kabel Udara)',
      'Dinas Perhubungan (Rambu & Lampu Jalan)',
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
            top: 20,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: AppColors.rose, size: 24),
                  const SizedBox(width: 8),
                  Text(
                    'Minta Bantuan / Eskalasi',
                    style: GoogleFonts.spaceGrotesk(fontSize: 18, fontWeight: FontWeight.w800),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Kirimkan permintaan armada bantuan unit dinas terkait jika penanganan butuh alat khusus.',
                style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 16),
              Text('Dinas / Instansi Tujuan:', style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.w700, fontSize: 13)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: selectedDept,
                decoration: InputDecoration(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
                items: deptList.map((d) => DropdownMenuItem(value: d, child: Text(d, style: const TextStyle(fontSize: 12.5)))).toList(),
                onChanged: (val) => setModalState(() => selectedDept = val!),
              ),
              const SizedBox(height: 14),
              Text('Alasan Eskalasi Lapangan:', style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.w700, fontSize: 13)),
              const SizedBox(height: 6),
              TextField(
                controller: reasonController,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Contoh: Butuh crane pemotong dahan besar atau alat tambal aspal panas.',
                  hintStyle: const TextStyle(fontSize: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.rose,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.send_rounded, size: 18),
                label: Text(
                  'KIRIM PERMINTAAN ESKALASI',
                  style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.w800, fontSize: 13),
                ),
                onPressed: () async {
                  if (reasonController.text.trim().isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Alasan eskalasi wajib diisi.'), backgroundColor: AppColors.rose),
                    );
                    return;
                  }
                  Navigator.pop(ctx);
                  try {
                    await SupabaseService.instance.requestEscalation(
                      reportId: widget.reportId,
                      targetDepartment: selectedDept,
                      reason: reasonController.text.trim(),
                      urgency: selectedUrgency,
                    );
                    if (!mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Permintaan eskalasi berhasil tercatat dan diteruskan ke Posko Komando!'),
                        backgroundColor: AppColors.emerald,
                      ),
                    );
                    _fetchReportDetail();
                  } catch (e) {
                    if (!mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Gagal eskalasi: $e'), backgroundColor: AppColors.rose),
                    );
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currentUserId = SupabaseService.instance.currentUser?.id;
    final dateFormat = DateFormat('dd MMMM yyyy, HH:mm WIB');

    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: AppColors.obsidian),
        ),
      );
    }

    if (_report == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Rincian Tugas')),
        body: const Center(child: Text('Data laporan tidak ditemukan.')),
      );
    }

    final report = _report!;
    final isMyTask = report.assignedTo == currentUserId;
    final dist = _getDistanceToTask();

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Tiket #${report.ticketId}',
          style: GoogleFonts.spaceGrotesk(fontSize: 16, fontWeight: FontWeight.w700),
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.forum_outlined),
            tooltip: 'Chat Posko Admin',
            onPressed: _showChatSheet,
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchReportDetail,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Assignment / Responsibility Banner
            Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isMyTask
                    ? AppColors.emeraldLight
                    : report.assignedPetugasName != null
                        ? AppColors.amberLight
                        : AppColors.background,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isMyTask
                      ? AppColors.emerald.withValues(alpha: 0.4)
                      : report.assignedPetugasName != null
                          ? AppColors.amber.withValues(alpha: 0.4)
                          : AppColors.border,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    isMyTask
                        ? Icons.verified_user_rounded
                        : report.assignedPetugasName != null
                            ? Icons.engineering_rounded
                            : Icons.help_outline_rounded,
                    color: isMyTask
                        ? AppColors.emerald
                        : report.assignedPetugasName != null
                            ? AppColors.amber
                            : AppColors.textSecondary,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isMyTask
                              ? 'PENUGASAN RESMI KEPADA ANDA'
                              : report.assignedPetugasName != null
                                  ? 'DITUGASKAN KEPADA REKAN PETUGAS'
                                  : 'BELUM DIDISPOSISIKAN OLEH ADMIN',
                          style: GoogleFonts.ibmPlexMono(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            color: isMyTask
                                ? AppColors.emerald
                                : report.assignedPetugasName != null
                                    ? AppColors.amber
                                    : AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          isMyTask
                              ? 'Anda adalah petugas penanggung jawab tiket ini.'
                              : report.assignedPetugasName != null
                                  ? 'Petugas: ${report.assignedPetugasName} (${report.assignedPetugasPhone ?? 'Petugas Resmi'})'
                                  : 'Laporan warga menunggu proses verifikasi dan disposisi.',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Status & Priority Header
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'STATUS PENUGASAN',
                        style: GoogleFonts.ibmPlexMono(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textMuted,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: report.isCompleted
                                  ? AppColors.emerald
                                  : report.isInProgress
                                      ? AppColors.amber
                                      : AppColors.blue,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            report.statusLabel,
                            style: GoogleFonts.spaceGrotesk(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: report.isCompleted
                                  ? AppColors.emerald
                                  : report.isInProgress
                                      ? AppColors.amber
                                      : AppColors.blue,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'PRIORITAS TIKET',
                        style: GoogleFonts.ibmPlexMono(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textMuted,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: report.priority.toLowerCase() == 'urgent' || report.priority.toLowerCase() == 'darurat'
                              ? AppColors.roseLight
                              : AppColors.amberLight,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          report.priority.toUpperCase(),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: report.priority.toLowerCase() == 'urgent' || report.priority.toLowerCase() == 'darurat'
                                ? AppColors.rose
                                : AppColors.amber,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Report Title & Category
            Text(
              report.title,
              style: GoogleFonts.spaceGrotesk(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.obsidian,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    report.categoryLabel,
                    style: GoogleFonts.ibmPlexMono(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                if (report.isAnonymous)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.darkSlate.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: AppColors.darkSlate.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.shield_rounded, size: 12, color: AppColors.emerald),
                        const SizedBox(width: 4),
                        Text(
                          'Laporan Anonim',
                          style: GoogleFonts.ibmPlexMono(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                Text(
                  dateFormat.format(report.createdAt),
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // SLA Target Banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: report.isOverdue
                    ? AppColors.roseLight
                    : AppColors.blueLight.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: report.isOverdue
                      ? AppColors.rose.withValues(alpha: 0.4)
                      : AppColors.blue.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.timer_outlined,
                    size: 18,
                    color: report.isOverdue ? AppColors.rose : AppColors.blue,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'SLA Standar: ${report.slaLabel} • Target: ${dateFormat.format(report.slaTargetDate)}${report.isOverdue ? ' (Overdue)' : ''}',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: report.isOverdue ? AppColors.rose : AppColors.obsidian,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Description
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'DESKRIPSI MASALAH WARGA',
                    style: GoogleFonts.ibmPlexMono(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    report.description.isNotEmpty ? report.description : 'Tidak ada deskripsi tambahan.',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 14,
                      color: AppColors.textPrimary,
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Location Box & 1-Click Navigation
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'LOKASI PENUGASAN',
                        style: GoogleFonts.ibmPlexMono(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textMuted,
                        ),
                      ),
                      if (dist != null)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.emeraldLight,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.near_me_rounded, size: 12, color: AppColors.emerald),
                              const SizedBox(width: 4),
                              Text(
                                '± ${dist.toStringAsFixed(1)} km dari posisi Anda',
                                style: GoogleFonts.spaceGrotesk(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.emerald,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.location_on, color: AppColors.rose, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          report.address ?? 'Lokasi GPS terdaftar di sistem',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  if (report.latitude != null && report.longitude != null)
                    ElevatedButton.icon(
                      onPressed: () {
                        NavigationHelper.openGoogleMapsRoute(
                          latitude: report.latitude!,
                          longitude: report.longitude!,
                          title: report.title,
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.obsidian,
                        foregroundColor: Colors.white,
                        minimumSize: const Size.fromHeight(46),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      icon: const Icon(Icons.navigation_rounded, size: 18),
                      label: const Text('BUKA PETA & NAVIGASI RUTE (GOOGLE MAPS)'),
                    ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Comparative Before-After Photo Section if completed
            if (report.isCompleted && report.photoUrl != null && report.completionPhotoUrl != null) ...[
              BeforeAfterComparison(
                beforePhotoUrl: report.photoUrl!,
                afterPhotoUrl: report.completionPhotoUrl!,
              ),
              const SizedBox(height: 16),
            ] else ...[
              if (report.photoUrl != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'FOTO KONDISI AWAL DARI WARGA',
                        style: GoogleFonts.ibmPlexMono(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textMuted,
                        ),
                      ),
                      const SizedBox(height: 12),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: CachedNetworkImage(
                          imageUrl: report.photoUrl!,
                          height: 200,
                          width: double.infinity,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],
              if (report.completionPhotoUrl != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.emerald.withValues(alpha: 0.5)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.check_circle_rounded, color: AppColors.emerald, size: 16),
                          const SizedBox(width: 6),
                          Text(
                            'FOTO BUKTI SELESAI DI LOKASI',
                            style: GoogleFonts.ibmPlexMono(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.emerald,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: CachedNetworkImage(
                          imageUrl: report.completionPhotoUrl!,
                          height: 200,
                          width: double.infinity,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ],

            // If Completed: Show Proof Notes
            if (report.isCompleted && report.completionNotes != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.emeraldLight.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.emerald.withValues(alpha: 0.4)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.verified_rounded, color: AppColors.emerald, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'CATATAN TEKNIS PENYELESAIAN',
                            style: GoogleFonts.ibmPlexMono(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: AppColors.emerald,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            report.completionNotes!,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 12),

            // Live Chat with Admin Button
            ElevatedButton.icon(
              onPressed: _showChatSheet,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.obsidian,
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.forum_rounded, size: 18),
              label: Text(
                'CHAT DENGAN ADMIN (KENDALA & STATUS)',
                style: GoogleFonts.spaceGrotesk(fontSize: 12.5, fontWeight: FontWeight.w800),
              ),
            ),

            const SizedBox(height: 12),

            // Escalation / Request Help Button (Only if assigned to me and active)
            if (isMyTask && !report.isCompleted) ...[
              OutlinedButton.icon(
                onPressed: _showEscalationDialog,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.rose,
                  side: const BorderSide(color: AppColors.rose),
                  minimumSize: const Size.fromHeight(46),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.warning_amber_rounded, size: 18),
                label: Text(
                  'MINTA BANTUAN UNIT / ESKALASI DINAS',
                  style: GoogleFonts.spaceGrotesk(fontSize: 12.5, fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(height: 12),
            ],

            // Action Buttons (Only allowed if this report is ASSIGNED TO ME)
            if (isMyTask) ...[
              if (report.isAssigned)
                ElevatedButton.icon(
                  onPressed: _isActionLoading ? null : _handleStartWork,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.amber,
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(Icons.play_arrow_rounded, size: 22),
                  label: Text(
                    _isActionLoading ? 'MEMPERBARUI...' : 'MULAI PENGERJAAN DI LOKASI',
                    style: GoogleFonts.spaceGrotesk(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                )
              else if (report.isInProgress)
                ElevatedButton.icon(
                  onPressed: () async {
                    final result = await Navigator.push<bool>(
                      context,
                      MaterialPageRoute(
                        builder: (context) => CompleteTaskScreen(report: report),
                      ),
                    );
                    if (result == true) {
                      _fetchReportDetail();
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.emerald,
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(Icons.camera_alt_rounded, size: 20),
                  label: Text(
                    'SELESAIKAN & UNGGAH BUKTI FOTO',
                    style: GoogleFonts.spaceGrotesk(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
            ] else if (!isMyTask && !report.isCompleted) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.lock_outline_rounded, size: 16, color: AppColors.textMuted),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Mode Pantau: Tiket ini dikelola oleh ${report.assignedPetugasName ?? "petugas lain"}. Anda tidak dapat mengubah status pengerjaan.',
                        style: GoogleFonts.plusJakartaSans(fontSize: 11.5, color: AppColors.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
