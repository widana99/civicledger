class ProfileModel {
  final String id;
  final String? fullName;
  final String? email;
  final String? phone;
  final String role;
  final String? wilayahId;
  final String? department;
  final String? avatarUrl;
  final bool isActive;

  ProfileModel({
    required this.id,
    this.fullName,
    this.email,
    this.phone,
    required this.role,
    this.wilayahId,
    this.department,
    this.avatarUrl,
    this.isActive = true,
  });

  factory ProfileModel.fromJson(Map<String, dynamic> json) {
    return ProfileModel(
      id: json['id'] as String,
      fullName: json['full_name'] as String? ?? 'Petugas Lapangan',
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      role: json['role'] as String? ?? 'petugas',
      wilayahId: json['wilayah_id'] as String?,
      department: json['department'] as String? ?? 'Dinas Pekerjaan Umum & Tata Kota',
      avatarUrl: json['avatar_url'] as String?,
      isActive: json['is_active'] as bool? ?? true,
    );
  }

  bool get isPetugas => role.toLowerCase() == 'petugas';
}
