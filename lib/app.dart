import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/theme/app_theme.dart';
import 'core/constants/app_constants.dart';
import 'features/auth/presentation/auth_screen.dart';
import 'features/auth/presentation/email_auth_screen.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/character/presentation/character_sheet_view.dart';
import 'features/character/presentation/character_edit_screen.dart';
import 'features/character/presentation/character_creation_view.dart';
import 'features/character/providers/character_provider.dart';
import 'features/guild/presentation/barracks_screen.dart';
import 'features/workout/presentation/workout_log_screen.dart';
import 'features/missions/presentation/missions_screen.dart';
import 'features/journal/presentation/journal_screen.dart';
import 'features/journal/presentation/goals_screen.dart';
import 'features/announcements/presentation/announcements_screen.dart';
import 'features/calendar/presentation/calendar_screen.dart';
import 'features/squad/presentation/squad_screen.dart';
import 'features/squad/presentation/session_checkin_screen.dart';
import 'shared/widgets/app_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.listen(authStateProvider, (_, __) {
    refresh.value++;
  });

  final router = GoRouter(
    initialLocation: '/auth',
    refreshListenable: refresh,
    redirect: (context, state) async {
      final auth = ref.read(authStateProvider);
      // Stay put until the session stream emits, or a logged-in recruit
      // is bounced to /auth on the first frame.
      if (auth.isLoading) return null;

      final isAuthenticated = auth.asData?.value.session != null;
      final path = state.uri.path;
      final isAuthRoute = path == '/auth' || path.startsWith('/auth/');
      final isCreationRoute = path == '/character/create';

      if (!isAuthenticated) {
        return isAuthRoute ? null : '/auth';
      }

      final character = await ref.read(characterProvider.future);
      if (character == null) {
        return isCreationRoute ? null : '/character/create';
      }
      if (isAuthRoute || isCreationRoute) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/auth', builder: (context, state) => const AuthScreen()),
      GoRoute(
          path: '/auth/email',
          builder: (context, state) => const EmailAuthScreen()),
      GoRoute(
          path: '/character/create',
          builder: (context, state) => const CharacterCreationView()),
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(
              path: '/', builder: (context, state) => const BarracksScreen()),
          GoRoute(
              path: '/character',
              builder: (context, state) => const CharacterSheetView()),
          GoRoute(
              path: '/character/edit',
              builder: (context, state) => const CharacterEditScreen()),
          GoRoute(
              path: '/workout',
              builder: (context, state) => const WorkoutLogScreen()),
          GoRoute(
              path: '/missions',
              builder: (context, state) => const MissionsScreen()),
          GoRoute(
              path: '/journal',
              builder: (context, state) => const JournalScreen()),
          GoRoute(
              path: '/goals', builder: (context, state) => const GoalsScreen()),
          GoRoute(
              path: '/announcements',
              builder: (context, state) => const AnnouncementsScreen()),
          GoRoute(
              path: '/calendar',
              builder: (context, state) => const CalendarScreen()),
          GoRoute(
              path: '/squad', builder: (context, state) => const SquadScreen()),
          GoRoute(
              path: '/session',
              builder: (context, state) => const SessionCheckInScreen()),
        ],
      ),
    ],
  );

  ref.onDispose(router.dispose);
  ref.onDispose(refresh.dispose);
  return router;
});

class EmcApp extends ConsumerWidget {
  const EmcApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: AppConstants.appName,
      theme: AppTheme.dark,
      routerConfig: ref.watch(routerProvider),
      debugShowCheckedModeBanner: false,
    );
  }
}
