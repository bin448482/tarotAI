# 业务逻辑服务 (app/services/CLAUDE.md)

## 🏗️ 服务层架构

### 服务文件组织
```
app/services/
├── __init__.py           # 服务导出
├── reading_service.py    # 解读业务逻辑 (✅ 已实现)
├── llm_service.py        # LLM调用服务 (✅ 已实现)
├── payment_service.py    # 支付服务 (🔄 待实现)
├── user_service.py       # 用户业务逻辑 (🔄 待实现)
├── google_play.py        # Google Play集成 (🔄 待实现)
└── sync_service.py       # 同步服务 (🔄 待实现)
```

## 🎯 核心服务设计

### 1. 解读服务 (reading_service.py)

#### ReadingService - 解读核心逻辑
```python
class ReadingService:
    """解读服务核心类"""

    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service

    async def analyze_question(
        self,
        question: str,
        spread_type: str,
        db: Session
    ) -> List[DimensionInfo]:
        """分析用户问题，推荐相关维度"""

        # 1. 获取所有可用维度
        dimensions = self._get_dimensions_by_spread_type(spread_type, db)

        # 2. LLM分析问题内容
        analysis_prompt = self._build_analysis_prompt(question, dimensions)
        llm_result = await self.llm_service.call_api(analysis_prompt)

        # 3. 解析推荐维度ID
        recommended_ids = self._parse_dimension_ids(llm_result)

        # 4. 返回推荐维度
        return self._filter_dimensions(dimensions, recommended_ids)

    async def generate_reading(
        self,
        request: ReadingRequest,
        db: Session
    ) -> ReadingResponse:
        """生成多维度塔罗解读"""

        # 1. 验证请求参数
        self._validate_reading_request(request)

        # 2. 获取卡牌和维度信息
        cards = self._get_cards_info(request.cards, db)
        dimensions = self._get_dimensions_info(request.selected_dimensions, db)

        # 3. 生成各维度解读
        dimension_summaries = {}
        for dimension in dimensions:
            summary = await self._generate_dimension_summary(
                cards, dimension, request.question
            )
            dimension_summaries[str(dimension.id)] = summary

        # 4. 生成综合解读
        overall_summary = await self._generate_overall_summary(
            dimension_summaries, request.question
        )

        # 5. 构建响应
        return ReadingResponse(
            reading_id=str(uuid4()),
            question=request.question,
            spread_type=request.spread_type,
            cards=cards,
            dimension_summaries=dimension_summaries,
            overall_summary=overall_summary,
            created_at=datetime.utcnow().isoformat()
        )
```

#### 关键业务方法
```python
async def _generate_dimension_summary(
    self,
    cards: List[CardInfo],
    dimension: DimensionInfo,
    question: str
) -> str:
    """为单个维度生成解读摘要"""

    # 构建单维度解读提示词
    prompt = self._build_dimension_prompt(cards, dimension, question)

    # 调用LLM生成解读
    try:
        result = await self.llm_service.call_api(prompt)
        return result if result else f"从{dimension.name}角度来看，需要您保持开放心态。"
    except Exception as e:
        logger.error(f"维度解读生成失败: {e}")
        return f"从{dimension.name}角度来看，建议您相信自己的直觉。"

async def _generate_overall_summary(
    self,
    dimension_summaries: Dict[str, str],
    question: str
) -> str:
    """生成跨维度综合解读"""

    # 构建综合分析提示词
    summaries_text = "\n".join([
        f"维度{dim_id}: {summary}"
        for dim_id, summary in dimension_summaries.items()
    ])

    prompt = f"""
    基于以下多维度塔罗解读结果，生成综合分析（150-200字）：

    用户问题：{question}
    各维度解读：{summaries_text}

    请综合分析各维度的一致性、互补性，给出具体建议。
    """

    try:
        result = await self.llm_service.call_api(prompt)
        return result if result else "综合来看，建议您保持积极心态，相信自己的能力。"
    except Exception as e:
        logger.error(f"综合解读生成失败: {e}")
        return "综合来看，建议您保持积极心态，相信自己的能力。"
```

### 2. LLM服务 (llm_service.py)

