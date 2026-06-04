package com.example.blog.service.impl;

import com.example.blog.dao.BlogRepository;
import com.example.blog.dao.DocRepository;
import com.example.blog.dao.EssayRepository;
import com.example.blog.dao.ProjectRepository;
import com.example.blog.enums.ContentType;
import com.example.blog.po.Blog;
import com.example.blog.po.Doc;
import com.example.blog.po.Essay;
import com.example.blog.po.Project;
import com.example.blog.service.GlobalSearchService;
import com.example.blog.vo.SearchResultItem;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class GlobalSearchServiceImpl implements GlobalSearchService {

    private final BlogRepository blogRepository;
    private final EssayRepository essayRepository;
    private final ProjectRepository projectRepository;
    private final DocRepository docRepository;

    public GlobalSearchServiceImpl(BlogRepository blogRepository,
                                   EssayRepository essayRepository,
                                   ProjectRepository projectRepository,
                                   DocRepository docRepository) {
        this.blogRepository = Objects.requireNonNull(blogRepository, "blogRepository must not be null");
        this.essayRepository = Objects.requireNonNull(essayRepository, "essayRepository must not be null");
        this.projectRepository = Objects.requireNonNull(projectRepository, "projectRepository must not be null");
        this.docRepository = Objects.requireNonNull(docRepository, "docRepository must not be null");
    }

    @Override
    public List<SearchResultItem> search(String query, int limit) {
        if (query == null || query.trim().isEmpty()) {
            return List.of();
        }

        String keyword = query.trim().toLowerCase();

        List<SearchResultItem> blogResults = searchBlogs(keyword);
        List<SearchResultItem> essayResults = searchEssays(keyword);
        List<SearchResultItem> projectResults = searchProjects(keyword);
        List<SearchResultItem> docResults = searchDocs(keyword);

        return Stream.of(blogResults, essayResults, projectResults, docResults)
                .flatMap(List::stream)
                .sorted(Comparator
                        .comparingInt(SearchResultItem::getScore).reversed()
                        .thenComparing((SearchResultItem item) -> item.getUpdateTime() != null ? item.getUpdateTime() : LocalDateTime.MIN, Comparator.reverseOrder()))
                .limit(Math.max(1, limit))
                .collect(Collectors.toList());
    }

    private List<SearchResultItem> searchBlogs(String keyword) {
        List<Blog> blogs = blogRepository.findAll(
                (Specification<Blog>) (root, cq, cb) -> {
                    List<Predicate> predicates = new ArrayList<>();
                    predicates.add(cb.equal(root.get("published"), true));

                    Predicate titlePredicate = cb.like(root.get("title"), "%" + keyword + "%");
                    Predicate descriptionPredicate = cb.like(root.get("description"), "%" + keyword + "%");
                    Predicate contentPredicate = cb.like(root.get("content"), "%" + keyword + "%");

                    predicates.add(cb.or(titlePredicate, descriptionPredicate, contentPredicate));
                    cq.where(predicates.toArray(new Predicate[0]));
                    return null;
                });

        return blogs.stream()
                .map(blog -> {
                    int score = 0;
                    if (containsIgnoreCase(blog.getTitle(), keyword)) score += 3;
                    if (containsIgnoreCase(blog.getDescription(), keyword)) score += 2;
                    if (containsIgnoreCase(blog.getContent(), keyword)) score += 1;

                    return new SearchResultItem(
                            blog.getId(),
                            blog.getTitle(),
                            blog.getDescription(),
                            ContentType.BLOG,
                            "/blog/" + blog.getId(),
                            false,
                            score,
                            toLocalDateTime(blog.getUpdateTime())
                    );
                })
                .collect(Collectors.toList());
    }

    private List<SearchResultItem> searchEssays(String keyword) {
        List<Essay> essays = essayRepository.findAll(
                (Specification<Essay>) (root, cq, cb) -> {
                    List<Predicate> predicates = new ArrayList<>();
                    predicates.add(cb.equal(root.get("published"), true));

                    Predicate titlePredicate = cb.like(root.get("title"), "%" + keyword + "%");
                    Predicate contentPredicate = cb.like(root.get("content"), "%" + keyword + "%");

                    predicates.add(cb.or(titlePredicate, contentPredicate));
                    cq.where(predicates.toArray(new Predicate[0]));
                    return null;
                });

        return essays.stream()
                .map(essay -> {
                    int score = 0;
                    if (containsIgnoreCase(essay.getTitle(), keyword)) score += 3;
                    if (containsIgnoreCase(essay.getContent(), keyword)) score += 1;

                    return new SearchResultItem(
                            essay.getId(),
                            essay.getTitle(),
                            null,
                            ContentType.ESSAY,
                            "/essays#" + essay.getId(),
                            false,
                            score,
                            toLocalDateTime(essay.getCreateTime())
                    );
                })
                .collect(Collectors.toList());
    }

    private List<SearchResultItem> searchProjects(String keyword) {
        List<Project> projects = projectRepository.findAll(
                (Specification<Project>) (root, cq, cb) -> {
                    List<Predicate> predicates = new ArrayList<>();
                    predicates.add(cb.equal(root.get("published"), true));

                    Predicate titlePredicate = cb.like(root.get("title"), "%" + keyword + "%");
                    Predicate contentPredicate = cb.like(root.get("content"), "%" + keyword + "%");

                    predicates.add(cb.or(titlePredicate, contentPredicate));
                    cq.where(predicates.toArray(new Predicate[0]));
                    return null;
                });

        return projects.stream()
                .map(project -> {
                    int score = 0;
                    if (containsIgnoreCase(project.getTitle(), keyword)) score += 3;
                    if (containsIgnoreCase(project.getContent(), keyword)) score += 1;

                    return new SearchResultItem(
                            project.getId(),
                            project.getTitle(),
                            null,
                            ContentType.PROJECT,
                            project.getUrl(),
                            true,
                            score,
                            null
                    );
                })
                .collect(Collectors.toList());
    }

    private List<SearchResultItem> searchDocs(String keyword) {
        List<Doc> docs = docRepository.findAll(
                (Specification<Doc>) (root, cq, cb) -> {
                    List<Predicate> predicates = new ArrayList<>();
                    predicates.add(cb.equal(root.get("published"), true));

                    Predicate titlePredicate = cb.like(root.get("title"), "%" + keyword + "%");
                    Predicate descriptionPredicate = cb.like(root.get("description"), "%" + keyword + "%");

                    predicates.add(cb.or(titlePredicate, descriptionPredicate));
                    cq.where(predicates.toArray(new Predicate[0]));
                    return null;
                });

        return docs.stream()
                .map(doc -> {
                    int score = 0;
                    if (containsIgnoreCase(doc.getTitle(), keyword)) score += 3;
                    if (containsIgnoreCase(doc.getDescription(), keyword)) score += 2;

                    return new SearchResultItem(
                            doc.getId(),
                            doc.getTitle(),
                            doc.getDescription(),
                            ContentType.DOC,
                            "/docs/" + doc.getDocId(),
                            false,
                            score,
                            doc.getUpdateTime()
                    );
                })
                .collect(Collectors.toList());
    }

    private boolean containsIgnoreCase(String text, String keyword) {
        return text != null && text.toLowerCase().contains(keyword);
    }

    private LocalDateTime toLocalDateTime(Date date) {
        if (date == null) {
            return null;
        }
        return date.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
    }
}
