package com.example.blog.enums;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * 用户类型枚举
 */
public enum UserType {
    /**
     * 普通用户
     */
    NORMAL("0"),

    /**
     * 管理员
     */
    ADMIN("1");

    private final String code;

    UserType(String code) {
        this.code = code;
    }

    @JsonValue
    public String getCode() {
        return code;
    }

    /**
     * 根据代码获取枚举
     */
    public static UserType fromCode(String code) {
        if (code == null) {
            return null;
        }
        for (UserType type : UserType.values()) {
            if (type.code.equals(code)) {
                return type;
            }
        }
        return null;
    }

    /**
     * 判断是否为管理员
     */
    public boolean isAdmin() {
        return this == ADMIN;
    }

    /**
     * 判断是否为普通用户
     */
    public boolean isNormal() {
        return this == NORMAL;
    }
}