#### LLMService - LLM调用封装
```python
class LLMService:
    """LLM调用服务"""

    def __init__(self):
        self.provider = os.getenv("API_PROVIDER", "zhipu")
        self.zhipu_key = os.getenv("ZHIPUAI_API_KEY")
        self.openai_key = os.getenv("OPENAI_API_KEY")
        self.model_name = os.getenv("MODEL_NAME", "glm-4-flash")

    async def call_api(self, prompt: str) -> str:
        """统一的LLM API调用入口"""

        if self.provider == "zhipu":
            return await self._call_zhipu_api(prompt)
        elif self.provider == "openai":
            return await self._call_openai_api(prompt)
        else:
            raise ValueError(f"不支持的LLM提供商: {self.provider}")

    async def _call_zhipu_api(self, prompt: str) -> str:
        """调用智谱AI API"""
        from zhipuai import ZhipuAI

        try:
            client = ZhipuAI(api_key=self.zhipu_key)
            response = client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=1000
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"智谱AI调用失败: {e}")
            raise

    async def _call_openai_api(self, prompt: str) -> str:
        """调用OpenAI API"""
        import openai

        try:
            client = openai.AsyncOpenAI(api_key=self.openai_key)
            response = await client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=1000
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI调用失败: {e}")
            raise
```

### 3. 用户服务 (user_service.py)

#### UserService - 用户管理
```python
class UserService:
    """用户服务"""

    async def create_anonymous_user(self, db: Session) -> dict:
        """创建匿名用户"""

        # 生成唯一安装ID
        installation_id = str(uuid4())

        # 创建用户记录
        user = User(installation_id=installation_id)
        db.add(user)

        # 创建用户余额记录
        balance = UserBalance(user_id=user.id, credits=0)
        db.add(balance)

        db.commit()
        db.refresh(user)

        # 生成JWT token
        token = self._generate_jwt_token(user.id, installation_id)

        return {
            "user_id": installation_id,
            "token": token,
            "expires_in": 3600
        }

    async def get_user_balance(self, user_id: int, db: Session) -> dict:
        """获取用户积分余额"""

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")

        balance = db.query(UserBalance).filter(UserBalance.user_id == user_id).first()

        return {
            "user_id": user.installation_id,
            "credits": balance.credits if balance else 0,
            "total_purchased": user.total_credits_purchased,
            "total_consumed": user.total_credits_consumed,
            "last_updated": balance.updated_at if balance else user.created_at
        }

    async def update_credits(
        self,
        user_id: int,
        credits_change: int,
        transaction_type: str,
        description: str,
        db: Session
    ) -> bool:
        """更新用户积分（使用乐观锁）"""

        # 获取当前余额
        balance = db.query(UserBalance).filter(UserBalance.user_id == user_id).first()
        if not balance:
            raise HTTPException(status_code=404, detail="用户余额不存在")

        current_version = balance.version
        new_credits = balance.credits + credits_change

        if new_credits < 0:
            raise HTTPException(status_code=400, detail="积分余额不足")

        # 乐观锁更新余额
        result = db.execute(
            update(UserBalance)
            .where(UserBalance.user_id == user_id)
            .where(UserBalance.version == current_version)
            .values(
                credits=new_credits,
                version=UserBalance.version + 1,
                updated_at=datetime.utcnow()
            )
        )

        if result.rowcount == 0:
            raise HTTPException(status_code=409, detail="并发更新冲突，请重试")

        # 记录交易
        transaction = CreditTransaction(
            user_id=user_id,
            type=transaction_type,
            credits=credits_change,
            balance_after=new_credits,
            description=description
        )
        db.add(transaction)

        # 更新用户统计
        if credits_change > 0:
            db.execute(
                update(User)
                .where(User.id == user_id)
                .values(total_credits_purchased=User.total_credits_purchased + credits_change)
            )
        else:
            db.execute(
                update(User)
                .where(User.id == user_id)
                .values(total_credits_consumed=User.total_credits_consumed + abs(credits_change))
            )

        db.commit()
        return True
```

### 4. 支付服务 (payment_service.py)

