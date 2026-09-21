package com.example.blog.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GeoIpUtilsTest {

    @Test
    void lookupWithoutReaderReturnsUnknown() {
        GeoIpUtils utils = new GeoIpUtils();
        GeoIpUtils.Location loc = utils.lookup("1.1.1.1");
        assertNotNull(loc);
        assertTrue(loc.isUnknown());
    }

    @Test
    void lookupWithBlankIpReturnsUnknown() {
        GeoIpUtils utils = new GeoIpUtils();
        assertTrue(utils.lookup("  ").isUnknown());
        assertTrue(utils.lookup(null).isUnknown());
    }

    @Test
    void lookupWithPrivateIpDoesNotThrow() {
        GeoIpUtils utils = new GeoIpUtils();
        // reader 为 null，私有 IP 也走降级分支，不抛异常
        GeoIpUtils.Location loc = utils.lookup("192.168.1.1");
        assertNotNull(loc);
    }
}