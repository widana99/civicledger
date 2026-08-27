import 'package:flutter_test/flutter_test.dart';
import 'package:civicledger_field_app/models/report_model.dart';
import 'package:civicledger_field_app/models/profile_model.dart';

void main() {
  group('ReportModel Tests', () {
    test('ReportModel parses json correctly', () {
      final json = {
        'id': 'rep-123',
        'ticket_id': 'TIK-2026-0001',
        'title': 'Jalan Berlubang di Sudirman',
        'description': 'Aspal terkelupas sedalam 15cm membahayakan pengendara.',
        'category': 'infrastruktur',
        'status': 'assigned',
        'priority': 'darurat',
        'latitude': -6.2088,
        'longitude': 106.8456,
        'address': 'Jl. Jenderal Sudirman No. 12, Jakarta',
        'created_at': '2026-08-25T10:00:00Z',
      };

      final report = ReportModel.fromJson(json);

      expect(report.id, 'rep-123');
      expect(report.ticketId, 'TIK-2026-0001');
      expect(report.isAssigned, isTrue);
      expect(report.isInProgress, isFalse);
      expect(report.isCompleted, isFalse);
      expect(report.categoryLabel, 'Infrastruktur');
      expect(report.statusLabel, 'Ditugaskan');
    });

    test('ReportModel state helpers work correctly', () {
      final inProgressJson = {
        'id': 'rep-456',
        'ticket_id': 'TIK-2026-0002',
        'title': 'Sampah Menumpuk',
        'description': 'Sampah pasar belum diangkut.',
        'category': 'kebersihan',
        'status': 'in_progress',
        'priority': 'tinggi',
        'is_anonymous': true,
        'created_at': '2026-08-25T11:00:00Z',
      };

      final inProgressReport = ReportModel.fromJson(inProgressJson);
      expect(inProgressReport.isInProgress, isTrue);
      expect(inProgressReport.statusLabel, 'Sedang Dikerjakan');
      expect(inProgressReport.isAnonymous, isTrue);
      expect(inProgressReport.slaLabel, '1-2 Hari Kerja');
    });
  });

  group('ProfileModel Tests', () {
    test('ProfileModel identifies field officer role', () {
      final json = {
        'id': 'user-789',
        'full_name': 'Budi Santoso',
        'email': 'budi.petugas@dinas.go.id',
        'role': 'petugas',
        'department': 'Dinas Pekerjaan Umum',
      };

      final profile = ProfileModel.fromJson(json);
      expect(profile.isPetugas, isTrue);
      expect(profile.fullName, 'Budi Santoso');
      expect(profile.department, 'Dinas Pekerjaan Umum');
    });
  });
}
