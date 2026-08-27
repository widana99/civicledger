import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class AttendanceModel {
  final String id;
  final String officerId;
  final String type; // 'check_in', 'break_start', 'break_end', 'check_out'
  final String status; // 'on_time', 'late', 'normal'
  final double? latitude;
  final double? longitude;
  final String? address;
  final String? photoUrl;
  final String? notes;
  final String authMethod; // 'biometric', 'password_fallback'
  final DateTime createdAt;

  AttendanceModel({
    required this.id,
    required this.officerId,
    required this.type,
    this.status = 'on_time',
    this.authMethod = 'biometric',
    this.latitude,
    this.longitude,
    this.address,
    this.photoUrl,
    this.notes,
    required this.createdAt,
  });

  factory AttendanceModel.fromJson(Map<String, dynamic> json) {
    return AttendanceModel(
      id: json['id'] as String,
      officerId: json['officer_id'] as String,
      type: json['type'] as String? ?? 'check_in',
      status: json['status'] as String? ?? 'on_time',
      authMethod: json['auth_method'] as String? ?? 'biometric',
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      address: json['address'] as String?,
      photoUrl: json['photo_url'] as String?,
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String).toLocal(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'officer_id': officerId,
      'type': type,
      'status': status,
      'latitude': latitude,
      'longitude': longitude,
      'address': address,
      'photo_url': photoUrl,
      'notes': notes,
    };
  }

  String get formattedTime => DateFormat('HH:mm').format(createdAt);
  String get formattedDate => DateFormat('dd MMM yyyy').format(createdAt);

  String get typeLabel {
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
        return type;
    }
  }

  IconData get typeIcon {
    switch (type) {
      case 'check_in':
        return Icons.login_rounded;
      case 'break_start':
        return Icons.coffee_rounded;
      case 'break_end':
        return Icons.work_history_rounded;
      case 'check_out':
        return Icons.logout_rounded;
      default:
        return Icons.access_time_rounded;
    }
  }

  Color get statusColor {
    if (status == 'late') return const Color(0xFFC1503D);
    if (type == 'check_in') return const Color(0xFF2E8B7F);
    if (type == 'break_start') return const Color(0xFFD4A843);
    if (type == 'break_end') return const Color(0xFF3B82F6);
    return const Color(0xFF64748B);
  }
}
