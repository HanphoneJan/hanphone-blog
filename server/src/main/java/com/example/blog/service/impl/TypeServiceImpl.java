package com.example.blog.service.impl;

import com.example.blog.dao.TypeRepository;
import com.example.blog.dao.BlogRepository;
import com.example.blog.po.Blog;
import com.example.blog.po.Type;
import com.example.blog.service.AdminFileService;
import com.example.blog.service.TypeService;
import com.example.blog.util.MyBeanUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.transaction.Transactional;
import java.util.List;

@Service
public class TypeServiceImpl implements TypeService {

    private static final Logger logger = LoggerFactory.getLogger(TypeServiceImpl.class);

    private final TypeRepository typeRepository;
    private final BlogRepository blogRepository;
    private final AdminFileService adminFileService;

    public TypeServiceImpl(TypeRepository typeRepository,
            BlogRepository blogRepository,
            AdminFileService adminFileService) {
        this.typeRepository = typeRepository;
        this.blogRepository = blogRepository;
        this.adminFileService = adminFileService;
    }

    @CacheEvict(value = {"types", "typesTop"}, allEntries = true)
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

    @Cacheable("types")
    @Override
    public List<Type> listType() {
        List<Type> types = typeRepository.findAll();
        return getTypes(types);
    }

    @Cacheable("typesTop")
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

    @CacheEvict(value = {"types", "typesTop"}, allEntries = true)
    @Transactional
    @Override
    public Type updateType(Long id, Type type) {
        Type t = typeRepository.getReferenceById(id);
        BeanUtils.copyProperties(type, t, MyBeanUtils.getNullPropertyNames(type));
        return typeRepository.save(t);
    }

    @CacheEvict(value = {"types", "typesTop"}, allEntries = true)
    @Transactional
    @Override
    public void deleteType(Long id, boolean syncDeleteImage) {
        // 先取出分类图，记录删除后就查不到了
        String picUrl = typeRepository.findById(id)
                .map(Type::getPic_url)
                .orElse(null);
        typeRepository.deleteById(id);
        if (syncDeleteImage && picUrl != null && !picUrl.isBlank()) {
            try {
                // 仍有博客把这张图当封面时属于共用图片，删掉会让那些博客封面失效
                if (blogRepository.countByFirstPicture(picUrl) > 0) {
                    logger.info("分类 {} 的图片仍被博客引用，跳过物理删除: {}", id, picUrl);
                } else {
                    adminFileService.deleteManagedFiles(List.of(picUrl));
                }
            } catch (Exception fileEx) {
                logger.warn("回收分类图片失败，分类ID: {}", id, fileEx);
            }
        }
    }
}
