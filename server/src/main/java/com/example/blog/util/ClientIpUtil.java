package com.example.blog.util;

import jakarta.servlet.http.HttpServletRequest;

import java.net.InetAddress;

public final class ClientIpUtil {

    private ClientIpUtil() {
    }

    // 仅信任反向代理（nginx）覆写的 X-Real-IP；X-Forwarded-For 可由客户端伪造。
    // 仅当直接对端是代理（loopback/内网）时才信任该头；直连时退回 remoteAddr。
    public static String getClientIp(HttpServletRequest request) {
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank() && isTrustedProxy(request.getRemoteAddr())) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    private static boolean isTrustedProxy(String remoteAddr) {
        try {
            InetAddress addr = InetAddress.getByName(remoteAddr);
            return addr.isLoopbackAddress() || addr.isSiteLocalAddress();
        } catch (Exception e) {
            return false;
        }
    }
}