#!/usr/bin/env python3
"""
Blog Server 压力测试
用法:
  python3 stress_test.py                           # 默认：渐进式加压
  python3 stress_test.py --concurrency 50 --duration 60   # 固定50并发，持续60秒
  python3 stress_test.py --endpoints /blogs,/search        # 指定测试接口
  python3 stress_test.py --ramp-up                         # 渐进式加压(默认)

策略:
  ramp-up  — 从 1 并发逐步增加到 100，找到性能拐点
  fixed    — 固定并发数，持续指定时间
  spike    — 瞬间大流量冲击
"""
import sys
import time
import json
import math
import threading
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from collections import defaultdict
from statistics import mean, median, stdev, quantiles

import requests

# =============================================================================
# 配置
# =============================================================================
BASE_URL = "https://hanphone.cn/api"
TIMEOUT = 30

GREEN = "\033[0;32m"
RED = "\033[0;31m"
YELLOW = "\033[1;33m"
CYAN = "\033[0;36m"
BOLD = "\033[1m"
NC = "\033[0m"

# 默认测试端点（只读，低写入影响）
DEFAULT_ENDPOINTS = [
    ("GET", "/blogs?pagenum=1&pagesize=10", None, "博客列表"),
    ("GET", "/search?query=test", None, "搜索"),
    ("GET", "/site-stats", None, "站点统计"),
    ("GET", "/getRecommendBlogList", None, "推荐博客"),
]

# 渐进式加压的并发级别
RAMP_LEVELS = [1, 5, 10, 25, 50, 100, 150, 200]


# =============================================================================
# 数据结构
# =============================================================================

@dataclass
class RequestMetric:
    """单次请求指标"""
    timestamp: float
    latency: float       # 秒
    status_code: int
    success: bool
    error: str = ""


@dataclass
class LevelReport:
    """单个并发级别的压测报告"""
    concurrency: int
    total_requests: int
    success_count: int
    error_count: int
    duration: float                    # 测试持续时间
    rps: float                         # 每秒请求数
    latencies: list[float] = field(default_factory=list)
    # 延迟统计
    latency_min: float = 0
    latency_avg: float = 0
    latency_p50: float = 0
    latency_p95: float = 0
    latency_p99: float = 0
    latency_max: float = 0
    latency_stdev: float = 0
    # 错误分布
    status_dist: dict = field(default_factory=dict)
    error_samples: list[str] = field(default_factory=list)  # 最多保存10条错误


# =============================================================================
# 压力测试引擎
# =============================================================================

