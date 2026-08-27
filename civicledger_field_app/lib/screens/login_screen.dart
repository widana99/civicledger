import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme/app_theme.dart';
import '../services/biometric_service.dart';
import '../services/supabase_service.dart';
import 'loading_transition_screen.dart';
import 'pending_approval_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _isBiometricLoading = false;
  bool _obscurePassword = true;
  String? _errorMessage;
  bool _hasBiometricQuickLogin = false;

  @override
  void initState() {
    super.initState();
    _checkBiometricQuickLogin();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _checkBiometricQuickLogin() async {
    final isAvailable = await BiometricService.instance.isBiometricAvailable();
    final isEnabled = await BiometricService.instance.isBiometricEnabled();
    final creds = await BiometricService.instance.getSavedCredentials();

    if (isAvailable && isEnabled && creds != null) {
      if (mounted) {
        setState(() {
          _hasBiometricQuickLogin = true;
          _emailController.text = creds['email'] ?? '';
        });
      }
    }
  }

  Future<void> _handleBiometricLogin() async {
    setState(() {
      _isBiometricLoading = true;
      _errorMessage = null;
    });

    try {
      final creds = await BiometricService.instance.getSavedCredentials();
      if (creds == null) {
        throw Exception('Kredensial biometrik belum tersimpan. Silakan masuk manual dengan kata sandi.');
      }

      final didAuth = await BiometricService.instance.authenticate(
        reason: 'Pindai sidik jari Anda untuk masuk ke sistem CivicLedger',
      );

      if (!didAuth) {
        setState(() => _isBiometricLoading = false);
        return;
      }

      final email = creds['email']!;
      final password = creds['password']!;

      await SupabaseService.instance.signInWithEmail(email: email, password: password);
      final profile = await SupabaseService.instance.getOfficerProfile();

      if (!mounted) return;

      if (profile != null && !profile.isActive) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => PendingApprovalScreen(
              email: email,
              officerName: profile.fullName ?? 'Petugas Lapangan',
            ),
          ),
        );
      } else {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => LoadingTransitionScreen(
              officerName: profile?.fullName ?? 'Petugas Lapangan',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceAll('Exception: ', '');
        });
      }
    } finally {
      if (mounted) setState(() => _isBiometricLoading = false);
    }
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final email = _emailController.text.trim();
    final password = _passwordController.text;

    try {
      await SupabaseService.instance.signInWithEmail(
        email: email,
        password: password,
      );

      final profile = await SupabaseService.instance.getOfficerProfile();

      if (!mounted) return;

      // Cek apakah perangkat mendukung biometrik dan belum diaktifkan
      final isBioAvailable = await BiometricService.instance.isBiometricAvailable();
      final isBioEnabled = await BiometricService.instance.isBiometricEnabled();

      if (isBioAvailable && !isBioEnabled) {
        if (!mounted) return;
        // Tawarkan aktivasi sidik jari untuk login cepat & presensi
        final wantBiometric = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Row(
              children: [
                const Icon(Icons.fingerprint_rounded, color: AppColors.emerald, size: 26),
                const SizedBox(width: 8),
                Text(
                  'Aktifkan Sidik Jari?',
                  style: GoogleFonts.spaceGrotesk(fontSize: 15, fontWeight: FontWeight.w800),
                ),
              ],
            ),
            content: Text(
              'Gunakan sensor sidik jari perangkat Anda untuk login instan 1 detik dan verifikasi presensi lapangan yang aman.',
              style: GoogleFonts.plusJakartaSans(fontSize: 12.5, height: 1.4),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('NANTI SAJA'),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.obsidian,
                  foregroundColor: Colors.white,
                ),
                onPressed: () => Navigator.pop(context, true),
                child: const Text('AKTIFKAN'),
              ),
            ],
          ),
        );

        if (wantBiometric == true) {
          final didAuth = await BiometricService.instance.authenticate(
            reason: 'Pindai sidik jari Anda untuk mengikat perangkat ini secara sah',
          );
          if (didAuth) {
            await BiometricService.instance.saveCredentials(email: email, password: password);
          }
        }
      }

      if (!mounted) return;

      // Cek apakah akun aktif atau masih menunggu persetujuan admin
      if (profile != null && !profile.isActive) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => PendingApprovalScreen(
              email: email,
              officerName: profile.fullName ?? 'Petugas Lapangan',
            ),
          ),
        );
      } else {
        // Akun aktif -> Jalankan animasi Lottie Loading Transition -> Masuk ke Dashboard
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => LoadingTransitionScreen(
              officerName: profile?.fullName ?? 'Petugas Lapangan',
            ),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // App Emblem & Header
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.obsidian,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.obsidian.withValues(alpha: 0.2),
                            blurRadius: 15,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.shield_outlined,
                        size: 40,
                        color: AppColors.amber,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'CIVICLEDGER',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.spaceGrotesk(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 3.0,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  Text(
                    'PORTAL SATUAN PETUGAS LAPANGAN',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.ibmPlexMono(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.5,
                      color: AppColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Quick Biometric Login Card (If Enabled)
                  if (_hasBiometricQuickLogin) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.emerald.withValues(alpha: 0.4), width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.emerald.withValues(alpha: 0.08),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: AppColors.emeraldLight,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.fingerprint_rounded, color: AppColors.emerald, size: 24),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Masuk Cepat Biometrik',
                                      style: GoogleFonts.spaceGrotesk(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    Text(
                                      _emailController.text.isNotEmpty
                                          ? _emailController.text
                                          : 'Sidik jari terdaftar pada perangkat ini',
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
                            ],
                          ),
                          const SizedBox(height: 12),
                          ElevatedButton.icon(
                            onPressed: _isBiometricLoading ? null : _handleBiometricLogin,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.emerald,
                              foregroundColor: Colors.white,
                              minimumSize: const Size.fromHeight(44),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            icon: _isBiometricLoading
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                  )
                                : const Icon(Icons.fingerprint_rounded, size: 20),
                            label: Text(
                              _isBiometricLoading ? 'MEMVERIFIKASI...' : 'PINDAI SIDIK JARI (MASUK INSTAN)',
                              style: GoogleFonts.spaceGrotesk(fontSize: 12, fontWeight: FontWeight.w800),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        const Expanded(child: Divider()),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12.0),
                          child: Text(
                            'ATAU GUNAKAN KATA SANDI',
                            style: GoogleFonts.ibmPlexMono(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ),
                        const Expanded(child: Divider()),
                      ],
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Login Card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Kredensial Petugas',
                          style: GoogleFonts.spaceGrotesk(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Error Banner
                        if (_errorMessage != null)
                          Container(
                            margin: const EdgeInsets.only(bottom: 16),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.roseLight,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.rose.withValues(alpha: 0.3)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.error_outline, size: 18, color: AppColors.rose),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _errorMessage!,
                                    style: const TextStyle(
                                      color: AppColors.rose,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),

                        // Email Field
                        Text(
                          'EMAIL RESMI',
                          style: GoogleFonts.ibmPlexMono(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          decoration: InputDecoration(
                            hintText: 'petugas@dinas.go.id',
                            prefixIcon: const Icon(Icons.mail_outline_rounded, size: 20),
                            filled: true,
                            fillColor: AppColors.background,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: AppColors.border),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: AppColors.border),
                            ),
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Email wajib diisi';
                            }
                            return null;
                          },
                        ),

                        const SizedBox(height: 16),

                        // Password Field
                        Text(
                          'KATA SANDI',
                          style: GoogleFonts.ibmPlexMono(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          decoration: InputDecoration(
                            hintText: '••••••••',
                            prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                size: 20,
                                color: AppColors.textMuted,
                              ),
                              onPressed: () {
                                setState(() {
                                  _obscurePassword = !_obscurePassword;
                                });
                              },
                            ),
                            filled: true,
                            fillColor: AppColors.background,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: AppColors.border),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: AppColors.border),
                            ),
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Kata sandi wajib diisi';
                            }
                            return null;
                          },
                        ),

                        const SizedBox(height: 24),

                        // Submit Button
                        ElevatedButton(
                          onPressed: _isLoading ? null : _handleLogin,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.obsidian,
                            foregroundColor: Colors.white,
                            minimumSize: const Size.fromHeight(50),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      'MASUK SISTEM',
                                      style: GoogleFonts.spaceGrotesk(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 1.0,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    const Icon(Icons.arrow_forward_rounded, size: 18),
                                  ],
                                ),
                        ),

                        const SizedBox(height: 16),

                        // Register Link Button
                        Center(
                          child: TextButton.icon(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(builder: (context) => const RegisterScreen()),
                              );
                            },
                            icon: const Icon(Icons.person_add_alt_1_rounded, size: 16, color: AppColors.obsidian),
                            label: Text(
                              'Petugas Baru? Daftar Akun di Sini',
                              style: GoogleFonts.spaceGrotesk(
                                fontWeight: FontWeight.w700,
                                color: AppColors.obsidian,
                                fontSize: 12.5,
                              ),
                            ),
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
      ),
    );
  }
}
