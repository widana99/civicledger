import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

class BiometricService {
  BiometricService._();
  static final BiometricService instance = BiometricService._();

  final LocalAuthentication _auth = LocalAuthentication();
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  static const String _keyBiometricEnabled = 'civicledger_biometric_enabled';
  static const String _keySavedEmail = 'civicledger_saved_email';
  static const String _keySavedPassword = 'civicledger_saved_password';

  /// Check if hardware supports biometric and has fingerprints/FaceID enrolled
  Future<bool> isBiometricAvailable() async {
    try {
      final bool canAuthenticateWithBiometrics = await _auth.canCheckBiometrics;
      final bool canAuthenticate = canAuthenticateWithBiometrics || await _auth.isDeviceSupported();
      return canAuthenticate;
    } on PlatformException {
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Get list of available enrolled biometric types (e.g. fingerprint, face)
  Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      return await _auth.getAvailableBiometrics();
    } on PlatformException {
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Trigger native Biometric Prompt
  Future<bool> authenticate({
    required String reason,
  }) async {
    try {
      final available = await isBiometricAvailable();
      if (!available) return false;

      return await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: true,
          useErrorDialogs: true,
        ),
      );
    } on PlatformException {
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Check if user has turned ON biometric authentication in this app
  Future<bool> isBiometricEnabled() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getBool(_keyBiometricEnabled) ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Enable or disable biometric authentication
  Future<void> setBiometricEnabled(bool enabled) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_keyBiometricEnabled, enabled);
      if (!enabled) {
        await clearSavedCredentials();
      }
    } catch (_) {}
  }

  /// Securely save credentials for 1-Tap Biometric Quick Login
  Future<void> saveCredentials({
    required String email,
    required String password,
  }) async {
    try {
      await _secureStorage.write(key: _keySavedEmail, value: email);
      await _secureStorage.write(key: _keySavedPassword, value: password);
      await setBiometricEnabled(true);
    } catch (_) {}
  }

  /// Retrieve securely saved credentials
  Future<Map<String, String>?> getSavedCredentials() async {
    try {
      final email = await _secureStorage.read(key: _keySavedEmail);
      final password = await _secureStorage.read(key: _keySavedPassword);
      if (email != null && password != null && email.isNotEmpty && password.isNotEmpty) {
        return {'email': email, 'password': password};
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Clear saved credentials
  Future<void> clearSavedCredentials() async {
    try {
      await _secureStorage.delete(key: _keySavedEmail);
      await _secureStorage.delete(key: _keySavedPassword);
    } catch (_) {}
  }
}
