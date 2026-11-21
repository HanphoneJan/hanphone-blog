package com.example.blog.util;

import jakarta.servlet.http.HttpServletRequest;

/**
 * 从请求里推断设备名（登录设备列表展示用）。
 * 优先 `X-Device-Name`（客户端自报，如 "Pixel 8 · Android"），否则按 User-Agent 归类。
 */
public final class DeviceNameUtil {

    private DeviceNameUtil() {
    }

    public static String resolve(HttpServletRequest request) {
        String fromHeader = request.getHeader("X-Device-Name");
        if (fromHeader != null && !fromHeader.isBlank()) {
            return cut(fromHeader.trim(), 120);
        }
        String ua = request.getHeader("User-Agent");
        if (ua == null || ua.isBlank()) {
            return null;
        }
        if (ua.contains("Android")) return "Android";
        if (ua.contains("Windows")) return "Windows";
        if (ua.contains("Macintosh")) return "macOS";
        if (ua.contains("iPhone") || ua.contains("iPad")) return "iOS";
        return cut(ua, 60);
    }

    private static String cut(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }
}
