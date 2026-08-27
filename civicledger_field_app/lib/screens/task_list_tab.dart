import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme/app_theme.dart';
import '../models/report_model.dart';
import '../services/supabase_service.dart';
import '../widgets/ticket_card_widget.dart';
import 'task_detail_screen.dart';
import 'attendance_screen.dart';

class TaskListTab extends StatefulWidget {
  const TaskListTab({super.key});

  @override
  State<TaskListTab> createState() => _TaskListTabState();
}

class _TaskListTabState extends State<TaskListTab> {
  String _selectedFilter = 'active'; // 'active', 'assigned', 'in_progress'
  List<ReportModel> _tasks = [];
  bool _isLoading = true;
  String? _errorMessage;
  StreamSubscription? _streamSub;

  @override
  void initState() {
    super.initState();
    _fetchTasks();
    _initRealtimeStream();
  }

  @override
  void dispose() {
    _streamSub?.cancel();
    super.dispose();
  }

  void _initRealtimeStream() {
    try {
      _streamSub = SupabaseService.instance.getOfficerTasksStream().listen(
        (updatedTasks) {
          if (mounted) {
            setState(() {
              _tasks = updatedTasks;
              _isLoading = false;
              _errorMessage = null;
            });
          }
        },
        onError: (err) {
          // Fallback to REST fetch if stream fails
          _fetchTasks(showLoading: false);
        },
      );
    } catch (_) {}
  }

  Future<void> _fetchTasks({bool showLoading = true}) async {
    if (showLoading && mounted) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final data = await SupabaseService.instance.getOfficerTasks();
      if (mounted) {
        setState(() {
          _tasks = data;
          _isLoading = false;
          _errorMessage = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString();
        });
      }
    }
  }

  List<ReportModel> get _filteredTasks {
    return _tasks.where((task) {
      if (_selectedFilter == 'active') {
        return task.isAssigned || task.isInProgress;
      } else if (_selectedFilter == 'assigned') {
        return task.isAssigned;
      } else if (_selectedFilter == 'in_progress') {
        return task.isInProgress;
      }
      return true;
    }).toList();
  }

  int get _assignedCount => _tasks.where((t) => t.isAssigned).length;
  int get _inProgressCount => _tasks.where((t) => t.isInProgress).length;
  int get _activeCount => _assignedCount + _inProgressCount;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Tugas Lapangan',
              style: GoogleFonts.spaceGrotesk(
                fontWeight: FontWeight.w800,
                fontSize: 20,
              ),
            ),
            Text(
              'Daftar penugasan dari Admin & Dinas',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 12,
                color: AppColors.textMuted,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.fingerprint_rounded, color: AppColors.emerald),
            tooltip: 'Presensi & Jam Kerja Lapangan',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const AttendanceScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Perbarui Tugas',
            onPressed: () => _fetchTasks(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip('Tugas Aktif', 'active', count: _activeCount),
                  const SizedBox(width: 8),
                  _buildFilterChip('Ditugaskan (Baru)', 'assigned', count: _assignedCount),
                  const SizedBox(width: 8),
                  _buildFilterChip('Sedang Dikerjakan', 'in_progress', count: _inProgressCount),
                ],
              ),
            ),
          ),

          // Main Task List with Pull-to-Refresh
          Expanded(
            child: RefreshIndicator(
              color: AppColors.obsidian,
              onRefresh: () => _fetchTasks(showLoading: false),
              child: _buildContent(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    if (_isLoading && _tasks.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.obsidian),
      );
    }

    if (_errorMessage != null && _tasks.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.5,
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline_rounded, size: 40, color: AppColors.rose),
                    const SizedBox(height: 12),
                    Text(
                      'Gagal memuat tugas',
                      style: GoogleFonts.spaceGrotesk(fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _errorMessage!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () => _fetchTasks(),
                      icon: const Icon(Icons.refresh, size: 16),
                      label: const Text('Coba Lagi'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      );
    }

    final filtered = _filteredTasks;

    if (filtered.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.5,
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: AppColors.border.withValues(alpha: 0.5),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.assignment_turned_in_outlined,
                        size: 32,
                        color: AppColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      _selectedFilter == 'in_progress'
                          ? 'Tidak Ada Tugas Sedang Dikerjakan'
                          : _selectedFilter == 'assigned'
                              ? 'Tidak Ada Tugas Baru'
                              : 'Tidak Ada Tugas Aktif',
                      style: GoogleFonts.spaceGrotesk(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Semua penugasan saat ini telah selesai atau belum ada penugasan baru dari Admin.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Tarik ke bawah (Swipe down) untuk me-refresh',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11,
                        color: AppColors.textMuted,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      itemCount: filtered.length,
      itemBuilder: (context, index) {
        final task = filtered[index];
        return TicketCardWidget(
          report: task,
          onTap: () async {
            await Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => TaskDetailScreen(reportId: task.id),
              ),
            );
            // Always refresh after returning from detail
            _fetchTasks(showLoading: false);
          },
        );
      },
    );
  }

  Widget _buildFilterChip(String label, String value, {int count = 0}) {
    final isSelected = _selectedFilter == value;
    return GestureDetector(
      onTap: () {
        setState(() => _selectedFilter = value);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.obsidian : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.obsidian : AppColors.border,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 12.5,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? Colors.white : AppColors.textPrimary,
              ),
            ),
            if (count > 0) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white.withValues(alpha: 0.25) : AppColors.border,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  count.toString(),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? Colors.white : AppColors.textPrimary,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
