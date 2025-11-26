// API测试脚本
// 在浏览器控制台中运行以测试API连接

// 1. 测试登录
const testLogin = async () => {
  try {
    const response = await fetch('http://localhost:8001/api/v1/admin-api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    const data = await response.json();
    console.log('Login response:', data);

    if (data.access_token) {
      localStorage.setItem('admin_token', data.access_token);
      console.log('Token saved to localStorage');
      return data.access_token;
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
};

// 2. 测试获取用户列表
const testGetUsers = async () => {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    console.log('No token found, please login first');
    return;
  }

  try {
    const response = await fetch('http://localhost:8001/api/v1/admin/users?page=1&size=20', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include'
    });

    const data = await response.json();
    console.log('Users response:', data);
  } catch (error) {
    console.error('Get users failed:', error);
  }
};

// 运行测试
console.log('Running API tests...');
testLogin().then(() => {
  setTimeout(testGetUsers, 1000);
});