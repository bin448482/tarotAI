"""
FastAPI application entry point.
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import logging
import traceback

from app.config import settings
from app.database import create_tables

# 配置日志
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# 创建 FastAPI 应用实例
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="塔罗牌应用后端API - 支持匿名用户、牌阵解读、LLM集成",
    debug=settings.DEBUG
)

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_CREDENTIALS,
    allow_methods=settings.CORS_METHODS,
    allow_headers=settings.CORS_HEADERS,
)

# 挂载静态文件目录
app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")

# 添加请求日志中间件
@app.middleware("http")
async def log_requests(request: Request, call_next):
    from app.utils.logger import api_logger

    # 记录重要的API请求
    if request.method == "POST" and ("/admin/" in str(request.url) or "/api/" in str(request.url)):
        api_logger.log_request(
            method=request.method,
            path=str(request.url.path),
            user=request.headers.get("user-agent", "unknown")[:50]
        )

    response = await call_next(request)

    # 记录错误响应
    if response.status_code >= 400 and ("/admin/" in str(request.url) or "/api/" in str(request.url)):
        api_logger.log_response(
            path=str(request.url.path),
            status=response.status_code
        )

    return response


# 全局异常处理器
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理器"""
    logger.error(f"Global exception on {request.url}: {exc}")
    if settings.DEBUG:
        logger.error(f"Traceback: {traceback.format_exc()}")

    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.DEBUG else "An unexpected error occurred",
            "path": str(request.url.path)
        }
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP异常处理器"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "path": str(request.url.path)
        }
    )


# 启动事件
@app.on_event("startup")
async def startup_event():
    """应用启动时的初始化操作"""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # 创建数据库表（如果不存在）
    try:
        create_tables()
        logger.info("Database tables created/verified successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        raise


# 关闭事件
@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时的清理操作"""
    logger.info(f"Shutting down {settings.APP_NAME}")


# 健康检查端点
@app.get("/")
async def root():
    """根路径 - API信息"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "database": "connected"  # TODO: 实际检查数据库连接
    }


# TODO: 注册API路由
from app.api import auth, readings, dimensions, spreads, users, payments, admin, app_release

app.include_router(auth.router, prefix="/api/v1")
app.include_router(readings.router, prefix="/api/v1")
app.include_router(dimensions.router, prefix="/api/v1")
app.include_router(spreads.router, prefix="/api/v1")
app.include_router(users.router)  # Users router already includes /api/v1 prefix
app.include_router(payments.router)  # Payments router already includes /api/v1 prefix
app.include_router(admin.router, prefix="/api/v1")  # Admin API routes (/api/v1/admin-api/*)
app.include_router(admin.user_router)  # Admin user management API (/api/v1/admin/*)
app.include_router(admin.purchase_router)  # Admin purchase management API (/api/v1/admin/purchases/*)
app.include_router(admin.redeem_router)  # Admin redeem codes management API (/api/v1/admin/redeem-codes/*)
app.include_router(app_release.public_router, prefix="/api/v1")
app.include_router(app_release.admin_router, prefix="/api/v1")


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info" if not settings.DEBUG else "debug"
    )
