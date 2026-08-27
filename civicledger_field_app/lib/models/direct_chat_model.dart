import 'package:intl/intl.dart';

class DirectChatModel {
  final String id;
  final String officerId;
  final String senderId;
  final String message;
  final String category; // 'kendala', 'alat', 'laporan', 'darurat', 'umum'
  final bool isFlagged;
  final bool isRead;
  final DateTime createdAt;
  final String? senderName;
  final String? senderRole;

  DirectChatModel({
    required this.id,
    required this.officerId,
    required this.senderId,
    required this.message,
    this.category = 'umum',
    this.isFlagged = false,
    this.isRead = false,
    required this.createdAt,
    this.senderName,
    this.senderRole,
  });

  factory DirectChatModel.fromJson(Map<String, dynamic> json) {
    String? name;
    String? role;

    if (json['profiles'] != null && json['profiles'] is Map) {
      final p = json['profiles'] as Map<String, dynamic>;
      name = p['full_name'] as String?;
      role = p['role'] as String?;
    }

    return DirectChatModel(
      id: json['id'] as String,
      officerId: json['officer_id'] as String,
      senderId: json['sender_id'] as String,
      message: json['message'] as String? ?? '',
      category: json['category'] as String? ?? 'umum',
      isFlagged: json['is_flagged'] as bool? ?? false,
      isRead: json['is_read'] as bool? ?? false,
      createdAt: DateTime.parse(json['created_at'] as String).toLocal(),
      senderName: name,
      senderRole: role,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'officer_id': officerId,
      'sender_id': senderId,
      'message': message,
      'category': category,
      'is_flagged': isFlagged,
      'is_read': isRead,
    };
  }

  String get formattedTime => DateFormat('HH:mm').format(createdAt);
  bool isFromAdmin(String currentUserId) => senderId != currentUserId;
}