#### PaymentService - 支付处理
```python
class PaymentService:
    """支付服务"""

    def __init__(self, user_service: UserService):
        self.user_service = user_service

    async def redeem_code(
        self,
        code: str,
        user_id: int,
        db: Session
    ) -> dict:
        """兑换码处理"""

        # 查找兑换码
        redeem_code = db.query(RedeemCode).filter(
            RedeemCode.code == code.upper(),
            RedeemCode.status == "active"
        ).first()

        if not redeem_code:
            raise HTTPException(status_code=404, detail="兑换码不存在或已失效")

        # 检查过期时间
        if redeem_code.expires_at and redeem_code.expires_at < datetime.utcnow():
            redeem_code.status = "expired"
            db.commit()
            raise HTTPException(status_code=400, detail="兑换码已过期")

        # 标记兑换码为已使用
        redeem_code.status = "used"
        redeem_code.used_by = user_id
        redeem_code.used_at = datetime.utcnow()

        # 创建订单记录
        order = Purchase(
            order_id=f"redeem_{uuid4().hex}",
            platform="redeem_code",
            user_id=user_id,
            product_id=redeem_code.product_id,
            credits=redeem_code.credits,
            status="completed",
            redeem_code=code,
            completed_at=datetime.utcnow()
        )
        db.add(order)

        # 发放积分
        await self.user_service.update_credits(
            user_id=user_id,
            credits_change=redeem_code.credits,
            transaction_type="earn",
            description=f"兑换码充值: {code}",
            db=db
        )

        db.commit()

        # 获取最新余额
        balance_info = await self.user_service.get_user_balance(user_id, db)

        return {
            "success": True,
            "credits_earned": redeem_code.credits,
            "new_balance": balance_info["credits"],
            "message": f"兑换成功，获得{redeem_code.credits}积分"
        }

    async def verify_google_purchase(
        self,
        purchase_token: str,
        product_id: str,
        order_id: str,
        user_id: int,
        db: Session
    ) -> dict:
        """验证Google Play购买"""

        # 检查订单是否已存在（防重复处理）
        existing_order = db.query(Purchase).filter(
            Purchase.order_id == order_id
        ).first()

        if existing_order:
            if existing_order.status == "completed":
                raise HTTPException(status_code=400, detail="订单已完成处理")
            elif existing_order.status == "failed":
                raise HTTPException(status_code=400, detail="订单处理失败")

        # 调用Google Play API验证
        google_service = GooglePlayService()
        verification_result = await google_service.verify_purchase(
            purchase_token, product_id
        )

        if not verification_result["valid"]:
            # 创建失败订单记录
            if not existing_order:
                order = Purchase(
                    order_id=order_id,
                    platform="google_play",
                    user_id=user_id,
                    product_id=product_id,
                    status="failed",
                    purchase_token=purchase_token
                )
                db.add(order)
                db.commit()

            raise HTTPException(status_code=400, detail="购买验证失败")

        # 获取产品信息（积分数量）
        product_credits = self._get_product_credits(product_id)

        # 创建或更新订单记录
        if existing_order:
            existing_order.status = "completed"
            existing_order.credits = product_credits
            existing_order.completed_at = datetime.utcnow()
        else:
            order = Purchase(
                order_id=order_id,
                platform="google_play",
                user_id=user_id,
                product_id=product_id,
                credits=product_credits,
                status="completed",
                purchase_token=purchase_token,
                completed_at=datetime.utcnow()
            )
            db.add(order)

        # 发放积分
        await self.user_service.update_credits(
            user_id=user_id,
            credits_change=product_credits,
            transaction_type="earn",
            description=f"Google Play购买: {product_id}",
            db=db
        )

        db.commit()

        # 获取最新余额
        balance_info = await self.user_service.get_user_balance(user_id, db)

        return {
            "success": True,
            "order_id": order_id,
            "credits_earned": product_credits,
            "new_balance": balance_info["credits"],
            "purchase_status": "completed"
        }
```

### 5. Google Play服务 (google_play.py)

