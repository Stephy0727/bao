// ===================================================================================
//
//                        TAOBAO APP - SELF-CONTAINED MODULE (v1.1 - Fixed)
//
// ===================================================================================

// ▼▼▼ 模拟EPhone环境API，以便独立测试 ▼▼▼
let standaloneWalletBalance = 262.00; 
if (!window.EPhone) {
    console.warn("EPhone API object not found. Taobao App will run in standalone mode.");
    window.EPhone = {
        showScreen: (screenId) => {
            document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
            const screen = document.getElementById(screenId);
            if (screen) screen.style.display = 'flex';
            console.log(`Standalone Mode: Show screen ${screenId}`);
        },
        showCustomAlert: (title, message) => alert(`${title}\n${message}`),
        showCustomConfirm: (title, message) => Promise.resolve(confirm(`${title}\n${message}`)),
        showCustomPrompt: (title, message, defaultValue) => Promise.resolve(prompt(message, defaultValue)),
        api: {
            getWalletBalance: async () => {
                await new Promise(resolve => setTimeout(resolve, 50)); 
                return standaloneWalletBalance;
            },
            updateWallet: async (amount, description) => {
                console.log(`Standalone Mode: Wallet updated by ${amount}. Reason: ${description}`);
                standaloneWalletBalance += amount;
                await new Promise(resolve => setTimeout(resolve, 100));
                return Promise.resolve();
            },
            getChat: (chatId) => null,
            openCharSelector: (title) => Promise.resolve(null),
            sendMessage: (chatId, messageObject) => Promise.resolve(),
            getUserNickname: () => "我"
        }
    };
}
// ▲▲▲ 模拟API结束 ▲▲▲

