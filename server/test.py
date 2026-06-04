#!/usr/bin/env python3
"""
Hanphone Blog Server — 安全 & 功能回归测试
用法: python3 test.py [--base-url https://hanphone.cn/api] [--skip-t11]
"""
import sys
import json
import time
import threading
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

import requests

# =============================================================================
# 配置
# =============================================================================
BASE_URL = "https://hanphone.cn/api"
TIMEOUT = 30

# ANSI 颜色
GREEN = "\033[0;32m"
RED = "\033[0;31m"
YELLOW = "\033[1;33m"
CYAN = "\033[0;36m"
BOLD = "\033[1m"
NC = "\033[0m"

# =============================================================================
# 测试框架
# =============================================================================

@dataclass
class TestResult:
    name: str
    passed: bool
    detail: str = ""

@dataclass
class TestGroup:
    name: str
    tests: list[TestResult] = field(default_factory=list)

class Tester:
    """轻量测试框架 — 无需 pytest/unittest，零配置"""

    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url.rstrip("/")
        self.groups: list[TestGroup] = []
        self._current_group: Optional[TestGroup] = None
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "BlogSecurityTester/1.0"
        })

    # ---- 分组 ----
    def group(self, name: str):
        self._current_group = TestGroup(name)
        self.groups.append(self._current_group)
        print(f"\n{CYAN}[{name}]{NC}")

    # ---- 断言 ----
    def _add(self, passed: bool, desc: str, detail: str = ""):
        result = TestResult(desc, passed, detail)
        assert self._current_group is not None
        self._current_group.tests.append(result)
        marker = f"{GREEN}PASS{NC}" if passed else f"{RED}FAIL{NC}"
        detail_str = f" — {detail}" if detail else ""
        print(f"  {marker} {desc}{detail_str}")

    def assert_code(self, desc: str, expected: int, path: str,
                    method: str = "GET", json_data: dict = None, headers: dict = None):
        """断言 HTTP 状态码"""
        try:
            url = f"{self.base_url}{path}"
            resp = self.session.request(
                method, url, json=json_data, headers=headers,
                timeout=TIMEOUT, allow_redirects=False)
            code = resp.status_code
            if code == expected:
                self._add(True, desc)
            else:
                self._add(False, desc, f"期望 HTTP {expected}, 实际 HTTP {code}")
        except Exception as e:
            self._add(False, desc, f"请求异常: {e}")

    def assert_body_contains(self, desc: str, needle: str, path: str,
                             method: str = "GET", json_data: dict = None, headers: dict = None):
        """断言响应体包含指定字符串"""
        try:
            url = f"{self.base_url}{path}"
            resp = self.session.request(
                method, url, json=json_data, headers=headers,
                timeout=TIMEOUT)
            if needle in resp.text:
                self._add(True, desc)
            else:
                self._add(False, desc, f"响应中未找到 '{needle}'")
        except Exception as e:
            self._add(False, desc, f"请求异常: {e}")

    def assert_json_field(self, desc: str, field: str, expected: Any, path: str,
                          method: str = "GET", json_data: dict = None, headers: dict = None):
        """断言 JSON 响应中字段值"""
        try:
            url = f"{self.base_url}{path}"
            resp = self.session.request(
                method, url, json=json_data, headers=headers,
                timeout=TIMEOUT)
            data = resp.json()
            actual = data.get(field)
            if actual == expected:
                self._add(True, desc)
            else:
                self._add(False, desc, f"期望 {field}={expected!r}, 实际 {actual!r}")
        except Exception as e:
            self._add(False, desc, f"请求异常: {e}")

    def assert_header(self, desc: str, header_pattern: str, path: str):
        """断言响应头中存在指定模式"""
        try:
            url = f"{self.base_url}{path}"
            resp = self.session.head(url, timeout=TIMEOUT)
            for key, value in resp.headers.items():
                combined = f"{key}: {value}".lower()
                if header_pattern.lower() in combined:
                    self._add(True, desc)
                    return
            self._add(False, desc, f"响应头中未找到 '{header_pattern}'")
        except Exception as e:
            self._add(False, desc, f"请求异常: {e}")

    def assert_concurrent(self, desc: str, path: str, count: int = 10,
                          expected_code: int = 200):
        """并发测试 — 所有请求必须返回指定状态码"""
        url = f"{self.base_url}{path}"
        ok = 0
        bad = 0
        lock = threading.Lock()

        def do_request():
            nonlocal ok, bad
            try:
                code = requests.get(url, timeout=10).status_code
            except Exception:
                code = 0
            with lock:
                if code == expected_code:
                    ok += 1
                else:
                    bad += 1

        with ThreadPoolExecutor(max_workers=count) as pool:
            futures = [pool.submit(do_request) for _ in range(count)]
            for f in as_completed(futures):
                f.result()

        if bad == 0:
            self._add(True, desc, f"{ok}/{count} 全部 {expected_code}")
        else:
            self._add(False, desc, f"{bad}/{count} 失败")

    # ---- 统计 ----
    def summary(self) -> int:
        total_pass = 0
        total_fail = 0
        for g in self.groups:
            for t in g.tests:
                if t.passed:
                    total_pass += 1
                else:
                    total_fail += 1
        total = total_pass + total_fail
        print(f"\n{'=' * 60}")
        print(f" 总计: {total} | {GREEN}通过: {total_pass}{NC} | {RED}失败: {total_fail}{NC}")
        print(f"{'=' * 60}")
        return total_fail


