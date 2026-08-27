import 'dart:io';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/constants/supabase_config.dart';
import '../models/report_model.dart';
import '../models/profile_model.dart';
import '../models/comment_model.dart';
import '../models/attendance_model.dart';
import '../models/direct_chat_model.dart';

class SupabaseService {
  static final SupabaseService instance = SupabaseService._internal();
  SupabaseService._internal();

  SupabaseClient get client => Supabase.instance.client;
  User? get currentUser => client.auth.currentUser;

  // ───── 1. AUTHENTICATION & PROFILE ───── //

  Future<AuthResponse> signInWithEmail({
    required String email,
    required String password,
  }) async {
    final response = await client.auth.signInWithPassword(
      email: email,
      password: password,
    );

    // Verify user role
    final profile = await getOfficerProfile();
    if (profile == null || !profile.isPetugas) {
      await client.auth.signOut();
      throw Exception('Akses ditolak: Akun Anda bukan Petugas Lapangan.');
    }

    return response;
  }

  Future<void> signOut() async {
    await client.auth.signOut();
  }

  Future<ProfileModel?> getOfficerProfile() async {
    final user = currentUser;
    if (user == null) return null;

    try {
      final data = await client
          .from(SupabaseConfig.profilesTable)
          .select()
          .eq('id', user.id)
          .single();

      return ProfileModel.fromJson(data);
    } catch (e) {
      return null;
    }
  }

  // ───── 2. TASKS & REPORTS MANAGEMENT ───── //

