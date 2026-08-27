class ChatSecurityResult {
  final bool isValid;
  final bool isFlagged;
  final String? errorMessage;
  final String cleanMessage;

  ChatSecurityResult({
    required this.isValid,
    this.isFlagged = false,
    this.errorMessage,
    required this.cleanMessage,
  });
}

class ChatSecurityGuard {
  static DateTime? _lastMessageTime;
  static const int _cooldownSeconds = 2;

  // List kata-kata tidak pantas / provokatif / spam untuk menjaga ruang komunikasi tetap profesional dan kondusif
  static final List<String> _blockedKeywords = [
    'anjing', 'babi', 'bangsat', 'kontol', 'memek', 'goblok', 'tolol', 'bajingan',
    'idiot', 'puki', 'pantek', 'asu', 'kampret', 'brengsek', 'shit', 'fuck',
    'bitch', 'asshole', 'bastard', 'spam', 'jual obat', 'slot gacor', 'judi'
  ];

  /// Validasi keamanan pesan sebelum dikirim ke Posko
  static ChatSecurityResult validateMessage(String rawMessage) {
    final text = rawMessage.trim();

    // 1. Validasi Panjang Minimal
    if (text.isEmpty) {
      return ChatSecurityResult(
        isValid: false,
        errorMessage: 'Pesan tidak boleh kosong.',
        cleanMessage: '',
      );
    }

    if (text.length > 500) {
      return ChatSecurityResult(
        isValid: false,
        errorMessage: 'Pesan maksimal 500 karakter.',
        cleanMessage: text,
      );
    }

    // 2. Anti-Spam Cooldown Rate Limiting
    final now = DateTime.now();
    if (_lastMessageTime != null) {
      final diff = now.difference(_lastMessageTime!).inSeconds;
      if (diff < _cooldownSeconds) {
        return ChatSecurityResult(
          isValid: false,
          errorMessage: 'Harap tunggu $_cooldownSeconds detik sebelum mengirim pesan berikutnya.',
          cleanMessage: text,
        );
      }
    }

    // 3. Deteksi Kata Terlarang (Profanity Check)
    final lower = text.toLowerCase();
    bool hasProfanity = false;
    for (final word in _blockedKeywords) {
      final regex = RegExp(r'\b' + RegExp.escape(word) + r'\b', caseSensitive: false);
      if (regex.hasMatch(lower) || lower.contains(word)) {
        hasProfanity = true;
        break;
      }
    }

    if (hasProfanity) {
      return ChatSecurityResult(
        isValid: false,
        isFlagged: true,
        errorMessage: 'Pesan mengandung kata yang tidak pantas. Harap gunakan bahasa profesional kedinasan.',
        cleanMessage: text,
      );
    }

    // Lolos verifikasi
    _lastMessageTime = now;
    return ChatSecurityResult(
      isValid: true,
      cleanMessage: text,
    );
  }
}
