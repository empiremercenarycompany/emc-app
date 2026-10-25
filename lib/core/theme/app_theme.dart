import 'package:flutter/material.dart';

class AppColors {
  static const ironBlack = Color(0xFF111111);
  static const mercenaryRed = Color(0xFFB11217);
  static const parchmentWhite = Color(0xFFF4F1E8);
  static const steelGray = Color(0xFF5A5A5A);
  static const weatheredBronze = Color(0xFF8A6A3B);
}

class AppFonts {
  /// Brand heading face. Corleone is not bundled (see pubspec.yaml). Flutter
  /// falls back to the platform default while that family is unregistered.
  static const String heading = 'Corleone';

  static const String body = 'LeagueSpartan';
}

class AppTheme {
  static ThemeData get dark {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.ironBlack,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.mercenaryRed,
        secondary: AppColors.weatheredBronze,
        surface: AppColors.ironBlack,
        onSurface: AppColors.parchmentWhite,
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(
            fontFamily: AppFonts.heading, color: AppColors.parchmentWhite),
        headlineMedium: TextStyle(
            fontFamily: AppFonts.heading, color: AppColors.parchmentWhite),
        bodyLarge: TextStyle(
            fontFamily: AppFonts.body, color: AppColors.parchmentWhite),
        bodyMedium: TextStyle(
            fontFamily: AppFonts.body, color: AppColors.parchmentWhite),
      ),
    );
  }

  static ThemeData get light => dark; // Dark-first for brand
}
