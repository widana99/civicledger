import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/theme/app_theme.dart';
import '../models/report_model.dart';
import '../services/supabase_service.dart';
import '../core/utils/navigation_helper.dart';
import 'task_detail_screen.dart';

class OfficerMapTab extends StatefulWidget {
  const OfficerMapTab({super.key});

  @override
  State<OfficerMapTab> createState() => _OfficerMapTabState();
}

class _OfficerMapTabState extends State<OfficerMapTab> {
  final MapController _mapController = MapController();
  List<ReportModel> _allReports = [];
  Position? _currentPosition;
  bool _isLoading = true;
  ReportModel? _selectedTask;
  String _mapFilter = 'active'; // 'active', 'my', 'all'
  RealtimeChannel? _realtimeChannel;

  // Default coordinate (Jakarta/Depok area)
  static const LatLng _defaultCenter = LatLng(-6.2088, 106.8456);

  @override
  void initState() {
    super.initState();
    _loadData();
    _subscribeRealtime();
  }

  @override
  void dispose() {
    _realtimeChannel?.unsubscribe();
    super.dispose();
  }

  void _subscribeRealtime() {
    try {
      _realtimeChannel = SupabaseService.instance.client
          .channel('public:reports:map')
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: 'reports',
            callback: (payload) {
              // Auto-refresh data on any database change
              _fetchReportsSilently();
            },
          )
          .subscribe();
    } catch (_) {}
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    await Future.wait([
      _getCurrentLocation(),
      _fetchReportsSilently(),
    ]);
    if (mounted) setState(() => _isLoading = false);

