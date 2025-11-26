from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from app.models.user import User, UserBalance
from app.models.payment import RedeemCode, Purchase
from app.models.transaction import CreditTransaction
from app.database import get_db
import logging

logger = logging.getLogger(__name__)

class DashboardService:
    """管理Portal仪表板数据服务"""

    def __init__(self):
        self.logger = logger

    async def get_dashboard_metrics(self, db: Session) -> Dict[str, Any]:
        """获取仪表板关键指标"""
        try:
            now = datetime.utcnow()
            thirty_days_ago = now - timedelta(days=30)
            seven_days_ago = now - timedelta(days=7)
            yesterday = now - timedelta(days=1)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

            # 基础用户统计
            total_users = db.query(User).count()
            active_users_30d = db.query(User).filter(
                User.last_active_at >= thirty_days_ago
            ).count()

            # 用户增长统计
            users_last_month = db.query(User).filter(
                User.created_at >= thirty_days_ago - timedelta(days=30),
                User.created_at < thirty_days_ago
            ).count()
            users_growth = self._calculate_growth(total_users - db.query(User).filter(
                User.created_at >= thirty_days_ago
            ).count(), users_last_month)

            # 收入统计
            total_credits_sold = db.query(func.sum(Purchase.credits)).filter(
                Purchase.status == 'completed'
            ).scalar() or 0

            credits_sold_last_month = db.query(func.sum(Purchase.credits)).filter(
                and_(
                    Purchase.status == 'completed',
                    Purchase.created_at >= thirty_days_ago - timedelta(days=30),
                    Purchase.created_at < thirty_days_ago
                )
            ).scalar() or 0

            credits_sold_this_month = db.query(func.sum(Purchase.credits)).filter(
                and_(
                    Purchase.status == 'completed',
                    Purchase.created_at >= thirty_days_ago
                )
            ).scalar() or 0

            revenue_growth = self._calculate_growth(credits_sold_this_month, credits_sold_last_month)

            # 今日订单统计
            orders_today = db.query(Purchase).filter(
                and_(
                    Purchase.created_at >= today_start,
                    Purchase.status.in_(['completed', 'pending'])
                )
            ).count()

            orders_yesterday = db.query(Purchase).filter(
                and_(
                    Purchase.created_at >= yesterday.replace(hour=0, minute=0, second=0, microsecond=0),
                    Purchase.created_at < today_start,
                    Purchase.status.in_(['completed', 'pending'])
                )
            ).count()

            orders_growth = self._calculate_growth(orders_today, orders_yesterday)

            # 活跃度计算
            active_users_ratio = round((active_users_30d / total_users * 100) if total_users > 0 else 0, 1)

            return {
                'total_users': total_users,
                'users_growth': users_growth,
                'total_credits_sold': total_credits_sold,
                'revenue_growth': revenue_growth,
                'active_users_30d': active_users_30d,
                'active_users_ratio': active_users_ratio,
                'orders_today': orders_today,
                'orders_growth': orders_growth,
                'last_updated': now.isoformat()
            }

        except Exception as e:
            self.logger.error(f"Error getting dashboard metrics: {e}")
            return self._get_empty_metrics()

    async def get_chart_data(self, db: Session) -> Dict[str, Any]:
        """获取图表数据"""
        try:
            now = datetime.utcnow()
            thirty_days_ago = now - timedelta(days=30)
            seven_days_ago = now - timedelta(days=7)

            # 收入趋势（最近30天）
            revenue_data = []
            revenue_labels = []
            for i in range(30):
                date = (now - timedelta(days=29-i)).date()
                day_start = datetime.combine(date, datetime.min.time())
                day_end = day_start + timedelta(days=1)

                credits_sold = db.query(func.sum(Purchase.credits)).filter(
                    and_(
                        Purchase.status == 'completed',
                        Purchase.created_at >= day_start,
                        Purchase.created_at < day_end
                    )
                ).scalar() or 0

                revenue_data.append(credits_sold)
                revenue_labels.append(date.strftime('%m-%d'))

            # 用户增长（最近7天）
            user_growth_data = []
            user_growth_labels = []
            for i in range(7):
                date = (now - timedelta(days=6-i)).date()
                day_start = datetime.combine(date, datetime.min.time())
                day_end = day_start + timedelta(days=1)

                new_users = db.query(User).filter(
                    and_(
                        User.created_at >= day_start,
                        User.created_at < day_end
                    )
                ).count()

                user_growth_data.append(new_users)
                user_growth_labels.append(date.strftime('%m-%d'))

            # 平台分布
            google_play_orders = db.query(Purchase).filter(
                and_(
                    Purchase.platform == 'google_play',
                    Purchase.status == 'completed'
                )
            ).count()

            redeem_code_orders = db.query(Purchase).filter(
                and_(
                    Purchase.platform == 'redeem_code',
                    Purchase.status == 'completed'
                )
            ).count()

            other_orders = db.query(Purchase).filter(
                and_(
                    Purchase.platform.notin_(['google_play', 'redeem_code']),
                    Purchase.status == 'completed'
                )
            ).count()

            return {
                'revenue_labels': revenue_labels,
                'revenue_data': revenue_data,
                'user_growth_labels': user_growth_labels,
                'user_growth_data': user_growth_data,
                'platform_labels': ['Google Play', '兑换码', '其他'],
                'platform_data': [google_play_orders, redeem_code_orders, other_orders]
            }

        except Exception as e:
            self.logger.error(f"Error getting chart data: {e}")
            return self._get_empty_chart_data()

    async def get_recent_activities(self, db: Session, limit: int = 10) -> List[Dict[str, Any]]:
        """获取最近活动记录"""
        try:
            # 获取最近的购买记录
            recent_purchases = db.query(Purchase).join(User).filter(
                Purchase.status == 'completed'
            ).order_by(Purchase.completed_at.desc()).limit(limit).all()

            activities = []
            for purchase in recent_purchases:
                activities.append({
                    'created_at': purchase.completed_at or purchase.created_at,
                    'type': 'redeem' if purchase.platform == 'redeem_code' else 'purchase',
                    'installation_id': purchase.user.installation_id,
                    'credits': purchase.credits,
                    'platform': purchase.platform
                })

            return sorted(activities, key=lambda x: x['created_at'], reverse=True)

        except Exception as e:
            self.logger.error(f"Error getting recent activities: {e}")
            return []

    async def get_system_status(self, db: Session) -> Dict[str, Any]:
        """获取系统状态信息"""
        try:
            # 数据库健康检查
            db_status = "healthy"
            try:
                db.execute("SELECT 1").fetchone()
            except:
                db_status = "error"

            # 统计一些基本信息
            total_transactions = db.query(CreditTransaction).count()
            pending_orders = db.query(Purchase).filter(Purchase.status == 'pending').count()
            active_redeem_codes = db.query(RedeemCode).filter(RedeemCode.status == 'active').count()

            return {
                'database_status': db_status,
                'google_play_status': 'healthy',  # 实际实现中应该调用Google Play API检查
                'llm_service_status': 'healthy',  # 实际实现中应该调用LLM API检查
                'system_load': 65,  # 实际实现中应该获取真实的系统负载
                'total_transactions': total_transactions,
                'pending_orders': pending_orders,
                'active_redeem_codes': active_redeem_codes
            }

        except Exception as e:
            self.logger.error(f"Error getting system status: {e}")
            return {
                'database_status': 'error',
                'google_play_status': 'unknown',
                'llm_service_status': 'unknown',
                'system_load': 0,
                'total_transactions': 0,
                'pending_orders': 0,
                'active_redeem_codes': 0
            }

    def _calculate_growth(self, current: int, previous: int) -> float:
        """计算增长率"""
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round(((current - previous) / previous) * 100, 1)

    def _get_empty_metrics(self) -> Dict[str, Any]:
        """返回空的指标数据"""
        return {
            'total_users': 0,
            'users_growth': 0,
            'total_credits_sold': 0,
            'revenue_growth': 0,
            'active_users_30d': 0,
            'active_users_ratio': 0,
            'orders_today': 0,
            'orders_growth': 0,
            'last_updated': datetime.utcnow().isoformat()
        }

    def _get_empty_chart_data(self) -> Dict[str, Any]:
        """返回空的图表数据"""
        return {
            'revenue_labels': [],
            'revenue_data': [],
            'user_growth_labels': [],
            'user_growth_data': [],
            'platform_labels': ['Google Play', '兑换码', '其他'],
            'platform_data': [0, 0, 0]
        }


# 全局实例
dashboard_service = DashboardService()