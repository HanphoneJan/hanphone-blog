package com.example.blog.util;

import java.util.Map;

/**
 * 随笔附件缩略图字段的解析工具。
 *
 * <p>背景：随笔图片由 admin-file 上传，服务端会同步生成 320w/800w/1600w 的 WebP 缩略图，
 * 并在上传响应里返回 {@code width} / {@code height} / {@code thumbPath}。
 * 列表页/九宫格一律用小图，点开放大才回原图 —— 原图单张可达十几 MB，
 * 直接展示会同时打爆浏览器和 2C2G 的服务器。
 *
 * <p>admin 与 MCP 两个入口都是手写 {@code Map} 解析，共用这里的校验规则，
 * 保证非法值一律落库为 {@code null} 而不是把脏数据写进表里。
 *
 * <p>老数据、外链附件、上传失败回退等场景这三个字段都可能缺失，
 * 前端拿到 null 会透明回退到原图，因此这里不做任何猜测或补全。
 */
public final class EssayFileUrlFields {

    /** thumb_path 列长度上限，与建表 SQL 保持一致 */
    private static final int THUMB_PATH_MAX_LENGTH = 512;

    private EssayFileUrlFields() {
    }

    /**
     * 解析正整数宽高：null / 非数字 / 0 / 负数 / 小于 1 一律返回 null。
     * <p>JSON 反序列化后数字可能是 Integer / Long / Double / String，统一按字符串解析。
     */
    public static Integer toPositiveInt(Object value) {
        if (value == null) {
            return null;
        }
        int parsed;
        try {
            if (value instanceof Number number) {
                double d = number.doubleValue();
                if (!Double.isFinite(d) || d > Integer.MAX_VALUE) {
                    return null;
                }
                parsed = (int) Math.round(d);
            } else {
                parsed = Integer.parseInt(value.toString().trim());
            }
        } catch (NumberFormatException e) {
            return null;
        }
        return parsed > 0 ? parsed : null;
    }

    /**
     * 解析 thumbPath：非字符串、空串、超长一律返回 null（存 null 即让前端回退原图）。
     */
    public static String toThumbPath(Object value) {
        if (!(value instanceof String s)) {
            return null;
        }
        String trimmed = s.trim();
        if (trimmed.isEmpty() || trimmed.length() > THUMB_PATH_MAX_LENGTH) {
            return null;
        }
        return trimmed;
    }

    /**
     * 从请求 Map 中一次性取出 width / height / thumbPath，并写进实体。
     */
    public static void applyTo(Map<String, Object> fileUrlMap, com.example.blog.po.EssayFileUrl target) {
        target.setWidth(toPositiveInt(fileUrlMap.get("width")));
        target.setHeight(toPositiveInt(fileUrlMap.get("height")));
        target.setThumbPath(toThumbPath(fileUrlMap.get("thumbPath")));
    }
}