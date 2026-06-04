package com.example.blog.service.impl;

import com.example.blog.DTO.TagBlogCountDTO;
import com.example.blog.dao.TagRepository;
import com.example.blog.po.Blog;
import com.example.blog.po.Tag;
import com.example.blog.service.TagService;
import org.springframework.beans.BeanUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class TagServiceImpl implements TagService {

    private final TagRepository tagRepository;

    // 构造函数依赖注入校验
    public TagServiceImpl(TagRepository tagRepository) {
        this.tagRepository = Objects.requireNonNull(tagRepository, "tagRepository must not be null");
    }

    @Override
    public List<TagBlogCountDTO> listTagAndBlogNumber() {
        try {
            List<TagBlogCountDTO> result = tagRepository.findAllWithBlogCount();
            Objects.requireNonNull(result, "Tag blog count result must not be null");
            return result;
        } catch (Exception e) {
            throw new RuntimeException("Failed to get tag and blog count list", e);
        }
    }

    @Transactional
    @Override
    public Tag saveTag(Tag tag) {
        try {
            Objects.requireNonNull(tag, "Tag to save must not be null");
            Tag savedTag = tagRepository.save(tag);
            Objects.requireNonNull(savedTag, "Saved tag must not be null");
            return savedTag;
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid tag data: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save tag", e);
        }
    }

    @Transactional
    @Override
    public Tag getTag(Long id) {
        try {
            Objects.requireNonNull(id, "Tag id must not be null");
            Tag tag = tagRepository.getReferenceById(id);
            Objects.requireNonNull(tag, "Tag not found with id: " + id);
            return tag;
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid tag id: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get tag by id: " + id, e);
        }
    }

    @Transactional
    @Override
    public Tag getTagByName(String name) {
        try {
            Objects.requireNonNull(name, "Tag name must not be null");
            return tagRepository.findByName(name);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid tag name: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get tag by name: " + name, e);
        }
    }

    @Override
    public List<Tag> listTag() {
        try {
            List<Tag> tags = tagRepository.findAll();
            return reduceTagsAttributes(tags);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get all tags", e);
        }
    }

    @Transactional
    @Override
    public Page<Tag> listTag(Pageable pageable) {
        try {
            Objects.requireNonNull(pageable, "Pageable must not be null");
            Page<Tag> tagPage = tagRepository.findAll(pageable);
            Objects.requireNonNull(tagPage, "Tag page result must not be null");
            return tagPage;
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid pageable: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get tag page", e);
        }
    }

    @Override
    public List<Tag> listTagTop(Integer size) {
        try {
            Objects.requireNonNull(size, "Size must not be null");
            if (size <= 0) {
                throw new IllegalArgumentException("Size must be greater than 0");
            }

            Pageable pageable = PageRequest.of(0, size);
            List<Tag> tags = tagRepository.findTopByBlogCount(pageable);
            return reduceTagsAttributes(tags);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid size parameter: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get top tags with size: " + size, e);
        }
    }

    @Override
    public List<Tag> listTag(String ids) {
        try {
            List<Long> idList = convertToList(ids);
            List<Tag> tags = tagRepository.findAllById(idList);
            return reduceTagsAttributes(tags);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get tags by ids: " + ids, e);
        }
    }

    private List<Tag> reduceTagsAttributes(List<Tag> tags) {
        try {
            if (tags == null) {
                return new ArrayList<>();
            }

            tags.forEach(tag -> {
                if (tag != null) {
                    List<Blog> blogs = tag.getBlogs();
                    if (blogs != null) {
                        blogs.forEach(blog -> {
                            if (blog != null) {
                                blog.setContent("");
                                blog.setComments(null);
                            }
                        });
                        tag.setBlogs(blogs);
                    }
                }
            });
            return tags;
        } catch (Exception e) {
            throw new RuntimeException("Failed to reduce tag attributes", e);
        }
    }

    private List<Long> convertToList(String ids) {
        try {
            List<Long> list = new ArrayList<>();
            if (ids == null || ids.trim().isEmpty()) {
                return list;
            }

            String[] idArray = ids.split(",");
            for (String s : idArray) {
                if (s != null && !s.trim().isEmpty()) {
                    try {
                        list.add(Long.valueOf(s.trim()));
                    } catch (NumberFormatException e) {
                        throw new IllegalArgumentException("Invalid id format: " + s, e);
                    }
                }
            }
            return list;
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Failed to convert ids to list: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("Error converting ids to list: " + ids, e);
        }
    }

    @Transactional
    @Override
    public Tag updateTag(Long id, Tag tag) {
        try {
            Objects.requireNonNull(id, "Tag id must not be null");
            Objects.requireNonNull(tag, "Tag data must not be null");

            Optional<Tag> optionalTag = tagRepository.findById(id);
            if (!optionalTag.isPresent()) {
                throw new IllegalArgumentException("Tag not found with id: " + id);
            }

            Tag t = optionalTag.get();
            BeanUtils.copyProperties(tag, t);
            Tag updatedTag = tagRepository.save(t);
            Objects.requireNonNull(updatedTag, "Updated tag must not be null");
            return updatedTag;
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid update parameters: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to update tag with id: " + id, e);
        }
    }

    @Transactional
    @Override
    public void deleteTag(Long id) {
        try {
            Objects.requireNonNull(id, "Tag id must not be null");
            tagRepository.deleteById(id);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid tag id: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete tag with id: " + id, e);
        }
    }

    @Override
    public List<Tag> listByNameExceptSelf(Long id, String name) {
        try {
            Objects.requireNonNull(id, "Tag id must not be null");
            Objects.requireNonNull(name, "Tag name must not be null");

            List<Tag> tags = tagRepository.findByNameExceptSelf(id, name);
            Objects.requireNonNull(tags, "Result list must not be null");
            return tags;
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid parameters: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get tags by name except self: id=" + id + ", name=" + name, e);
        }
    }
}