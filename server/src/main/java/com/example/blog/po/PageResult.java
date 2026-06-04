package com.example.blog.po;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data // 生成getter、setter、toString、equals和hashCode方法
@NoArgsConstructor // 生成无参构造方法
@AllArgsConstructor // 生成全参构造方法
public class PageResult<T> {

    private Long total;//总记录数
    private List<T> rows;//记录
}
