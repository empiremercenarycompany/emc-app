import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_constants.dart';
import '../../../services/supabase_service.dart';

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  bool _loading = false;
  String? _error;

  Future<void> _signInWithOAuth(OAuthProvider provider) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await SupabaseService.client.auth.signInWithOAuth(
        provider,
        // Mobile returns through the app scheme. Web stays on this origin.
        redirectTo: kIsWeb ? null : 'io.supabase.emc://login-callback/',
      );
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.ironBlack,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'EMPIRE',
                style: Theme.of(context).textTheme.displayLarge?.copyWith(
                      fontSize: 48,
                      letterSpacing: 4,
                    ),
              ),
              Text(
                'MERCENARY COMPANY',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: AppColors.mercenaryRed,
                      letterSpacing: 2,
                    ),
              ),
              const SizedBox(height: 24),
              Text(
                AppConstants.motto,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 8),
              Text(
                AppConstants.operational,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.steelGray,
                    ),
              ),
              const SizedBox(height: 48),
              if (_error != null) ...[
                Text(
                  _error!,
                  style: const TextStyle(color: AppColors.mercenaryRed),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
              ],
              _AuthButton(
                label: 'Continue with Discord',
                loading: _loading,
                onPressed: () => _signInWithOAuth(OAuthProvider.discord),
              ),
              const SizedBox(height: 12),
              _AuthButton(
                label: 'Continue with Google',
                loading: _loading,
                onPressed: () => _signInWithOAuth(OAuthProvider.google),
              ),
              const SizedBox(height: 12),
              _AuthButton(
                label: 'Continue with Email',
                loading: _loading,
                onPressed: () => context.go('/auth/email'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AuthButton extends StatelessWidget {
  final String label;
  final bool loading;
  final VoidCallback onPressed;

  const _AuthButton({
    required this.label,
    required this.loading,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        onPressed: loading ? null : onPressed,
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.parchmentWhite,
          side: const BorderSide(color: AppColors.mercenaryRed),
          padding: const EdgeInsets.symmetric(vertical: 16),
        ),
        child: loading
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: AppColors.mercenaryRed),
              )
            : Text(label),
      ),
    );
  }
}
