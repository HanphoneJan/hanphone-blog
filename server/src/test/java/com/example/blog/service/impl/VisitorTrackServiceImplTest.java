package com.example.blog.service.impl;

import com.example.blog.dao.BlogVisitorRepository;
import com.example.blog.util.GeoIpUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class VisitorTrackServiceImplTest {

    private BlogVisitorRepository repository;
    private VisitorTrackServiceImpl service;

    @BeforeEach
    void setUp() {
        repository = mock(BlogVisitorRepository.class);
        service = new VisitorTrackServiceImpl(repository);
    }

    @Test
    void trackAndFlushPersistsEachIpWithAccumulatedCount() {
        GeoIpUtils.Location loc = new GeoIpUtils.Location("United States", "Minnesota", "Minneapolis");
        service.track("5.5.5.5", loc);
        service.track("5.5.5.5", loc); // 同 IP 两次，缓冲计数累加为 2
        service.track("6.6.6.6", new GeoIpUtils.Location("China", "Sichuan", "Chengdu"));

        assertEquals(2, service.getBufferedCount());
        int flushed = service.flushBuffer();
        assertEquals(3, flushed); // 5.5.5.5 计 2 次 + 6.6.6.6 计 1 次
        verify(repository, times(2)).upsertVisit(any(), any(), any(), any(), anyInt(), any());
        verify(repository).upsertVisit(eq("5.5.5.5"), eq("United States"), eq("Minnesota"), eq("Minneapolis"), eq(2), any());
        verify(repository).upsertVisit(eq("6.6.6.6"), eq("China"), eq("Sichuan"), eq("Chengdu"), eq(1), any());
        assertEquals(0, service.getBufferedCount());
    }

    @Test
    void trackWithBlankIpIsIgnored() {
        service.track(" ", null);
        service.track("", null);
        assertEquals(0, service.getBufferedCount());
    }

    @Test
    void discardBufferClearsWithoutWriting() {
        service.track("5.5.5.5", new GeoIpUtils.Location("US", null, null));
        service.discardBuffer();
        assertEquals(0, service.getBufferedCount());
        verify(repository, times(0)).upsertVisit(any(), any(), any(), any(), anyInt(), any());
    }
}