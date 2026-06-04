package com.example.blog.util;

import org.springframework.beans.BeanWrapper;
import org.springframework.beans.BeanWrapperImpl;

import java.beans.PropertyDescriptor;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class MyBeanUtils {
    /**
     * 获取所有需要忽略的属性名（值为null的属性 + 强制排除的属性）
     */
    public static String[] getNullPropertyNames(Object source) {
        return getNullPropertyNames(source, new String[0]);
    }

    /**
     * 获取所有需要忽略的属性名（值为null的属性 + 强制排除的属性）
     * @param source 源对象
     * @param excludeProperties 需要强制排除的属性名数组
     * @return 需要忽略的属性名数组
     */
    public static String[] getNullPropertyNames(Object source, String... excludeProperties) {
        if (source == null) {
            return new String[0];
        }

        BeanWrapper beanWrapper = new BeanWrapperImpl(source);
        PropertyDescriptor[] pds = beanWrapper.getPropertyDescriptors();

        // 存储需要忽略的属性（值为null的属性 + 强制排除的属性）

        // 1. 添加强制排除的属性（无论值是否为null）
        Set<String> ignoreProperties = new HashSet<>(Arrays.asList(excludeProperties));

        // 2. 添加值为null的其他属性
        for (PropertyDescriptor pd : pds) {
            String propertyName = pd.getName();
            // 跳过已经在强制排除列表中的属性
            if (ignoreProperties.contains(propertyName)) {
                continue;
            }
            // 检查属性值是否为null
            if (beanWrapper.getPropertyValue(propertyName) == null) {
                ignoreProperties.add(propertyName);
            }
        }

        return ignoreProperties.toArray(new String[0]);
    }
}