  /// Simpan task ke cache lokal untuk akses offline saat petugas di lapangan
  Future<void> _cacheTasksLocally(List<dynamic> data) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('cached_officer_tasks', jsonEncode(data));
    } catch (_) {}
  }

  /// Ambil task dari cache offline jika koneksi internet terputus di area blindspot
  Future<List<ReportModel>> getCachedTasksLocally() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final str = prefs.getString('cached_officer_tasks');
      if (str != null && str.isNotEmpty) {
        final decoded = jsonDecode(str) as List;
        final List<ReportModel> list = [];
        for (final item in decoded) {
          try {
            final map = Map<String, dynamic>.from(item as Map);
            list.add(ReportModel.fromJson(map));
          } catch (_) {}
        }
        return list;
      }
    } catch (_) {}
    return [];
  }

  /// Mendapatkan daftar semua tugas yang di-assign ke petugas saat ini
  Future<List<ReportModel>> getOfficerTasks() async {
    final user = currentUser;
    if (user == null) return await getCachedTasksLocally();

    try {
      final data = await client
          .from(SupabaseConfig.reportsTable)
          .select('*, completion_proofs(photo_url, note), assigned_petugas:profiles!assigned_petugas_id(id, full_name, phone, role)')
          .eq('assigned_petugas_id', user.id)
          .order('created_at', ascending: false);

      final List<ReportModel> list = [];
      for (final item in data) {
        try {
          final map = Map<String, dynamic>.from(item);
          if (map['completion_proofs'] is List && (map['completion_proofs'] as List).isNotEmpty) {
            final firstProof = (map['completion_proofs'] as List).first as Map;
            map['completion_photo_url'] ??= firstProof['photo_url'];
            map['completion_notes'] ??= firstProof['note'];
          }
          list.add(ReportModel.fromJson(map));
        } catch (_) {}
      }

      // Simpan ke cache offline secara asynchronous
      _cacheTasksLocally(data);
      return list;
    } catch (e) {
      // Jika jaringan gagal, otomatis fallback ke cache offline
      final offlineCached = await getCachedTasksLocally();
      if (offlineCached.isNotEmpty) {
        return offlineCached;
      }

      try {
        final fallbackData = await client
            .from(SupabaseConfig.reportsTable)
            .select()
            .eq('assigned_petugas_id', user.id)
            .order('created_at', ascending: false);
        return fallbackData.map((e) => ReportModel.fromJson(e)).toList();
      } catch (_) {
        return [];
      }
    }
  }

  /// Stream realtime untuk auto-update tugas lapangan
  Stream<List<ReportModel>> getOfficerTasksStream() {
    final user = currentUser;
    if (user == null) return const Stream.empty();

    return client
        .from(SupabaseConfig.reportsTable)
        .stream(primaryKey: ['id'])
        .eq('assigned_petugas_id', user.id)
        .order('created_at', ascending: false)
        .map((list) {
          final List<ReportModel> result = [];
          for (final item in list) {
            try {
              result.add(ReportModel.fromJson(item));
            } catch (_) {}
          }
          return result;
        });
  }

  /// Mendapatkan semua laporan masyarakat & tugas rekan petugas se-kota
  Future<List<ReportModel>> getAllCityReports() async {
    try {
      final data = await client
          .from(SupabaseConfig.reportsTable)
          .select('*, completion_proofs(photo_url, note), assigned_petugas:profiles!assigned_petugas_id(id, full_name, phone, role)')
          .order('created_at', ascending: false)
          .limit(100);

      final List<ReportModel> list = [];
      for (final item in data) {
        try {
          final map = Map<String, dynamic>.from(item);
          if (map['completion_proofs'] is List && (map['completion_proofs'] as List).isNotEmpty) {
            final firstProof = (map['completion_proofs'] as List).first as Map;
            map['completion_photo_url'] ??= firstProof['photo_url'];
            map['completion_notes'] ??= firstProof['note'];
          }
          list.add(ReportModel.fromJson(map));
        } catch (_) {}
      }
      return list;
    } catch (e) {
      try {
        final fallback = await client
            .from(SupabaseConfig.reportsTable)
            .select()
            .order('created_at', ascending: false)
            .limit(100);
        return fallback.map((e) => ReportModel.fromJson(e)).toList();
      } catch (_) {
        return [];
      }
    }
  }

  /// Stream realtime semua laporan kota (untuk live radar map)
  Stream<List<ReportModel>> getAllCityReportsStream() {
    return client
        .from(SupabaseConfig.reportsTable)
        .stream(primaryKey: ['id'])
        .order('created_at', ascending: false)
        .limit(100)
        .map((list) {
          final List<ReportModel> result = [];
          for (final item in list) {
            try {
              result.add(ReportModel.fromJson(item));
            } catch (_) {}
          }
          return result;
        });
  }

  /// Mendapatkan rincian satu tugas beserta bukti penyelesaian (completion_proofs) & nama petugas
  Future<ReportModel?> getReportDetail(String reportId) async {
    try {
      final data = await client
          .from(SupabaseConfig.reportsTable)
          .select('*, assigned_petugas:profiles!assigned_petugas_id(id, full_name, phone, role)')
          .eq('id', reportId)
          .single();

      final report = ReportModel.fromJson(data);

      // Ambil bukti penyelesaian jika laporan sudah selesai
      if (report.isCompleted || report.status == 'completed') {
        try {
          final proofData = await client
              .from('completion_proofs')
              .select('photo_url, note, created_at')
              .eq('report_id', reportId)
              .order('created_at', ascending: false)
              .limit(1)
              .maybeSingle();

          if (proofData != null) {
            return report.copyWith(
              completionPhotoUrl: proofData['photo_url']?.toString(),
              completionNotes: proofData['note']?.toString(),
            );
          }
        } catch (_) {}
      }

      return report;
    } catch (_) {
      try {
        final fallback = await client
            .from(SupabaseConfig.reportsTable)
            .select()
            .eq('id', reportId)
            .single();
        return ReportModel.fromJson(fallback);
      } catch (_) {
        return null;
      }
    }
  }

  // ───── 3. STATE MACHINE TRANSITIONS ───── //

  /// Memulai pengerjaan tugas (Ditugaskan -> Diproses)
  Future<void> startWorkingOnReport(String reportId) async {
    final user = currentUser;
    if (user == null) throw Exception('Sesi tidak valid.');

    final now = DateTime.now().toIso8601String();

    // 1. Update status laporan
    await client.from(SupabaseConfig.reportsTable).update({
      'status': 'in_progress',
      'started_at': now,
      'updated_at': now,
    }).eq('id', reportId);

    // 2. Catat di status_logs
    try {
      await client.from(SupabaseConfig.statusLogsTable).insert({
        'report_id': reportId,
        'from_status': 'assigned',
        'to_status': 'in_progress',
        'changed_by': user.id,
        'note': 'Petugas memulai pengerjaan di lokasi',
        'created_at': now,
      });
    } catch (_) {
      try {
        await client.from(SupabaseConfig.statusLogsTable).insert({
          'report_id': reportId,
          'from_status': 'assigned',
          'to_status': 'in_progress',
          'changed_by_id': user.id,
          'notes': 'Petugas memulai pengerjaan di lokasi',
          'created_at': now,
        });
      } catch (_) {}
    }

    // 3. Kirim notifikasi ke pelapor
    try {
      final reportData = await client
          .from(SupabaseConfig.reportsTable)
          .select('reporter_id, ticket_id, title')
          .eq('id', reportId)
          .single();

      final citizenUserId = (reportData['reporter_id'] ?? reportData['user_id']) as String?;
      final ticketId = reportData['ticket_id'] ?? reportId;

      if (citizenUserId != null) {
        await client.from(SupabaseConfig.notificationsTable).insert({
          'user_id': citizenUserId,
          'report_id': reportId,
          'title': 'Petugas Menuju Lokasi 🚀',
          'message': 'Petugas lapangan sedang menuju lokasi untuk menangani laporan [$ticketId].',
          'type': 'status_update',
          'is_read': false,
          'created_at': now,
        });
      }
    } catch (_) {}
  }

  /// Mengunggah foto bukti penyelesaian dan menyelesaikan tugas (Alias)
  Future<void> completeReport({
    required String reportId,
    required File proofImage,
    required String officerNotes,
    double? latitude,
    double? longitude,
  }) async {
    return completeReportWithProof(
      reportId: reportId,
      photoFile: proofImage,
      officerNotes: officerNotes,
      latitude: latitude,
      longitude: longitude,
    );
  }

  /// Mengunggah foto bukti penyelesaian dan menyelesaikan tugas
  Future<void> completeReportWithProof({
    required String reportId,
    required File photoFile,
    required String officerNotes,
    double? latitude,
    double? longitude,
  }) async {
    final user = currentUser;
    if (user == null) throw Exception('Sesi tidak valid.');

    final now = DateTime.now().toIso8601String();
    final fileName = 'proof_${reportId}_${DateTime.now().millisecondsSinceEpoch}.jpg';
    final filePath = 'proofs/$fileName';

    // 1. Upload foto bukti ke storage Supabase
    String photoUrl = '';
    try {
      await client.storage.from(SupabaseConfig.completionPhotosBucket).upload(
            filePath,
            photoFile,
            fileOptions: const FileOptions(cacheControl: '3600', upsert: true),
          );

      photoUrl = client.storage
          .from(SupabaseConfig.completionPhotosBucket)
          .getPublicUrl(filePath);
    } catch (_) {
      try {
        await client.storage.from(SupabaseConfig.reportPhotosBucket).upload(
              filePath,
              photoFile,
              fileOptions: const FileOptions(cacheControl: '3600', upsert: true),
            );

        photoUrl = client.storage
            .from(SupabaseConfig.reportPhotosBucket)
            .getPublicUrl(filePath);
      } catch (uploadErr) {
        throw Exception('Gagal mengunggah foto bukti: $uploadErr');
      }
    }

    // 2. Simpan bukti di tabel completion_proofs
    try {
      await client.from(SupabaseConfig.completionProofsTable).insert({
        'report_id': reportId,
        'photo_url': photoUrl,
        'note': officerNotes,
        'uploaded_by': user.id,
        'created_at': now,
      });
    } catch (_) {
      try {
        await client.from(SupabaseConfig.completionProofsTable).insert({
          'report_id': reportId,
          'photo_url': photoUrl,
          'notes': officerNotes,
          'created_at': now,
        });
      } catch (_) {}
    }

    // 3. Update status laporan di tabel reports
    try {
      await client.from(SupabaseConfig.reportsTable).update({
        'status': 'completed',
        'completed_at': now,
        'updated_at': now,
        'completion_photo_url': photoUrl,
        'completion_notes': officerNotes,
      }).eq('id', reportId);
    } catch (_) {
      await client.from(SupabaseConfig.reportsTable).update({
        'status': 'completed',
        'completed_at': now,
        'updated_at': now,
      }).eq('id', reportId);
    }

    // 4. Catat di status_logs
    try {
      await client.from(SupabaseConfig.statusLogsTable).insert({
        'report_id': reportId,
        'from_status': 'in_progress',
        'to_status': 'completed',
        'changed_by': user.id,
        'note': 'Penanganan selesai: $officerNotes',
        'created_at': now,
      });
    } catch (_) {
      try {
        await client.from(SupabaseConfig.statusLogsTable).insert({
          'report_id': reportId,
          'from_status': 'in_progress',
          'to_status': 'completed',
          'changed_by_id': user.id,
          'notes': 'Penanganan selesai: $officerNotes',
          'created_at': now,
        });
      } catch (_) {}
    }

    // 5. Notifikasi ke warga
    try {
      final reportData = await client
          .from(SupabaseConfig.reportsTable)
          .select('reporter_id, ticket_id, title')
          .eq('id', reportId)
          .single();

      final citizenUserId = (reportData['reporter_id'] ?? reportData['user_id']) as String?;
      final ticketId = reportData['ticket_id'] ?? reportId;

      if (citizenUserId != null) {
        await client.from(SupabaseConfig.notificationsTable).insert({
          'user_id': citizenUserId,
          'report_id': reportId,
          'title': 'Laporan Telah Selesai Ditangani 🎉',
          'message': 'Petugas telah menyelesaikan penanganan laporan [$ticketId]. Silakan periksa foto hasil kerja dan beri penilaian.',
          'type': 'status_update',
          'is_read': false,
          'created_at': now,
        });
      }
    } catch (_) {}
  }

  // ───── 4. ESKALASI LAPORAN & BANTUAN DINAS ───── //

  Future<void> requestEscalation({
    required String reportId,
    required String targetDepartment,
    required String reason,
    required String urgency,
  }) async {
    final user = currentUser;
    if (user == null) throw Exception('Sesi tidak valid.');

    final now = DateTime.now().toIso8601String();

    await client.from(SupabaseConfig.statusLogsTable).insert({
      'report_id': reportId,
      'from_status': 'in_progress',
      'to_status': 'in_progress',
      'changed_by': user.id,
      'note': '🚨 ESKALASI BANTUAN ($urgency) ke [$targetDepartment]: $reason',
      'created_at': now,
    });
  }

  // ───── 5. INTERACTIVE CHAT PETUGAS & ADMIN (COMMENTS) ───── //

  /// Mengambil semua chat / pesan pada suatu laporan
  Future<List<CommentModel>> getReportComments(String reportId) async {
    try {
      final data = await client
          .from(SupabaseConfig.commentsTable)
          .select('*, profiles:user_id(id, full_name, phone, role)')
          .eq('report_id', reportId)
          .order('created_at', ascending: true);

      final List<CommentModel> list = [];
      for (final item in data) {
        try {
          list.add(CommentModel.fromJson(item));
        } catch (_) {}
      }
      return list;
    } catch (_) {
      try {
        final fallback = await client
            .from(SupabaseConfig.commentsTable)
            .select()
            .eq('report_id', reportId)
            .order('created_at', ascending: true);
        return fallback.map((e) => CommentModel.fromJson(e)).toList();
      } catch (_) {
        return [];
      }
    }
  }

  /// Mengirim pesan chat / kendala lapangan ke Admin
  Future<void> sendReportComment({
    required String reportId,
    required String content,
  }) async {
    final user = currentUser;
    if (user == null) throw Exception('Sesi tidak valid.');

    final now = DateTime.now().toIso8601String();

    await client.from(SupabaseConfig.commentsTable).insert({
      'report_id': reportId,
      'user_id': user.id,
      'content': content,
      'created_at': now,
    });
  }

  // ───── 6. ATTENDANCE & DISCIPLINE (PRESENSI REALTIME & GPS) ───── //

  /// Mencatat presensi petugas (check_in, break_start, break_end, check_out)
  Future<AttendanceModel> recordAttendance({
    required String type, // 'check_in', 'break_start', 'break_end', 'check_out'
    String authMethod = 'biometric', // 'biometric', 'password_fallback'
    double? latitude,
    double? longitude,
    String? address,
    String? photoUrl,
    String? notes,
  }) async {
    final user = currentUser;
    if (user == null) throw Exception('Sesi login tidak valid.');

    final now = DateTime.now();
    String status = 'on_time';

    // Logika keterlambatan: jika absen masuk (check_in) dilakukan setelah pukul 08:00 pagi
    if (type == 'check_in') {
      if (now.hour > 8 || (now.hour == 8 && now.minute > 0)) {
        status = 'late';
      } else {
        status = 'on_time';
      }
    }

    final data = await client.from(SupabaseConfig.officerAttendanceTable).insert({
      'officer_id': user.id,
      'type': type,
      'status': status,
      'auth_method': authMethod,
      'latitude': latitude,
      'longitude': longitude,
      'address': address,
      'photo_url': photoUrl,
      'notes': notes,
      'created_at': now.toUtc().toIso8601String(),
    }).select().single();

    return AttendanceModel.fromJson(data);
  }

  /// Mengambil riwayat presensi hari ini
  Future<List<AttendanceModel>> getTodayAttendance() async {
    final user = currentUser;
    if (user == null) return [];

    try {
      final data = await client
          .from(SupabaseConfig.officerAttendanceTable)
          .select()
          .eq('officer_id', user.id)
          .order('created_at', ascending: true)
          .limit(50);

      return (data as List).map((e) => AttendanceModel.fromJson(e)).toList();
    } catch (_) {
      return [];
    }
  }

  /// Stream realtime riwayat presensi hari ini
  Stream<List<AttendanceModel>> getTodayAttendanceStream() {
    final user = currentUser;
    if (user == null) return Stream.value([]);

    return client
        .from(SupabaseConfig.officerAttendanceTable)
        .stream(primaryKey: ['id'])
        .eq('officer_id', user.id)
        .order('created_at', ascending: true)
        .map((data) => data.map((json) => AttendanceModel.fromJson(json)).toList());
  }

  // ───── 7. 24/7 DIRECT POSKO CHAT CHANNEL (SALURAN CEPAT ADMIN) ───── //

  /// Mengambil riwayat pesan langsung antara petugas dan posko
  Future<List<DirectChatModel>> getDirectChats() async {
    final user = currentUser;
    if (user == null) return [];

    try {
      final data = await client
          .from(SupabaseConfig.officerDirectChatsTable)
          .select('*, profiles:sender_id(id, full_name, role)')
          .eq('officer_id', user.id)
          .order('created_at', ascending: true);

      return (data as List).map((e) => DirectChatModel.fromJson(e)).toList();
    } catch (_) {
      try {
        final fallback = await client
            .from(SupabaseConfig.officerDirectChatsTable)
            .select()
            .eq('officer_id', user.id)
            .order('created_at', ascending: true);
        return (fallback as List).map((e) => DirectChatModel.fromJson(e)).toList();
      } catch (_) {
        return [];
      }
    }
  }

  /// Realtime Stream pesan langsung petugas & admin posko
  Stream<List<DirectChatModel>> getDirectChatsStream() {
    final user = currentUser;
    if (user == null) return Stream.value([]);

    return client
        .from(SupabaseConfig.officerDirectChatsTable)
        .stream(primaryKey: ['id'])
        .eq('officer_id', user.id)
        .order('created_at', ascending: true)
        .map((data) => data.map((json) => DirectChatModel.fromJson(json)).toList());
  }

  /// Mengirim pesan langsung ke Posko Admin dengan kategori
  Future<void> sendDirectChat({
    required String message,
    String category = 'umum',
    bool isFlagged = false,
  }) async {
    final user = currentUser;
    if (user == null) throw Exception('Sesi tidak valid.');

    final now = DateTime.now().toUtc().toIso8601String();

    await client.from(SupabaseConfig.officerDirectChatsTable).insert({
      'officer_id': user.id,
      'sender_id': user.id,
      'message': message,
      'category': category,
      'is_flagged': isFlagged,
      'is_read': false,
      'created_at': now,
    });
  }

  /// Tandai pesan dari admin sebagai terbaca (Read Receipts)
  Future<void> markDirectChatsAsRead() async {
    final user = currentUser;
    if (user == null) return;

    try {
      await client
          .from(SupabaseConfig.officerDirectChatsTable)
          .update({'is_read': true})
          .eq('officer_id', user.id)
          .neq('sender_id', user.id)
          .eq('is_read', false);
    } catch (_) {}
  }
}
