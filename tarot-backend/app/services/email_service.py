"""
Email service for sending verification emails and other notifications.
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr, formatdate
from email.header import Header
from typing import Optional, List
from jinja2 import Environment, FileSystemLoader, select_autoescape
import os
from pathlib import Path

from app.config import settings

# 配置日志
logger = logging.getLogger(__name__)


class EmailService:
    """邮件发送服务类"""

    def __init__(self):
        self.smtp_host = settings.EMAIL_SMTP_HOST
        self.smtp_port = settings.EMAIL_SMTP_PORT
        self.from_address = settings.EMAIL_FROM_ADDRESS
        self.from_name = settings.EMAIL_FROM_NAME
        self.password = settings.EMAIL_PASSWORD
        self.use_tls = settings.EMAIL_USE_TLS
        self.timeout = settings.EMAIL_TIMEOUT

        # 设置Jinja2模板环境
        templates_dir = Path(__file__).parent.parent / "templates" / "email"
        self.template_env = Environment(
            loader=FileSystemLoader(str(templates_dir)),
            autoescape=select_autoescape(['html', 'xml'])
        )

    def _create_smtp_connection(self) -> smtplib.SMTP:
        """创建SMTP连接"""
        try:
            # QQ邮箱推荐使用SSL连接（端口465）
            if self.smtp_port == 465:
                smtp = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, timeout=self.timeout)
                logger.info(f"使用SSL连接到 {self.smtp_host}:{self.smtp_port}")
            else:
                # 其他端口使用标准SMTP + TLS
                smtp = smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=self.timeout)
                logger.info(f"使用TLS连接到 {self.smtp_host}:{self.smtp_port}")

                if self.use_tls:
                    smtp.starttls()

            smtp.login(self.from_address, self.password)
            logger.info(f"SMTP登录成功: {self.from_address}")
            return smtp

        except Exception as e:
            logger.error(f"SMTP连接失败: {e}")
            raise EmailServiceError(f"无法连接到邮件服务器: {e}")

    def send_email(
        self,
        to_email: str,
        subject: str,
        text_content: str,
        html_content: Optional[str] = None,
        to_name: Optional[str] = None
    ) -> bool:
        """
        发送邮件

        Args:
            to_email: 收件人邮箱
            subject: 邮件主题
            text_content: 纯文本内容
            html_content: HTML内容（可选）
            to_name: 收件人姓名（可选）

        Returns:
            bool: 发送是否成功
        """
        smtp = None
        try:
            # 创建邮件对象
            msg = MIMEMultipart('alternative')
            msg['Subject'] = Header(subject, 'utf-8')
            msg['From'] = self.from_address  # 直接使用地址，不使用formataddr
            msg['To'] = to_email  # 直接使用邮箱地址

            # 设置邮件日期
            msg['Date'] = formatdate(localtime=True)

            # 添加纯文本内容
            text_part = MIMEText(text_content, 'plain', 'utf-8')
            msg.attach(text_part)

            # 添加HTML内容（如果提供）
            if html_content:
                html_part = MIMEText(html_content, 'html', 'utf-8')
                msg.attach(html_part)

            # 创建SMTP连接
            smtp = self._create_smtp_connection()

            # 发送邮件
            text = msg.as_string()
            smtp.sendmail(self.from_address, [to_email], text)

            logger.info(f"邮件发送成功: {to_email}")
            return True

        except Exception as e:
            logger.error(f"邮件发送失败 {to_email}: {e}")
            logger.error(f"错误详情: {type(e).__name__}: {str(e)}")
            return False

        finally:
            # 安全关闭SMTP连接，忽略quit错误
            if smtp:
                try:
                    smtp.quit()
                except Exception as quit_error:
                    logger.warning(f"SMTP quit错误（可忽略）: {quit_error}")
                    try:
                        smtp.close()
                    except Exception:
                        pass

    def send_template_email(
        self,
        to_email: str,
        template_name: str,
        context: dict,
        subject: str,
        to_name: Optional[str] = None
    ) -> bool:
        """
        使用模板发送邮件

        Args:
            to_email: 收件人邮箱
            template_name: 模板文件名（不含扩展名）
            context: 模板变量
            subject: 邮件主题
            to_name: 收件人姓名（可选）

        Returns:
            bool: 发送是否成功
        """
        try:
            # 渲染HTML模板
            html_template = self.template_env.get_template(f"{template_name}.html")
            html_content = html_template.render(**context)

            # 尝试渲染文本模板（如果存在）
            text_content = ""
            try:
                text_template = self.template_env.get_template(f"{template_name}.txt")
                text_content = text_template.render(**context)
            except Exception:
                # 如果没有文本模板，从HTML中生成简单的文本内容
                text_content = self._html_to_text(html_content)

            return self.send_email(
                to_email=to_email,
                subject=subject,
                text_content=text_content,
                html_content=html_content,
                to_name=to_name
            )

        except Exception as e:
            logger.error(f"模板邮件发送失败 {to_email}: {e}")
            return False

    def send_verification_email(
        self,
        to_email: str,
        verification_token: str,
        user_name: Optional[str] = None
    ) -> bool:
        """
        发送邮箱验证邮件

        Args:
            to_email: 收件人邮箱
            verification_token: 验证令牌
            user_name: 用户名称（可选）

        Returns:
            bool: 发送是否成功
        """
        verification_url = f"{settings.APP_BASE_URL}/api/v1/auth/email/verify?token={verification_token}"

        context = {
            "user_name": user_name or "用户",
            "verification_url": verification_url,
            "app_name": self.from_name,
            "expires_hours": 24
        }

        return self.send_template_email(
            to_email=to_email,
            template_name="email_verification",
            context=context,
            subject="验证您的邮箱地址",
            to_name=user_name
        )

    def send_password_reset_email(
        self,
        to_email: str,
        reset_token: str,
        user_name: Optional[str] = None
    ) -> bool:
        """
        发送密码重置邮件

        Args:
            to_email: 收件人邮箱
            reset_token: 重置令牌
            user_name: 用户名称（可选）

        Returns:
            bool: 发送是否成功
        """
        reset_url = f"{settings.APP_BASE_URL}/api/v1/auth/email/reset-password?token={reset_token}"

        context = {
            "user_name": user_name or "用户",
            "reset_url": reset_url,
            "app_name": self.from_name,
            "expires_hours": 1  # 密码重置链接1小时有效
        }

        return self.send_template_email(
            to_email=to_email,
            template_name="password_reset",
            context=context,
            subject="重置您的密码",
            to_name=user_name
        )

    def _html_to_text(self, html_content: str) -> str:
        """
        简单的HTML到文本转换

        Args:
            html_content: HTML内容

        Returns:
            str: 纯文本内容
        """
        # 这里可以使用更复杂的HTML到文本转换库
        # 暂时使用简单的标签移除
        import re
        text = re.sub(r'<[^>]+>', '', html_content)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def test_connection(self) -> bool:
        """
        测试邮件服务器连接

        Returns:
            bool: 连接是否成功
        """
        try:
            with self._create_smtp_connection() as smtp:
                logger.info("邮件服务器连接测试成功")
                return True
        except Exception as e:
            logger.error(f"邮件服务器连接测试失败: {e}")
            return False


class EmailServiceError(Exception):
    """邮件服务异常"""
    pass


# 全局邮件服务实例
email_service = EmailService()


def get_email_service() -> EmailService:
    """获取邮件服务实例"""
    return email_service