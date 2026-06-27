let currentPage = 1;
let pageSize = 20;

// 处理积分调整
function handleAdjustCredits() {
    console.log('DEBUG: handleAdjustCredits 被调用');

    const userId = document.getElementById('targetUserId').value;
    const creditChange = parseInt(document.getElementById('creditChange').value);
    const reason = document.getElementById('adjustReason').value;

    console.log('DEBUG: 表单数据', { userId, creditChange, reason });
    console.log('DEBUG: reason字符编码', reason, 'length:', reason.length);
    console.log('DEBUG: reason字节表示', Array.from(reason).map(c => c.charCodeAt(0)));

    if (!userId || !creditChange || !reason) {
        alert('请填写完整信息');
        return;
    }

    const requestBody = {
        installation_id: userId,
        credits: creditChange,
        reason: reason
    };

    console.log('DEBUG: 请求体对象', requestBody);
    console.log('DEBUG: JSON.stringify结果', JSON.stringify(requestBody));

    fetch('/api/v1/admin/users/adjust-credits', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess('积分调整成功');
            bootstrap.Modal.getInstance(document.getElementById('adjustCreditsModal')).hide();
            loadUsers(currentPage);
        } else {
            showError('积分调整失败: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('网络错误，请稍后重试');
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadUsers();

    // 绑定发送验证邮件表单提交事件
    document.getElementById('sendVerificationForm').addEventListener('submit', function(e) {
        e.preventDefault();

        const email = document.getElementById('verificationEmail').value;
        const userId = document.getElementById('targetUserIdForEmail').value;

        const requestData = {
            email: email
        };

        if (userId) {
            requestData.user_id = userId;
        }

        fetch('/api/v1/auth/email/send-verification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccess('验证邮件发送成功');
                bootstrap.Modal.getInstance(document.getElementById('sendVerificationModal')).hide();
                loadUsers(currentPage);
            } else {
                showError('验证邮件发送失败: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('网络错误，请稍后重试');
        });
    });
});

// 加载用户列表
function loadUsers(page = 1) {
    currentPage = page;
    const searchParams = new URLSearchParams();
    searchParams.append('page', page);
    searchParams.append('size', pageSize);

    // 添加搜索条件
    const installationId = document.getElementById('searchInstallationId').value;
    const searchEmail = document.getElementById('searchEmail').value;
    const emailStatus = document.getElementById('emailStatus').value;
    const minCredits = document.getElementById('minCredits').value;
    const dateRange = document.getElementById('dateRange').value;

    if (installationId) searchParams.append('installation_id', installationId);
    if (searchEmail) searchParams.append('email', searchEmail);
    if (emailStatus) searchParams.append('email_status', emailStatus);
    if (minCredits) searchParams.append('min_credits', minCredits);
    if (dateRange) searchParams.append('date_range', dateRange);

    fetch(`/api/v1/admin/users?${searchParams}`, {
        credentials: 'include'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderUsers(data.users);
                renderPagination(data.total, data.page, data.size);
                document.getElementById('userCount').textContent = `总计: ${data.total} 用户`;
            } else {
                showError('加载用户列表失败: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('网络错误，请稍后重试');
        });
}

// 渲染用户列表
function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');

    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <i class="fas fa-inbox fa-2x text-muted mb-3"></i>
                    <div>暂无用户数据</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>
                <code>${user.installation_id.substring(0, 8)}...</code>
                <i class="fas fa-copy ms-1 text-muted cursor-pointer"
                   onclick="copyToClipboard('${user.installation_id}')"
                   title="复制完整ID"></i>
            </td>
            <td>
                ${getEmailStatusBadge(user.email, user.email_verified)}
            </td>
            <td>
                <span class="badge ${user.credits > 0 ? 'bg-success' : 'bg-secondary'}">
                    ${user.credits} 积分
                </span>
            </td>
            <td>${user.total_credits_purchased || 0}</td>
            <td>${user.total_credits_consumed || 0}</td>
            <td>${formatDateTime(user.created_at)}</td>
            <td>${formatDateTime(user.last_active_at)}</td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button type="button" class="btn btn-outline-info"
                            onclick="viewUserDetail('${user.installation_id}')"
                            title="查看详情">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button type="button" class="btn btn-outline-success"
                            onclick="sendVerificationToUser('${user.installation_id}', '${user.email || ''}')"
                            title="发送验证邮件">
                        <i class="fas fa-envelope"></i>
                    </button>
                    <button type="button" class="btn btn-outline-warning"
                            onclick="adjustUserCredits('${user.installation_id}')"
                            title="调整积分">
                        <i class="fas fa-coins"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger"
                            onclick="deleteUser('${user.installation_id}')"
                            title="删除用户">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// 渲染分页
function renderPagination(total, page, size) {
    const totalPages = Math.ceil(total / size);
    const pagination = document.getElementById('pagination');

    let html = '';

    // 上一页
    html += `
        <li class="page-item ${page <= 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="${page > 1 ? `loadUsers(${page - 1})` : 'return false'}">
                上一页
            </a>
        </li>
    `;

    // 页码
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === page ? 'active' : ''}">
                <a class="page-link" href="#" onclick="loadUsers(${i})">${i}</a>
            </li>
        `;
    }

    // 下一页
    html += `
        <li class="page-item ${page >= totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="${page < totalPages ? `loadUsers(${page + 1})` : 'return false'}">
                下一页
            </a>
        </li>
    `;

    pagination.innerHTML = html;
}

// 搜索用户
function searchUsers() {
    loadUsers(1);
}

// 查看用户详情
function viewUserDetail(installationId) {
    fetch(`/api/v1/admin/users/${installationId}`, {
        credentials: 'include'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderUserDetail(data.user);
                new bootstrap.Modal(document.getElementById('userDetailModal')).show();
            } else {
                showError('加载用户详情失败: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('网络错误，请稍后重试');
        });
}

// 渲染用户详情
function renderUserDetail(user) {
    document.getElementById('userDetailContent').innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6 class="fw-bold">基本信息</h6>
                <table class="table table-sm">
                    <tr><td>用户ID:</td><td><code>${user.installation_id}</code></td></tr>
                    <tr><td>邮箱地址:</td><td>${user.email || '<span class="text-muted">未设置</span>'}</td></tr>
                    <tr><td>邮箱状态:</td><td>${getEmailStatusBadge(user.email, user.email_verified)}</td></tr>
                    <tr><td>注册时间:</td><td>${formatDateTime(user.created_at)}</td></tr>
                    <tr><td>最后活跃:</td><td>${formatDateTime(user.last_active_at)}</td></tr>
                    ${user.email_verified_at ? `<tr><td>邮箱验证时间:</td><td>${formatDateTime(user.email_verified_at)}</td></tr>` : ''}
                </table>
            </div>
            <div class="col-md-6">
                <h6 class="fw-bold">积分统计</h6>
                <table class="table table-sm">
                    <tr><td>当前余额:</td><td><span class="badge bg-success">${user.credits || 0} 积分</span></td></tr>
                    <tr><td>累计购买:</td><td>${user.total_credits_purchased || 0} 积分</td></tr>
                    <tr><td>累计消费:</td><td>${user.total_credits_consumed || 0} 积分</td></tr>
                </table>
                ${!user.email || !user.email_verified ? `
                <div class="mt-3">
                    <button type="button" class="btn btn-success btn-sm"
                            onclick="sendVerificationToUser('${user.installation_id}', '${user.email || ''}')">
                        <i class="fas fa-envelope me-1"></i>发送验证邮件
                    </button>
                </div>
                ` : ''}
            </div>
        </div>

        <hr>

        <h6 class="fw-bold">最近交易记录</h6>
        <div class="table-responsive">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>时间</th>
                        <th>类型</th>
                        <th>积分变更</th>
                        <th>余额</th>
                        <th>说明</th>
                    </tr>
                </thead>
                <tbody>
                    ${user.recent_transactions && user.recent_transactions.length > 0 ?
                        user.recent_transactions.map(tx => `
                            <tr>
                                <td>${formatDateTime(tx.created_at)}</td>
                                <td><span class="badge bg-${getTransactionTypeColor(tx.type)}">${getTransactionTypeName(tx.type)}</span></td>
                                <td class="${tx.credits > 0 ? 'text-success' : 'text-danger'}">${tx.credits > 0 ? '+' : ''}${tx.credits}</td>
                                <td>${tx.balance_after}</td>
                                <td>${tx.description || '-'}</td>
                            </tr>
                        `).join('') :
                        '<tr><td colspan="5" class="text-center text-muted">暂无交易记录</td></tr>'
                    }
                </tbody>
            </table>
        </div>
    `;
}

// 调整用户积分
function adjustUserCredits(installationId) {
    document.getElementById('targetUserId').value = installationId;
    document.getElementById('creditChange').value = '';
    document.getElementById('adjustReason').value = '';
    new bootstrap.Modal(document.getElementById('adjustCreditsModal')).show();
}


// 导出用户数据
function exportUsers() {
    const searchParams = new URLSearchParams();
    const installationId = document.getElementById('searchInstallationId').value;
    const searchEmail = document.getElementById('searchEmail').value;
    const emailStatus = document.getElementById('emailStatus').value;
    const minCredits = document.getElementById('minCredits').value;
    const dateRange = document.getElementById('dateRange').value;

    if (installationId) searchParams.append('installation_id', installationId);
    if (searchEmail) searchParams.append('email', searchEmail);
    if (emailStatus) searchParams.append('email_status', emailStatus);
    if (minCredits) searchParams.append('min_credits', minCredits);
    if (dateRange) searchParams.append('date_range', dateRange);

    window.open(`/api/v1/admin/users/export?${searchParams}`, '_blank');
}

// 工具函数
function resetSearch() {
    document.getElementById('searchInstallationId').value = '';
    document.getElementById('searchEmail').value = '';
    document.getElementById('emailStatus').value = '';
    document.getElementById('minCredits').value = '';
    document.getElementById('dateRange').value = '';
    loadUsers(1);
}

function getEmailStatusBadge(email, emailVerified) {
    if (!email) {
        return '<span class="badge bg-secondary">无邮箱</span>';
    }

    if (emailVerified) {
        return `<span class="badge bg-success" title="${email}">已验证</span>`;
    } else {
        return `<span class="badge bg-warning" title="${email}">未验证</span>`;
    }
}

function sendVerificationToUser(installationId, currentEmail) {
    document.getElementById('targetUserIdForEmail').value = installationId;
    document.getElementById('verificationEmail').value = currentEmail;
    new bootstrap.Modal(document.getElementById('sendVerificationModal')).show();
}

// 删除用户
function deleteUser(installationId) {
    // 显示确认对话框
    const userIdShort = installationId.substring(0, 8) + '...';
    if (!confirm(`确定要删除用户 ${userIdShort} 吗？\n\n此操作将永久删除用户的所有数据，包括：\n- 用户基本信息\n- 积分余额和交易记录\n- 所有相关数据\n\n此操作不可撤销！`)) {
        return;
    }

    // 发送删除请求
    fetch(`/api/v1/admin/users/${installationId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            // 处理HTTP错误状态码
            return response.json().then(data => {
                throw new Error(data.detail || `HTTP ${response.status}: ${response.statusText}`);
            }).catch(jsonError => {
                // 如果响应不是JSON格式
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showSuccess(data.message);
            // 刷新用户列表
            loadUsers(currentPage);
        } else {
            showError('删除用户失败: ' + (data.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('Delete user error:', error);
        showError('删除用户失败: ' + error.message);
    });
}


function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('zh-CN');
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showSuccess('已复制到剪贴板');
    });
}

function getTransactionTypeColor(type) {
    const colors = {
        'earn': 'success',
        'consume': 'danger',
        'refund': 'warning',
        'admin_adjust': 'info'
    };
    return colors[type] || 'secondary';
}

function getTransactionTypeName(type) {
    const names = {
        'earn': '获得',
        'consume': '消费',
        'refund': '退款',
        'admin_adjust': '管理员调整'
    };
    return names[type] || type;
}

function showSuccess(message) {
    // TODO: 实现成功提示
    alert('成功: ' + message);
}

function showError(message) {
    // TODO: 实现错误提示
    alert('错误: ' + message);