class StressTester:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self._stop = threading.Event()
        self._lock = threading.Lock()
        self._metrics: list[RequestMetric] = []

    def _do_request(self, method: str, path: str, json_data: dict = None) -> RequestMetric:
        """执行单次请求并记录指标"""
        url = f"{self.base_url}{path}"
        t0 = time.monotonic()
        try:
            resp = self.session.request(
                method, url, json=json_data,
                timeout=TIMEOUT, allow_redirects=False)
            latency = time.monotonic() - t0
            return RequestMetric(
                timestamp=t0, latency=latency,
                status_code=resp.status_code,
                success=resp.status_code < 500,
                error="" if resp.status_code < 500 else f"HTTP {resp.status_code}")
        except requests.Timeout:
            return RequestMetric(t0, TIMEOUT, 0, False, "timeout")
        except requests.ConnectionError as e:
            return RequestMetric(t0, TIMEOUT, 0, False, f"connection: {e}")
        except Exception as e:
            return RequestMetric(t0, time.monotonic() - t0, 0, False, str(e)[:100])

    def _worker(self, endpoint: tuple, duration: float):
        """工作线程：在指定时间内反复发送请求"""
        method, path, body, _ = endpoint
        deadline = time.monotonic() + duration
        while time.monotonic() < deadline and not self._stop.is_set():
            m = self._do_request(method, path, body)
            with self._lock:
                self._metrics.append(m)

    def run(self, endpoints: list, concurrency: int, duration: float) -> LevelReport:
        """固定并发数，运行指定时长"""
        self._metrics = []
        self._stop.clear()
        t0 = time.monotonic()

        # 均匀分配 worker 到各 endpoint
        n_endpoints = len(endpoints)
        with ThreadPoolExecutor(max_workers=concurrency) as pool:
            futures = []
            for i in range(concurrency):
                ep = endpoints[i % n_endpoints]
                futures.append(pool.submit(self._worker, ep, duration))
            for f in as_completed(futures):
                try:
                    f.result()
                except Exception:
                    pass

        elapsed = time.monotonic() - t0
        return self._build_report(concurrency, elapsed)

    def _build_report(self, concurrency: int, elapsed: float) -> LevelReport:
        """从原始指标构建统计报告"""
        metrics = self._metrics
        if not metrics:
            return LevelReport(concurrency, 0, 0, 0, elapsed, 0)

        latencies = [m.latency for m in metrics if m.success]
        success = sum(1 for m in metrics if m.success)
        errors = len(metrics) - success
        rps = len(metrics) / elapsed if elapsed > 0 else 0

        # 状态码分布
        status_dist = defaultdict(int)
        error_samples = []
        for m in metrics:
            status_dist[str(m.status_code)] += 1
            if not m.success and len(error_samples) < 10:
                error_samples.append(m.error)

        report = LevelReport(
            concurrency=concurrency,
            total_requests=len(metrics),
            success_count=success,
            error_count=errors,
            duration=elapsed,
            rps=rps,
            latencies=latencies,
            status_dist=dict(status_dist),
            error_samples=error_samples,
        )

        if latencies:
            lat_sorted = sorted(latencies)
            report.latency_min = lat_sorted[0]
            report.latency_max = lat_sorted[-1]
            report.latency_avg = mean(latencies)
            report.latency_stdev = stdev(latencies) if len(latencies) > 1 else 0
            try:
                qs = quantiles(latencies, n=100)
                report.latency_p50 = qs[49] if len(qs) > 49 else lat_sorted[len(lat_sorted) // 2]
                report.latency_p95 = qs[94] if len(qs) > 94 else lat_sorted[int(len(lat_sorted) * 0.95)]
                report.latency_p99 = qs[98] if len(qs) > 98 else lat_sorted[int(len(lat_sorted) * 0.99)]
            except Exception:
                idx50 = len(lat_sorted) // 2
                idx95 = int(len(lat_sorted) * 0.95)
                idx99 = int(len(lat_sorted) * 0.99)
                report.latency_p50 = lat_sorted[idx50] if idx50 < len(lat_sorted) else lat_sorted[-1]
                report.latency_p95 = lat_sorted[idx95] if idx95 < len(lat_sorted) else lat_sorted[-1]
                report.latency_p99 = lat_sorted[idx99] if idx99 < len(lat_sorted) else lat_sorted[-1]

        return report

    def ramp_up(self, endpoints: list, duration_per_level: float = 30) -> list[LevelReport]:
        """渐进式加压：从 1 并发逐步增加到 200"""
        reports = []
        for level in RAMP_LEVELS:
            report = self.run(endpoints, level, duration_per_level)
            reports.append(report)
            self._print_level(report)

            # 错误率超过 30% 则停止加压
            if report.total_requests > 0 and report.error_count / report.total_requests > 0.3:
                print(f"\n{YELLOW}  错误率超过 30%，停止加压。系统瓶颈在 concurrency={level}{NC}")
                break
        return reports

    def spike(self, endpoints: list, peak_concurrency: int = 200, duration: float = 10):
        """尖峰测试：瞬间高并发"""
        print(f"\n{BOLD}尖峰测试: {peak_concurrency} 并发, {duration}s{NC}")
        report = self.run(endpoints, peak_concurrency, duration)
        self._print_level(report)
        return report

    @staticmethod
    def _fmt_latency(sec: float) -> str:
        if sec < 1:
            return f"{sec * 1000:.0f}ms"
        return f"{sec:.2f}s"

    def _print_level(self, r: LevelReport):
        """打印单个级别的结果"""
        pct_ok = (r.success_count / r.total_requests * 100) if r.total_requests else 0
        color = GREEN if pct_ok >= 99 else YELLOW if pct_ok >= 70 else RED
        print(f"  concurrency={r.concurrency:>4} | "
              f"RPS={r.rps:>7.1f} | "
              f"{color}成功率={pct_ok:>5.1f}%{NC} | "
              f"延迟 avg={self._fmt_latency(r.latency_avg)} "
              f"P50={self._fmt_latency(r.latency_p50)} "
              f"P95={self._fmt_latency(r.latency_p95)} "
              f"P99={self._fmt_latency(r.latency_p99)} "
              f"max={self._fmt_latency(r.latency_max)}")


# =============================================================================
# 报告输出
# =============================================================================

def print_summary_table(reports: list[LevelReport]):
    """打印汇总表格"""
    if not reports:
        return
    print(f"\n{BOLD}{'=' * 110}{NC}")
    print(f"{BOLD}{'并发':>5} {'请求数':>7} {'成功率':>7} {'RPS':>8} "
          f"{'avg':>8} {'P50':>8} {'P95':>8} {'P99':>8} {'max':>8} "
          f"{'stdev':>8}{NC}")

    for r in reports:
        if r.total_requests == 0:
            continue
        pct = r.success_count / r.total_requests * 100
        color = GREEN if pct >= 99 else YELLOW if pct >= 70 else RED
        print(f"{color}"
              f"{r.concurrency:>5} {r.total_requests:>7} {pct:>6.1f}% {r.rps:>8.1f} "
              f"{StressTester._fmt_latency(r.latency_avg):>8} "
              f"{StressTester._fmt_latency(r.latency_p50):>8} "
              f"{StressTester._fmt_latency(r.latency_p95):>8} "
              f"{StressTester._fmt_latency(r.latency_p99):>8} "
              f"{StressTester._fmt_latency(r.latency_max):>8} "
              f"{r.latency_stdev * 1000:>7.0f}ms{NC}")

        # 有错误时打印状态码分布
        if r.error_count > 0:
            codes = ", ".join(f"{c}:{n}" for c, n in sorted(r.status_dist.items()))
            print(f"      {RED}错误 {r.error_count} 次{NC} | 状态码: {codes}")
            for err in r.error_samples[:3]:
                print(f"      {YELLOW}  -> {err}{NC}")

    print(f"{'=' * 110}")


def print_recommendations(reports: list[LevelReport]):
    """基于测试结果给出建议"""
    print(f"\n{BOLD}分析与建议:{NC}")

    ok_reports = [r for r in reports if r.total_requests > 0]
    if not ok_reports:
        print("  无有效数据")
        return

    # 找拐点（P95 延迟突然飙升）
    last = ok_reports[0]
    for r in ok_reports[1:]:
        if r.latency_p95 > last.latency_p95 * 3 and r.latency_p95 > 1:
            print(f"  {YELLOW}⚠ P95 延迟拐点: concurrency={r.concurrency} "
                  f"({StressTester._fmt_latency(last.latency_p95)} → "
                  f"{StressTester._fmt_latency(r.latency_p95)}){NC}")
            break
        last = r

    # 最大 RPS
    best = max(ok_reports, key=lambda r: r.rps)
    print(f"  最大吞吐: {best.rps:.1f} RPS @ concurrency={best.concurrency}")

    # 最大安全并发（成功率 > 99%）
    safe_reports = [r for r in ok_reports
                    if r.success_count / r.total_requests >= 0.99]
    if safe_reports:
        best_safe = max(safe_reports, key=lambda r: r.concurrency)
        print(f"  {GREEN}最大安全并发: {best_safe.concurrency} "
              f"(RPS={best_safe.rps:.1f}, P95={StressTester._fmt_latency(best_safe.latency_p95)}){NC}")
    else:
        print(f"  {RED}所有并发级别均存在错误，系统可能配置不足{NC}")

    # 最后一级的错误率
    final = ok_reports[-1]
    if final.error_count > 0:
        error_rate = final.error_count / final.total_requests * 100
        print(f"  最高并发 ({final.concurrency}) 错误率: {error_rate:.1f}%")


# =============================================================================
# 入口
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Blog Server 压力测试",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python3 stress_test.py                                    # 渐进式加压 (默认)
  python3 stress_test.py --concurrency 50 --duration 60     # 固定50并发60秒
  python3 stress_test.py --spike                            # 尖峰测试 200并发10秒
  python3 stress_test.py --endpoints /blogs,/search         # 仅测试指定接口
        """)
    parser.add_argument("--base-url", default=BASE_URL, help="服务基础URL")
    parser.add_argument("--concurrency", type=int, default=0,
                        help="固定并发数 (0=渐进式加压)")
    parser.add_argument("--duration", type=int, default=30,
                        help="每个级别的测试时长(秒), 默认30")
    parser.add_argument("--spike", action="store_true",
                        help="尖峰测试模式 (200并发10秒)")
    parser.add_argument("--endpoints", type=str, default="",
                        help="指定测试接口，逗号分隔，如 '/blogs,/search'")
    args = parser.parse_args()

    # 构建 endpoint 列表
    if args.endpoints:
        endpoints = [
            ("GET", p.strip(), None, p.strip())
            for p in args.endpoints.split(",")
        ]
    else:
        endpoints = DEFAULT_ENDPOINTS

    print(f"{BOLD}Blog Server 压力测试{NC}")
    print(f"  目标: {args.base_url}")
    print(f"  端点: {', '.join(e[3] for e in endpoints)}")
    print(f"  时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  模式: ", end="")

    tester = StressTester(args.base_url)
    reports = []

    if args.concurrency > 0:
        # 固定并发模式
        concurrency = args.concurrency
        print(f"固定 {concurrency} 并发, {args.duration}s")
        print()
        report = tester.run(endpoints, concurrency, args.duration)
        reports = [report]
        tester._print_level(report)
    elif args.spike:
        # 尖峰模式
        print(f"尖峰 200 并发, 10s")
        print()
        report = tester.spike(endpoints, 200, 10)
        reports = [report]
    else:
        # 渐进式加压
        print(f"渐进式加压 ({', '.join(str(l) for l in RAMP_LEVELS)})")
        print()
        reports = tester.ramp_up(endpoints, args.duration)

    print_summary_table(reports)
    print_recommendations(reports)

    # 退出码：最后一级错误率 > 50% 视为失败
    if reports and reports[-1].total_requests > 0:
        err_rate = reports[-1].error_count / reports[-1].total_requests
        if err_rate > 0.5:
            sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
