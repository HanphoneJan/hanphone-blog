package com.example.blog.service;

import com.example.blog.po.Type;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface TypeService {

    Type saveType(Type type);

    Type getType(Long id);

    Type getTypeByName(String name);

    Page<Type> listType(Pageable pageable);

    List<Type> listType();

    List<Type> listTypeTop(Integer size);

    List<Type> listByNameExceptSelf(Long id,String name);

    Type updateType(Long id,Type type);

    /**
     * 删除分类
     *
     * @param id              分类 ID
     * @param syncDeleteImage 是否同步删除 admin-file 上的分类图片（pic_url 指向本站托管文件时生效）
     */
    void deleteType(Long id, boolean syncDeleteImage);

}