    if (_currentPosition != null) {
      _mapController.move(
        LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
        14.0,
      );
    } else if (_allReports.isNotEmpty &&
        _allReports.first.latitude != null &&
        _allReports.first.longitude != null) {
      _mapController.move(
        LatLng(_allReports.first.latitude!, _allReports.first.longitude!),
        14.0,
      );
    }
  }

  Future<void> _getCurrentLocation() async {
    try {
      final perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }
      final lastPos = await Geolocator.getLastKnownPosition();
      if (lastPos != null && mounted) {
        setState(() => _currentPosition = lastPos);
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 4),
        ),
      );
      if (mounted) {
        setState(() => _currentPosition = pos);
      }
    } catch (_) {}
  }

  Future<void> _fetchReportsSilently() async {
    try {
      final data = await SupabaseService.instance.getAllCityReports();
      if (mounted) {
        setState(() {
          _allReports = data;
        });
      }
    } catch (_) {}
  }

  double? _calculateDistance(double? lat, double? lng) {
    if (_currentPosition == null || lat == null || lng == null) return null;
    return Geolocator.distanceBetween(
          _currentPosition!.latitude,
          _currentPosition!.longitude,
          lat,
          lng,
        ) /
        1000.0;
  }

  List<ReportModel> get _displayedReports {
    final myId = SupabaseService.instance.currentUser?.id;
    return _allReports.where((r) {
      if (r.latitude == null || r.longitude == null) return false;

      if (_mapFilter == 'my') {
        return r.assignedTo == myId;
      } else if (_mapFilter == 'active') {
        return !r.isCompleted && r.status != 'rejected';
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final currentUserId = SupabaseService.instance.currentUser?.id;
    final markers = <Marker>[];

    // 1. Current Officer Location Marker
    if (_currentPosition != null) {
      markers.add(
        Marker(
          point: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
          width: 60,
          height: 60,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.obsidian.withValues(alpha: 0.15),
                ),
              ),
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.obsidian,
                  border: Border.all(color: Colors.white, width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.3),
                      blurRadius: 6,
                    ),
                  ],
                ),
                child: const Center(
                  child: Icon(Icons.person, size: 12, color: Colors.white),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // 2. City Tasks Markers
    for (final task in _displayedReports) {
      final isSelected = _selectedTask?.id == task.id;
      final isMyTask = task.assignedTo == currentUserId;

      Color markerColor;
      IconData icon;

      if (task.isCompleted) {
        markerColor = AppColors.emerald;
        icon = Icons.check_circle_rounded;
      } else if (isMyTask) {
        markerColor = task.isInProgress ? AppColors.amber : AppColors.obsidian;
        icon = task.isInProgress ? Icons.engineering_rounded : Icons.assignment_turned_in_rounded;
      } else if (task.assignedTo != null) {
        markerColor = Colors.deepOrange;
        icon = Icons.people_alt_rounded;
      } else {
        markerColor = Colors.grey.shade600;
        icon = Icons.help_outline_rounded;
      }

      markers.add(
        Marker(
          point: LatLng(task.latitude!, task.longitude!),
          width: isSelected ? 52 : 44,
          height: isSelected ? 52 : 44,
          child: GestureDetector(
            onTap: () {
              setState(() => _selectedTask = task);
              _mapController.move(LatLng(task.latitude!, task.longitude!), 15.0);
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              decoration: BoxDecoration(
                color: isSelected ? markerColor : Colors.white,
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? Colors.white : markerColor,
                  width: isSelected ? 3 : 2.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: markerColor.withValues(alpha: 0.4),
                    blurRadius: isSelected ? 12 : 6,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Icon(
                icon,
                color: isSelected ? Colors.white : markerColor,
                size: isSelected ? 24 : 20,
              ),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Radar Peta Penugasan',
                  style: GoogleFonts.spaceGrotesk(
                    fontWeight: FontWeight.w800,
                    fontSize: 19,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.emeraldLight,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.emerald,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'LIVE',
                        style: GoogleFonts.ibmPlexMono(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          color: AppColors.emerald,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            Text(
              '${_displayedReports.length} titik laporan terpantau se-kota',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 11,
                color: AppColors.textMuted,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.my_location_rounded),
            tooltip: 'Pusatkan ke Lokasi Saya',
            onPressed: () {
              if (_currentPosition != null) {
                _mapController.move(
                  LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
                  15.0,
                );
              } else {
                _getCurrentLocation();
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh Peta',
            onPressed: _loadData,
          ),
        ],
      ),
      body: Stack(
        children: [
          // OpenStreetMap Tile Layer
          FlutterMap(
            mapController: _mapController,
            options: const MapOptions(
              initialCenter: _defaultCenter,
              initialZoom: 13.0,
              minZoom: 5.0,
              maxZoom: 18.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.civicledger.fieldapp',
              ),
              MarkerLayer(markers: markers),
            ],
          ),

          // Map Filter Pills Floating on Top
          Positioned(
            top: 14,
            left: 14,
            right: 14,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildMapFilterChip('active', 'Semua Tugas Aktif (${_allReports.where((r) => !r.isCompleted).length})'),
                  const SizedBox(width: 8),
                  _buildMapFilterChip('my', 'Tugas Saya (${_allReports.where((r) => r.assignedTo == currentUserId).length})'),
                  const SizedBox(width: 8),
                  _buildMapFilterChip('all', 'Seluruh Titik (${_allReports.length})'),
                ],
              ),
            ),
          ),

          if (_isLoading)
            Positioned(
              top: 60,
              left: 16,
              right: 16,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.1),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.obsidian),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Sinkronisasi GPS & Radar Live...',
                        style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // Selected Task Card Overlay
          if (_selectedTask != null)
            Positioned(
              left: 16,
              right: 16,
              bottom: 24,
              child: _buildTaskCard(_selectedTask!),
            ),
        ],
      ),
    );
  }

  Widget _buildMapFilterChip(String key, String label) {
    final isSelected = _mapFilter == key;
    return GestureDetector(
      onTap: () => setState(() => _mapFilter = key),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.obsidian : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.obsidian : AppColors.border,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Text(
          label,
          style: GoogleFonts.spaceGrotesk(
            fontSize: 11.5,
            fontWeight: FontWeight.w700,
            color: isSelected ? Colors.white : AppColors.textPrimary,
          ),
        ),
      ),
    );
  }

  Widget _buildTaskCard(ReportModel task) {
    final currentUserId = SupabaseService.instance.currentUser?.id;
    final isMyTask = task.assignedTo == currentUserId;
    final dist = _calculateDistance(task.latitude, task.longitude);

    return Card(
      elevation: 8,
      shadowColor: Colors.black.withValues(alpha: 0.2),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Top Bar
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.obsidian,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '#${task.ticketId}',
                        style: GoogleFonts.ibmPlexMono(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: isMyTask
                            ? AppColors.emeraldLight
                            : task.assignedPetugasName != null
                                ? AppColors.amberLight
                                : AppColors.background,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        isMyTask
                            ? 'TUGAS ANDA'
                            : task.assignedPetugasName != null
                                ? 'PETUGAS: ${task.assignedPetugasName!.toUpperCase()}'
                                : 'BELUM DITUGASKAN',
                        style: GoogleFonts.spaceGrotesk(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: isMyTask
                              ? AppColors.emerald
                              : task.assignedPetugasName != null
                                  ? AppColors.amber
                                  : AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
                IconButton(
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  icon: const Icon(Icons.close_rounded, size: 18, color: AppColors.textMuted),
                  onPressed: () => setState(() => _selectedTask = null),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              task.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.spaceGrotesk(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            if (task.address != null) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.location_on_outlined, size: 14, color: AppColors.textMuted),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      task.address!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            ],
            if (dist != null) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.near_me_rounded, size: 13, color: AppColors.emerald),
                  const SizedBox(width: 4),
                  Text(
                    'Jarak dari posisi Anda: ± ${dist.toStringAsFixed(1)} km',
                    style: GoogleFonts.spaceGrotesk(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.emerald,
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      side: const BorderSide(color: AppColors.obsidian),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.info_outline, size: 16, color: AppColors.obsidian),
                    label: Text(
                      'Rincian',
                      style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.w700, fontSize: 12, color: AppColors.obsidian),
                    ),
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => TaskDetailScreen(reportId: task.id),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.obsidian,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.navigation_rounded, size: 16),
                    label: Text(
                      'Buka Navigasi',
                      style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.w700, fontSize: 12),
                    ),
                    onPressed: () {
                      if (task.latitude != null && task.longitude != null) {
                        NavigationHelper.openGoogleMapsRoute(
                          latitude: task.latitude!,
                          longitude: task.longitude!,
                          title: task.title,
                        );
                      }
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
