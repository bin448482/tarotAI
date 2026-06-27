"""
Admin authentication and management API routes.
"""
from fastapi import APIRouter, HTTPException, status, Depends, Request, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, ValidationError
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc, func, or_
from datetime import datetime, timedelta
import csv
import io

from app.utils.admin_auth import admin_auth_service, get_current_admin
from app.database import get_db
from app.models.user import User, UserBalance
from app.models.transaction import CreditTransaction
from app.models.email_verification import EmailVerification
from app.models.payment import RedeemCode, Purchase
from app.services.user_service import UserService
from app.utils.logger import admin_logger, api_logger, log_admin_action, log_user_credit_change


# 移除Cookie认证函数，统一使用JWT Bearer token认证


class AdminLoginRequest(BaseModel):
    """Admin login request schema."""
    username: str = Field(..., description="Admin username")
    password: str = Field(..., description="Admin password")


class AdminLoginResponse(BaseModel):
    """Admin login response schema."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    username: str


class AdminProfileResponse(BaseModel):
    """Admin profile response schema."""
    username: str
    role: str = "admin"
    authenticated: bool = True


router = APIRouter(prefix="/admin-api", tags=["admin-auth"])




async def parse_admin_login_payload(request: Request) -> AdminLoginRequest:
    """Parse admin login payload from JSON or form submissions."""
    content_type = (request.headers.get("content-type") or "").lower()

    data = None
    try:
        if "application/json" in content_type:
            data = await request.json()
        elif "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
            form = await request.form()
            data = dict(form.multi_items()) if hasattr(form, 'multi_items') else dict(form)
        else:
            data = await request.json()
    except Exception:
        try:
            form = await request.form()
            data = dict(form.multi_items()) if hasattr(form, 'multi_items') else dict(form)
        except Exception:
            data = None

    if not data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Username and password are required"
        )

    try:
        return AdminLoginRequest.model_validate(data)
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.errors()
        )

@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(login_request: AdminLoginRequest = Depends(parse_admin_login_payload)):
    """
    Admin login endpoint.

    Authenticates admin credentials and returns a JWT token.
    """
    try:
        # Verify credentials
        if not admin_auth_service.verify_credentials(login_request.username, login_request.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )

        # Create JWT token
        token = admin_auth_service.create_admin_token(login_request.username)

        return AdminLoginResponse(
            access_token=token,
            expires_in=admin_auth_service.expire_hours * 3600,  # Convert to seconds
            username=login_request.username
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.get("/profile", response_model=AdminProfileResponse)
async def get_admin_profile(current_admin: str = Depends(get_current_admin)):
    """
    Get current admin profile information.

    Requires valid admin authentication.
    """
    return AdminProfileResponse(
        username=current_admin
    )


@router.post("/logout")
async def admin_logout(current_admin: str = Depends(get_current_admin)):
    """
    Admin logout endpoint.

    Note: Since we're using stateless JWT tokens, logout is handled
    on the client side by discarding the token.
    """
    return {
        "message": "Successfully logged out",
        "username": current_admin
    }


@router.post("/refresh")
async def refresh_admin_token(current_admin: str = Depends(get_current_admin)):
    """
    Refresh admin JWT token.

    Returns a new token with extended expiration time.
    """
    try:
        # Create new token
        new_token = admin_auth_service.create_admin_token(current_admin)

        return {
            "access_token": new_token,
            "token_type": "bearer",
            "expires_in": admin_auth_service.expire_hours * 3600,
            "username": current_admin
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh token"
        )


# ============================================================================
# 用户管理API路由
# ============================================================================

class UserListResponse(BaseModel):
    """用户列表响应模型"""
    success: bool = True
    users: List[dict]
    total: int
    page: int
    size: int


class UserDetailResponse(BaseModel):
    """用户详情响应模型"""
    success: bool = True
    user: dict


class AdjustCreditsRequest(BaseModel):
    """调整积分请求模型"""
    installation_id: str = Field(..., description="用户installation_id")
    credits: int = Field(..., description="积分变更量（正数增加，负数减少）")
    reason: str = Field(..., description="调整原因")


class AdjustCreditsResponse(BaseModel):
    """调整积分响应模型"""
    success: bool = True
    message: str
    new_balance: int


class DeleteUserResponse(BaseModel):
    """删除用户响应模型"""
    success: bool = True
    message: str


class PurchaseItemResponse(BaseModel):
    """管理员查看订单单项"""
    id: int
    order_id: str
    platform: str
    installation_id: Optional[str]
    email: Optional[str]
    product_id: int
    credits: int
    amount_cents: Optional[int]
    currency: Optional[str]
    status: str
    created_at: datetime
    completed_at: Optional[datetime]


class PurchaseListResponse(BaseModel):
    """管理员订单列表响应模型"""
    success: bool = True
    purchases: List[PurchaseItemResponse]
    total: int
    page: int
    size: int


class PurchaseTransactionResponse(BaseModel):
    """订单关联积分流水"""
    id: int
    type: str
    credits: int
    balance_after: int
    description: Optional[str]
    created_at: datetime


class PurchaseDetailResponse(BaseModel):
    """订单详情响应模型"""
    success: bool = True
    purchase: PurchaseItemResponse
    transactions: List[PurchaseTransactionResponse] = []


# 创建用户管理路由组
user_router = APIRouter(prefix="/api/v1/admin", tags=["admin-users"])
purchase_router = APIRouter(prefix="/api/v1/admin/purchases", tags=["admin-purchases"])


@user_router.get("/users", response_model=UserListResponse)
async def get_users(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    installation_id: Optional[str] = Query(None, description="用户ID筛选"),
    email: Optional[str] = Query(None, description="邮箱地址筛选"),
    email_status: Optional[str] = Query(None, description="邮箱状态筛选"),
    min_credits: Optional[int] = Query(None, ge=0, description="最低积分筛选"),
    date_range: Optional[str] = Query(None, description="注册时间筛选"),
    current_admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    获取用户列表（分页）

    支持以下筛选条件：
    - installation_id: 用户ID搜索
    - email: 邮箱地址搜索
    - email_status: 邮箱状态筛选（verified/unverified/none）
    - min_credits: 最低积分筛选
    - date_range: 注册时间筛选（today, week, month）
    """
    try:
        # 构建查询
        query = db.query(User).options(joinedload(User.balance))

        # 应用筛选条件
        if installation_id:
            query = query.filter(User.installation_id.contains(installation_id))

        if email:
            query = query.filter(User.email.contains(email))

        if email_status:
            if email_status == "verified":
                query = query.filter(User.email.isnot(None), User.email_verified == True)
            elif email_status == "unverified":
                query = query.filter(User.email.isnot(None), User.email_verified == False)
            elif email_status == "none":
                query = query.filter(User.email.is_(None))

        if date_range:
            now = datetime.utcnow()
            if date_range == "today":
                start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            elif date_range == "week":
                start_date = now - timedelta(days=7)
            elif date_range == "month":
                start_date = now - timedelta(days=30)
            else:
                start_date = None

            if start_date:
                query = query.filter(User.created_at >= start_date)

        if min_credits is not None:
            query = query.join(UserBalance).filter(UserBalance.credits >= min_credits)

        # 计算总数
        total = query.count()

        # 分页查询
        offset = (page - 1) * size
        users = query.order_by(desc(User.created_at)).offset(offset).limit(size).all()

        # 格式化响应数据
        user_list = []
        for user in users:
            balance = user.balance.credits if user.balance else 0
            user_list.append({
                "installation_id": user.installation_id,
                "email": user.email,
                "email_verified": user.email_verified,
                "credits": balance,
                "total_credits_purchased": user.total_credits_purchased,
                "total_credits_consumed": user.total_credits_consumed,
                "created_at": user.created_at.isoformat(),
                "last_active_at": user.last_active_at.isoformat()
            })

        return UserListResponse(
            users=user_list,
            total=total,
            page=page,
            size=size
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取用户列表失败: {str(e)}"
        )


