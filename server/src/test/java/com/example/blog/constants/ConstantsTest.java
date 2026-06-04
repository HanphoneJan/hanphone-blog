package com.example.blog.constants;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.*;

/**
 * 常量类单元测试
 */
class ConstantsTest {

    @Test
    @DisplayName("测试通用常量 - 默认父ID")
    void commonConstants_DefaultParentId() {
        assertEquals(-1L, CommonConstants.DEFAULT_PARENT_ID);
    }

    @Test
    @DisplayName("测试通用常量 - 点赞增加量")
    void commonConstants_LikeIncrement() {
        assertEquals(1, CommonConstants.LIKE_INCREMENT);
    }

    @Test
    @DisplayName("测试通用常量 - 点赞减少量")
    void commonConstants_LikeDecrement() {
        assertEquals(-1, CommonConstants.LIKE_DECREMENT);
    }

    @Test
    @DisplayName("测试通用常量 - 值应该正确设置")
    void commonConstants_ValuesShouldBeCorrect() {
        assertTrue(CommonConstants.LIKE_INCREMENT > 0);
        assertTrue(CommonConstants.LIKE_DECREMENT < 0);
        assertTrue(CommonConstants.DEFAULT_PARENT_ID < 0);
    }

    @Test
    @DisplayName("测试分页常量 - 默认分页大小")
    void paginationConstants_DefaultPageSize() {
        assertEquals(8, PaginationConstants.DEFAULT_PAGE_SIZE);
    }

    @Test
    @DisplayName("测试分页常量 - 推荐博客数量")
    void paginationConstants_RecommendBlogSize() {
        assertEquals(8, PaginationConstants.RECOMMEND_BLOG_SIZE);
    }

    @Test
    @DisplayName("测试分页常量 - 数值应该为正数")
    void paginationConstants_ValuesShouldBePositive() {
        assertTrue(PaginationConstants.DEFAULT_PAGE_SIZE > 0);
        assertTrue(PaginationConstants.RECOMMEND_BLOG_SIZE > 0);
    }

    @Test
    @DisplayName("测试常量类是 final 的")
    void constantsClasses_ShouldBeFinal() {
        assertTrue(java.lang.reflect.Modifier.isFinal(CommonConstants.class.getModifiers()));
        assertTrue(java.lang.reflect.Modifier.isFinal(PaginationConstants.class.getModifiers()));
    }

    @Test
    @DisplayName("测试常量类有私有构造方法")
    void constantsClasses_ShouldHavePrivateConstructor() throws NoSuchMethodException {
        assertTrue(java.lang.reflect.Modifier.isPrivate(CommonConstants.class.getDeclaredConstructor().getModifiers()));
        assertTrue(java.lang.reflect.Modifier.isPrivate(PaginationConstants.class.getDeclaredConstructor().getModifiers()));
    }

    @Test
    @DisplayName("测试常量类不能被实例化")
    void constantsClasses_CannotBeInstantiated() throws NoSuchMethodException {
        // 测试 CommonConstants - 验证构造函数是私有的并抛出异常
        java.lang.reflect.Constructor<CommonConstants> commonCtor = CommonConstants.class.getDeclaredConstructor();
        commonCtor.setAccessible(true);

        Throwable commonCause = null;
        try {
            commonCtor.newInstance();
        } catch (java.lang.reflect.InvocationTargetException e) {
            commonCause = e.getCause();
        } catch (Exception e) {
            commonCause = e;
        }
        assertNotNull(commonCause);
        assertTrue(commonCause instanceof UnsupportedOperationException);

        // 测试 PaginationConstants
        java.lang.reflect.Constructor<PaginationConstants> paginationCtor = PaginationConstants.class.getDeclaredConstructor();
        paginationCtor.setAccessible(true);

        Throwable paginationCause = null;
        try {
            paginationCtor.newInstance();
        } catch (java.lang.reflect.InvocationTargetException e) {
            paginationCause = e.getCause();
        } catch (Exception e) {
            paginationCause = e;
        }
        assertNotNull(paginationCause);
        assertTrue(paginationCause instanceof UnsupportedOperationException);
    }
}
