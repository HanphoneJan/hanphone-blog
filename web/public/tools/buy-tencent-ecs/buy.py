import time
import threading
import logging
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    NoSuchElementException, TimeoutException,
    ElementNotVisibleException, ElementClickInterceptedException,
    StaleElementReferenceException
)
from selenium.webdriver.chrome.options import Options

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


class TengxunyunSeckill:
    def __init__(self):
        self.driver = None
        self.main_thread = None
        self.high_freq_thread = None
        self.running = False  # 改为实例变量，避免全局变量问题
        self.lock = threading.Lock()  # 线程锁，确保线程安全

    def _init_browser(self):
        """初始化浏览器配置，避免被检测为自动化工具"""
        chrome_options = Options()
        # 禁用自动化控制特征
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option("useAutomationExtension", False)
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        # 可选：无头模式（注释掉可看到浏览器操作）
        # chrome_options.add_argument("--headless=new")
        # 禁用GPU加速，避免某些环境问题
        chrome_options.add_argument("--disable-gpu")
        # 禁用沙箱模式
        chrome_options.add_argument("--no-sandbox")
        self.driver = webdriver.Chrome(options=chrome_options)
        # 移除webdriver特征
        self.driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": """
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                })
            """
        })
        self.driver.maximize_window()  # 最大化窗口，避免元素被遮挡

    def start_high_frequency_clicker(self):
        """启动高频点击线程，优化异常处理"""

        def high_freq_task():
            while self._is_running():
                try:
                    # 匹配JS中的弹层确认按钮选择器
                    buy_button = WebDriverWait(self.driver, 10, 0.01).until(
                        EC.element_to_be_clickable((By.CSS_SELECTOR, ".uno3-dialog-footer-mobile .uno3-button.uno3-button--primary"))
                    )
                    # 多次尝试点击，提高成功率
                    for _ in range(3):
                        try:
                            self.driver.execute_script("arguments[0].click();", buy_button)
                            logger.info("高频线程：成功点击确认按钮")
                            break
                        except Exception as e:
                            logger.warning(f"高频线程：点击失败，重试中... {str(e)}")
                            time.sleep(0.01)
                except (NoSuchElementException, TimeoutException):
                    # 未找到元素时短暂休眠，减少资源占用
                    time.sleep(0.02)
                except (ElementNotVisibleException, ElementClickInterceptedException):
                    logger.warning("高频线程：元素不可见或被遮挡")
                    time.sleep(0.05)
                except StaleElementReferenceException:
                    logger.warning("高频线程：元素已失效，重新查找")
                except Exception as e:
                    logger.error(f"高频线程：未知错误 {str(e)}")
                    time.sleep(0.1)

        with self.lock:
            if not self.high_freq_thread or not self.high_freq_thread.is_alive():
                self.high_freq_thread = threading.Thread(target=high_freq_task)
                self.high_freq_thread.daemon = True
                self.high_freq_thread.start()
                logger.info("高频点击线程已启动")

    def main_task(self):
        """主任务线程，优化按钮定位和点击逻辑"""
        while self._is_running():
            try:
                # 匹配JS中的主按钮选择器
                try:
                    qg = self.driver.find_element(
                        By.CSS_SELECTOR,
                        ".qc-base-grid__row.qc-base-grid--gutter-5n.qc-base-grid--gutter-pad-0n > *:first-child .uno3-buy-card__btn"
                    )
                except NoSuchElementException:
                    # 备用选择器
                    qg = self.driver.find_element(
                        By.CSS_SELECTOR,
                        ".uno3-buy-card__btn"
                    )

                button_text = qg.text.strip()
                logger.info(f"主任务：当前按钮状态 - {button_text}")

                # 检查对话框是否出现（匹配JS逻辑）
                dialog_footers = self.driver.find_elements(By.CLASS_NAME, "uno3-dialog-footer")
                if dialog_footers:
                    self.start_high_frequency_clicker()
                    time.sleep(0.05)
                    continue

                # 主按钮点击逻辑（匹配JS判断条件）
                if button_text not in ["添加提醒", "取消提醒"]:
                    logger.info(f"主任务：尝试点击按钮 - {button_text}")
                    # 多方式点击尝试
                    for _ in range(2):
                        try:
                            qg.click()
                            logger.info("主任务：成功点击按钮（常规方式）")
                            break
                        except:
                            try:
                                self.driver.execute_script("arguments[0].click();", qg)
                                logger.info("主任务：成功点击按钮（JS方式）")
                                break
                            except Exception as e:
                                logger.warning(f"主任务：点击失败，重试中... {str(e)}")
                                time.sleep(0.02)

            except NoSuchElementException:
                logger.warning("主任务：未找到目标按钮，可能页面未加载完成")
            except StaleElementReferenceException:
                logger.warning("主任务：按钮元素已失效，重新查找")
            except Exception as e:
                logger.error(f"主任务：错误 {str(e)}")

            # 保持与JS相同的50ms间隔
            time.sleep(0.05)

    def _is_running(self):
        """线程安全地检查运行状态"""
        with self.lock:
            return self.running

    def start(self):
        """启动抢购流程"""
        self._init_browser()
        self.driver.get("https://cloud.tencent.com/act/pro/warmup202506?from=27490")

        # 提示用户准备工作
        input("请先在浏览器中完成登录并导航到抢购页面，准备就绪后按回车键继续...")

        # 启动任务
        with self.lock:
            self.running = True

        self.main_thread = threading.Thread(target=self.main_task)
        self.main_thread.daemon = True
        self.main_thread.start()
        logger.info("主任务线程已启动")

        # 等待用户终止
        input("抢购程序已启动，按回车键停止...")
        self.stop()

    def stop(self):
        """停止所有任务并清理资源"""
        logger.info("开始停止所有任务...")
        with self.lock:
            self.running = False

        # 等待线程结束
        if self.main_thread and self.main_thread.is_alive():
            self.main_thread.join(timeout=2)
        if self.high_freq_thread and self.high_freq_thread.is_alive():
            self.high_freq_thread.join(timeout=2)

        self.tear_down()

    def tear_down(self):
        """清理浏览器资源"""
        if self.driver:
            logger.info("关闭浏览器...")
            self.driver.quit()
        logger.info("程序已结束")


if __name__ == "__main__":
    try:
        seckill = TengxunyunSeckill()
        seckill.start()
    except Exception as e:
        logger.critical(f"程序崩溃：{str(e)}", exc_info=True)
        if 'seckill' in locals() and seckill.driver:
            seckill.driver.quit()