package com.example.blog.service.impl;

import com.example.blog.dao.BlogMonthlyVisitsRepository;
import com.example.blog.po.BlogMonthlyVisits;
import com.example.blog.service.BlogMonthlyVisitsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.TransactionException;

import javax.transaction.Transactional;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class BlogMonthlyVisitsServiceImpl implements BlogMonthlyVisitsService {

    private final BlogMonthlyVisitsRepository blogMonthlyVisitsRepository;

    public BlogMonthlyVisitsServiceImpl(BlogMonthlyVisitsRepository blogMonthlyVisitsRepository) {
        this.blogMonthlyVisitsRepository = Objects.requireNonNull(blogMonthlyVisitsRepository,
                "blogMonthlyVisitsRepository must not be null");
    }

    @Override
    public BlogMonthlyVisits saveBlogMonthlyVisits(BlogMonthlyVisits blogMonthlyVisits) {
        Objects.requireNonNull(blogMonthlyVisits, "blogMonthlyVisits must not be null");
        try {
            return blogMonthlyVisitsRepository.save(blogMonthlyVisits);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save BlogMonthlyVisits", e);
        }
    }

    @Override
    public BlogMonthlyVisits getBlogMonthlyVisits(Long id) {
        Objects.requireNonNull(id, "id must not be null");
        try {
            return blogMonthlyVisitsRepository.findById(id).orElse(null);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get BlogMonthlyVisits by id: " + id, e);
        }
    }

    @Override
    public Optional<BlogMonthlyVisits> getBlogMonthlyVisitsByYearMonth(String yearMonth) {
        Objects.requireNonNull(yearMonth, "yearMonth must not be null");
        try {
            return blogMonthlyVisitsRepository.findByYearMonth(yearMonth);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get BlogMonthlyVisits by yearMonth: " + yearMonth, e);
        }
    }

    @Override
    public List<BlogMonthlyVisits> listBlogMonthlyVisits() {
        try {
            return blogMonthlyVisitsRepository.findAll();
        } catch (Exception e) {
            throw new RuntimeException("Failed to list all BlogMonthlyVisits", e);
        }
    }

    @Override
    public List<BlogMonthlyVisits> listLatestVisits(int limit) {
        if (limit < 0) {
            throw new IllegalArgumentException("limit must not be negative");
        }
        try {
            return blogMonthlyVisitsRepository.findLatestVisits(limit);
        } catch (Exception e) {
            throw new RuntimeException("Failed to list latest " + limit + " BlogMonthlyVisits", e);
        }
    }

    @Override
    public List<BlogMonthlyVisits> listByYear(String year) {
        Objects.requireNonNull(year, "year must not be null");
        try {
            return blogMonthlyVisitsRepository.findByYear(year);
        } catch (Exception e) {
            throw new RuntimeException("Failed to list BlogMonthlyVisits by year: " + year, e);
        }
    }

    @Override
    public List<BlogMonthlyVisits> listLastSixMonths() {
        try {
            LocalDate sixMonthsAgo = LocalDate.now().minusMonths(6);
            String sixMonthsAgoYearMonth = sixMonthsAgo.format(DateTimeFormatter.ofPattern("yyyyMM"));
            return blogMonthlyVisitsRepository.findLastSixMonths(sixMonthsAgoYearMonth);
        } catch (Exception e) {
            throw new RuntimeException("Failed to list last six months BlogMonthlyVisits", e);
        }
    }

    @Override
    public List<BlogMonthlyVisits> listByYearMonthExceptSelf(Long id, String yearMonth) {
        Objects.requireNonNull(id, "id must not be null");
        Objects.requireNonNull(yearMonth, "yearMonth must not be null");
        try {
            return blogMonthlyVisitsRepository.findByYearMonthExceptSelf(id, yearMonth);
        } catch (Exception e) {
            throw new RuntimeException("Failed to list BlogMonthlyVisits by yearMonth except self: " + id, e);
        }
    }

    @Override
    public BlogMonthlyVisits updateBlogMonthlyVisits(Long id, BlogMonthlyVisits blogMonthlyVisits) {
        Objects.requireNonNull(id, "id must not be null");
        Objects.requireNonNull(blogMonthlyVisits, "blogMonthlyVisits must not be null");
        try {
            BlogMonthlyVisits original = blogMonthlyVisitsRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("BlogMonthlyVisits not found with id: " + id));

            original.setYearMonth(blogMonthlyVisits.getYearMonth());
            original.setTotalVisits(blogMonthlyVisits.getTotalVisits());
            original.setRecordUpdateTime(blogMonthlyVisits.getRecordUpdateTime());
            return blogMonthlyVisitsRepository.save(original);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to update BlogMonthlyVisits with id: " + id, e);
        }
    }

    @Override
    public void deleteBlogMonthlyVisits(Long id) {
        Objects.requireNonNull(id, "id must not be null");
        try {
            blogMonthlyVisitsRepository.deleteById(id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete BlogMonthlyVisits with id: " + id, e);
        }
    }

    @Override
    public Long getTotalVisits() {
        try {
            List<BlogMonthlyVisits> allVisits = blogMonthlyVisitsRepository.findAll();
            return allVisits.stream()
                    .filter(Objects::nonNull)
                    .mapToLong(visit -> {
                        Long visits = visit.getTotalVisits();
                        return visits != null ? visits : 0L;
                    })
                    .sum();
        } catch (Exception e) {
            throw new RuntimeException("Failed to calculate total visits", e);
        }
    }

    @Override
    public List<String> getFormattedMonthlyStats(String year) {
        try {
            List<BlogMonthlyVisits> monthlyVisits;

            if (year != null && !year.isEmpty()) {
                monthlyVisits = listByYear(year);
            } else {
                monthlyVisits = listBlogMonthlyVisits();
            }

            return getFormattedData(monthlyVisits);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get formatted monthly stats", e);
        }
    }

    private static List<String> getFormattedData(List<BlogMonthlyVisits> monthlyVisits) {
        List<String> formattedData = new ArrayList<>();
        for (BlogMonthlyVisits visit : monthlyVisits) {
            if (visit == null) continue;

            String yearMonth = visit.getYearMonth();
            if (yearMonth == null || yearMonth.length() != 6) {
                continue;
            }

            String formattedDate = yearMonth.substring(0, 4) + "-" + yearMonth.substring(4);
            Long totalVisits = visit.getTotalVisits();
            formattedData.add(formattedDate + "," + (totalVisits != null ? totalVisits : 0));
        }
        return formattedData;
    }

    @Override
    public Long getTotalVisitsByYear(String year) {
        Objects.requireNonNull(year, "year must not be null");
        try {
            List<BlogMonthlyVisits> yearlyVisits = blogMonthlyVisitsRepository.findByYear(year);
            return yearlyVisits.stream()
                    .filter(Objects::nonNull)
                    .mapToLong(visit -> {
                        Long visits = visit.getTotalVisits();
                        return visits != null ? visits : 0L;
                    })
                    .sum();
        } catch (Exception e) {
            throw new RuntimeException("Failed to calculate total visits by year: " + year, e);
        }
    }

    @Override
    @Transactional
    public Long incrementAndGetTotalVisits() {
        try {
            BlogMonthlyVisits currentMonthRecord = getOrCreateCurrentMonthRecord();
            Objects.requireNonNull(currentMonthRecord, "currentMonthRecord must not be null");

            Long currentVisits = currentMonthRecord.getTotalVisits();
            currentMonthRecord.setTotalVisits((currentVisits != null ? currentVisits : 0L) + 1);
            currentMonthRecord.setRecordUpdateTime(ZonedDateTime.now());
            blogMonthlyVisitsRepository.save(currentMonthRecord);

            return getTotalVisits();
        } catch (TransactionException e) {
            throw new RuntimeException("Transaction failed while incrementing visits", e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to increment and get total visits", e);
        }
    }

    @Override
    public BlogMonthlyVisits getOrCreateCurrentMonthRecord() {
        try {
            String currentYearMonth = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
            Optional<BlogMonthlyVisits> existingRecord = blogMonthlyVisitsRepository.findByYearMonth(currentYearMonth);

            if (existingRecord.isPresent()) {
                return existingRecord.get();
            } else {
                BlogMonthlyVisits newRecord = new BlogMonthlyVisits();
                newRecord.setYearMonth(currentYearMonth);
                newRecord.setTotalVisits(0L);
                newRecord.setRecordUpdateTime(ZonedDateTime.now());
                return blogMonthlyVisitsRepository.save(newRecord);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to get or create current month record", e);
        }
    }
}