@user_router.get("/users/{installation_id}", response_model=UserDetailResponse)
async def get_user_detail(
    installation_id: str,
    current_admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """获取用户详情信息"""
    try:
        # 查询用户
        user = db.query(User).options(
            joinedload(User.balance)
        ).filter(User.installation_id == installation_id).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )

        # 查询最近交易记录
        recent_transactions = db.query(CreditTransaction).filter(
            CreditTransaction.user_id == user.id
        ).order_by(desc(CreditTransaction.created_at)).limit(10).all()

        # 预取关联的订单信息，补充平台和订单号
        purchase_ids = [
            tx.reference_id for tx in recent_transactions
            if tx.reference_type == "purchase" and tx.reference_id is not None
        ]
        purchase_map = {}
        if purchase_ids:
            purchases = db.query(Purchase.id, Purchase.platform, Purchase.order_id).filter(
                Purchase.id.in_(purchase_ids)
            ).all()
            purchase_map = {p.id: {"platform": p.platform, "order_id": p.order_id} for p in purchases}

        # 格式化用户数据
        user_detail = {
            "installation_id": user.installation_id,
            "email": user.email,
            "email_verified": user.email_verified,
            "email_verified_at": user.email_verified_at.isoformat() if user.email_verified_at else None,
            "credits": user.balance.credits if user.balance else 0,
            "total_credits_purchased": user.total_credits_purchased,
            "total_credits_consumed": user.total_credits_consumed,
            "created_at": user.created_at.isoformat(),
            "last_active_at": user.last_active_at.isoformat(),
            "recent_transactions": [
                {
                    "type": tx.type,
                    "credits": tx.credits,
                    "balance_after": tx.balance_after,
                    "description": tx.description,
                    "created_at": tx.created_at.isoformat(),
                    "platform": (
                        purchase_map.get(tx.reference_id, {}).get("platform")
                        if tx.reference_type == "purchase"
                        else (
                            "redeem_code" if tx.reference_type == "redeem_code"
                            else "manual" if tx.reference_type == "admin"
                            else tx.reference_type
                        )
                    ),
                    "order_id": (
                        purchase_map.get(tx.reference_id, {}).get("order_id")
                        if tx.reference_type == "purchase"
                        else None
                    )
                } for tx in recent_transactions
            ]
        }

        return UserDetailResponse(user=user_detail)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取用户详情失败: {str(e)}"
        )


