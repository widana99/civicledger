import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme/app_theme.dart';
import 'task_list_tab.dart';
import 'city_reports_tab.dart';
import 'officer_map_tab.dart';
import 'completed_history_tab.dart';
import 'profile_tab.dart';
import '../widgets/officer_posko_chat_sheet.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  // Lazy-loaded tabs: only instantiate when tab is first opened
  final Map<int, Widget> _cachedTabs = {};

  @override
  void initState() {
    super.initState();
    // Preload only the initial tab (Tugas Saya)
    _cachedTabs[0] = const TaskListTab();
  }

  Widget _getTab(int index) {
    if (!_cachedTabs.containsKey(index)) {
      switch (index) {
        case 0:
          _cachedTabs[0] = const TaskListTab();
          break;
        case 1:
          _cachedTabs[1] = const CityReportsTab();
          break;
        case 2:
          _cachedTabs[2] = const OfficerMapTab();
          break;
        case 3:
          _cachedTabs[3] = const CompletedHistoryTab();
          break;
        case 4:
          _cachedTabs[4] = const ProfileTab();
          break;
      }
    }
    return _cachedTabs[index] ?? const SizedBox.shrink();
  }

  @override
  Widget build(BuildContext context) {
    // Build list with placeholder for unvisited tabs
    final children = List<Widget>.generate(5, (index) {
      if (_cachedTabs.containsKey(index)) {
        return _cachedTabs[index]!;
      }
      return const SizedBox.shrink();
    });

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: children,
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (context) => const OfficerPoskoChatSheet(),
          );
        },
        backgroundColor: AppColors.obsidian,
        elevation: 6,
        shape: const CircleBorder(),
        tooltip: 'Saluran Cepat Posko Admin',
        child: Stack(
          alignment: Alignment.center,
          children: [
            const Icon(Icons.forum_rounded, color: Colors.white, size: 24),
            Positioned(
              top: 0,
              right: 0,
              child: Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: AppColors.emerald,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: const Border(
            top: BorderSide(color: AppColors.border, width: 1),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 10,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
            child: BottomNavigationBar(
              currentIndex: _currentIndex,
              onTap: (index) {
                // Ensure lazy initialization
                _getTab(index);
                setState(() => _currentIndex = index);
              },
              backgroundColor: Colors.transparent,
              type: BottomNavigationBarType.fixed,
              elevation: 0,
              selectedItemColor: AppColors.obsidian,
              unselectedItemColor: AppColors.textMuted,
              selectedLabelStyle: GoogleFonts.spaceGrotesk(
                fontSize: 10,
                fontWeight: FontWeight.w800,
              ),
              unselectedLabelStyle: GoogleFonts.plusJakartaSans(
                fontSize: 9.5,
                fontWeight: FontWeight.w500,
              ),
              items: const [
                BottomNavigationBarItem(
                  icon: Icon(Icons.assignment_outlined, size: 20),
                  activeIcon: Icon(Icons.assignment_rounded, size: 20),
                  label: 'Tugas Saya',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.feed_outlined, size: 20),
                  activeIcon: Icon(Icons.feed_rounded, size: 20),
                  label: 'Pantau Kota',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.map_outlined, size: 20),
                  activeIcon: Icon(Icons.map_rounded, size: 20),
                  label: 'Radar Live',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.history_rounded, size: 20),
                  activeIcon: Icon(Icons.history_edu_rounded, size: 20),
                  label: 'Riwayat',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.person_outline_rounded, size: 20),
                  activeIcon: Icon(Icons.person_rounded, size: 20),
                  label: 'Profil',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
