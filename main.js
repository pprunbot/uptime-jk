const express = require('express');
const axios = require('axios');
const cron = require('cron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
  console.log('创建 public 目录');
}

const USERNAME = process.env.USERNAME || 'admin';
const PASSWORD = process.env.PASSWORD || 'password';
const SECRET = process.env.SECRET || 'supersecretkey';

console.log(`鉴权用户: ${USERNAME}`);

const websitesList = process.env.WEBSITES_LIST 
  ? process.env.WEBSITES_LIST.split(',').filter(url => /^https?:\/\/.+$/.test(url))
  : [];

console.log(`从环境变量加载了 ${websitesList.length} 个网站`);

let cache = {};
websitesList.forEach(website => {
  cache[website] = { 
    url: website, 
    status: 'Pending', 
    lastChecked: new Date().toISOString(), 
    responseTime: -1,
    description: ''
  };
});

app.use(session({
  secret: SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const requireLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect('/login.html');
  }
};

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === USERNAME && password === PASSWORD) {
    req.session.loggedIn = true;
    req.session.username = username;
    res.redirect('/dashboard.html');
  } else {
    res.status(401).send(`
      <html>
        <head>
          <title>登录失败</title>
          <link rel="stylesheet" href="/styles.css">
        </head>
        <body>
          <div class="login-container">
            <div class="login-card">
              <h2>登录失败</h2>
              <p>用户名或密码不正确</p>
              <a href="/login.html" class="btn">返回登录</a>
            </div>
          </div>
        </body>
      </html>
    `);
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

const checkWebsite = async (url) => {
  try {
    const startTime = Date.now();
    const response = await axios.get(url, { 
      httpsAgent,
      timeout: 10000 
    });
    const responseTime = Date.now() - startTime;
    
    return {
      status: response.status,
      responseTime,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: error.response?.status || 'Error',
      responseTime: -1,
      lastChecked: new Date().toISOString()
    };
  }
};

const checkAllWebsites = async () => {
  console.log(`[${new Date().toISOString()}] 开始检查 ${websitesList.length} 个网站...`);
  
  for (const url of websitesList) {
    const result = await checkWebsite(url);
    cache[url] = { ...cache[url], ...result };
    console.log(`[${new Date().toISOString()}] ${url} → 状态: ${result.status}, 响应时间: ${result.responseTime}ms`);
  }
  
  console.log(`[${new Date().toISOString()}] 网站检查完成`);
};

checkAllWebsites();

const job = new cron.CronJob('*/10 * * * *', () => {
  console.log('执行定时网站检查...');
  checkAllWebsites();
});
job.start();

app.get('/api/status', requireLogin, (req, res) => {
  const statusData = websitesList.map(url => ({
    url,
    status: cache[url]?.status || 'Pending',
    responseTime: cache[url]?.responseTime || -1,
    lastChecked: cache[url]?.lastChecked || new Date().toISOString(),
    description: cache[url]?.description || ''
  }));
  res.json(statusData);
});

app.post('/api/update-description', requireLogin, bodyParser.json(), (req, res) => {
  const { url, description } = req.body;
  
  if (!cache[url]) {
    return res.status(404).json({ error: '网站未找到' });
  }
  
  cache[url].description = description || '';
  res.json({ success: true });
});

app.get('/dashboard.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`使用用户名: ${USERNAME} 和密码访问系统`);
});
