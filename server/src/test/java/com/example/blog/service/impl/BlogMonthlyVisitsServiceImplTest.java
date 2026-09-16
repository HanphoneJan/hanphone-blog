package com.example.blog.service.impl;

import com.example.blog.dao.BlogMonthlyVisitsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BlogMonthlyVisitsServiceImplTest {

    @Mock
    private BlogMonthlyVisitsRepository repository;

    private BlogMonthlyVisitsServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new BlogMonthlyVisitsServiceImpl(repository);
    }

    @Test
    void increment_readsTotalFromDatabaseAtMostOnce() {
        when(repository.sumTotalVisits()).thenReturn(100L);

        Long first = service.incrementAndGetTotalVisits();
        Long second = service.incrementAndGetTotalVisits();

        assertEquals(100L, first);
        assertEquals(101L, second);
        verify(repository, times(1)).sumTotalVisits();
    }
}
