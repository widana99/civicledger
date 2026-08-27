import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme/app_theme.dart';
import '../models/report_model.dart';
import '../services/supabase_service.dart';
import '../widgets/ticket_card_widget.dart';
import 'task_detail_screen.dart';

class CityReportsTab extends StatefulWidget {
  const CityReportsTab({super.key});

  @override
  State<CityReportsTab> createState() => _CityReportsTabState();
}

class _CityReportsTabState extends State<CityReportsTab> {
  List<ReportModel> _reports = [];
  bool _isLoading = true;
  String _filter = 'all'; // all, my, colleagues, unassigned, completed
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _fetchCityReports();
  }

  Future<void> _fetchCityReports() async {
    setState(() => _isLoading = true);
    try {
      final data = await SupabaseService.instance.getAllCityReports();
      if (mounted) {
        setState(() {
          _reports = data;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<ReportModel> get _filteredReports {
    final currentUserId = SupabaseService.instance.currentUser?.id;

    return _reports.where((r) {
      // 1. Filter Chip
      if (_filter == 'my') {
        if (r.assignedTo != currentUserId) return false;
      } else if (_filter == 'colleagues') {
        if (r.assignedTo == null || r.assignedTo == currentUserId) return false;
      } else if (_filter == 'unassigned') {
        if (r.assignedTo != null && r.status != 'pending') return false;
      } else if (_filter == 'completed') {
        if (!r.isCompleted) return false;
      }

      // 2. Search query
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final matchTitle = r.title.toLowerCase().contains(q);
        final matchTicket = r.ticketId.toLowerCase().contains(q);
        final matchAddr = (r.address ?? '').toLowerCase().contains(q);
        final matchPetugas = (r.assignedPetugasName ?? '').toLowerCase().contains(q);
        return matchTitle || matchTicket || matchAddr || matchPetugas;
      }

      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final currentUserId = SupabaseService.instance.currentUser?.id;

    final myCount = _reports.where((r) => r.assignedTo == currentUserId && !r.isCompleted).length;
    final colleagueCount = _reports.where((r) => r.assignedTo != null && r.assignedTo != currentUserId && !r.isCompleted).length;
    final unassignedCount = _reports.where((r) => r.assignedTo == null && !r.isCompleted).length;
    final completedCount = _reports.where((r) => r.isCompleted).length;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Pantau Laporan Kota',
              style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.w800, fontSize: 19),
            ),
            Text(
              'Monitor progress seluruh laporan & rekan petugas',
              style: GoogleFonts.plusJakartaSans(fontSize: 11, color: AppColors.textMuted),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchCityReports,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchCityReports,
        color: AppColors.obsidian,
        child: Column(
          children: [
            // Search Bar
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: TextField(
                decoration: InputDecoration(
                  hintText: 'Cari tiket, nama jalan, atau petugas...',
                  hintStyle: GoogleFonts.plusJakartaSans(fontSize: 13, color: AppColors.textMuted),
                  prefixIcon: const Icon(Icons.search_rounded, size: 20, color: AppColors.textMuted),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                ),
                onChanged: (val) => setState(() => _searchQuery = val.trim()),
              ),
            ),

            // Filter Chips Bar
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: Row(
                children: [
                  _buildFilterChip('all', 'Semua (${_reports.length})'),
                  const SizedBox(width: 8),
                  _buildFilterChip('my', 'Tugas Saya ($myCount)'),
                  const SizedBox(width: 8),
                  _buildFilterChip('colleagues', 'Tugas Rekan ($colleagueCount)'),
                  const SizedBox(width: 8),
                  _buildFilterChip('unassigned', 'Belum Ditugaskan ($unassignedCount)'),
                  const SizedBox(width: 8),
                  _buildFilterChip('completed', 'Selesai ($completedCount)'),
                ],
              ),
            ),

            const SizedBox(height: 6),

            // Reports List
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.obsidian))
                  : _filteredReports.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.folder_open_rounded, size: 48, color: AppColors.textMuted),
                              const SizedBox(height: 12),
                              Text(
                                'Tidak ada laporan yang sesuai.',
                                style: GoogleFonts.spaceGrotesk(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filteredReports.length,
                          itemBuilder: (context, index) {
                            final report = _filteredReports[index];
                            final isMyTask = report.assignedTo == currentUserId;

                            return Column(
                              children: [
                                // Assignment Header Badge
                                Container(
                                  margin: const EdgeInsets.only(bottom: 2),
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                                  decoration: BoxDecoration(
                                    color: isMyTask
                                        ? AppColors.emeraldLight
                                        : report.assignedPetugasName != null
                                            ? AppColors.amberLight
                                            : AppColors.background,
                                    borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                                    border: Border.all(
                                      color: isMyTask
                                          ? AppColors.emerald.withValues(alpha: 0.3)
                                          : report.assignedPetugasName != null
                                              ? AppColors.amber.withValues(alpha: 0.3)
                                              : AppColors.border,
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Row(
                                        children: [
                                          Icon(
                                            isMyTask
                                                ? Icons.person_pin_rounded
                                                : report.assignedPetugasName != null
                                                    ? Icons.engineering_rounded
                                                    : Icons.hourglass_top_rounded,
                                            size: 14,
                                            color: isMyTask
                                                ? AppColors.emerald
                                                : report.assignedPetugasName != null
                                                    ? AppColors.amber
                                                    : AppColors.textSecondary,
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            isMyTask
                                                ? 'TUGAS ANDA SENDIRI'
                                                : report.assignedPetugasName != null
                                                    ? 'DITUGASKAN: ${report.assignedPetugasName!.toUpperCase()}'
                                                    : 'BELUM DITUGASKAN OLEH ADMIN',
                                            style: GoogleFonts.spaceGrotesk(
                                              fontSize: 10.5,
                                              fontWeight: FontWeight.w800,
                                              letterSpacing: 0.3,
                                              color: isMyTask
                                                  ? AppColors.emerald
                                                  : report.assignedPetugasName != null
                                                      ? AppColors.amber
                                                      : AppColors.textSecondary,
                                            ),
                                          ),
                                        ],
                                      ),
                                      if (!isMyTask)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                          decoration: BoxDecoration(
                                            color: Colors.white,
                                            borderRadius: BorderRadius.circular(4),
                                            border: Border.all(color: AppColors.border),
                                          ),
                                          child: Text(
                                            'Mode Pantau',
                                            style: GoogleFonts.ibmPlexMono(fontSize: 9, color: AppColors.textMuted),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),

                                // The Ticket Card
                                TicketCardWidget(
                                  report: report,
                                  onTap: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (context) => TaskDetailScreen(reportId: report.id),
                                      ),
                                    ).then((_) => _fetchCityReports());
                                  },
                                ),
                              ],
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String key, String label) {
    final isSelected = _filter == key;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => setState(() => _filter = key),
      selectedColor: AppColors.obsidian,
      backgroundColor: Colors.white,
      labelStyle: GoogleFonts.spaceGrotesk(
        color: isSelected ? Colors.white : AppColors.textPrimary,
        fontWeight: FontWeight.w700,
        fontSize: 11.5,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(
          color: isSelected ? AppColors.obsidian : AppColors.border,
        ),
      ),
    );
  }
}
