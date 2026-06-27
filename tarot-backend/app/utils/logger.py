"""
日志管理器 - 统一管理应用日志输出
提供分级日志记录，将详细信息记录到文件，关键信息输出到控制台
"""

import logging
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional

# 日志配置
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

class AdminLogger:
    """管理员操作日志记录器"""

    def __init__(self, name: str = "admin"):
        self.logger = logging.getLogger(name)
        if not self.logger.handlers:
            self._setup_logger()

    def _setup_logger(self):
        """设置日志记录器"""
        self.logger.setLevel(logging.DEBUG)

        # 文件处理器 - 记录详细信息
        file_handler = logging.FileHandler(
            LOG_DIR / f"admin_{datetime.now().strftime('%Y%m%d')}.log",
            encoding='utf-8'
        )
        file_handler.setLevel(logging.DEBUG)
        file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
        )
        file_handler.setFormatter(file_formatter)

        # 控制台处理器 - 只记录重要信息
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(console_formatter)

        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)

    def info(self, message: str, extra_data: Optional[dict] = None):
        """记录信息级别日志"""
        if extra_data:
            self.logger.debug(f"{message} | 详细数据: {extra_data}")
        self.logger.info(message)

    def debug(self, message: str, data: Optional[dict] = None):
        """记录调试信息（仅文件）"""
        if data:
            message = f"{message} | 数据: {data}"
        self.logger.debug(message)

    def warning(self, message: str, extra_data: Optional[dict] = None):
        """记录警告信息"""
        if extra_data:
            self.logger.debug(f"{message} | 详细数据: {extra_data}")
        self.logger.warning(message)

    def error(self, message: str, error: Optional[Exception] = None, extra_data: Optional[dict] = None):
        """记录错误信息"""
        if extra_data:
            self.logger.debug(f"{message} | 详细数据: {extra_data}")
        if error:
            self.logger.error(f"{message} | 错误: {str(error)}", exc_info=True)
        else:
            self.logger.error(message)

class APILogger:
    """API请求日志记录器"""

    def __init__(self, name: str = "api"):
        self.logger = logging.getLogger(name)
        if not self.logger.handlers:
            self._setup_logger()

    def _setup_logger(self):
        """设置API日志记录器"""
        self.logger.setLevel(logging.DEBUG)

        # API日志文件
        file_handler = logging.FileHandler(
            LOG_DIR / f"api_{datetime.now().strftime('%Y%m%d')}.log",
            encoding='utf-8'
        )
        file_handler.setLevel(logging.DEBUG)
        file_formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(file_formatter)

        # 控制台只显示错误
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.ERROR)
        console_formatter = logging.Formatter(
            '%(asctime)s - API ERROR - %(message)s'
        )
        console_handler.setFormatter(console_formatter)

        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)

    def log_request(self, method: str, path: str, user: str, data: Optional[dict] = None):
        """记录API请求"""
        message = f"{method} {path} | 用户: {user}"
        if data:
            self.logger.debug(f"{message} | 请求数据: {data}")
        else:
            self.logger.debug(message)

    def log_response(self, path: str, status: int, message: str = ""):
        """记录API响应"""
        level_message = f"{path} | 状态: {status}"
        if message:
            level_message += f" | {message}"

        if status >= 400:
            self.logger.error(level_message)
        else:
            self.logger.debug(level_message)

    def log_error(self, path: str, error: Exception, context: Optional[dict] = None):
        """记录API错误"""
        message = f"API错误 {path} | {str(error)}"
        if context:
            self.logger.debug(f"{message} | 上下文: {context}")
        self.logger.error(message, exc_info=True)

# 全局日志实例
admin_logger = AdminLogger()
api_logger = APILogger()

# 便捷函数
def log_admin_action(action: str, admin: str, target: str = "", result: str = "success", data: Optional[dict] = None):
    """记录管理员操作"""
    message = f"管理员操作: {action} | 管理员: {admin}"
    if target:
        message += f" | 目标: {target}"
    message += f" | 结果: {result}"

    if result == "success":
        admin_logger.info(message, data)
    else:
        admin_logger.warning(message, data)

def log_user_credit_change(user_id: str, change: int, reason: str, admin: str, new_balance: int):
    """记录用户积分变更"""
    message = f"积分调整 | 用户: {user_id} | 变更: {change:+d} | 新余额: {new_balance} | 管理员: {admin}"
    admin_logger.info(message, {
        "user_id": user_id,
        "credit_change": change,
        "reason": reason,
        "admin": admin,
        "new_balance": new_balance
    })