#### GooglePlayService - Google Play集成
```python
class GooglePlayService:
    """Google Play API服务"""

    def __init__(self):
        self.service_account_file = os.getenv("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON")
        self.package_name = os.getenv("GOOGLE_PACKAGE_NAME")
        self.enabled = os.getenv("GOOGLE_PLAY_ENABLED", "false").lower() == "true"

    async def verify_purchase(
        self,
        purchase_token: str,
        product_id: str
    ) -> dict:
        """验证Google Play内购"""

        if not self.enabled:
            logger.warning("Google Play验证未启用")
            return {"valid": False, "reason": "Google Play验证未启用"}

        try:
            # 加载服务账户凭据
            credentials = service_account.Credentials.from_service_account_file(
                self.service_account_file,
                scopes=['https://www.googleapis.com/auth/androidpublisher']
            )

            # 构建服务客户端
            service = build('androidpublisher', 'v3', credentials=credentials)

            # 验证购买
            result = service.purchases().products().get(
                packageName=self.package_name,
                productId=product_id,
                token=purchase_token
            ).execute()

            # 检查购买状态
            purchase_state = result.get('purchaseState', 0)
            consumption_state = result.get('consumptionState', 0)

            # purchaseState: 0=purchased, 1=canceled
            # consumptionState: 0=not_consumed, 1=consumed
            is_valid = (purchase_state == 0 and consumption_state == 0)

            return {
                "valid": is_valid,
                "purchase_state": purchase_state,
                "consumption_state": consumption_state,
                "order_id": result.get('orderId'),
                "purchase_time": result.get('purchaseTimeMillis')
            }

        except Exception as e:
            logger.error(f"Google Play验证失败: {e}")
            return {"valid": False, "reason": str(e)}

    async def consume_purchase(
        self,
        purchase_token: str,
        product_id: str
    ) -> bool:
        """标记购买为已消费"""

        if not self.enabled:
            return True

        try:
            credentials = service_account.Credentials.from_service_account_file(
                self.service_account_file,
                scopes=['https://www.googleapis.com/auth/androidpublisher']
            )

            service = build('androidpublisher', 'v3', credentials=credentials)

            # 标记为已消费
            service.purchases().products().consume(
                packageName=self.package_name,
                productId=product_id,
                token=purchase_token
            ).execute()

            return True

        except Exception as e:
            logger.error(f"标记消费失败: {e}")
            return False
```

## 🔧 服务集成和依赖注入

### 服务工厂
```python
# app/services/__init__.py
class ServiceFactory:
    """服务工厂"""

    _instances = {}

    @classmethod
    def get_llm_service(cls) -> LLMService:
        if 'llm_service' not in cls._instances:
            cls._instances['llm_service'] = LLMService()
        return cls._instances['llm_service']

    @classmethod
    def get_reading_service(cls) -> ReadingService:
        if 'reading_service' not in cls._instances:
            llm_service = cls.get_llm_service()
            cls._instances['reading_service'] = ReadingService(llm_service)
        return cls._instances['reading_service']

    @classmethod
    def get_user_service(cls) -> UserService:
        if 'user_service' not in cls._instances:
            cls._instances['user_service'] = UserService()
        return cls._instances['user_service']

    @classmethod
    def get_payment_service(cls) -> PaymentService:
        if 'payment_service' not in cls._instances:
            user_service = cls.get_user_service()
            cls._instances['payment_service'] = PaymentService(user_service)
        return cls._instances['payment_service']
```

## 🧪 服务测试

### 测试结构
```
tests/services/
├── test_reading_service.py   # 解读服务测试
├── test_llm_service.py       # LLM服务测试
├── test_user_service.py      # 用户服务测试
├── test_payment_service.py   # 支付服务测试
└── test_google_play.py       # Google Play测试
```

### 关键测试用例
```python
# tests/services/test_payment_service.py
@pytest.mark.asyncio
async def test_redeem_code_success(db_session, mock_user_service):
    """测试兑换码成功流程"""

    # 创建测试数据
    redeem_code = RedeemCode(
        code="TEST123456789ABCD",
        product_id=1,
        credits=5,
        status="active",
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db_session.add(redeem_code)
    db_session.commit()

    # 执行兑换
    service = PaymentService(mock_user_service)
    result = await service.redeem_code("TEST123456789ABCD", 1, db_session)

    # 验证结果
    assert result["success"] is True
    assert result["credits_earned"] == 5

    # 验证兑换码状态
    updated_code = db_session.query(RedeemCode).filter(
        RedeemCode.code == "TEST123456789ABCD"
    ).first()
    assert updated_code.status == "used"
```

---

*此文档定义了塔罗牌应用后端的核心业务逻辑服务，提供各服务模块的设计和实现指南。*