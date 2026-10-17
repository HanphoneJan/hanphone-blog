package com.example.blog.hot.collector;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpResponse;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.GZIPOutputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertSame;

/**
 * GitHub 采集器 gzip 协商与解压单元测试。
 *
 * <p>回归背景：国内服务器直连 {@code github.com/trending} 的 600KB 未压缩页面常触发读超时，
 * 导致 Trending 抓取失败并回退到变化极慢的 Search API。开启 gzip 后传输量降至约 50KB。</p>
 */
class GithubTrendingCollectorTest {

    private final GithubTrendingCollector.GzipAcceptEncodingInterceptor interceptor =
            new GithubTrendingCollector.GzipAcceptEncodingInterceptor();

    @Test
    @DisplayName("请求会带上 Accept-Encoding: gzip，且 gzip 响应体被透明解压")
    void decompressesGzipResponse() throws Exception {
        String html = "<html><body>article Box-row</body></html>";
        byte[] gzipped = gzip(html);

        ClientHttpRequest request = new StubClientHttpRequest();
        ClientHttpResponse response = interceptor.intercept(
                request, new byte[0], executionReturning(gzippedResponse(gzipped)));

        assertEquals("gzip", request.getHeaders().getFirst(HttpHeaders.ACCEPT_ENCODING),
                "必须声明 Accept-Encoding: gzip");
        assertEquals(html, readBody(response), "响应体应被透明解压");
    }

    @Test
    @DisplayName("非 gzip 响应保持原样返回")
    void passesThroughPlainResponse() throws Exception {
        ClientHttpResponse plain = new StubClientHttpResponse(
                "plain".getBytes(StandardCharsets.UTF_8), null);
        ClientHttpResponse result = interceptor.intercept(
                new StubClientHttpRequest(), new byte[0], executionReturning(plain));

        assertSame(plain, result, "未声明 gzip 时不应包装响应");
        assertEquals("plain", readBody(result));
    }

    @Test
    @DisplayName("gzip 包装不改变状态码与响应头")
    void preservesStatusAndHeaders() throws Exception {
        ClientHttpResponse result = interceptor.intercept(
                new StubClientHttpRequest(), new byte[0],
                executionReturning(gzippedResponse(gzip("x"))));

        assertNotSame(null, result);
        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals("gzip", result.getHeaders().getFirst(HttpHeaders.CONTENT_ENCODING));
    }

    private static ClientHttpResponse gzippedResponse(byte[] body) {
        return new StubClientHttpResponse(body, "gzip");
    }

    private static ClientHttpRequestExecution executionReturning(ClientHttpResponse response) {
        return (request, body) -> response;
    }

    private static byte[] gzip(String text) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (GZIPOutputStream gzip = new GZIPOutputStream(out)) {
            gzip.write(text.getBytes(StandardCharsets.UTF_8));
        }
        return out.toByteArray();
    }

    private static String readBody(ClientHttpResponse response) throws IOException {
        try (InputStream in = response.getBody()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    /** 最小化的请求桩，仅记录头信息。 */
    private static final class StubClientHttpRequest implements ClientHttpRequest {
        private final HttpHeaders headers = new HttpHeaders();

        @Override
        public HttpHeaders getHeaders() {
            return headers;
        }

        @Override
        public java.io.OutputStream getBody() {
            return new ByteArrayOutputStream();
        }

        @Override
        public org.springframework.http.HttpMethod getMethod() {
            return org.springframework.http.HttpMethod.GET;
        }

        @Override
        public java.net.URI getURI() {
            return java.net.URI.create("https://github.com/trending");
        }

        @Override
        public ClientHttpResponse execute() {
            throw new UnsupportedOperationException();
        }
    }

    /** 最小化的响应桩。 */
    private static final class StubClientHttpResponse implements ClientHttpResponse {
        private final byte[] body;
        private final HttpHeaders headers = new HttpHeaders();

        StubClientHttpResponse(byte[] body, String contentEncoding) {
            this.body = body;
            if (contentEncoding != null) {
                headers.set(HttpHeaders.CONTENT_ENCODING, contentEncoding);
            }
        }

        @Override
        public HttpStatusCode getStatusCode() {
            return HttpStatus.OK;
        }

        @Override
        @Deprecated
        public int getRawStatusCode() {
            return HttpStatus.OK.value();
        }

        @Override
        public String getStatusText() {
            return "OK";
        }

        @Override
        public HttpHeaders getHeaders() {
            return headers;
        }

        @Override
        public InputStream getBody() {
            return new ByteArrayInputStream(body);
        }

        @Override
        public void close() {
        }
    }
}
