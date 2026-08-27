import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lottie/lottie.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/theme/app_theme.dart';
import '../services/supabase_service.dart';
import 'loading_transition_screen.dart';
import 'login_screen.dart';

class PendingApprovalScreen extends StatefulWidget {
  final String email;
  final String officerName;

  const PendingApprovalScreen({
    super.key,
    required this.email,
    required this.officerName,
  });

  @override
  State<PendingApprovalScreen> createState() => _PendingApprovalScreenState();
}

class _PendingApprovalScreenState extends State<PendingApprovalScreen> {
  bool _isChecking = false;

  Future<void> _checkApprovalStatus() async {
    setState(() => _isChecking = true);
    final scaffold = ScaffoldMessenger.of(context);
    final nav = Navigator.of(context);

    try {
      final profile = await SupabaseService.instance.getOfficerProfile();
      if (!mounted) return;

      if (profile != null && profile.isActive) {
        scaffold.showSnackBar(
          const SnackBar(
            content: Text('Akun Anda telah disetujui oleh Admin! Menyiapkan dashboard...'),
            backgroundColor: AppColors.emerald,
          ),
        );
        nav.pushReplacement(
          MaterialPageRoute(
            builder: (context) => LoadingTransitionScreen(
              officerName: profile.fullName ?? widget.officerName,
            ),
          ),
        );
      } else {
        scaffold.showSnackBar(
          const SnackBar(
            content: Text('Akun masih dalam tahap verifikasi Admin Posko.'),
            backgroundColor: AppColors.amber,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      scaffold.showSnackBar(
        SnackBar(content: Text('Gagal memeriksa status: $e'), backgroundColor: AppColors.rose),
      );
    } finally {
      if (mounted) setState(() => _isChecking = false);
    }
  }

  Future<void> _contactAdminWhatsApp() async {
    final message = Uri.encodeComponent(
      'Halo Admin CivicLedger, saya telah mendaftar sebagai Petugas Lapangan dengan email: ${widget.email}. Mohon konfirmasi aktivasi akun saya. Terima kasih.',
    );
    final Uri waUrl = Uri.parse('https://wa.me/628111919204?text=$message');

    try {
      if (await canLaunchUrl(waUrl)) {
        await launchUrl(waUrl, mode: LaunchMode.externalApplication);
      }
    } catch (_) {}
  }

  Future<void> _handleLogout() async {
    final nav = Navigator.of(context);
    await SupabaseService.instance.signOut();
    if (!mounted) return;
    nav.pushAndRemoveUntil(
      MaterialPageRoute(builder: (context) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Verifikasi Pendaftaran'),
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'Ganti Akun / Keluar',
            onPressed: _handleLogout,
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(height: 20),
              // Lottie Animation Container
              SizedBox(
                width: 160,
                height: 160,
                child: Lottie.asset(
                  'assets/animations/verification.json',
                  fit: BoxFit.contain,
                  animate: true,
                  repeat: true,
                  errorBuilder: (context, error, stackTrace) {
                    return _buildVectorFallback();
                  },
                ),
              ),

              const SizedBox(height: 24),

              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: AppColors.amberLight,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.amber.withValues(alpha: 0.4)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.hourglass_top_rounded, size: 14, color: AppColors.amber),
                    const SizedBox(width: 6),
                    Text(
                      'STATUS: MENUNGGU KONFIRMASI ADMIN',
                      style: GoogleFonts.ibmPlexMono(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: AppColors.amber,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              Text(
                'Pendaftaran Berhasil!',
                style: GoogleFonts.spaceGrotesk(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Akun atas nama ${widget.officerName} (${widget.email}) sedang ditinjau oleh Admin Posko Komando untuk menjaga keamanan penugasan lapangan.',
                textAlign: TextAlign.center,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 13.5,
                  color: AppColors.textSecondary,
                  height: 1.45,
                ),
              ),

              const SizedBox(height: 32),

              // Action 1: Refresh / Check Status
              ElevatedButton.icon(
                onPressed: _isChecking ? null : _checkApprovalStatus,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.obsidian,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(50),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                icon: _isChecking
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.sync_rounded, size: 20),
                label: Text(
                  _isChecking ? 'MEMERIKSA DATABASE...' : 'CEK STATUS PERSETUJUAN SEKARANG',
                  style: GoogleFonts.spaceGrotesk(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.3,
                  ),
                ),
              ),

              const SizedBox(height: 12),

              // Action 2: Contact Admin WhatsApp
              OutlinedButton.icon(
                onPressed: _contactAdminWhatsApp,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.emerald,
                  side: const BorderSide(color: AppColors.emerald),
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18),
                label: Text(
                  'KONFIRMASI KE ADMIN VIA WHATSAPP',
                  style: GoogleFonts.spaceGrotesk(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),

              const SizedBox(height: 16),

              TextButton(
                onPressed: _handleLogout,
                child: Text(
                  'Kembali ke Halaman Login',
                  style: GoogleFonts.spaceGrotesk(
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVectorFallback() {
    return Container(
      width: 100,
      height: 100,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white,
        border: Border.all(color: AppColors.amber, width: 3),
        boxShadow: [
          BoxShadow(
            color: AppColors.amber.withValues(alpha: 0.2),
            blurRadius: 10,
          ),
        ],
      ),
      child: const Center(
        child: Icon(
          Icons.admin_panel_settings_rounded,
          size: 48,
          color: AppColors.amber,
        ),
      ),
    );
  }
}
