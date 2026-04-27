package com.example.blog.service.impl;

import com.example.blog.dao.TypeRepository;
import com.example.blog.po.Blog;
import com.example.blog.po.Type;
import com.example.blog.service.TypeService;
import com.example.blog.util.MyBeanUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import jakarta.transaction.Transactional;
import java.util.List;

@Service
public class TypeServiceImpl implements TypeService {

    private final TypeRepository typeRepository;

    public TypeServiceImpl(TypeRepository typeRepository) {
        this.typeRepository = typeRepository;
    }

    @Transactional
    @Override
    public Type saveType(Type type) {
        return typeRepository.save(type);
    }

    @Transactional
    @Override
    public Type getType(Long id) {
        // springboot2.0将findone改成了getone
        return typeRepository.getReferenceById(id);
    }

    @Transactional
    @Override
    public Type getTypeByName(String name) {
        return typeRepository.findByName(name);
    }

    @Transactional
    @Override
    public Page<Type> listType(Pageable pageable) {
        return typeRepository.findAll(pageable);
    }

    @Override
    public List<Type> listType() {
        List<Type> types = typeRepository.findAll();
        return getTypes(types);
    }

    @Override
    public List<Type> listTypeTop(Integer size) {
        Pageable pageable = PageRequest.of(0, size);
        List<Type> types = typeRepository.findTopByBlogCount(pageable);
        return getTypes(types);
    }

    private List<Type> getTypes(List<Type> types) {
        types.forEach(type -> {
            List<Blog> blogs = type.getBlogs();
            blogs.forEach(blog -> {
                blog.setContent("");
                blog.setComments(null);
                blog.setTags(null);
            });
            type.setBlogs(blogs);
        });
        return types;
    }

    @Override
    public List<Type> listByNameExceptSelf(Long id, String name) {
        return typeRepository.findByNameExceptSelf(id, name);
    }

    @Transactional
    @Override
    public Type updateType(Long id, Type type) {
        Type t = typeRepository.getReferenceById(id);
        BeanUtils.copyProperties(type, t, MyBeanUtils.getNullPropertyNames(type));
        return typeRepository.save(t);
    }

    @Transactional
    @Override
    public void deleteType(Long id) {
        typeRepository.deleteById(id);
    }
}
