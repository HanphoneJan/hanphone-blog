package com.example.blog.po;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Result 实体类单元测试
 */
class ResultTest {

    @Test
    @DisplayName("测试无参构造方法")
    void noArgsConstructor_ShouldCreateEmptyResult() {
        Result<String> result = new Result<>();
        
        // 对于 boolean 类型，默认值为 false，不是 null
        assertFalse(result.isFlag());
        assertNull(result.getCode());
        assertNull(result.getMessage());
        assertNull(result.getData());
    }

    @Test
    @DisplayName("测试三参数构造方法")
    void threeArgsConstructor_ShouldCreateResultWithFlagCodeMessage() {
        Result<String> result = new Result<>(true, 200, "成功");
        
        assertTrue(result.isFlag());
        assertEquals(200, result.getCode());
        assertEquals("成功", result.getMessage());
        assertNull(result.getData());
    }

    @Test
    @DisplayName("测试全参数构造方法")
    void allArgsConstructor_ShouldCreateCompleteResult() {
        String data = "test data";
        Result<String> result = new Result<>(true, 200, "成功", data);
        
        assertTrue(result.isFlag());
        assertEquals(200, result.getCode());
        assertEquals("成功", result.getMessage());
        assertEquals(data, result.getData());
    }

    @Test
    @DisplayName("测试 Setter 和 Getter 方法")
    void settersAndGetters_ShouldWorkCorrectly() {
        Result<Integer> result = new Result<>();
        
        result.setFlag(true);
        result.setCode(404);
        result.setMessage("未找到");
        result.setData(42);
        
        assertTrue(result.isFlag());
        assertEquals(404, result.getCode());
        assertEquals("未找到", result.getMessage());
        assertEquals(42, result.getData());
    }

    @Test
    @DisplayName("测试泛型类型 - Integer")
    void genericType_IntegerShouldWork() {
        Result<Integer> result = new Result<>(true, 200, "成功", 100);
        
        assertEquals(100, result.getData());
    }

    @Test
    @DisplayName("测试泛型类型 - Object")
    void genericType_ObjectShouldWork() {
        Object obj = new Object();
        Result<Object> result = new Result<>(true, 200, "成功", obj);
        
        assertSame(obj, result.getData());
    }

    @Test
    @DisplayName("测试失败结果")
    void failureResult_ShouldHaveFalseFlag() {
        Result<String> result = new Result<>(false, 500, "服务器错误");
        
        assertFalse(result.isFlag());
        assertEquals(500, result.getCode());
        assertEquals("服务器错误", result.getMessage());
    }

    @Test
    @DisplayName("测试 toString 方法")
    void toString_ShouldContainAllFields() {
        Result<String> result = new Result<>(true, 200, "成功", "data");
        String str = result.toString();
        
        assertTrue(str.contains("Result"));
        assertTrue(str.contains("flag=true") || str.contains("flag = true"));
        assertTrue(str.contains("code=200") || str.contains("code = 200"));
    }
}