@user_router.post("/users/adjust-credits", response_model=AdjustCreditsResponse)
async def adjust_user_credits(
    raw_request: Request,
    current_admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """管理员调整用户积分"""
    admin_logger.debug(f"管理员积分调整请求", {"admin": current_admin})

    # 手动解析请求体
    try:
        body = await raw_request.body()
        admin_logger.debug(f"接收请求体", {"body_length": len(body)})

        import json
        # 尝试多种编码方式解码请求体
        if isinstance(body, bytes):
            try:
                # 优先尝试UTF-8解码
                body_str = body.decode('utf-8')
            except UnicodeDecodeError:
                try:
                    # 如果UTF-8失败，尝试GBK解码
                    body_str = body.decode('gbk')
                    admin_logger.debug("使用GBK编码解析请求体")
                except UnicodeDecodeError:
                    # 如果都失败，使用错误替换模式
                    body_str = body.decode('utf-8', errors='replace')
                    admin_logger.warning("请求体编码异常，使用替换模式解析")
        else:
            body_str = body

        json_data = json.loads(body_str)
        admin_logger.debug(f"请求JSON解析成功", {"keys": list(json_data.keys())})

        # 手动创建请求对象
        request = AdjustCreditsRequest(**json_data)
        admin_logger.debug(f"积分调整请求验证通过", {
            "installation_id": request.installation_id,
            "credits": request.credits,
            "reason": request.reason
        })

    except Exception as e:
        admin_logger.error(f"请求体解析失败", e, {"raw_body": str(body)[:200]})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"请求体解析失败: {str(e)}"
        )

    try:
        # 查询用户
        user = db.query(User).filter(
            User.installation_id == request.installation_id
        ).first()

        if not user:
            admin_logger.warning(f"积分调整失败：用户不存在", {
                "installation_id": request.installation_id,
                "admin": current_admin
            })
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )

        # 使用 UserService 的标准方法进行积分调整
        balance, transaction = UserService.admin_adjust_balance(
            db=db,
            user_id=user.id,
            credit_change=request.credits,
            description=request.reason,
            admin_id=None  # TODO: 从管理员认证中获取 admin_id
        )

        # 记录成功的积分调整操作
        log_user_credit_change(
            user_id=user.installation_id,
            change=request.credits,
            reason=request.reason,
            admin=current_admin,
            new_balance=balance.credits
        )

        return AdjustCreditsResponse(
            success=True,
            message=f"积分调整成功：{request.credits:+d}",
            new_balance=balance.credits
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        admin_logger.error(f"积分调整失败", e, {
            "installation_id": request.installation_id,
            "credits": request.credits,
            "admin": current_admin
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"积分调整失败: {str(e)}"
        )


@user_router.get("/users/export")
async def export_users(
    installation_id: Optional[str] = Query(None),
    min_credits: Optional[int] = Query(None),
    date_range: Optional[str] = Query(None),
    current_admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """导出用户数据为CSV文件"""
    try:
        # 构建查询（与获取用户列表相同的逻辑）
        query = db.query(User).options(joinedload(User.balance))

        if installation_id:
            query = query.filter(User.installation_id.contains(installation_id))

        if date_range:
            now = datetime.utcnow()
            if date_range == "today":
                start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            elif date_range == "week":
                start_date = now - timedelta(days=7)
            elif date_range == "month":
                start_date = now - timedelta(days=30)
            else:
                start_date = None

            if start_date:
                query = query.filter(User.created_at >= start_date)

        if min_credits is not None:
            query = query.join(UserBalance).filter(UserBalance.credits >= min_credits)

        # 获取所有用户数据
        users = query.order_by(desc(User.created_at)).all()

        # 创建CSV内容
        output = io.StringIO()
        writer = csv.writer(output)

        # 写入表头
        writer.writerow([
            "用户ID", "当前积分", "累计购买", "累计消费", "注册时间", "最后活跃时间"
        ])

        # 写入数据
        for user in users:
            balance = user.balance.credits if user.balance else 0
            writer.writerow([
                user.installation_id,
                balance,
                user.total_credits_purchased,
                user.total_credits_consumed,
                user.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                user.last_active_at.strftime("%Y-%m-%d %H:%M:%S")
            ])

        # 准备响应
        output.seek(0)
        filename = f"users_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8-sig')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导出用户数据失败: {str(e)}"
        )


@user_router.delete("/users/{installation_id}", response_model=DeleteUserResponse)
async def delete_user(
    installation_id: str,
    current_admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """删除用户及其所有相关数据"""
    try:
        # 查询用户
        user = db.query(User).filter(User.installation_id == installation_id).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )

        # 开启事务删除用户及其相关数据
        try:
            # 删除邮箱验证记录
            db.query(EmailVerification).filter(EmailVerification.user_id == user.id).delete()

            # 删除用户余额记录
            db.query(UserBalance).filter(UserBalance.user_id == user.id).delete()

            # 删除交易记录
            db.query(CreditTransaction).filter(CreditTransaction.user_id == user.id).delete()

            # TODO: 如果有其他相关表（如解读记录、订单记录等），也需要在这里删除
            # 例如：
            # db.query(Reading).filter(Reading.user_id == user.id).delete()
            # db.query(Purchase).filter(Purchase.user_id == user.id).delete()

            # 最后删除用户记录
            db.delete(user)

            # 提交事务
            db.commit()

        except Exception as delete_error:
            # 回滚事务
            db.rollback()
            raise delete_error

        return DeleteUserResponse(
            message=f"用户 {installation_id[:8]}... 已成功删除"
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除用户失败: {str(e)}"
        )


# ============================================================================
# 订单管理API路由
# ============================================================================

@purchase_router.get("", response_model=PurchaseListResponse)
async def list_purchases(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    platform: Optional[str] = Query(None, description="平台筛选"),
    status: Optional[str] = Query(None, description="订单状态"),
    installation_id: Optional[str] = Query(None, description="用户ID筛选"),
    email: Optional[str] = Query(None, description="邮箱模糊匹配"),
    order_id: Optional[str] = Query(None, description="订单号精确匹配"),
    date_from: Optional[str] = Query(None, description="开始日期（ISO或YYYY-MM-DD）"),
    date_to: Optional[str] = Query(None, description="结束日期（ISO或YYYY-MM-DD）"),
    current_admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """分页获取订单列表"""
    try:
        query = db.query(Purchase).options(joinedload(Purchase.user))

        if platform:
            query = query.filter(Purchase.platform == platform)
        if status:
            query = query.filter(Purchase.status == status)
        if installation_id:
            query = query.join(User).filter(User.installation_id.contains(installation_id))
        if email:
            query = query.join(User).filter(User.email.ilike(f"%{email}%"))
        if order_id:
            query = query.filter(Purchase.order_id == order_id)
        if date_from:
            try:
                dt_from = datetime.fromisoformat(date_from)
                query = query.filter(Purchase.created_at >= dt_from)
            except ValueError:
                pass
        if date_to:
            try:
                dt_to = datetime.fromisoformat(date_to)
                query = query.filter(Purchase.created_at <= dt_to)
            except ValueError:
                pass

        total = query.count()

        purchases = query.order_by(desc(Purchase.created_at)).offset((page - 1) * size).limit(size).all()

        purchases_data = [
            PurchaseItemResponse(
                id=purchase.id,
                order_id=purchase.order_id,
                platform=purchase.platform,
                installation_id=purchase.user.installation_id if purchase.user else None,
                email=purchase.user.email if purchase.user else None,
                product_id=purchase.product_id,
                credits=purchase.credits,
                amount_cents=purchase.amount_cents,
                currency=purchase.currency,
                status=purchase.status,
                created_at=purchase.created_at,
                completed_at=purchase.completed_at
            ) for purchase in purchases
        ]

        return PurchaseListResponse(
            purchases=purchases_data,
            total=total,
            page=page,
            size=size
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取订单列表失败: {str(e)}"
        )


@purchase_router.get("/{purchase_id}", response_model=PurchaseDetailResponse)
async def get_purchase_detail(
    purchase_id: int,
    current_admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """获取单个订单详情"""
    try:
        purchase = db.query(Purchase).options(joinedload(Purchase.user)).filter(
            Purchase.id == purchase_id
        ).first()

        if not purchase:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="订单不存在"
            )

        # 关联的积分流水
        transactions = db.query(CreditTransaction).filter(
            CreditTransaction.reference_type == "purchase",
            CreditTransaction.reference_id == purchase.id
        ).order_by(desc(CreditTransaction.created_at)).all()

        return PurchaseDetailResponse(
            purchase=PurchaseItemResponse(
                id=purchase.id,
                order_id=purchase.order_id,
                platform=purchase.platform,
                installation_id=purchase.user.installation_id if purchase.user else None,
                email=purchase.user.email if purchase.user else None,
                product_id=purchase.product_id,
                credits=purchase.credits,
                amount_cents=purchase.amount_cents,
                currency=purchase.currency,
                status=purchase.status,
                created_at=purchase.created_at,
                completed_at=purchase.completed_at
            ),
            transactions=[
                PurchaseTransactionResponse(
                    id=tx.id,
                    type=tx.type,
                    credits=tx.credits,
                    balance_after=tx.balance_after,
                    description=tx.description,
                    created_at=tx.created_at
                ) for tx in transactions
            ]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取订单详情失败: {str(e)}"
        )


# ============================================================================
# 兑换码管理API路由
# ============================================================================

class RedeemCodeListResponse(BaseModel):
    """兑换码列表响应模型"""
    success: bool = True
    redeem_codes: List[dict]
    total: int
    page: int
    size: int
    stats: dict


class RedeemCodeDetailResponse(BaseModel):
    """兑换码详情响应模型"""
    success: bool = True
    redeem_code: dict


class GenerateRedeemCodesRequest(BaseModel):
    """生成兑换码请求模型"""
    count: int = Field(..., ge=1, le=1000, description="生成数量（1-1000）")
    credits: int = Field(..., ge=1, description="每个兑换码的积分值")
    expires_days: int = Field(365, ge=1, le=3650, description="有效期天数（默认365天）")
    batch_name: Optional[str] = Field(None, description="批次名称")


class GenerateRedeemCodesResponse(BaseModel):
    """生成兑换码响应模型"""
    success: bool = True
    message: str
    batch_id: str
    generated_codes: List[str]
    count: int


class UpdateRedeemCodeRequest(BaseModel):
    """更新兑换码请求模型"""
    status: str = Field(..., description="新状态: active, disabled, expired")
    reason: Optional[str] = Field(None, description="更新原因")


class UpdateRedeemCodeResponse(BaseModel):
    """更新兑换码响应模型"""
    success: bool = True
    message: str


# 创建兑换码管理路由组
redeem_router = APIRouter(prefix="/api/v1/admin/redeem-codes", tags=["admin-redeem-codes"])
purchase_router = APIRouter(prefix="/api/v1/admin/purchases", tags=["admin-purchases"])


def generate_redeem_code() -> str:
    """生成16位兑换码"""
    import string
    import secrets

    # 使用大写字母和数字，排除容易混淆的字符
    chars = string.ascii_uppercase.replace('O', '').replace('I', '') + string.digits.replace('0', '').replace('1', '')
    return ''.join(secrets.choice(chars) for _ in range(16))


@redeem_router.get("", response_model=RedeemCodeListResponse)
async def get_redeem_codes(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    status: Optional[str] = Query(None, description="状态筛选"),
    batch_id: Optional[str] = Query(None, description="批次ID筛选"),
    code: Optional[str] = Query(None, description="兑换码搜索"),
    current_admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    获取兑换码列表（分页）

    支持以下筛选条件：
    - status: 状态筛选（active/used/expired/disabled）
    - batch_id: 批次ID筛选
    - code: 兑换码搜索（部分匹配）
    """
    try:
        # 构建查询
        query = db.query(RedeemCode)

        # 应用筛选条件
        if status:
            query = query.filter(RedeemCode.status == status)

        if batch_id:
            query = query.filter(RedeemCode.batch_id == batch_id)

        if code:
            query = query.filter(RedeemCode.code.contains(code.upper()))

        # 计算总数
        total = query.count()

        # 分页查询
        offset = (page - 1) * size
        redeem_codes = query.order_by(desc(RedeemCode.created_at)).offset(offset).limit(size).all()

        # 获取统计信息
        stats = {
            "total": db.query(RedeemCode).count(),
            "active": db.query(RedeemCode).filter(RedeemCode.status == "active").count(),
            "used": db.query(RedeemCode).filter(RedeemCode.status == "used").count(),
            "expired": db.query(RedeemCode).filter(RedeemCode.status == "expired").count(),
            "disabled": db.query(RedeemCode).filter(RedeemCode.status == "disabled").count()
        }

        # 格式化响应数据
        redeem_code_list = []
        for redeem_code in redeem_codes:
            # 查询使用者信息
            used_by_user = None
            if redeem_code.used_by:
                user = db.query(User).filter(User.id == redeem_code.used_by).first()
                if user:
                    used_by_user = {
                        "installation_id": user.installation_id,
                        "created_at": user.created_at.isoformat()
                    }

            redeem_code_list.append({
                "id": redeem_code.id,
                "code": redeem_code.code,
                "product_id": redeem_code.product_id,
                "credits": redeem_code.credits,
                "status": redeem_code.status,
                "used_by_user": used_by_user,
                "used_at": redeem_code.used_at.isoformat() if redeem_code.used_at else None,
                "expires_at": redeem_code.expires_at.isoformat() if redeem_code.expires_at else None,
                "created_at": redeem_code.created_at.isoformat(),
                "batch_id": redeem_code.batch_id
            })

        return RedeemCodeListResponse(
            redeem_codes=redeem_code_list,
            total=total,
            page=page,
            size=size,
            stats=stats
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取兑换码列表失败: {str(e)}"
        )


@redeem_router.post("/generate", response_model=GenerateRedeemCodesResponse)
async def generate_redeem_codes(
    request: GenerateRedeemCodesRequest,
    current_admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """批量生成兑换码"""
    try:
        import uuid
        from datetime import timedelta

        # 生成批次ID
        batch_id = str(uuid.uuid4())
        if request.batch_name:
            batch_id = f"{request.batch_name}_{batch_id[:8]}"

        # 计算过期时间
        expires_at = datetime.utcnow() + timedelta(days=request.expires_days)

        # 批量生成兑换码
        generated_codes = []
        redeem_codes = []

        for _ in range(request.count):
            # 生成唯一兑换码
            while True:
                code = generate_redeem_code()
                # 检查是否已存在
                existing = db.query(RedeemCode).filter(RedeemCode.code == code).first()
                if not existing:
                    break

            redeem_code = RedeemCode(
                code=code,
                product_id=1,  # 默认产品ID
                credits=request.credits,
                expires_at=expires_at,
                batch_id=batch_id,
                status="active"
            )
            redeem_codes.append(redeem_code)
            generated_codes.append(code)

        # 批量插入数据库
        db.add_all(redeem_codes)
        db.commit()

        return GenerateRedeemCodesResponse(
            message=f"成功生成{request.count}个兑换码",
            batch_id=batch_id,
            generated_codes=generated_codes,
            count=request.count
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成兑换码失败: {str(e)}"
        )


@redeem_router.put("/{redeem_code_id}", response_model=UpdateRedeemCodeResponse)
async def update_redeem_code(
    redeem_code_id: int,
    request: UpdateRedeemCodeRequest,
    current_admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """更新兑换码状态"""
    try:
        # 查询兑换码
        redeem_code = db.query(RedeemCode).filter(RedeemCode.id == redeem_code_id).first()

        if not redeem_code:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="兑换码不存在"
            )

        # 验证状态更新
        valid_statuses = ["active", "disabled", "expired"]
        if request.status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"无效的状态值，必须是: {', '.join(valid_statuses)}"
            )

        # 检查是否可以更新
        if redeem_code.status == "used":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="已使用的兑换码无法修改状态"
            )

        # 更新状态
        old_status = redeem_code.status
        redeem_code.status = request.status

        # 如果设置为过期，更新过期时间
        if request.status == "expired":
            redeem_code.expires_at = datetime.utcnow()

        db.commit()

        return UpdateRedeemCodeResponse(
            message=f"兑换码状态已从 {old_status} 更新为 {request.status}"
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新兑换码失败: {str(e)}"
        )


@redeem_router.get("/export/csv")
async def export_redeem_codes_csv(
    status: Optional[str] = Query(None),
    batch_id: Optional[str] = Query(None),
    current_admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """导出兑换码数据为CSV文件"""
    try:
        # 构建查询（与获取兑换码列表相同的逻辑）
        query = db.query(RedeemCode)

        if status:
            query = query.filter(RedeemCode.status == status)

        if batch_id:
            query = query.filter(RedeemCode.batch_id == batch_id)

        # 获取所有兑换码数据
        redeem_codes = query.order_by(desc(RedeemCode.created_at)).all()

        # 创建CSV内容
        output = io.StringIO()
        writer = csv.writer(output)

        # 写入表头
        writer.writerow([
            "兑换码", "积分值", "状态", "使用用户", "使用时间", "过期时间", "创建时间", "批次ID"
        ])

        # 写入数据
        for redeem_code in redeem_codes:
            # 查询使用者
            used_by_user_id = ""
            if redeem_code.used_by:
                user = db.query(User).filter(User.id == redeem_code.used_by).first()
                if user:
                    used_by_user_id = user.installation_id[:12] + "..."

            writer.writerow([
                redeem_code.code,
                redeem_code.credits,
                redeem_code.status,
                used_by_user_id,
                redeem_code.used_at.strftime("%Y-%m-%d %H:%M:%S") if redeem_code.used_at else "",
                redeem_code.expires_at.strftime("%Y-%m-%d %H:%M:%S") if redeem_code.expires_at else "",
                redeem_code.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                redeem_code.batch_id or ""
            ])

        # 准备响应
        output.seek(0)
        filename = f"redeem_codes_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8-sig')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导出兑换码数据失败: {str(e)}"
        )


@redeem_router.get("/stats")
async def get_redeem_code_stats(
    current_admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """获取兑换码统计信息"""
    try:
        stats = {
            "total": db.query(RedeemCode).count(),
            "active": db.query(RedeemCode).filter(RedeemCode.status == "active").count(),
            "used": db.query(RedeemCode).filter(RedeemCode.status == "used").count(),
            "expired": db.query(RedeemCode).filter(RedeemCode.status == "expired").count(),
            "disabled": db.query(RedeemCode).filter(RedeemCode.status == "disabled").count()
        }

        return {"success": True, "stats": stats}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取统计信息失败: {str(e)}"
        )


@redeem_router.get("/batches")
async def get_redeem_code_batches(
    current_admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """获取所有批次列表"""
    try:
        # 查询所有非空的批次ID
        batches = db.query(RedeemCode.batch_id).filter(
            RedeemCode.batch_id.isnot(None),
            RedeemCode.batch_id != ""
        ).distinct().all()

        batch_list = [batch[0] for batch in batches if batch[0]]

        return {"success": True, "batches": batch_list}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取批次列表失败: {str(e)}"
        )

# Keep detail route after static paths to avoid conflicts with endpoints like /stats or /batches

@redeem_router.get("/{redeem_code_id}", response_model=RedeemCodeDetailResponse)
async def get_redeem_code_detail(
    redeem_code_id: int,
    current_admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """获取兑换码详情信息"""
    try:
        # 查询兑换码
        redeem_code = db.query(RedeemCode).filter(RedeemCode.id == redeem_code_id).first()

        if not redeem_code:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="兑换码不存在"
            )

        # 查询使用者信息
        used_by_user = None
        if redeem_code.used_by:
            user = db.query(User).filter(User.id == redeem_code.used_by).first()
            if user:
                used_by_user = {
                    "installation_id": user.installation_id,
                    "email": user.email,
                    "created_at": user.created_at.isoformat(),
                    "last_active_at": user.last_active_at.isoformat()
                }

        # 格式化兑换码详情
        redeem_code_detail = {
            "id": redeem_code.id,
            "code": redeem_code.code,
            "product_id": redeem_code.product_id,
            "credits": redeem_code.credits,
            "status": redeem_code.status,
            "used_by_user": used_by_user,
            "used_at": redeem_code.used_at.isoformat() if redeem_code.used_at else None,
            "expires_at": redeem_code.expires_at.isoformat() if redeem_code.expires_at else None,
            "created_at": redeem_code.created_at.isoformat(),
            "batch_id": redeem_code.batch_id
        }

        return RedeemCodeDetailResponse(redeem_code=redeem_code_detail)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取兑换码详情失败: {str(e)}"
        )


