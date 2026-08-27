class ReportModel {
  final String id;
  final String ticketId;
  final String title;
  final String description;
  final String category;
  final String status;
  final String priority;
  final double? latitude;
  final double? longitude;
  final String? address;
  final String? photoUrl;
  final String? assignedTo;
  final String? userId;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final String? completionPhotoUrl;
  final String? completionNotes;
  final DateTime? completedAt;
  final int? rating;
  final String? ratingFeedback;
  final bool isAnonymous;

  // Joined Profile data (Petugas & Reporter)
  final String? assignedPetugasName;
  final String? assignedPetugasPhone;
  final String? reporterName;

  ReportModel({
    required this.id,
    required this.ticketId,
    required this.title,
    required this.description,
    required this.category,
    required this.status,
    required this.priority,
    this.latitude,
    this.longitude,
    this.address,
    this.photoUrl,
    this.assignedTo,
    this.userId,
    required this.createdAt,
    this.updatedAt,
    this.completionPhotoUrl,
    this.completionNotes,
    this.completedAt,
    this.rating,
    this.ratingFeedback,
    this.isAnonymous = false,
    this.assignedPetugasName,
    this.assignedPetugasPhone,
    this.reporterName,
  });

  factory ReportModel.fromJson(Map<String, dynamic> json) {
    DateTime parseDate(dynamic value, [DateTime? fallback]) {
      if (value == null) return fallback ?? DateTime.now();
      if (value is DateTime) return value;
      try {
        return DateTime.tryParse(value.toString()) ?? fallback ?? DateTime.now();
      } catch (_) {
        return fallback ?? DateTime.now();
      }
    }

    double? parseDouble(dynamic value) {
      if (value == null) return null;
      if (value is num) return value.toDouble();
      return double.tryParse(value.toString());
    }

    int? parseInt(dynamic value) {
      if (value == null) return null;
      if (value is num) return value.toInt();
      return int.tryParse(value.toString());
    }

    final id = (json['id'] ?? '').toString();
    final rawTicket = json['ticket_id']?.toString();
    final ticketId = (rawTicket != null && rawTicket.isNotEmpty)
        ? rawTicket
        : (id.length >= 8 ? id.substring(0, 8) : id);

    // Extract assigned petugas if joined
    String? petugasName;
    String? petugasPhone;
    if (json['assigned_petugas'] is Map) {
      petugasName = json['assigned_petugas']['full_name']?.toString();
      petugasPhone = json['assigned_petugas']['phone']?.toString();
    } else if (json['petugas'] is Map) {
      petugasName = json['petugas']['full_name']?.toString();
      petugasPhone = json['petugas']['phone']?.toString();
    }

    // Extract reporter if joined
    String? repName;
    if (json['reporter'] is Map) {
      repName = json['reporter']['full_name']?.toString();
    }

    return ReportModel(
      id: id,
      ticketId: ticketId,
      title: json['title']?.toString() ?? 'Tanpa Judul',
      description: json['description']?.toString() ?? '',
      category: json['category']?.toString() ?? 'infrastruktur',
      status: json['status']?.toString() ?? 'pending',
      priority: json['priority']?.toString() ?? 'normal',
      latitude: parseDouble(json['latitude']),
      longitude: parseDouble(json['longitude']),
      address: json['address']?.toString(),
      photoUrl: json['photo_url']?.toString(),
      assignedTo: (json['assigned_petugas_id'] ?? json['assigned_to'])?.toString(),
      userId: (json['reporter_id'] ?? json['user_id'])?.toString(),
      createdAt: parseDate(json['created_at']),
      updatedAt: json['updated_at'] != null ? parseDate(json['updated_at']) : null,
      completionPhotoUrl: json['completion_photo_url']?.toString(),
      completionNotes: json['completion_notes']?.toString(),
      completedAt: json['completed_at'] != null ? parseDate(json['completed_at']) : null,
      rating: parseInt(json['rating']),
      ratingFeedback: json['rating_feedback']?.toString(),
      isAnonymous: json['is_anonymous'] == true,
      assignedPetugasName: petugasName ?? json['assigned_petugas_name']?.toString(),
      assignedPetugasPhone: petugasPhone ?? json['assigned_petugas_phone']?.toString(),
      reporterName: repName ?? json['reporter_name']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'ticket_id': ticketId,
      'title': title,
      'description': description,
      'category': category,
      'status': status,
      'priority': priority,
      'latitude': latitude,
      'longitude': longitude,
      'address': address,
      'photo_url': photoUrl,
      'assigned_petugas_id': assignedTo,
      'reporter_id': userId,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
      'completion_photo_url': completionPhotoUrl,
      'completion_notes': completionNotes,
      'completed_at': completedAt?.toIso8601String(),
      'rating': rating,
      'rating_feedback': ratingFeedback,
      'is_anonymous': isAnonymous,
    };
  }

  ReportModel copyWith({
    String? id,
    String? ticketId,
    String? title,
    String? description,
    String? category,
    String? status,
    String? priority,
    double? latitude,
    double? longitude,
    String? address,
    String? photoUrl,
    String? assignedTo,
    String? userId,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? completionPhotoUrl,
    String? completionNotes,
    DateTime? completedAt,
    int? rating,
    String? ratingFeedback,
    bool? isAnonymous,
    String? assignedPetugasName,
    String? assignedPetugasPhone,
    String? reporterName,
  }) {
    return ReportModel(
      id: id ?? this.id,
      ticketId: ticketId ?? this.ticketId,
      title: title ?? this.title,
      description: description ?? this.description,
      category: category ?? this.category,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      address: address ?? this.address,
      photoUrl: photoUrl ?? this.photoUrl,
      assignedTo: assignedTo ?? this.assignedTo,
      userId: userId ?? this.userId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      completionPhotoUrl: completionPhotoUrl ?? this.completionPhotoUrl,
      completionNotes: completionNotes ?? this.completionNotes,
      completedAt: completedAt ?? this.completedAt,
      rating: rating ?? this.rating,
      ratingFeedback: ratingFeedback ?? this.ratingFeedback,
      isAnonymous: isAnonymous ?? this.isAnonymous,
      assignedPetugasName: assignedPetugasName ?? this.assignedPetugasName,
      assignedPetugasPhone: assignedPetugasPhone ?? this.assignedPetugasPhone,
      reporterName: reporterName ?? this.reporterName,
    );
  }

  String get slaLabel {
    switch (category.toLowerCase()) {
      case 'infrastruktur':
        return '3-5 Hari Kerja';
      case 'kebersihan':
      case 'keamanan':
        return '1-2 Hari Kerja';
      case 'pelayanan':
        return '1-3 Hari Kerja';
      case 'lingkungan':
      default:
        return '2-4 Hari Kerja';
    }
  }

  DateTime get slaTargetDate {
    int days = 4;
    switch (category.toLowerCase()) {
      case 'infrastruktur':
        days = 5;
        break;
      case 'kebersihan':
      case 'keamanan':
        days = 2;
        break;
      case 'pelayanan':
        days = 3;
        break;
      case 'lingkungan':
      default:
        days = 4;
        break;
    }
    return createdAt.add(Duration(days: days));
  }

  bool get isOverdue => DateTime.now().isAfter(slaTargetDate) && status.toLowerCase() != 'completed';

  bool get isAssigned => status == 'assigned';
  bool get isInProgress => status == 'in_progress';
  bool get isCompleted => status == 'completed';
  bool get isPending => status == 'pending';
  bool get isVerified => status == 'verified';

  String get categoryLabel {
    switch (category.toLowerCase()) {
      case 'infrastruktur':
        return 'Infrastruktur';
      case 'kebersihan':
        return 'Kebersihan';
      case 'lingkungan':
        return 'Lingkungan';
      case 'fasilitas':
        return 'Fasilitas Umum';
      case 'keamanan':
        return 'Keamanan & Ketertiban';
      default:
        return category.toUpperCase();
    }
  }

  String get statusLabel {
    switch (status.toLowerCase()) {
      case 'assigned':
        return 'Ditugaskan';
      case 'in_progress':
        return 'Sedang Dikerjakan';
      case 'completed':
        return 'Selesai';
      case 'verified':
        return 'Terverifikasi';
      case 'rejected':
        return 'Ditolak';
      default:
        return 'Menunggu Verifikasi';
    }
  }
}
