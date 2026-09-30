package com.hanphone.blog.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * Material 3 双主题色板 —— 逐一映射 web 端 globals.css 的 CSS 变量：
 *
 * 白日（:root）：--bg #FFFFFF、--card #FAFBFD、--border #E2E8F0、
 *              --text #0F172A、--text-muted #64748B、--primary #2563EB、--danger #EF4444
 * 黑夜（.dark）：--bg #020617、--card #0F172A(80%)、--border #253A60(40%)、
 *              --text #F1F5F9、--text-muted #94A3B8、--primary #3B82F6
 */

// ---- 白日（对齐 web :root）----
val LightPrimary = Color(0xFF2563EB)             // --primary (blue-600)
val LightOnPrimary = Color(0xFFFFFFFF)
val LightPrimaryContainer = Color(0xFFEFF6FF)    // --hover (blue-50)
val LightOnPrimaryContainer = Color(0xFF1D4ED8)  // --primary-hover (blue-700)

val LightSecondary = Color(0xFF64748B)           // --text-muted (slate-500)
val LightOnSecondary = Color(0xFFFFFFFF)
val LightSecondaryContainer = Color(0xFFF1F5F9)  // slate-100
val LightOnSecondaryContainer = Color(0xFF0F172A)

val LightTertiary = Color(0xFF475569)            // slate-600（web 无 tertiary，取 slate 系保持统一）
val LightOnTertiary = Color(0xFFFFFFFF)
val LightTertiaryContainer = Color(0xFFE2E8F0)   // slate-200
val LightOnTertiaryContainer = Color(0xFF0F172A)

val LightBackground = Color(0xFFFFFFFF)          // --bg
val LightOnBackground = Color(0xFF0F172A)        // --text (slate-900)
val LightSurface = Color(0xFFFAFBFD)             // --card
val LightOnSurface = Color(0xFF0F172A)
val LightSurfaceVariant = Color(0xFFF1F5F9)      // slate-100（≈ --code-bg）
val LightOnSurfaceVariant = Color(0xFF64748B)    // --text-muted
val LightOutline = Color(0xFF94A3B8)             // slate-400
val LightOutlineVariant = Color(0xFFE2E8F0)      // --border

val LightSurfaceContainerLowest = Color(0xFFFFFFFF)
val LightSurfaceContainerLow = Color(0xFFFAFBFD)    // --card
val LightSurfaceContainer = Color(0xFFF8FAFC)       // --code-bg (slate-50)
val LightSurfaceContainerHigh = Color(0xFFF1F5F9)   // slate-100
val LightSurfaceContainerHighest = Color(0xFFE2E8F0) // slate-200

val LightError = Color(0xFFEF4444)               // --danger
val LightOnError = Color(0xFFFFFFFF)
val LightErrorContainer = Color(0xFFFEE2E2)      // red-100
val LightOnErrorContainer = Color(0xFF7F1D1D)    // red-900

// ---- 黑夜（对齐 web .dark）----
val DarkPrimary = Color(0xFF3B82F6)              // --primary (blue-500)
val DarkOnPrimary = Color(0xFFFFFFFF)
val DarkPrimaryContainer = Color(0xFF1E293B)     // --hover (slate-800/30% 视觉近似)
val DarkOnPrimaryContainer = Color(0xFF93C5FD)   // blue-300

val DarkSecondary = Color(0xFF94A3B8)            // --text-muted (slate-400)
val DarkOnSecondary = Color(0xFF0F172A)
val DarkSecondaryContainer = Color(0xFF1E293B)   // slate-800
val DarkOnSecondaryContainer = Color(0xFFE2E8F0) // slate-200

val DarkTertiary = Color(0xFFCBD5E1)             // slate-300
val DarkOnTertiary = Color(0xFF0F172A)
val DarkTertiaryContainer = Color(0xFF334155)    // slate-700
val DarkOnTertiaryContainer = Color(0xFFE2E8F0)

val DarkBackground = Color(0xFF020617)           // --bg (slate-950)
val DarkOnBackground = Color(0xFFF1F5F9)         // --text (slate-100)
val DarkSurface = Color(0xFF0F172A)              // --card (slate-900，不透明化)
val DarkOnSurface = Color(0xFFF1F5F9)
val DarkSurfaceVariant = Color(0xFF1E293B)       // slate-800（≈ --code-bg）
val DarkOnSurfaceVariant = Color(0xFF94A3B8)     // --text-muted
val DarkOutline = Color(0xFF475569)              // slate-600
val DarkOutlineVariant = Color(0xFF253A60)       // --border (slate-900/40% 不透明化)

val DarkSurfaceContainerLowest = Color(0xFF020617)
val DarkSurfaceContainerLow = Color(0xFF0B1324)     // card 在 bg 上的合成色
val DarkSurfaceContainer = Color(0xFF0F172A)        // slate-900
val DarkSurfaceContainerHigh = Color(0xFF1E293B)    // slate-800
val DarkSurfaceContainerHighest = Color(0xFF24324A)

val DarkError = Color(0xFFEF4444)                // --danger
val DarkOnError = Color(0xFFFFFFFF)
val DarkErrorContainer = Color(0xFF7F1D1D)       // red-900
val DarkOnErrorContainer = Color(0xFFFECACA)     // red-200
