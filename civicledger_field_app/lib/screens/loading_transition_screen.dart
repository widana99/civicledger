import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lottie/lottie.dart';
import '../core/theme/app_theme.dart';
import 'home_screen.dart';

class LoadingTransitionScreen extends StatefulWidget {
  final String officerName;

  const LoadingTransitionScreen({
    super.key,
    required this.officerName,
  });

  @override
  State<LoadingTransitionScreen> createState() => _LoadingTransitionScreenState();
}

class _LoadingTransitionScreenState extends State<LoadingTransitionScreen> {
  String _statusText = 'Memverifikasi izin akses & radar...';
  bool _isReady = false;

  @override
  void initState() {
    super.initState();
    _startTransition();
  }

  Future<void> _startTransition() async {
    await Future.delayed(const Duration(milliseconds: 900));
    if (mounted) {
      setState(() {
        _statusText = 'Menyiapkan modul penugasan lapangan...';
      });
    }

    await Future.delayed(const Duration(milliseconds: 900));
    if (mounted) {
      setState(() {
        _statusText = 'Akses Diberikan. Selamat Bertugas!';
        _isReady = true;
      });
    }

    await Future.delayed(const Duration(milliseconds: 600));
    if (mounted) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => const HomeScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.obsidian,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Optimized Lottie Animation container
                SizedBox(
                  width: 160,
                  height: 160,
                  child: Lottie.asset(
                    'assets/animations/loading.json',
                    fit: BoxFit.contain,
                    animate: true,
                    repeat: true,
                    errorBuilder: (context, error, stackTrace) {
                      return _buildFallbackAnimation();
                    },
                  ),
                ),

                const SizedBox(height: 24),

                Text(
                  'CivicLedger Tactical',
                  style: GoogleFonts.ibmPlexMono(
                    color: Colors.white54,
                    fontSize: 12,
                    letterSpacing: 2,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  widget.officerName.isNotEmpty ? widget.officerName : 'Petugas Lapangan',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.spaceGrotesk(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                ),

                const SizedBox(height: 20),

                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 250),
                  child: Row(
                    key: ValueKey<String>(_statusText),
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (!_isReady) ...[
                        const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.amber,
                          ),
                        ),
                        const SizedBox(width: 10),
                      ] else ...[
                        const Icon(Icons.check_circle_rounded, color: AppColors.emerald, size: 18),
                        const SizedBox(width: 8),
                      ],
                      Text(
                        _statusText,
                        style: GoogleFonts.plusJakartaSans(
                          color: _isReady ? AppColors.emerald : Colors.white70,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFallbackAnimation() {
    return Container(
      width: 100,
      height: 100,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withValues(alpha: 0.08),
        border: Border.all(color: AppColors.amber, width: 2),
      ),
      child: Center(
        child: Icon(
          _isReady ? Icons.verified_user_rounded : Icons.shield_rounded,
          size: 44,
          color: _isReady ? AppColors.emerald : AppColors.amber,
        ),
      ),
    );
  }
}
