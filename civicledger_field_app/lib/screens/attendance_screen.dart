import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../core/theme/app_theme.dart';
import '../models/attendance_model.dart';
import '../services/biometric_service.dart';
import '../services/supabase_service.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  DateTime _currentTime = DateTime.now();
  Timer? _timer;
  Position? _currentPosition;
  String _currentAddress = 'Mendeteksi koordinat GPS...';
  bool _isLoadingGps = true;
  bool _isSubmitting = false;
  bool _isBiometricSupported = false;

  List<AttendanceModel> _todayLogs = [];
  StreamSubscription<List<AttendanceModel>>? _streamSub;

  // Attendance state flags
  bool get hasCheckedIn => _todayLogs.any((l) => l.type == 'check_in');
  bool get isOnBreak {
    final breaks = _todayLogs.where((l) => l.type == 'break_start' || l.type == 'break_end').toList();
    if (breaks.isEmpty) return false;
    return breaks.last.type == 'break_start';
  }
  bool get hasCheckedOut => _todayLogs.any((l) => l.type == 'check_out');

  @override
  void initState() {
    super.initState();
    _startClock();
    _checkBiometricSupport();
    _fetchGpsLocation();
    _loadTodayAttendance();
    _subscribeAttendanceStream();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _streamSub?.cancel();
    super.dispose();
  }

  void _startClock() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) setState(() => _currentTime = DateTime.now());
    });
  }

  Future<void> _checkBiometricSupport() async {
    final available = await BiometricService.instance.isBiometricAvailable();
    if (mounted) setState(() => _isBiometricSupported = available);
  }

  void _subscribeAttendanceStream() {
    try {
      _streamSub = SupabaseService.instance.getTodayAttendanceStream().listen((logs) {
        if (mounted) setState(() => _todayLogs = logs);
      });
    } catch (_) {}
  }

  Future<void> _loadTodayAttendance() async {
    try {
      final logs = await SupabaseService.instance.getTodayAttendance();
      if (mounted) setState(() => _todayLogs = logs);
    } catch (_) {}
  }

  Future<void> _fetchGpsLocation() async {
    setState(() => _isLoadingGps = true);
    try {
      final perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 4),
        ),
      );
      if (mounted) {
        setState(() {
          _currentPosition = pos;
          _currentAddress = 'Lat: ${pos.latitude.toStringAsFixed(5)}, Long: ${pos.longitude.toStringAsFixed(5)}';
          _isLoadingGps = false;
        });
      }
    } catch (_) {
      final lastPos = await Geolocator.getLastKnownPosition();
      if (mounted) {
        setState(() {
          _currentPosition = lastPos;
          _currentAddress = lastPos != null
              ? 'Lat: ${lastPos.latitude.toStringAsFixed(5)}, Long: ${lastPos.longitude.toStringAsFixed(5)} (Terakhir)'
              : 'GPS Terkunci (Area Penugasan Kota)';
          _isLoadingGps = false;
        });
      }
    }
  }

  String _getActionTitle(String type) {
    switch (type) {
      case 'check_in':
        return 'Absen Masuk';
      case 'break_start':
        return 'Mulai Istirahat';
      case 'break_end':
        return 'Selesai Istirahat';
      case 'check_out':
        return 'Absen Pulang';
      default:
        return 'Presensi';
    }
  }

  Future<bool> _showPasswordFallbackDialog(String actionTitle) async {
    final passwordController = TextEditingController();
    bool isVerifying = false;
    String? errorText;

    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: Row(
                children: [
                  const Icon(Icons.shield_outlined, color: AppColors.amber, size: 24),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Verifikasi Manual: $actionTitle',
                      style: GoogleFonts.spaceGrotesk(fontSize: 14, fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Sensor biometrik tidak terbaca atau dibatalkan. Masukkan kata sandi akun petugas Anda untuk konfirmasi presensi resmi.',
                    style: GoogleFonts.plusJakartaSans(fontSize: 12, height: 1.4),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: passwordController,
                    obscureText: true,
                    decoration: InputDecoration(
                      hintText: 'Kata Sandi Akun',
                      errorText: errorText,
                      prefixIcon: const Icon(Icons.lock_outline_rounded, size: 18),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: isVerifying ? null : () => Navigator.pop(context, false),
                  child: const Text('BATAL'),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.obsidian,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: isVerifying
                      ? null
                      : () async {
                          if (passwordController.text.trim().isEmpty) {
                            setDialogState(() => errorText = 'Kata sandi wajib diisi');
                            return;
                          }
                          setDialogState(() {
                            isVerifying = true;
                            errorText = null;
                          });

                          try {
                            final email = SupabaseService.instance.currentUser?.email ?? '';
                            await SupabaseService.instance.signInWithEmail(
                              email: email,
                              password: passwordController.text.trim(),
                            );
                            if (context.mounted) Navigator.pop(context, true);
                          } catch (e) {
                            setDialogState(() {
                              isVerifying = false;
                              errorText = 'Kata sandi salah. Coba lagi.';
                            });
                          }
                        },
                  child: isVerifying
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('KONFIRMASI'),
                ),
              ],
            );
          },
        );
      },
    );

    return result ?? false;
  }

  Future<void> _handleAttendanceAction(String type) async {
    final actionTitle = _getActionTitle(type);
    String authMethod = 'biometric';

    // 1. Biometric Hardware Verification
    if (_isBiometricSupported) {
      final didAuthenticate = await BiometricService.instance.authenticate(
        reason: 'Pindai sidik jari Anda untuk mengonfirmasi $actionTitle resmi dinas.',
      );

      if (!didAuthenticate) {
        // Fallback to Password Authentication
        final fallbackSuccess = await _showPasswordFallbackDialog(actionTitle);
        if (!fallbackSuccess) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Presensi dibatalkan. Identitas tidak terverifikasi.'),
                backgroundColor: AppColors.rose,
              ),
            );
          }
          return;
        }
        authMethod = 'password_fallback';
      }
    }

    setState(() => _isSubmitting = true);
    final now = DateTime.now();
    final isLate = type == 'check_in' && (now.hour > 8 || (now.hour == 8 && now.minute > 0));

    try {
      final log = await SupabaseService.instance.recordAttendance(
        type: type,
        authMethod: authMethod,
        latitude: _currentPosition?.latitude,
        longitude: _currentPosition?.longitude,
        address: _currentAddress,
      );

      if (!mounted) return;

      // Haptic Vibration feedback
      HapticFeedback.mediumImpact();

      // Show specific dialogs based on action
      if (type == 'check_in') {
        _showCheckInResultDialog(isLate, log.formattedTime, authMethod);
      } else if (type == 'break_start') {
        _showBreakStartDialog(log.formattedTime, authMethod);
      } else if (type == 'break_end') {
        _showBreakEndDialog(log.formattedTime, authMethod);
      } else if (type == 'check_out') {
        _showCheckOutDialog(log.formattedTime, authMethod);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mencatat presensi: $e'), backgroundColor: AppColors.rose),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _showCheckInResultDialog(bool isLate, String time, String authMethod) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(
              isLate ? Icons.warning_amber_rounded : Icons.check_circle_rounded,
              color: isLate ? AppColors.rose : AppColors.emerald,
              size: 26,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                isLate ? 'PERINGATAN TELAT MASUK' : 'PRESENSI MASUK BERHASIL',
                style: GoogleFonts.spaceGrotesk(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: isLate ? AppColors.rose : AppColors.textPrimary,
                ),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isLate
                  ? 'Anda tercatat melakukan Absen Masuk pada pukul $time WIB (Batas jam kerja masuk: 08:00 WIB).'
                  : 'Selamat bertugas! Absen Masuk tercatat tepat waktu pada pukul $time WIB.',
              style: const TextStyle(fontSize: 13, height: 1.4),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isLate ? AppColors.roseLight : AppColors.emeraldLight,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.location_on_rounded, size: 14, color: isLate ? AppColors.rose : AppColors.emerald),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          _currentAddress,
                          style: GoogleFonts.ibmPlexMono(fontSize: 10, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(
                        authMethod == 'biometric' ? Icons.fingerprint_rounded : Icons.lock_clock_rounded,
                        size: 14,
                        color: authMethod == 'biometric' ? AppColors.emerald : AppColors.amber,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        authMethod == 'biometric' ? 'Kredensial: Sidik Jari Sah' : 'Kredensial: Verifikasi Manual',
                        style: GoogleFonts.ibmPlexMono(fontSize: 10, fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: isLate ? AppColors.rose : AppColors.obsidian,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(context),
            child: const Text('MENGERTI'),
          ),
        ],
      ),
    );
  }

  void _showBreakStartDialog(String time, String authMethod) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.coffee_rounded, color: AppColors.amber, size: 24),
            const SizedBox(width: 8),
            Text('WAKTU ISTIRAHAT DIMULAI', style: GoogleFonts.spaceGrotesk(fontSize: 14, fontWeight: FontWeight.w800)),
          ],
        ),
        content: Text(
          'Istirahat tercatat pukul $time WIB (Verifikasi: ${authMethod == 'biometric' ? 'Sidik Jari' : 'Password'}). Durasi standar istirahat adalah maksimal 60 menit.',
          style: const TextStyle(fontSize: 13),
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.obsidian, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(context),
            child: const Text('OK, SIAP'),
          ),
        ],
      ),
    );
  }

  void _showBreakEndDialog(String time, String authMethod) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.work_history_rounded, color: AppColors.emerald, size: 24),
            const SizedBox(width: 8),
            Text('KEMBALI BERTUGAS', style: GoogleFonts.spaceGrotesk(fontSize: 14, fontWeight: FontWeight.w800)),
          ],
        ),
        content: Text(
          'Selesai istirahat tercatat pukul $time WIB. Status operasional Anda telah aktif kembali di radar Posko.',
          style: const TextStyle(fontSize: 13),
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.obsidian, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(context),
            child: const Text('LANJUTKAN TUGAS'),
          ),
        ],
      ),
    );
  }

  void _showCheckOutDialog(String time, String authMethod) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.task_alt_rounded, color: AppColors.emerald, size: 24),
            const SizedBox(width: 8),
            Text('ABSEN PULANG TERCATAT', style: GoogleFonts.spaceGrotesk(fontSize: 14, fontWeight: FontWeight.w800)),
          ],
        ),
        content: Text(
          'Terima kasih atas dedikasi dan kerja keras Anda hari ini! Presensi pulang tercatat pukul $time WIB.',
          style: const TextStyle(fontSize: 13),
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.obsidian, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(context),
            child: const Text('TUTUP'),
          ),
        ],
      ),
    );
  }

  String _formatIndonesianDate(DateTime dt) {
    try {
      return DateFormat('EEEE, dd MMMM yyyy', 'id_ID').format(dt);
    } catch (_) {
      const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      final dayName = days[dt.weekday - 1];
      final monthName = months[dt.month - 1];
      return '$dayName, ${dt.day} $monthName ${dt.year}';
    }
  }

  @override
  Widget build(BuildContext context) {
    final timeStr = DateFormat('HH:mm:ss').format(_currentTime);
    final dateStr = _formatIndonesianDate(_currentTime);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Presensi & Disiplin Lapangan'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () {
              _fetchGpsLocation();
              _loadTodayAttendance();
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Tactical Live Clock Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.obsidian,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.obsidian.withValues(alpha: 0.25),
                    blurRadius: 15,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.emerald,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'WAKTU OPERASIONAL REALTIME (WIB)',
                        style: GoogleFonts.ibmPlexMono(
                          color: Colors.white70,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    timeStr,
                    style: GoogleFonts.spaceGrotesk(
                      color: Colors.white,
                      fontSize: 38,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 2,
                    ),
                  ),
                  Text(
                    dateStr,
                    style: GoogleFonts.plusJakartaSans(
                      color: Colors.white54,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.white12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.my_location_rounded, color: AppColors.amber, size: 14),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            _isLoadingGps ? 'Mengunci GPS...' : _currentAddress,
                            style: GoogleFonts.ibmPlexMono(
                              color: Colors.white70,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // Biometric Protection Banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: _isBiometricSupported ? AppColors.emeraldLight : AppColors.amberLight,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _isBiometricSupported
                      ? AppColors.emerald.withValues(alpha: 0.3)
                      : AppColors.amber.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    _isBiometricSupported ? Icons.fingerprint_rounded : Icons.info_outline_rounded,
                    size: 20,
                    color: _isBiometricSupported ? AppColors.emerald : AppColors.amber,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _isBiometricSupported
                          ? 'Perlindungan Biometrik Aktif: Setiap presensi diverifikasi sensor sidik jari perangkat.'
                          : 'Sensor Biometrik Tidak Ditemukan: Presensi dialihkan ke verifikasi kata sandi manual.',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: _isBiometricSupported ? AppColors.emerald : AppColors.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 18),

            // Action Buttons Grid (4 Core States)
            Text(
              'AKSI PRESENSI HARI INI',
              style: GoogleFonts.spaceGrotesk(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 10),

            Row(
              children: [
                // 1. Check-In Button
                Expanded(
                  child: _buildAttendanceActionCard(
                    title: 'Absen Masuk',
                    subtitle: hasCheckedIn ? 'Sudah Masuk' : 'Batas 08:00 WIB',
                    icon: Icons.fingerprint_rounded,
                    color: AppColors.emerald,
                    isEnabled: !hasCheckedIn && !_isSubmitting,
                    onTap: () => _handleAttendanceAction('check_in'),
                  ),
                ),
                const SizedBox(width: 12),
                // 2. Break Button (Toggle start/end)
                Expanded(
                  child: _buildAttendanceActionCard(
                    title: isOnBreak ? 'Selesai Istirahat' : 'Mulai Istirahat',
                    subtitle: isOnBreak ? 'Sedang Istirahat' : 'Maks. 60 Menit',
                    icon: isOnBreak ? Icons.work_history_rounded : Icons.coffee_rounded,
                    color: isOnBreak ? AppColors.rose : AppColors.amber,
                    isEnabled: hasCheckedIn && !hasCheckedOut && !_isSubmitting,
                    onTap: () => _handleAttendanceAction(isOnBreak ? 'break_end' : 'break_start'),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // 3. Check-Out Button
            _buildAttendanceActionCard(
              title: 'Absen Pulang (Selesai Dinas)',
              subtitle: hasCheckedOut
                  ? 'Sudah Absen Pulang'
                  : hasCheckedIn
                      ? 'Pindai sidik jari & simpan rekap dinas'
                      : 'Lakukan absen masuk terlebih dahulu',
              icon: Icons.logout_rounded,
              color: AppColors.obsidian,
              isEnabled: hasCheckedIn && !hasCheckedOut && !isOnBreak && !_isSubmitting,
              onTap: () => _handleAttendanceAction('check_out'),
              isFullWidth: true,
            ),

            const SizedBox(height: 24),

            // Today's Milestones Timeline
            Text(
              'LOG RIWAYAT PRESENSI HARI INI',
              style: GoogleFonts.spaceGrotesk(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 10),

            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: _todayLogs.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 20.0),
                        child: Text(
                          'Belum ada presensi yang tercatat untuk hari ini.',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 12,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ),
                    )
                  : ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _todayLogs.length,
                      separatorBuilder: (context, index) => const Divider(height: 20),
                      itemBuilder: (context, index) {
                        final log = _todayLogs[index];
                        final isLate = log.status == 'late';
                        final isBiometric = log.authMethod == 'biometric';

                        return Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: log.statusColor.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Icon(log.typeIcon, color: log.statusColor, size: 20),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        log.typeLabel,
                                        style: GoogleFonts.spaceGrotesk(
                                          fontWeight: FontWeight.w800,
                                          fontSize: 13,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                      if (isLate) ...[
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                          decoration: BoxDecoration(
                                            color: AppColors.roseLight,
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            'TERLAMBAT',
                                            style: GoogleFonts.ibmPlexMono(
                                              color: AppColors.rose,
                                              fontSize: 9,
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                        ),
                                      ],
                                      const SizedBox(width: 6),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                        decoration: BoxDecoration(
                                          color: isBiometric ? AppColors.emeraldLight : AppColors.amberLight,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              isBiometric ? Icons.fingerprint_rounded : Icons.lock_clock_outlined,
                                              size: 10,
                                              color: isBiometric ? AppColors.emerald : AppColors.amber,
                                            ),
                                            const SizedBox(width: 3),
                                            Text(
                                              isBiometric ? 'SIDIK JARI SAH' : 'MANUAL',
                                              style: GoogleFonts.ibmPlexMono(
                                                color: isBiometric ? AppColors.emerald : AppColors.amber,
                                                fontSize: 8.5,
                                                fontWeight: FontWeight.w800,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  Text(
                                    log.address ?? 'Koordinat Tercatat',
                                    style: GoogleFonts.plusJakartaSans(
                                      fontSize: 11,
                                      color: AppColors.textSecondary,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              '${log.formattedTime} WIB',
                              style: GoogleFonts.ibmPlexMono(
                                fontWeight: FontWeight.w700,
                                fontSize: 12,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAttendanceActionCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required bool isEnabled,
    required VoidCallback onTap,
    bool isFullWidth = false,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: isEnabled ? onTap : null,
        borderRadius: BorderRadius.circular(16),
        child: Opacity(
          opacity: isEnabled ? 1.0 : 0.45,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isEnabled ? color.withValues(alpha: 0.5) : AppColors.border,
                width: isEnabled ? 1.5 : 1,
              ),
              boxShadow: isEnabled
                  ? [
                      BoxShadow(
                        color: color.withValues(alpha: 0.08),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ]
                  : [],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: color, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: GoogleFonts.spaceGrotesk(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        subtitle,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 10.5,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                if (isEnabled)
                  Icon(Icons.arrow_forward_ios_rounded, size: 12, color: color),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