(function(window) {
    'use strict';

    const logInfo = (message) => console.log(`%c🚀 [桃宝App] ${message}`, 'color: #2980b9; font-weight: bold;');
    const logSuccess = (message) => console.log(`%c✅ [桃宝App] ${message}`, 'color: #27ae60;');
    const logError = (message) => console.error(`%c❌ [桃宝App] ${message}`, 'color: #c0392b;');
    
    const TaobaoApp = {
        identity: {
            id: 'taobao',
            name: '桃宝',
            iconUrl: 'https://i.postimg.cc/L6R7x16R/IMG-7278.jpg',
            screenId: 'taobao-screen'
        },
        isInitialized: false,
        isRunningInEPhone: false,
        db: null,
        state: {
            currentEditingProductId: null,
            logisticsUpdateTimers: [],
            currentTaobaoCategory: null,
        },

        injectTaobaoStyles: function() {
            if (document.getElementById('taobao-app-styles')) return;
            const style = document.createElement('style');
            style.id = 'taobao-app-styles';
            style.textContent = `
                #taobao-screen { display: none; flex-direction: column; background-color: #f0f2f5; }
                #taobao-screen .taobao-tabs { display: flex; flex-shrink: 0; border-bottom: 1px solid var(--border-color); background-color: var(--secondary-bg); }
                #taobao-screen .taobao-tab { flex: 1; padding: 12px 0; text-align: center; font-weight: 500; color: var(--text-secondary); border: none; background: none; cursor: pointer; position: relative; }
                #taobao-screen .taobao-tab.active { color: #FF5722; }
                #taobao-screen .taobao-tab.active::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 40px; height: 3px; background-color: #FF5722; border-radius: 1.5px; }
                #taobao-screen .taobao-content { flex-grow: 1; position: relative; overflow: hidden; }
                #taobao-screen .taobao-view { position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow-y: auto; display: none; padding: 15px; box-sizing: border-box; }
                #taobao-screen .taobao-view.active { display: block; }
                #taobao-product-category-tabs { display: flex; gap: 10px; margin-bottom: 15px; overflow-x: auto; padding-bottom: 5px; scrollbar-width: none; -ms-overflow-style: none; }
                #taobao-product-category-tabs::-webkit-scrollbar { display: none; }
                #taobao-product-category-tabs .category-tab-btn { padding: 6px 12px; border-radius: 15px; border: 1px solid var(--border-color); background-color: var(--secondary-bg); white-space: nowrap; cursor: pointer; }
                #taobao-product-category-tabs .category-tab-btn.active { background-color: #FFEFE9; color: #FF5722; border-color: #FF5722; }
                .product-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .product-card { background-color: var(--secondary-bg); border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); cursor: pointer; position: relative; }
                .product-card .product-image { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; background-color: #f0f2f5; }
                .product-card .product-info { padding: 8px; }
                .product-card .product-name { font-size: 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.8em; }
                .product-card .product-price { font-size: 16px; font-weight: bold; color: #FF5722; margin-top: 5px; }
                .product-card .product-price::before { content: '¥'; font-size: 12px; margin-right: 2px; }
                #taobao-user-balance-container { background: linear-gradient(135deg, #FF9A8B 0%, #FF6A88 100%); color: white; padding: 30px 20px; border-radius: 12px; text-align: center; text-shadow: 0 1px 3px rgba(0,0,0,0.2); margin-bottom: 20px; }
                #taobao-user-balance-container h2 { font-size: 40px; margin: 10px 0 20px 0; }
                #taobao-top-up-btn { background-color: rgba(255,255,255,0.9); color: #FF5722; }
                .order-list { display: flex; flex-direction: column; gap: 15px; }
                .order-item { background-color: var(--secondary-bg); border-radius: 8px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); display: flex; gap: 12px; cursor: pointer; }
                .order-item .product-image { width: 70px; height: 70px; border-radius: 6px; flex-shrink: 0; object-fit: cover; }
                .order-item .order-info { flex-grow: 1; }
                .order-item .product-name { font-weight: 500; }
                .order-item .order-status { font-size: 13px; color: #28a745; margin-top: 8px; font-weight: 500; }
                .order-item .order-time { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
                .taobao-search-bar { display: flex; gap: 10px; padding: 0 0 15px 0; }
                #taobao-product-search-input { flex-grow: 1; border: 1px solid #FF5722; padding: 10px 15px; border-radius: 20px; font-size: 14px; outline: none; }
                #taobao-product-search-btn { background-color: #FF5722; color: white; border: none; border-radius: 20px; padding: 0 20px; font-weight: 500; cursor: pointer; }
                .taobao-tab #taobao-cart-item-count-badge { position: absolute; top: 5px; right: 15px; min-width: 18px; height: 18px; padding: 0 5px; background-color: #FF5722; color: white; font-size: 11px; border-radius: 9px; line-height: 18px; }
                .product-card .add-cart-btn { position: absolute; bottom: 5px; right: 5px; width: 28px; height: 28px; background-color: #FF5722; color: white; border: none; border-radius: 50%; font-size: 18px; line-height: 28px; text-align: center; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: transform 0.2s; }
                .product-card .add-cart-btn:active { transform: scale(0.9); }
                #taobao-cart-item-list { display: flex; flex-direction: column; gap: 10px; padding-bottom: 70px; }
                .cart-item { background-color: var(--secondary-bg); border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 12px; }
                .cart-item .product-image { width: 80px; height: 80px; border-radius: 6px; flex-shrink: 0; cursor: pointer; object-fit: cover; }
                .cart-item .cart-item-info { flex-grow: 1; cursor: pointer; }
                .cart-item .product-name { font-weight: 500; }
                .cart-item .product-price { color: #FF5722; font-weight: bold; margin-top: 8px; }
                .cart-item .quantity-controls { display: flex; align-items: center; gap: 8px; }
                .cart-item .quantity-controls button { width: 24px; height: 24px; border: 1px solid #ccc; background-color: #f0f0f0; border-radius: 50%; cursor: pointer; }
                .cart-item .delete-cart-item-btn { width: 30px; height: 30px; border: none; background: none; color: #999; font-size: 24px; cursor: pointer; flex-shrink: 0; }
                #taobao-cart-checkout-bar { position: fixed; bottom: 0; left: 0; right: 0; width: 100%; max-width: var(--screen-width); margin: 0 auto; z-index: 10; padding: 10px 15px; padding-bottom: calc(10px + env(safe-area-inset-bottom)); background-color: var(--secondary-bg); border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; }
                #taobao-cart-checkout-bar .total-price { font-weight: bold; }
                #taobao-cart-checkout-bar #taobao-cart-total-price { color: #FF5722; font-size: 18px; }
                #taobao-cart-checkout-bar button { color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: 500; cursor: pointer; }
                #taobao-checkout-btn { background-color: #FF5722; }
                #taobao-share-cart-to-char-btn { background-color: #FF9800; }
                #taobao-buy-for-char-btn { background-color: #4CAF50; }
                #taobao-product-detail-body { text-align: center; }
                #taobao-product-detail-body .product-image { width: 80%; max-width: 250px; border-radius: 8px; margin-bottom: 15px; }
                #taobao-product-detail-body .product-name { font-size: 18px; font-weight: 600; margin-bottom: 10px; }
                #taobao-product-detail-body .product-price { font-size: 24px; font-weight: bold; color: #FF5722; margin-bottom: 20px; }
                #taobao-product-detail-body .product-price::before { content: '¥'; font-size: 16px; }
                #taobao-product-reviews-section { padding: 0 15px 15px; border-top: 1px solid var(--border-color); margin-top: 15px; }
                #taobao-product-reviews-section h3 { font-size: 16px; margin: 15px 0; }
                #taobao-product-reviews-list { display: flex; flex-direction: column; gap: 15px; max-height: 150px; overflow-y: auto; margin-bottom: 15px; }
                .product-review-item { font-size: 14px; line-height: 1.6; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px; }
                .product-review-item .review-author { font-weight: 500; color: var(--text-secondary); margin-bottom: 5px; }
                #taobao-generate-reviews-btn { width: 100%; margin-top: 10px; background-color: #fff7e6; color: #fa8c16; border: 1px solid #ffd591; }
                .transaction-item { background-color: var(--secondary-bg); border-radius: 8px; padding: 12px 15px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; }
                .transaction-info .description { font-weight: 500; }
                .transaction-info .timestamp { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
                .transaction-amount { font-weight: bold; font-size: 16px; }
                .transaction-amount.income { color: #4CAF50; }
                .transaction-amount.expense { color: #F44336; }
            `;
            document.head.appendChild(style);
        },

        createTaobaoHTML: function() {
            if (document.getElementById('taobao-screen')) return;
            const htmlWrapper = document.createElement('div');
            htmlWrapper.innerHTML = `
                <div id="taobao-screen" class="screen">
                    <div class="header">
                        <span class="back-btn" onclick="window.EPhone.showScreen('home-screen')">‹</span>
                        <span>桃宝</span>
                        <div class="header-actions">
                            <span class="action-btn" id="taobao-clear-products-btn" style="font-size: 16px; font-weight: 500;">清空</span>
                            <span class="action-btn" id="taobao-add-product-btn" title="添加商品">+</span>
                        </div>
                    </div>
                    <div class="taobao-tabs">
                        <button class="taobao-tab active" data-view="taobao-products-view">首页</button>
                        <button class="taobao-tab" data-view="taobao-cart-view">购物车<span id="taobao-cart-item-count-badge" style="display: none;">0</span></button>
                        <button class="taobao-tab" data-view="taobao-orders-view">我的订单</button>
                        <button class="taobao-tab" data-view="taobao-my-view">我的</button>
                    </div>
                    <div class="taobao-content">
                        <div id="taobao-products-view" class="taobao-view active"><div id="taobao-product-grid" class="product-grid"></div></div>
                        <div id="taobao-cart-view" class="taobao-view"><div id="taobao-cart-item-list"></div><div id="taobao-cart-checkout-bar" style="display: none;"><div class="total-price">合计: <span id="taobao-cart-total-price">¥ 0.00</span></div><div style="display: flex; gap: 10px;"><button id="taobao-share-cart-to-char-btn">分享给Ta代付</button><button id="taobao-buy-for-char-btn">为Ta购买</button><button id="taobao-checkout-btn">结算(0)</button></div></div></div>
                        <div id="taobao-orders-view" class="taobao-view"><div id="taobao-order-list" class="order-list"></div></div>
                        <div id="taobao-my-view" class="taobao-view"><div id="taobao-user-balance-container"><p>我的余额</p><h2 id="taobao-user-balance-display">¥ 0.00</h2><button id="taobao-top-up-btn" class="form-button">给钱包充点钱</button></div><div id="taobao-balance-details-list" class="order-list" style="padding: 0 15px;"></div></div>
                    </div>
                </div>
                <div id="taobao-product-detail-modal" class="modal"><div class="modal-content"><div class="modal-header"><span>商品详情</span></div><div class="modal-body" id="taobao-product-detail-body"></div><div id="taobao-product-reviews-section"><h3>宝贝评价</h3><div id="taobao-product-reviews-list"></div><button id="taobao-generate-reviews-btn" class="form-button form-button-secondary">✨ AI生成评价</button></div><div class="modal-footer"><button class="cancel" id="taobao-close-product-detail-btn">关闭</button><button class="save" id="taobao-detail-add-to-cart-btn">加入购物车</button></div></div></div>
                <div id="taobao-add-product-choice-modal" class="modal"><div id="custom-modal" style="width: 250px;"><div class="custom-modal-header">选择添加方式</div><div class="custom-modal-footer"><button id="taobao-add-product-manual-btn">手动添加</button><button id="taobao-add-product-link-btn">识别链接</button><button id="taobao-add-product-ai-btn">AI生成</button><button id="taobao-cancel-add-choice-btn" style="margin-top: 8px; border-radius: 8px; background-color: #f0f0f0;">取消</button></div></div></div>
                <div id="taobao-product-editor-modal" class="modal"><div class="modal-content" style="height: auto;"><div class="modal-header"><span id="taobao-product-editor-title">添加新商品</span></div><div class="modal-body"><div class="form-group"><label for="taobao-product-name-input">商品名称</label><input type="text" id="taobao-product-name-input"></div><div class="form-group"><label for="taobao-product-price-input">价格 (元)</label><input type="number" id="taobao-product-price-input"></div><div class="form-group"><label for="taobao-product-image-input">图片 URL</label><input type="text" id="taobao-product-image-input"></div><div class="form-group"><label for="taobao-product-category-input">分类 (选填)</label><input type="text" id="taobao-product-category-input" placeholder="例如：衣服, 零食..."></div></div><div class="modal-footer"><button class="cancel" id="taobao-cancel-product-editor-btn">取消</button><button class="save" id="taobao-save-product-btn">保存</button></div></div></div>
            `;
            while (htmlWrapper.firstChild) {
                document.body.appendChild(htmlWrapper.firstChild);
            }
        },

        initInternal: async function() {
            logInfo("开始初始化...");
            if (typeof Dexie === 'undefined') {
                logError("Dexie.js 未加载. 桃宝App无法初始化数据库。");
                return;
            }
            this.db = new Dexie('TaobaoDB');
            this.db.version(1).stores({
                taobaoProducts: '++id, name, category', 
                taobaoOrders: '++id, productId, timestamp',
                taobaoCart: '++id, productId',
                userWalletTransactions: '++id, timestamp' 
            });
            await this.db.open(); // <<< [关键修复] 打开数据库
            logSuccess("数据库已连接");

            this.injectTaobaoStyles();
            this.createTaobaoHTML();
            this.bindEvents();
            
            await this.renderBalanceDetails();
            await this.updateCartBadge();
            await this.renderTaobaoProducts();
            logSuccess("模块已完全初始化并准备就绪。");
        },
        
        integrateWithHost: function() {
            if (!this.isRunningInEPhone) return;
            const placeholder = document.getElementById('taobao-app-placeholder');
            if (placeholder) {
                placeholder.innerHTML = `<div class="icon-bg-desktop"><img src="${this.identity.iconUrl}" alt="${this.identity.name}"></div><span class="label">${this.identity.name}</span>`;
                placeholder.addEventListener('click', () => this.open());
                logSuccess("已与宿主环境集成 (图标已绑定)");
            } else {
                console.warn(`[桃宝App] 未找到宿主占位符 #taobao-app-placeholder`);
            }
        },

        bindEvents: function() {
            // 主屏幕事件委托
            document.getElementById('taobao-screen').addEventListener('click', async (e) => {
                const target = e.target;
                
                if (target.classList.contains('taobao-tab')) this.switchTaobaoView(target.dataset.view);
                if (target.id === 'taobao-add-product-btn') this.openAddProductChoiceModal();
                if (target.id === 'taobao-clear-products-btn') await this.clearTaobaoProducts();

                const productCard = target.closest('.product-card');
                if (productCard && !target.classList.contains('add-cart-btn')) {
                    const productId = parseInt(productCard.dataset.productId);
                    if (!isNaN(productId)) await this.openProductDetail(productId);
                }
                
                if (target.classList.contains('add-cart-btn')) {
                    const productId = parseInt(target.dataset.productId);
                    if (!isNaN(productId)) await this.handleAddToCart(productId);
                }

                // ... 其他事件 ...

                // ▼▼▼ 【核心修复：重构充值逻辑】 ▼▼▼
                if (target.id === 'taobao-top-up-btn') {
                    try {
                        const amountStr = await window.EPhone.showCustomPrompt('钱包充值', '请输入要充值的金额', '100');
                        if (amountStr === null) return;

                        const amount = parseFloat(amountStr);
                        if (isNaN(amount) || amount <= 0) {
                            await window.EPhone.showCustomAlert('操作无效', '请输入一个有效的正数金额。');
                            return;
                        }

                        await window.EPhone.api.updateWallet(amount, '钱包充值');
                        logInfo(`API钱包已更新: +${amount}`);

                        await this.db.userWalletTransactions.add({
                            amount: amount,
                            description: '钱包充值',
                            timestamp: Date.now()
                        });
                        logInfo(`本地交易记录已创建`);

                        await this.renderBalanceDetails();
                        logSuccess(`UI已刷新，新余额应该已显示`);
                        
                        await window.EPhone.showCustomAlert('充值成功', `你的钱包已成功充值 ¥${amount.toFixed(2)}！`);

                    } catch (error) {
                        logError(`充值过程中发生错误: ${error.message}`);
                        await window.EPhone.showCustomAlert('充值失败', `发生了一个错误: ${error.message}`);
                    }
                }
                // ▲▲▲ 【修复结束】 ▲▲▲
            });

            // 弹窗事件
            document.getElementById('taobao-add-product-manual-btn').addEventListener('click', () => { document.getElementById('taobao-add-product-choice-modal').classList.remove('visible'); this.openProductEditor(); });
            document.getElementById('taobao-cancel-add-choice-btn').addEventListener('click', () => { document.getElementById('taobao-add-product-choice-modal').classList.remove('visible'); });
            document.getElementById('taobao-save-product-btn').addEventListener('click', this.saveProduct.bind(this));
            document.getElementById('taobao-cancel-product-editor-btn').addEventListener('click', () => { document.getElementById('taobao-product-editor-modal').classList.remove('visible'); });
            document.getElementById('taobao-close-product-detail-btn').addEventListener('click', () => { document.getElementById('taobao-product-detail-modal').classList.remove('visible'); });

            logSuccess("所有事件处理器已绑定");
        },
        
        open: async function() {
            logInfo("打开桃宝App");
            await this.renderBalanceDetails();
            await this.renderTaobaoProducts();
            await this.updateCartBadge();
            window.EPhone.showScreen(this.identity.screenId);
        },

        switchTaobaoView: async function(viewId) {
            document.querySelectorAll('#taobao-screen .taobao-view').forEach(v => v.classList.remove('active'));
            const view = document.getElementById(viewId);
            if(view) view.classList.add('active');

            document.querySelectorAll('#taobao-screen .taobao-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.view === viewId);
            });

            if (viewId === 'taobao-orders-view') await this.renderTaobaoOrders();
            else if (viewId === 'taobao-my-view') await this.renderBalanceDetails();
            else if (viewId === 'taobao-cart-view') await this.renderTaobaoCart();
        },

        renderBalanceDetails: async function() {
            logInfo("正在渲染余额详情...");
            const balanceDisplay = document.getElementById('taobao-user-balance-display');
            if (!balanceDisplay) return;
            try {
                const currentBalance = await window.EPhone.api.getWalletBalance();
                balanceDisplay.textContent = `¥ ${currentBalance.toFixed(2)}`;
                await this.renderWalletTransactions();
                logSuccess(`余额UI已更新为: ¥ ${currentBalance.toFixed(2)}`);
            } catch (error) {
                logError(`获取或渲染余额时出错: ${error.message}`);
            }
        },

        renderWalletTransactions: async function() {
            const listEl = document.getElementById('taobao-balance-details-list');
            if (!listEl) return;
            const transactions = await this.db.userWalletTransactions.orderBy('timestamp').reverse().toArray();
            listEl.innerHTML = (transactions.length === 0)
                ? '<p style="text-align:center; color: var(--text-secondary);">暂无收支明细</p>'
                : transactions.map(tx => `
                    <div class="transaction-item">
                        <div class="transaction-info">
                            <div class="description">${tx.description}</div>
                            <div class="timestamp">${new Date(tx.timestamp).toLocaleString()}</div>
                        </div>
                        <div class="transaction-amount ${tx.amount > 0 ? 'income' : 'expense'}">
                            ${tx.amount > 0 ? '+' : ''} ¥${tx.amount.toFixed(2)}
                        </div>
                    </div>`).join('');
        },
        
        renderTaobaoProducts: async function() {
            const gridEl = document.getElementById('taobao-product-grid');
            if(!gridEl) return;
            const allProducts = await this.db.taobaoProducts.toArray();
            if(allProducts.length === 0){
                gridEl.innerHTML = '<p style="text-align:center; padding: 50px 0; color: var(--text-secondary);">还没有商品哦，点击右上角+添加吧！</p>';
                return;
            }
            gridEl.innerHTML = allProducts.map(p => `
                <div class="product-card" data-product-id="${p.id}">
                    <img src="${p.imageUrl}" class="product-image" alt="${p.name}">
                    <div class="product-info">
                        <div class="product-name">${p.name}</div>
                        <div class="product-price">${p.price.toFixed(2)}</div>
                    </div>
                    <button class="add-cart-btn" data-product-id="${p.id}">+</button>
                </div>`).join('');
        },

        openAddProductChoiceModal: function() {
            document.getElementById('taobao-add-product-choice-modal').classList.add('visible');
        },
        
        openProductEditor: async function(productId = null) {
            this.state.currentEditingProductId = productId;
            const modal = document.getElementById('taobao-product-editor-modal');
            const [titleEl, nameInput, priceInput, imageInput, categoryInput] = [
                'taobao-product-editor-title', 'taobao-product-name-input', 'taobao-product-price-input', 
                'taobao-product-image-input', 'taobao-product-category-input'
            ].map(id => document.getElementById(id));

            if (productId) {
                titleEl.textContent = '编辑商品';
                const product = await this.db.taobaoProducts.get(productId);
                nameInput.value = product.name; priceInput.value = product.price; imageInput.value = product.imageUrl; categoryInput.value = product.category || '';
            } else {
                titleEl.textContent = '添加新商品';
                [nameInput, priceInput, imageInput, categoryInput].forEach(el => el.value = '');
            }
            modal.classList.add('visible');
        },

        saveProduct: async function() {
            const name = document.getElementById('taobao-product-name-input').value.trim();
            const price = parseFloat(document.getElementById('taobao-product-price-input').value);
            let imageUrl = document.getElementById('taobao-product-image-input').value.trim();
            const category = document.getElementById('taobao-product-category-input').value.trim();

            if (!name || isNaN(price)) {
                await window.EPhone.showCustomAlert('错误', '商品名称和价格不能为空！');
                return;
            }
            if (!imageUrl) imageUrl = 'https://i.postimg.cc/W4svy4Hm/Image-1760206134285.jpg';

            const productData = { name, price, imageUrl, category };
            if (this.state.currentEditingProductId) {
                await this.db.taobaoProducts.update(this.state.currentEditingProductId, productData);
            } else {
                await this.db.taobaoProducts.add(productData);
            }
            document.getElementById('taobao-product-editor-modal').classList.remove('visible');
            await this.renderTaobaoProducts();
        },

        // ▼▼▼ 【补全函数占位符 - 防止报错】 ▼▼▼
        async clearTaobaoProducts() { logInfo('Function not implemented: clearTaobaoProducts'); },
        async openProductDetail(productId) { logInfo(`Function not implemented: openProductDetail for ${productId}`); },
        async handleAddToCart(productId) { logInfo(`Function not implemented: handleAddToCart for ${productId}`); },
        async handleShareCartRequest() { logInfo('Function not implemented: handleShareCartRequest'); },
        async handleBuyForChar() { logInfo('Function not implemented: handleBuyForChar'); },
        async handleSearchProductsAI() { logInfo('Function not implemented: handleSearchProductsAI'); },
        async handleAddFromLink() { logInfo('Function not implemented: handleAddFromLink'); },
        async handleGenerateProductsAI() { logInfo('Function not implemented: handleGenerateProductsAI'); },
        async showProductActions(productId) { logInfo(`Function not implemented: showProductActions for ${productId}`); },
        async generateProductReviews(productId) { logInfo(`Function not implemented: generateProductReviews for ${productId}`); },
        async renderTaobaoCart() { logInfo('Function not implemented: renderTaobaoCart'); },
        async renderTaobaoOrders() { logInfo('Function not implemented: renderTaobaoOrders'); },
        async updateCartBadge() { logInfo('Function not implemented: updateCartBadge'); },
        async handleCheckout() { logInfo('Function not implemented: handleCheckout'); },
    };

    function addLongPressListener(element, callback) {
        let pressTimer;
        const start = (e) => { e.preventDefault(); pressTimer = setTimeout(() => callback(e), 500); };
        const cancel = () => clearTimeout(pressTimer);
        element.addEventListener("mousedown", start);
        element.addEventListener("touchstart", start, { passive: true });
        ["mouseup", "mouseleave", "touchend", "touchmove"].forEach(evt => element.addEventListener(evt, cancel));
    }

    function checkEnvironment() {
        TaobaoApp.isRunningInEPhone = typeof window.EPhone?.showScreen === 'function';
    }

    window.TaobaoAppModule = {
        init: function() {
            if (TaobaoApp.isInitialized) return;
            checkEnvironment();
            TaobaoApp.initInternal().then(() => {
                TaobaoApp.integrateWithHost();
                TaobaoApp.isInitialized = true;
            }).catch(err => {
                logError("Taobao App Module initialization failed.");
                console.error(err);
            });
        },
    };
    
    // 自动初始化逻辑
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
             if (!TaobaoApp.isRunningInEPhone) {
                 window.TaobaoAppModule.init();
             }
        });
    } else {
        if (!TaobaoApp.isRunningInEPhone) {
            window.TaobaoAppModule.init();
        }
    }

})(window);
