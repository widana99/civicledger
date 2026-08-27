class CommentModel {
  final String id;
  final String reportId;
  final String userId;
  final String content;
  final DateTime createdAt;

  // Joined Profile info
  final String? userName;
  final String? userRole;
  final String? userPhone;

  CommentModel({
    required this.id,
    required this.reportId,
    required this.userId,
    required this.content,
    required this.createdAt,
    this.userName,
    this.userRole,
    this.userPhone,
  });

  factory CommentModel.fromJson(Map<String, dynamic> json) {
    DateTime parseDate(dynamic value) {
      if (value == null) return DateTime.now();
      if (value is DateTime) return value;
      try {
        return DateTime.tryParse(value.toString()) ?? DateTime.now();
      } catch (_) {
        return DateTime.now();
      }
    }

    String? name;
    String? role;
    String? phone;

    if (json['profiles'] is Map) {
      name = json['profiles']['full_name']?.toString();
      role = json['profiles']['role']?.toString();
      phone = json['profiles']['phone']?.toString();
    } else if (json['user'] is Map) {
      name = json['user']['full_name']?.toString();
      role = json['user']['role']?.toString();
      phone = json['user']['phone']?.toString();
    }

    return CommentModel(
      id: json['id']?.toString() ?? '',
      reportId: json['report_id']?.toString() ?? '',
      userId: (json['user_id'] ?? json['sender_id'])?.toString() ?? '',
      content: json['content']?.toString() ?? '',
      createdAt: parseDate(json['created_at']),
      userName: name ?? json['user_name']?.toString(),
      userRole: role ?? json['user_role']?.toString(),
      userPhone: phone ?? json['user_phone']?.toString(),
    );
  }

  bool get isAdmin => userRole == 'admin';
  bool get isPetugas => userRole == 'petugas';
  bool get isMasyarakat => userRole == 'masyarakat';
}
