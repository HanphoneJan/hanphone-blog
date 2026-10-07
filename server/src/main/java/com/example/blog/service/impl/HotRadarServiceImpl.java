package com.example.blog.service.impl;

import com.example.blog.dao.HotItemRepository;
import com.example.blog.dao.HotSourceRepository;
import com.example.blog.hot.HotSourceKeys;
import com.example.blog.po.HotItem;
import com.example.blog.po.HotSource;
import com.example.blog.service.HotRadarService;
import com.example.blog.vo.HotCategoryVO;
import com.example.blog.vo.HotFeedItemVO;
import com.example.blog.vo.HotOverviewVO;
import com.example.blog.vo.HotSourceStatusVO;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class HotRadarServiceImpl implements HotRadarService {

    private static final List<String> CATEGORIES = List.of(
            HotSourceKeys.CATEGORY_GITHUB,
            HotSourceKeys.CATEGORY_HF,
            HotSourceKeys.CATEGORY_AI_NEWS);

    private static final int MAX_FEED_LIMIT = 100;

    private final HotItemRepository itemRepository;
    private final HotSourceRepository sourceRepository;

    public HotRadarServiceImpl(HotItemRepository itemRepository, HotSourceRepository sourceRepository) {
        this.itemRepository = itemRepository;
        this.sourceRepository = sourceRepository;
    }

    @Override
    @Cacheable("hotOverview")
    public HotOverviewVO getOverview() {
        HotOverviewVO vo = new HotOverviewVO();
        List<HotSource> sources = sourceRepository.findAllByOrderByCategoryAscSourceKeyAsc();
        vo.setSourceTotal(sources.size());
        vo.setSourceHealthy((int) sources.stream()
                .filter(s -> "SUCCESS".equals(s.getLastStatus()))
                .count());
        vo.setItemTotal(itemRepository.count());
        vo.setUpdatedAt(sources.stream()
                .map(HotSource::getLastSuccessAt)
                .filter(Objects::nonNull)
                .max(Date::compareTo)
                .orElse(null));

        List<HotCategoryVO> categories = new ArrayList<>();
        List<HotFeedItemVO> topItems = new ArrayList<>();
        for (String category : CATEGORIES) {
            categories.add(new HotCategoryVO(category, label(category), itemRepository.countByCategory(category)));
            Pageable pageable = PageRequest.of(0, 4, Sort.by(Sort.Direction.ASC, "rank"));
            itemRepository.findByCategory(category, pageable)
                    .forEach(item -> topItems.add(toVO(item)));
        }
        vo.setCategories(categories);
        vo.setTopItems(topItems);
        return vo;
    }

    @Override
    @Cacheable(value = "hotFeed",
            key = "T(java.util.Objects).toString(#category, 'all') + ':' + #limit")
    public List<HotFeedItemVO> getFeed(String category, int limit) {
        int size = Math.max(1, Math.min(limit, MAX_FEED_LIMIT));
        Pageable pageable = PageRequest.of(0, size,
                Sort.by(Sort.Direction.ASC, "rank").and(Sort.by(Sort.Direction.DESC, "score")));

        List<HotItem> items = (category == null || category.isBlank())
                ? itemRepository.findAll(pageable).getContent()
                : itemRepository.findByCategory(category, pageable);

        return items.stream().map(this::toVO).collect(Collectors.toList());
    }

    @Override
    @Cacheable("hotSources")
    public List<HotSourceStatusVO> getSources() {
        return sourceRepository.findAllByOrderByCategoryAscSourceKeyAsc().stream()
                .map(this::toVO)
                .collect(Collectors.toList());
    }

    private HotFeedItemVO toVO(HotItem item) {
        HotFeedItemVO vo = new HotFeedItemVO();
        vo.setSourceKey(item.getSourceKey());
        vo.setCategory(item.getCategory());
        vo.setItemKey(item.getItemKey());
        vo.setTitle(item.getTitle());
        vo.setTitleZh(item.getTitleZh());
        vo.setSummaryZh(item.getSummaryZh());
        vo.setUrl(item.getUrl());
        vo.setAuthor(item.getAuthor());
        vo.setTags(item.getTags());
        vo.setScore(item.getScore());
        vo.setRank(item.getRank());
        vo.setPublishedAt(item.getPublishedAt());
        vo.setFirstSeenAt(item.getFirstSeenAt());
        vo.setLastSeenAt(item.getLastSeenAt());
        return vo;
    }

    private HotSourceStatusVO toVO(HotSource source) {
        HotSourceStatusVO vo = new HotSourceStatusVO();
        vo.setSourceKey(source.getSourceKey());
        vo.setCategory(source.getCategory());
        vo.setDisplayName(source.getDisplayName());
        vo.setSourceUrl(source.getSourceUrl());
        vo.setEnabled(source.isEnabled());
        vo.setItemCount(source.getItemCount());
        vo.setLastStatus(source.getLastStatus());
        vo.setLastRunAt(source.getLastRunAt());
        vo.setLastSuccessAt(source.getLastSuccessAt());
        vo.setLastError(source.getLastError());
        return vo;
    }

    private String label(String category) {
        return switch (category) {
            case HotSourceKeys.CATEGORY_GITHUB -> "GitHub 热门";
            case HotSourceKeys.CATEGORY_HF -> "Hugging Face 趋势";
            case HotSourceKeys.CATEGORY_AI_NEWS -> "AI 要闻";
            default -> category;
        };
    }
}