# =============================================================================
# 测试用例
# =============================================================================

def run_tests(t: Tester, skip_t11: bool = False):
    ts = str(int(time.time()))

    # ---- T1. 基础设施层 ----
    t.group("T1 基础设施层 — 安全响应头")
    t.assert_header("T1.1 X-Content-Type-Options", "x-content-type-options: nosniff",
                    "/blogs?pagenum=1&pagesize=1")
    t.assert_header("T1.2 X-XSS-Protection", "x-xss-protection",
                    "/blogs?pagenum=1&pagesize=1")
    t.assert_header("T1.3 X-Frame-Options", "x-frame-options: SAMEORIGIN",
                    "/blogs?pagenum=1&pagesize=1")
    t.assert_header("T1.4 Strict-Transport-Security", "strict-transport-security",
                    "/blogs?pagenum=1&pagesize=1")
    t.assert_header("T1.5 Referrer-Policy", "referrer-policy",
                    "/blogs?pagenum=1&pagesize=1")
    t.assert_header("T1.6 Permissions-Policy", "permissions-policy",
                    "/blogs?pagenum=1&pagesize=1")

    # ---- T2. URL 超长 & 输入防御 ----
    t.group("T2 URL 超长 & 输入防御")
    t.assert_code("T2.1 URI超长(3000字符) → 414", 414,
                  f"/{'a' * 3000}")
    t.assert_code("T2.2 递归路径 → 404(非5xx)", 404,
                  "/users/1000/api/users/1000/api/users/1000/api/users/1000/api/users/1000/"
                  "api/users/1000/api/users/1000/api/users/1000/api/users/1000/api/users/1000")
    t.assert_code("T2.3 超大分页参数 → 200(裁剪)", 200,
                  "/blogs?pagenum=999999&pagesize=99999")

    # ---- T3. 并发与连接池 ----
    t.group("T3 并发与连接池")
    t.assert_concurrent("T3.1 /blogs 10并发", "/blogs?pagenum=1&pagesize=10", 10)
    t.assert_concurrent("T3.2 /search 20并发", "/search?query=test", 20)

    # ---- T4. 认证鉴权 ----
    t.group("T4 认证鉴权")
    t.assert_code("T4.1 admin接口无token → 400", 400, "/admin/users")
    t.assert_code("T4.2 admin接口伪造token → 401", 401, "/admin/users",
                  headers={"token": "fake.invalid.jwt.token"})
    t.assert_body_contains("T4.3 InternalAPI无key返回错误",
                           "未授权访问", "/users")
    t.assert_body_contains("T4.4 InternalAPI弱key被拒",
                           "未授权访问", "/users",
                           headers={"X-Internal-Key": "admin"})

    # ---- T5. XSS 防护 ----
    t.group("T5 XSS 防护 (JSON Body)")
    xss_username = f"xsstest_{ts}"
    xss_email = f"xss_{ts}@test.com"
    reg_resp = t.session.post(
        f"{t.base_url}/register",
        json={
            "username": xss_username,
            "password": "abcd1234",
            "email": xss_email,
            "nickname": "<script>alert(1)</script>"
        },
        timeout=TIMEOUT)
    try:
        reg_data = reg_resp.json()
        token = reg_data.get("data", {}).get("token", "")
        user = reg_data.get("data", {}).get("user", {})
        nickname = user.get("nickname", "")
        user_id = user.get("id", "")

        if "&lt;script&gt;" in nickname:
            t._add(True, "T5.1 JSON body XSS 转义 (nickname → &lt;script&gt;)")
        else:
            t._add(False, "T5.1 JSON body XSS 转义",
                   f"nickname={nickname!r}（应为 HTML 实体）")

        if token and user_id:
            curr_resp = t.session.post(
                f"{t.base_url}/user/current",
                json={"userId": int(user_id)},
                headers={"token": token},
                timeout=TIMEOUT)
            stored_nick = curr_resp.json().get("data", {}).get("nickname", "")
            if "&lt;script&gt;" in stored_nick:
                t._add(True, "T5.2 XSS 持久化验证 (数据库存储已转义)")
            else:
                t._add(False, "T5.2 XSS 持久化验证",
                       f"存储值={stored_nick!r}")
        else:
            t._add(False, "T5.2 XSS 持久化验证", "注册失败，无法获取token")
    except Exception as e:
        t._add(False, "T5 XSS 测试", str(e))

    # ---- T6. 密码策略 ----
    t.group("T6 密码策略")
    t.assert_json_field("T6.1 密码过短(<8) → 拒绝", "message",
                        "密码长度不能少于8位", "/register",
                        method="POST", json_data={
                            "username": f"pw1_{ts}", "password": "1",
                            "email": f"pw1_{ts}@a.com"})
    t.assert_json_field("T6.2 纯字母密码 → 拒绝", "message",
                        "密码必须包含字母和数字", "/register",
                        method="POST", json_data={
                            "username": f"pw2_{ts}", "password": "abcdefgh",
                            "email": f"pw2_{ts}@a.com"})
    t.assert_json_field("T6.3 合法密码 → 注册成功", "message",
                        "注册并登录成功", "/register",
                        method="POST", json_data={
                            "username": f"pw3_{ts}", "password": "abcd1234",
                            "email": f"pw3_{ts}@a.com"})

    # 验证默认 userType
    reg2 = t.session.post(
        f"{t.base_url}/register",
        json={
            "username": f"pw4_{ts}", "password": "xyz98765",
            "email": f"pw4_{ts}@a.com"
        }, timeout=TIMEOUT)
    try:
        utype = reg2.json().get("data", {}).get("user", {}).get("type", "")
        if utype == "0":
            t._add(True, "T6.4 新用户 type='0'")
        else:
            t._add(False, "T6.4 新用户 type='0'", f"实际 type={utype!r}")
    except Exception:
        t._add(False, "T6.4 新用户 type='0'", "响应解析失败")

    # ---- T7. 验证码限流与邮箱校验 ----
    t.group("T7 验证码限流与邮箱校验")
    rate_email = f"ratetest_{ts}@example.com"

    r1 = t.session.post(
        f"{t.base_url}/user/sendCaptcha",
        json={"email": rate_email}, timeout=TIMEOUT)
    msg1 = r1.json().get("message", "")
    if msg1 == "发送验证码成功":
        t._add(True, "T7.1 首次验证码发送成功")
    else:
        t._add(False, "T7.1 首次验证码发送", f"返回: {msg1}")

    r2 = t.session.post(
        f"{t.base_url}/user/sendCaptcha",
        json={"email": rate_email}, timeout=TIMEOUT)
    msg2 = r2.json().get("message", "")
    if msg2 == "发送验证码失败":
        t._add(True, "T7.2 重复发送限流 (60秒内)")
    else:
        t._add(False, "T7.2 重复发送限流", f"返回: {msg2}")

    long_email = "A" * 300 + "@a.com"
    t.assert_json_field("T7.3 超长邮箱 → 拒收", "message",
                        "发送验证码失败", "/user/sendCaptcha",
                        method="POST", json_data={"email": long_email})
    t.assert_json_field("T7.4 非法格式 → 拒收", "message",
                        "发送验证码失败", "/user/sendCaptcha",
                        method="POST", json_data={"email": "notanemail"})
    t.assert_json_field("T7.5 空邮箱 → 拒收", "message",
                        "邮箱地址不能为空", "/user/sendCaptcha",
                        method="POST", json_data={"email": ""})

    # ---- T8. SQL 注入防御 ----
    t.group("T8 SQL 注入防御")
    t.assert_code("T8.1 search单引号 → 200", 200, "/search?query=%27")
    t.assert_code("T8.2 OR 1=1 → 200", 200, "/search?query=%27+OR+1%3D1--")
    t.assert_code("T8.3 路径注入 → 500(类型异常)", 500,
                  "/blog/1%27%20OR%201%3D1--")

    # ---- T9. CORS ----
    t.group("T9 CORS")
    cors_ok = t.session.options(
        f"{t.base_url}/blogs",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET"
        }, timeout=TIMEOUT)
    acao = cors_ok.headers.get("Access-Control-Allow-Origin", "")
    if "localhost:3000" in acao:
        t._add(True, "T9.1 白名单 Origin (localhost:3000) → 允许")
    else:
        t._add(False, "T9.1 白名单 Origin", f"未返回正确的 Access-Control-Allow-Origin")

    cors_evil = t.session.options(
        f"{t.base_url}/blogs",
        headers={
            "Origin": "https://evil.com",
            "Access-Control-Request-Method": "GET"
        }, timeout=TIMEOUT)
    acao_evil = cors_evil.headers.get("Access-Control-Allow-Origin", "")
    if not acao_evil:
        t._add(True, "T9.2 恶意 Origin (evil.com) → 拒绝")
    else:
        t._add(False, "T9.2 恶意 Origin", f"不应返回 {acao_evil}")

    # ---- T10. HTTP 方法安全 ----
    t.group("T10 HTTP 方法安全")
    t.assert_code("T10.1 PUT /blogs → 405", 405,
                  "/blogs?pagenum=1&pagesize=1", method="PUT")
    t.assert_code("T10.2 TRACE → 405", 405,
                  "/blogs", method="TRACE")
    t.assert_code("T10.3 DELETE不存在评论 → 200", 200,
                  "/comments/99999", method="DELETE")

    # ---- T11. 评论功能 ----
    if not skip_t11:
        t.group("T11 评论功能 & XSS")

        # 获取有效 blogId
        try:
            blogs_resp = t.session.get(
                f"{t.base_url}/blogs?pagenum=1&pagesize=1", timeout=TIMEOUT)
            blog_id = blogs_resp.json()["data"]["content"][0]["id"]
        except Exception:
            t._add(False, "T11.0 获取测试blog", "无法获取有效blogId")
            blog_id = None

        if blog_id:
            ts11 = str(int(time.time()))

            # 未登录评论
            r1 = t.session.post(
                f"{t.base_url}/comments",
                json={
                    "nickname": "testuser",
                    "email": f"t{ts11}@test.com",
                    "content": f"hello {ts11}",
                    "blogId": str(blog_id)
                }, timeout=TIMEOUT)
            msg1 = r1.json().get("message", "")
            if msg1 == "评论发表成功！":
                t._add(True, "T11.1 未登录评论 (nickname+email)")
            else:
                t._add(False, "T11.1 未登录评论", f"返回: {msg1}")

            # 缺少昵称+邮箱
            t.assert_json_field("T11.2 缺少昵称+邮箱 → 拒绝", "message",
                                "昵称和邮箱不能为空", "/comments",
                                method="POST", json_data={
                                    "content": "test",
                                    "blogId": str(blog_id)})

            # XSS 评论
            xss_content = f"<img src=x onerror=alert(1)>"
            xss_nick = f"<b>bold</b>"
            xss_email = f"xss_{ts11}@test.com"
            r3 = t.session.post(
                f"{t.base_url}/comments",
                json={
                    "nickname": xss_nick,
                    "email": xss_email,
                    "content": xss_content,
                    "blogId": str(blog_id)
                }, timeout=TIMEOUT)

            # 验证转义
            comments_resp = t.session.get(
                f"{t.base_url}/comments/{blog_id}", timeout=TIMEOUT)
            found_escaped = False
            for c in comments_resp.json().get("data", []):
                if xss_email in str(c.get("email", "")):
                    stored_nick = c.get("nickname", "")
                    stored_content = c.get("content", "")
                    if "&lt;" in stored_nick or "&lt;" in stored_content:
                        found_escaped = True
                    break
            if found_escaped:
                t._add(True, "T11.3 评论 XSS 转义 (已HTML编码)")
            else:
                t._add(False, "T11.3 评论 XSS 转义", "存储值未转义或未找到")

    # ---- T12. Actuator ----
    t.group("T12 Actuator 端点最小暴露")
    t.assert_code("T12.1 /actuator/health → 308", 308, "/../actuator/health")
    t.assert_code("T12.2 /actuator/env → 308", 308, "/../actuator/env")


# =============================================================================
# 入口
# =============================================================================
def main():
    parser = argparse.ArgumentParser(description="Blog Server 安全 & 回归测试")
    parser.add_argument("--base-url", default=BASE_URL, help="服务基础URL")
    parser.add_argument("--skip-t11", action="store_true",
                        help="跳过T11评论测试（CommentController修复未部署时使用）")
    args = parser.parse_args()

    print(f"{BOLD}Blog Server 安全 & 回归测试{NC}")
    print(f"  目标: {args.base_url}")
    print(f"  时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")

    t = Tester(args.base_url)
    run_tests(t, skip_t11=args.skip_t11)
    failures = t.summary()
    sys.exit(0 if failures == 0 else 1)


if __name__ == "__main__":
    main()
