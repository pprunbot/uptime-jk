// 更新最后更新时间
function updateLastUpdated() {
    const now = new Date();
    const formattedDate = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('lastUpdated').textContent = formattedDate;
    document.getElementById('lastCheck').textContent = '刚刚';
}

// 获取状态文本
function getStatusText(status) {
    if (status === 200) return "正常运行";
    if (status >= 300 && status < 400) return "重定向";
    if (status >= 400 && status < 500) return "客户端错误";
    if (status >= 500) return "服务器错误";
    if (status === "Error") return "无法访问";
    return "检测中";
}

// 获取状态类名
function getStatusClass(status) {
    if (status === 200) return "status-up";
    if (status === "Error" || status >= 400) return "status-down";
    if (status >= 300 && status < 400) return "status-warning";
    return "status-pending";
}

// 获取状态进度条类名
function getBarClass(status) {
    if (status === 200) return "bar-up";
    if (status === "Error" || status >= 400) return "bar-down";
    if (status >= 300 && status < 400) return "bar-warning";
    return "bar-up";
}

// 生成网站卡片
function generateWebsiteCards(websites) {
    const container = document.getElementById('websitesContainer');
    
    if (!websites || websites.length === 0) {
        container.innerHTML = `
            <div class="loading-container" style="grid-column: 1 / -1;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--warning); margin-bottom: 20px;"></i>
                <p>未找到监控网站</p>
                <p style="margin-top: 10px; font-size: 1rem;">
                    请设置环境变量 WEBSITES_LIST 来添加监控网站
                </p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    websites.forEach(site => {
        const uptime = site.status === 200 ? (95 + Math.random() * 4).toFixed(1) :
                       (site.status === "Error" || site.status >= 400) ? (70 + Math.random() * 15).toFixed(1) :
                       (85 + Math.random() * 10).toFixed(1);
        
        const domain = site.url ? new URL(site.url).hostname : '未知域名';
        
        const card = document.createElement('div');
        card.className = 'website-card';
        card.dataset.url = site.url;
        
        card.innerHTML = `
            <div class="website-header">
                <div class="website-name">
                    <i class="fas fa-link"></i>
                    ${domain}
                </div>
                <div class="status-badge ${getStatusClass(site.status)}">
                    ${getStatusText(site.status)}
                </div>
            </div>
            <div class="website-body">
                <div class="website-info">
                    <div class="website-url">${site.url}</div>
                    <div class="website-status-code status-${site.status}">
                        ${site.status === "Error" ? "无法访问" : "状态码: " + site.status}
                    </div>
                </div>
                <div class="website-info">
                    <div>响应时间</div>
                    <div>${site.responseTime === -1 ? "超时" : site.responseTime + "ms"}</div>
                </div>
                <div class="progress-container">
                    <div class="progress-bar ${getBarClass(site.status)}" 
                         style="width: ${uptime}%"></div>
                </div>
                <div class="website-info">
                    <div>可用率</div>
                    <div>${uptime}%</div>
                </div>
                
                <div class="description-section">
                    <div class="description-text">${site.description || '点击编辑按钮添加描述...'}</div>
                    <button class="description-edit">
                        <i class="fas fa-edit"></i> 编辑描述
                    </button>
                </div>
            </div>
            <div class="website-footer">
                <div>最后检查: ${new Date(site.lastChecked).toLocaleString()}</div>
                <div><i class="fas fa-redo"></i> 10分钟后更新</div>
            </div>
        `;
        
        container.appendChild(card);
        
        // 添加点击跳转功能
        card.addEventListener('click', (e) => {
            // 如果点击的是编辑按钮，则不跳转
            if (e.target.closest('.description-edit')) {
                return;
            }
            window.open(site.url, '_blank');
        });
        
        const editBtn = card.querySelector('.description-edit');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡，避免触发卡片点击事件
            enterEditMode(card, site.url, site.description);
        });
    });
}

// 进入编辑模式
function enterEditMode(card, url, currentDescription) {
    const descriptionSection = card.querySelector('.description-section');
    descriptionSection.innerHTML = `
        <textarea class="description-input" placeholder="输入网站描述...">${currentDescription || ''}</textarea>
        <div class="description-actions">
            <button class="description-btn description-save">保存</button>
            <button class="description-btn description-cancel">取消</button>
        </div>
    `;
    
    const input = descriptionSection.querySelector('.description-input');
    input.focus();
    
    const saveBtn = descriptionSection.querySelector('.description-save');
    saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newDescription = input.value.trim();
        updateDescription(url, newDescription, card);
    });
    
    const cancelBtn = descriptionSection.querySelector('.description-cancel');
    cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exitEditMode(card, url, currentDescription);
    });
}

// 退出编辑模式
function exitEditMode(card, url, description) {
    const descriptionSection = card.querySelector('.description-section');
    descriptionSection.innerHTML = `
        <div class="description-text">${description || '点击编辑按钮添加描述...'}</div>
        <button class="description-edit">
            <i class="fas fa-edit"></i> 编辑描述
        </button>
    `;
    
    const editBtn = descriptionSection.querySelector('.description-edit');
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        enterEditMode(card, url, description);
    });
}

// 更新描述到服务器
async function updateDescription(url, description, card) {
    try {
        const response = await fetch('/api/update-description', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ url, description })
        });
        
        if (!response.ok) {
            throw new Error('更新描述失败');
        }
        
        const result = await response.json();
        if (result.success) {
            exitEditMode(card, url, description);
        } else {
            alert('更新描述失败，请重试');
        }
    } catch (error) {
        console.error('更新描述错误:', error);
        alert('更新描述时出错: ' + error.message);
    }
}

// 更新统计数据
function updateStats(websites) {
    if (!websites) return;
    
    document.getElementById('totalSites').textContent = websites.length;
    document.getElementById('currentSites').textContent = websites.length;
    
    const upSites = websites.filter(site => site.status === 200).length;
    const downSites = websites.filter(site => 
        site.status === "Error" || site.status >= 400
    ).length;
    
    document.getElementById('upSites').textContent = upSites;
    document.getElementById('downSites').textContent = downSites;
}

// 从API加载网站状态数据
async function loadWebsitesStatus() {
    try {
        const response = await fetch('/api/status', {
            credentials: 'include'
        });
        
        if (response.status === 401) {
            alert('会话已过期，请重新登录');
            window.location.href = '/login.html';
            return null;
        }
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        const websites = await response.json();
        return websites;
    } catch (error) {
        console.error('加载网站状态失败:', error);
        
        const container = document.getElementById('websitesContainer');
        container.innerHTML = `
            <div class="error-container">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>加载网站状态失败</h3>
                <p>${error.message}</p>
                <p>请检查服务器连接并刷新页面</p>
                <button onclick="window.location.reload()" style="
                    background: var(--primary);
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    margin-top: 20px;
                    cursor: pointer;
                ">
                    <i class="fas fa-sync-alt"></i> 刷新页面
                </button>
            </div>
        `;
        
        return null;
    }
}

// 登出功能
function logout() {
    fetch('/logout', { 
        method: 'GET',
        credentials: 'include'
    })
      .then(() => {
          window.location.href = '/login.html';
      })
      .catch(error => {
          console.error('登出失败:', error);
          alert('登出失败，请重试');
      });
}

// 初始化页面
async function initPage() {
    updateLastUpdated();
    
    // 显示加载状态
    const container = document.getElementById('websitesContainer');
    container.innerHTML = `
        <div class="loading-container">
            <div class="spinner"></div>
            <p>正在加载网站监控数据...</p>
        </div>
    `;
    
    // 加载网站数据
    const websites = await loadWebsitesStatus();
    
    if (websites) {
        generateWebsiteCards(websites);
        updateStats(websites);
        
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const filteredWebsites = websites.filter(site => 
                site.url.toLowerCase().includes(searchTerm) || 
                (site.url ? new URL(site.url).hostname.toLowerCase().includes(searchTerm) : false)
            );
            
            generateWebsiteCards(filteredWebsites);
            updateStats(filteredWebsites);
        });
    }
    
    setInterval(updateLastUpdated, 60000);
    
    setInterval(async () => {
        const newWebsites = await loadWebsitesStatus();
        if (newWebsites) {
            generateWebsiteCards(newWebsites);
            updateStats(newWebsites);
        }
    }, 60000);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initPage);