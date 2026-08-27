import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme/app_theme.dart';
import '../models/profile_model.dart';
import '../models/report_model.dart';
import '../services/supabase_service.dart';
import '../services/biometric_service.dart';
import 'login_screen.dart';
import 'attendance_screen.dart';

class ProfileTab extends StatefulWidget {
  const ProfileTab({super.key});

  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  ProfileModel? _profile;
  List<ReportModel> _tasks = [];
  bool _isLoading = true;
  bool _isOnDuty = true;
  bool _isBiometricEnabled = false;

  @override
  void initState() {
    super.initState();
    _loadProfileAndStats();
    _loadBiometricStatus();
  }

  Future<void> _loadBiometricStatus() async {
    final enabled = await BiometricService.instance.isBiometricEnabled();
    if (mounted) {
      setState(() {
        _isBiometricEnabled = enabled;
      });
    }
  }

  Future<void> _toggleBiometric(bool value) async {
    final isAvailable = await BiometricService.instance.isBiometricAvailable();
    if (!isAvailable && value) {
      if (!mounted) return;
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              const Icon(Icons.fingerprint_rounded, color: AppColors.amber, size: 26),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Sensor Belum Terdaftar',
                  style: GoogleFonts.spaceGrotesk(fontSize: 14, fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
          content: Text(
            'Perangkat ini belum mendaftarkan sidik jari di pengaturan sistem Android/iOS. Silakan buka Pengaturan HP > Keamanan > Sidik Jari untuk mendaftarkan sidik jari Anda terlebih dahulu.',
            style: GoogleFonts.plusJakartaSans(fontSize: 12.5, height: 1.4),
          ),
          actions: [
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.obsidian,
                foregroundColor: Colors.white,
              ),
              onPressed: () => Navigator.pop(context),
              child: const Text('MENGERTI'),
            ),
          ],
        ),
      );
      return;
    }

    if (value) {
      final didAuth = await BiometricService.instance.authenticate(
        reason: 'Pindai sidik jari Anda untuk mengaktifkan biometrik pada akun ini',
      );
      if (didAuth) {
        await BiometricService.instance.setBiometricEnabled(true);
        if (mounted) {
          setState(() => _isBiometricEnabled = true);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Verifikasi sidik jari berhasil diaktifkan pada perangkat ini.'),
              backgroundColor: AppColors.emerald,
            ),
          );
        }
      }
    } else {
      await BiometricService.instance.setBiometricEnabled(false);
      if (mounted) {
        setState(() => _isBiometricEnabled = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Verifikasi sidik jari dinonaktifkan.')),
        );
      }
    }
  }

  Future<void> _loadProfileAndStats() async {
    setState(() => _isLoading = true);
    final results = await Future.wait([
      SupabaseService.instance.getOfficerProfile(),
      SupabaseService.instance.getOfficerTasks(),
    ]);

    if (mounted) {
      setState(() {
        _profile = results[0] as ProfileModel?;
        _tasks = results[1] as List<ReportModel>;
        _isLoading = false;
      });
    }
  }

  int get _completedCount => _tasks.where((t) => t.isCompleted).length;
  int get _activeCount => _tasks.where((t) => t.isAssigned || t.isInProgress).length;

  double get _averageRating {
    final ratedTasks = _tasks.where((t) => t.rating != null && t.rating! > 0).toList();
    if (ratedTasks.isEmpty) return 5.0; // Default high rating for new officers
    final total = ratedTasks.fold<int>(0, (sum, t) => sum + t.rating!);
    return total / ratedTasks.length;
  }

  Future<void> _handleLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Keluar dari Aplikasi?',
          style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.w700),
        ),
        content: const Text('Pastikan semua laporan aktif telah diselesaikan atau dicatat sebelum keluar.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.rose,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Keluar'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    await SupabaseService.instance.signOut();
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (context) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: AppColors.obsidian),
        ),
      );
    }

    final profile = _profile;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Profil Petugas',
          style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.w800),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadProfileAndStats,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // Officer Profile Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.border),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 36,
                    backgroundColor: AppColors.obsidian,
                    child: Text(
                      (profile?.fullName ?? 'P').substring(0, 1).toUpperCase(),
                      style: GoogleFonts.spaceGrotesk(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    profile?.fullName ?? 'Petugas Lapangan',
                    style: GoogleFonts.spaceGrotesk(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    profile?.department ?? 'Dinas Pekerjaan Umum & Lingkungan Hidup',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.emeraldLight,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      'ROLE: PETUGAS LAPANGAN RESMI',
                      style: GoogleFonts.ibmPlexMono(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: AppColors.emerald,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Performance KPI Cards
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(14),
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
                              'SELESAI',
                              style: GoogleFonts.ibmPlexMono(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.emerald),
                            ),
                            const Icon(Icons.check_circle_rounded, size: 16, color: AppColors.emerald),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '$_completedCount',
                          style: GoogleFonts.spaceGrotesk(fontSize: 22, fontWeight: FontWeight.w800),
                        ),
                        Text(
                          'Laporan Tuntas',
                          style: GoogleFonts.plusJakartaSans(fontSize: 11, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(14),
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
                              'KEPUASAN',
                              style: GoogleFonts.ibmPlexMono(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.amber),
                            ),
                            const Icon(Icons.star_rounded, size: 18, color: AppColors.amber),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _averageRating.toStringAsFixed(1),
                          style: GoogleFonts.spaceGrotesk(fontSize: 22, fontWeight: FontWeight.w800),
                        ),
                        Text(
                          'Rating Warga',
                          style: GoogleFonts.plusJakartaSans(fontSize: 11, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(14),
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
                              'BERJALAN',
                              style: GoogleFonts.ibmPlexMono(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.blue),
                            ),
                            const Icon(Icons.pending_actions_rounded, size: 16, color: AppColors.blue),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '$_activeCount',
                          style: GoogleFonts.spaceGrotesk(fontSize: 22, fontWeight: FontWeight.w800),
                        ),
                        Text(
                          'Tugas Aktif',
                          style: GoogleFonts.plusJakartaSans(fontSize: 11, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Duty Status Toggle
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: _isOnDuty ? AppColors.emerald : AppColors.textMuted,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Status Siap Bertugas',
                            style: GoogleFonts.spaceGrotesk(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          Text(
                            _isOnDuty ? 'Menerima penugasan baru dari Admin' : 'Sedang tidak menerima tugas baru',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 11,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  Switch(
                    value: _isOnDuty,
                    activeThumbColor: AppColors.emerald,
                    onChanged: (val) {
                      setState(() => _isOnDuty = val);
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Information List
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.email_outlined, size: 20, color: AppColors.obsidian),
                    title: Text(
                      'Email Terdaftar',
                      style: GoogleFonts.spaceGrotesk(fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                    subtitle: Text(
                      profile?.email ?? SupabaseService.instance.currentUser?.email ?? '-',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                  const Divider(height: 1, indent: 56),
                  ListTile(
                    leading: const Icon(Icons.phone_outlined, size: 20, color: AppColors.obsidian),
                    title: Text(
                      'No. Handphone / WhatsApp',
                      style: GoogleFonts.spaceGrotesk(fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                    subtitle: Text(
                      profile?.phone ?? '+62 812-3456-7890',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                  const Divider(height: 1, indent: 56),
                  ListTile(
                    leading: const Icon(Icons.fingerprint_rounded, size: 22, color: AppColors.emerald),
                    title: Text(
                      'Presensi & Disiplin Lapangan',
                      style: GoogleFonts.spaceGrotesk(fontSize: 13, fontWeight: FontWeight.w700),
                    ),
                    subtitle: const Text(
                      'Absen Masuk, Istirahat, dan Pulang berbasis GPS',
                      style: TextStyle(fontSize: 11.5),
                    ),
                    trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.textMuted),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const AttendanceScreen()),
                      );
                    },
                  ),
                  const Divider(height: 1, indent: 56),
                  SwitchListTile(
                    secondary: const Icon(Icons.fingerprint_rounded, size: 24, color: AppColors.emerald),
                    title: Text(
                      'Kunci Biometrik / Sidik Jari',
                      style: GoogleFonts.spaceGrotesk(fontSize: 13, fontWeight: FontWeight.w700),
                    ),
                    subtitle: Text(
                      _isBiometricEnabled
                          ? 'Aktif: Presensi & login instan 1 detik'
                          : 'Nonaktif: Sentuh sakelar untuk mengaktifkan',
                      style: const TextStyle(fontSize: 11.5),
                    ),
                    value: _isBiometricEnabled,
                    activeThumbColor: AppColors.emerald,
                    onChanged: _toggleBiometric,
                  ),
                  const Divider(height: 1, indent: 56),
                  ListTile(
                    leading: const Icon(Icons.verified_user_outlined, size: 20, color: AppColors.obsidian),
                    title: Text(
                      'Versi Aplikasi Petugas',
                      style: GoogleFonts.spaceGrotesk(fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                    subtitle: const Text(
                      'CivicLedger Tactical Field v2.0 (Build 2)',
                      style: TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Logout Button
            OutlinedButton.icon(
              onPressed: _handleLogout,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.rose,
                side: const BorderSide(color: AppColors.rose),
                minimumSize: const Size.fromHeight(50),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              icon: const Icon(Icons.logout_rounded, size: 18),
              label: Text(
                'KELUAR DARI AKUN',
                style: GoogleFonts.spaceGrotesk(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
