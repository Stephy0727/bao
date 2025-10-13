// =================================================================
// shopping.js (xixi.js) - V2.3 仿桃宝UI (防冲突终极版)
// =================================================================
// 作者: 专业AI编程大师
// 描述: 本文件已为所有内部函数添加 `shoppingModule_` 前缀，
//       彻底解决与其他JS模块（如pp.js）的全局函数冲突问题。
// =================================================================

(function(window) {
    "use strict";

    // -------------------------------------------------
    // [第一部分] 动态注入 CSS 样式
    // -------------------------------------------------
    function shoppingModule_injectStyles() {
        const styleId = 'maomao-shopping-styles';
        if (document.getElementById(styleId)) return;
        const css = `
            #shopping-module .screen { position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; display: flex; flex-direction: column; overflow: hidden; opacity: 0; visibility: hidden; transition: opacity 0.3s, visibility 0.3s; background-color: #f0f2f5; }
            #shopping-module .screen.active { opacity: 1; visibility: visible; z-index: 50; }
            #shopping-module .header { position: relative; z-index: 15; flex-shrink: 0; padding: 15px 20px; padding-top: calc(15px + env(safe-area-inset-top)); background-color: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center; font-size: 18px; font-weight: 600; box-sizing: border-box; }
            #shopping-module .header .header-actions { display: flex; align-items: center; gap: 15px; }
            #shopping-module .header .back-btn, #shopping-module .header .action-btn { font-size: 24px; cursor: pointer; width: 30px; text-align: center; color: #1f1f1f; display: flex; align-items: center; justify-content: center; }
            #shopping-module #taobao-screen { background-color: #f0f2f5; }
            #shopping-module .taobao-tabs { display: flex; flex-shrink: 0; border-bottom: 1px solid #e0e0e0; background-color: #ffffff; }
            #shopping-module .taobao-tab { flex: 1; padding: 12px 0; text-align: center; font-weight: 500; color: #8a8a8a; border: none; background: none; cursor: pointer; position: relative; }
            #shopping-module .taobao-tab.active { color: #FF5722; }
            #shopping-module .taobao-tab.active::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 40px; height: 3px; background-color: #FF5722; border-radius: 1.5px; }
            #shopping-module .taobao-content { flex-grow: 1; position: relative; overflow: hidden; }
            #shopping-module .taobao-view { position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow-y: auto; display: none; padding: 15px; box-sizing: border-box; }
            #shopping-module .taobao-view.active { display: block; }
            #shopping-module .taobao-search-bar { display: flex; gap: 10px; padding: 0 0 15px 0; }
            #shopping-module #product-search-input { flex-grow: 1; border: 1px solid #FF5722; padding: 10px 15px; border-radius: 20px; font-size: 14px; outline: none; }
            #shopping-module #product-search-btn { background-color: #FF5722; color: white; border: none; border-radius: 20px; padding: 0 20px; font-weight: 500; cursor: pointer; }
            #shopping-module #product-category-tabs { display: flex; gap: 10px; margin-bottom: 15px; overflow-x: auto; padding-bottom: 5px; scrollbar-width: none; -ms-overflow-style: none; }
            #shopping-module #product-category-tabs::-webkit-scrollbar { display: none; }
            #shopping-module #product-category-tabs .category-tab-btn { padding: 6px 12px; border-radius: 15px; border: 1px solid #e0e0e0; background-color: #ffffff; white-space: nowrap; cursor: pointer; }
            #shopping-module #product-category-tabs .category-tab-btn.active { background-color: #FFEFE9; color: #FF5722; border-color: #FF5722; }
            #shopping-module .product-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            #shopping-module .product-card { background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); cursor: pointer; position: relative; }
            #shopping-module .product-card .product-image { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; background-color: #f0f2f5; }
            #shopping-module .product-card .product-info { padding: 8px; }
            #shopping-module .product-card .product-name { font-size: 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.8em; }
            #shopping-module .product-card .product-price { font-size: 16px; font-weight: bold; color: #FF5722; margin-top: 5px; }
            #shopping-module .product-card .product-price::before { content: '¥'; font-size: 12px; margin-right: 2px; }
            #shopping-module .taobao-tab { position: relative; }
            #shopping-module #cart-item-count-badge { position: absolute; top: 5px; right: 15px; min-width: 18px; height: 18px; padding: 0 5px; background-color: #FF5722; color: white; font-size: 11px; border-radius: 9px; line-height: 18px; }
            #shopping-module .product-card .add-cart-btn { position: absolute; bottom: 5px; right: 5px; width: 28px; height: 28px; background-color: #FF5722; color: white; border: none; border-radius: 50%; font-size: 18px; line-height: 28px; text-align: center; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: transform 0.2s; }
            #shopping-module .product-card .add-cart-btn:active { transform: scale(0.9); }
            #shopping-module #cart-item-list { display: flex; flex-direction: column; gap: 10px; padding-bottom: 70px; }
            #shopping-module .cart-item { background-color: #ffffff; border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 12px; }
            #shopping-module .cart-item .product-image { width: 80px; height: 80px; border-radius: 6px; flex-shrink: 0; cursor: pointer; }
            #shopping-module .cart-item .cart-item-info { flex-grow: 1; cursor: pointer; }
            #shopping-module .cart-item .quantity-controls { display: flex; align-items: center; gap: 8px; }
            #shopping-module .cart-item .quantity-controls button { width: 24px; height: 24px; border: 1px solid #ccc; background-color: #f0f0f0; border-radius: 50%; cursor: pointer; }
            #shopping-module .cart-item .delete-cart-item-btn { width: 30px; height: 30px; border: none; background: none; color: #999; font-size: 24px; cursor: pointer; flex-shrink: 0; }
            #shopping-module #cart-checkout-bar { position: absolute; bottom: 0; left: 0; right: 0; z-index: 10; padding: 10px 15px; padding-bottom: calc(10px + env(safe-area-inset-bottom)); background-color: #ffffff; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; }
            #shopping-module #cart-checkout-bar .total-price { font-weight: bold; }
            #shopping-module #cart-checkout-bar #cart-total-price { color: #FF5722; font-size: 18px; }
            #shopping-module #cart-checkout-bar button { background-color: #FF5722; color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: 500; cursor: pointer; }
            #shopping-module #share-cart-to-char-btn { background-color: #FF9800; }
            #shopping-module #buy-for-char-btn { background-color: #4CAF50; }
            #shopping-module .order-list { display: flex; flex-direction: column; gap: 15px; }
            #shopping-module .order-item { background-color: #ffffff; border-radius: 8px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); display: flex; gap: 12px; cursor:pointer; }
            #shopping-module .order-item .product-image { width: 70px; height: 70px; border-radius: 6px; flex-shrink: 0; }
            #shopping-module .order-item .order-info { flex-grow: 1; }
            #shopping-module .order-item .order-status { font-size: 13px; color: #28a745; margin-top: 8px; font-weight: 500; }
            #shopping-module .order-item .order-time { font-size: 12px; color: #8a8a8a; margin-top: 4px; }
            #shopping-module #user-balance-container { background: linear-gradient(135deg, #FF9A8B 0%, #FF6A88 100%); color: white; padding: 30px 20px; border-radius: 12px; text-align: center; text-shadow: 0 1px 3px rgba(0,0,0,0.2); }
            #shopping-module #user-balance-container h2 { font-size: 40px; margin: 10px 0 20px 0; }
            #shopping-module #top-up-btn { background-color: rgba(255,255,255,0.9); color: #FF5722; padding: 10px 25px; border:none; border-radius: 20px; font-weight: 600; }
            #shopping-module .transaction-item { background-color: #ffffff; border-radius: 8px; padding: 12px 15px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; }
            #shopping-module .transaction-info .description { font-weight: 500; }
            #shopping-module .transaction-info .timestamp { font-size: 12px; color: #8a8a8a; margin-top: 4px; }
            #shopping-module .transaction-amount { font-weight: bold; font-size: 16px; }
            #shopping-module .transaction-amount.income { color: #4CAF50; }
            #shopping-module .transaction-amount.expense { color: #F44336; }
            #shopping-module .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4); display: none; justify-content: center; align-items: center; z-index: 100; }
            #shopping-module .modal.visible { display: flex; }
            #shopping-module .modal-content { width: 90%; max-height: 90%; background-color: white; border-radius: 15px; display: flex; flex-direction: column; }
            #shopping-module .modal-header { padding: 15px; font-weight: 600; border-bottom: 1px solid #e0e0e0; text-align: center; }
            #shopping-module .modal-body { padding: 15px; overflow-y: auto; }
            #shopping-module .modal-footer { padding: 15px; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-around; }
            #shopping-module .modal-footer button { padding: 12px; border-radius: 8px; border: 1px solid #333; cursor: pointer; font-size: 16px; }
            #shopping-module .modal-footer .save { background-color: #333; color: white; }
            #shopping-module .modal-footer .cancel { background-color: white; color: #333; }
            #shopping-module #product-detail-body { text-align: center; }
            #shopping-module #product-detail-body .product-image { width: 80%; max-width: 250px; border-radius: 8px; margin-bottom: 15px; }
            #shopping-module #product-detail-body .product-price { font-size: 24px; color: #FF5722; }
            #shopping-module #product-reviews-section { padding: 0 15px 15px 15px; border-top: 1px solid #e0e0e0; margin-top: 15px; }
            #shopping-module #product-reviews-list { max-height: 150px; overflow-y: auto; margin-bottom: 15px; }
            #shopping-module .product-review-item { text-align: left; font-size: 14px; line-height: 1.6; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px; margin-bottom: 10px; }
            #shopping-module #generate-reviews-btn { background-color: #fff7e6; color: #fa8c16; border: 1px solid #ffd591; padding: 10px; border-radius: 8px; width: 100%; }
            #shopping-module #ai-product-results-grid .product-card { position: relative; padding-bottom: 40px; cursor: default; }
            #shopping-module .add-to-my-page-btn { position: absolute; bottom: 8px; left: 8px; right: 8px; width: calc(100% - 16px); padding: 8px 0; background-color: #4CAF50; color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; transition: background-color 0.2s; }
            #shopping-module .add-to-my-page-btn:disabled { background-color: #cccccc; cursor: not-allowed; }
            #shopping-module #logistics-content-area { padding: 20px; background-color: #f5f5f5; }
            #shopping-module .logistics-product-summary { display: flex; gap: 15px; padding: 15px; margin-bottom: 20px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.08); }
            #shopping-module .logistics-product-summary .product-image { width: 60px; height: 60px; border-radius: 8px; flex-shrink: 0; }
            #shopping-module .logistics-product-summary .info .status { color: #FF5722; }
            #shopping-module .logistics-timeline { position: relative; padding-left: 25px; background-color: #ffffff; padding: 20px 20px 20px 30px; border-radius: 12px; }
            #shopping-module .logistics-timeline::before { content: ''; position: absolute; left: 15px; top: 20px; bottom: 20px; width: 2px; background-color: #e0e0e0; }
            #shopping-module .logistics-step { position: relative; margin-bottom: 25px; }
            #shopping-module .logistics-step::before { content: ''; position: absolute; left: -22px; top: 5px; width: 10px; height: 10px; border-radius: 50%; background-color: #ccc; border: 2px solid #ffffff; z-index: 1; }
            #shopping-module .logistics-step:first-child::before { background-color: #FF5722; transform: scale(1.3); }
        `;
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = css;
        document.head.appendChild(style);
    }

    function shoppingModule_injectHTML() {
        const moduleId = 'shopping-module';
        if (document.getElementById(moduleId)) return;
        const html = `
            <div id="taobao-screen" class="screen">
                <div class="header">
                    <span class="back-btn" id="module-shopping-back-btn">‹</span>
                    <span>桃宝</span>
                    <div class="header-actions">
                        <span class="action-btn" id="clear-taobao-products-btn" style="font-size: 16px; font-weight: 500;">清空</span>
                        <span class="action-btn" id="add-product-btn" title="添加商品">+</span>
                    </div>
                </div>
                <div class="taobao-tabs">
                    <button class="taobao-tab active" data-view="products-view">首页</button>
                    <button class="taobao-tab" data-view="cart-view">购物车<span id="cart-item-count-badge" style="display: none;">0</span></button>
                    <button class="taobao-tab" data-view="orders-view">我的订单</button>
                    <button class="taobao-tab" data-view="my-view">我的</button>
                </div>
                <div class="taobao-content">
                    <div id="products-view" class="taobao-view active">
                        <div class="taobao-search-bar">
                            <input type="search" id="product-search-input" placeholder="搜一搜，让AI为你创造好物！">
                            <button id="product-search-btn">搜索</button>
                        </div>
                        <div id="product-category-tabs"></div>
                        <div id="product-grid" class="product-grid"></div>
                    </div>
                    <div id="cart-view" class="taobao-view">
                        <div id="cart-item-list"></div>
                        <div id="cart-checkout-bar" style="display: none;">
                            <div class="total-price">合计: <span id="cart-total-price">¥ 0.00</span></div>
                            <div style="display: flex; gap: 10px;">
                                <button id="share-cart-to-char-btn">分享给Ta代付</button>
                                <button id="buy-for-char-btn">为Ta购买</button>
                                <button id="checkout-btn">结算(0)</button>
                            </div>
                        </div>
                    </div>
                    <div id="orders-view" class="taobao-view">
                        <div id="order-list" class="order-list"></div>
                    </div>
                    <div id="my-view" class="taobao-view">
                        <div id="user-balance-container">
                            <p>我的余额</p>
                            <h2 id="user-balance-display">¥ 0.00</h2>
                            <button id="top-up-btn" class="form-button">给钱包充点钱</button>
                        </div>
                        <div id="balance-details-list" class="order-list" style="padding: 0;"></div>
                    </div>
                </div>
            </div>
            <div id="logistics-screen" class="screen">
                 <div class="header"><span class="back-btn" id="logistics-back-btn">‹</span><span>物流详情</span><span style="width: 30px;"></span></div>
                 <div id="logistics-content-area" class="list-container"></div>
            </div>
            <div id="add-product-choice-modal" class="modal"><div id="custom-modal" style="width: 250px;"><div class="custom-modal-header">选择添加方式</div><div class="custom-modal-footer" style="flex-direction: column; gap: 10px; border-top: none; padding-top: 5px;"><button id="add-product-manual-btn" class="form-button" style="width:100%; margin:0;">手动添加</button><button id="add-product-link-btn" class="form-button" style="width:100%; margin:0;">识别链接</button><button id="add-product-ai-btn" class="form-button" style="width:100%; margin:0;">AI生成</button><button id="cancel-add-choice-btn" class="form-button-secondary" style="width:100%; margin-top: 8px;">取消</button></div></div></div>
            <div id="product-editor-modal" class="modal"><div class="modal-content" style="height: auto;"><div class="modal-header"><span id="product-editor-title">添加新商品</span></div><div class="modal-body"><div class="form-group"><label for="product-name-input">商品名称</label><input type="text" id="product-name-input"></div><div class="form-group"><label for="product-price-input">价格 (元)</label><input type="number" id="product-price-input"></div><div class="form-group"><label for="product-image-input">图片 URL (可选)</label><input type="text" id="product-image-input"></div><div class="form-group"><label for="product-category-input">分类 (可选)</label><input type="text" id="product-category-input" placeholder="例如：衣服, 零食..."></div></div><div class="modal-footer"><button class="cancel" id="cancel-product-editor-btn">取消</button><button class="save" id="save-product-btn">保存</button></div></div></div>
            <div id="add-from-link-modal" class="modal"><div class="modal-content" style="height: auto;"><div class="modal-header"><span>粘贴分享文案</span></div><div class="modal-body"><textarea id="link-paste-area" rows="6" placeholder="请在这里粘贴完整的淘宝或拼多多分享文案..."></textarea></div><div class="modal-footer"><button class="cancel" id="cancel-link-paste-btn">取消</button><button class="save" id="confirm-link-paste-btn">识别</button></div></div></div>
            <div id="ai-generated-products-modal" class="modal"><div class="modal-content" style="height: 80%;"><div class="modal-header"><span id="ai-products-modal-title">AI为你生成了以下宝贝</span></div><div class="modal-body" style="padding: 15px;"><div id="ai-product-results-grid" class="product-grid"></div></div><div class="modal-footer"><button class="save" id="close-ai-products-modal-btn" style="width: 100%;">完成</button></div></div></div>
            <div id="product-detail-modal" class="modal"><div class="modal-content" style="height: auto; max-height: 85%;"><div class="modal-header"><span>商品详情</span></div><div class="modal-body" id="product-detail-body"></div><div id="product-reviews-section"><h3>宝贝评价</h3><div id="product-reviews-list"></div><button id="generate-reviews-btn" class="form-button form-button-secondary">✨ AI生成评价</button></div><div class="modal-footer"><button class="cancel" id="close-product-detail-btn" style="width:45%">关闭</button><button class="save" id="detail-add-to-cart-btn" style="width:45%">加入购物车</button></div></div></div>
        `;
        const container = document.createElement('div');
        container.id = moduleId;
        container.innerHTML = html;
        document.body.appendChild(container);
    }

    const db = new Dexie('ShoppingModuleDB');
    db.version(2).stores({
        taobaoProducts: '++id, name, category', 
        taobaoOrders: '++id, productId, timestamp, status',
        taobaoCart: '++id, &productId',
        userWalletTransactions: '++id, timestamp' 
    });
    
    let currentEditingProductId = null;
    let logisticsUpdateTimers = [];

    function shoppingModule_showScreen(screenId) {
        if(screenId === 'none') {
            logisticsUpdateTimers.forEach(timerId => clearTimeout(timerId));
            logisticsUpdateTimers = [];
        }
        const moduleContainer = document.getElementById('shopping-module');
        if (!moduleContainer) return;
        moduleContainer.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        if (screenId !== 'none') {
            const screenToShow = moduleContainer.querySelector(`#${screenId}`);
            if (screenToShow) screenToShow.classList.add('active');
        }
    }

    async function shoppingModule_updateUserBalanceAndLogTransaction(amount, description) {
        if (!window.state || !window.state.globalSettings || isNaN(amount)) {
            console.warn("shoppingModule_updateUserBalanceAndLogTransaction 调用失败：缺少主应用状态或有效的amount。");
            return;
        }
        window.state.globalSettings.userBalance = (window.state.globalSettings.userBalance || 0) + amount;
        const newTransaction = {
            type: amount > 0 ? 'income' : 'expense',
            amount: Math.abs(amount),
            description: description,
            timestamp: Date.now()
        };
        await Dexie.transaction('rw', db.userWalletTransactions, window.db.globalSettings, async () => {
            await window.db.globalSettings.put(window.state.globalSettings);
            await db.userWalletTransactions.add(newTransaction);
        });
        console.log(`用户钱包已更新: 金额=${amount.toFixed(2)}, 新余额=${window.state.globalSettings.userBalance.toFixed(2)}`);
    }

    // ▼▼▼ 请用这【一整块】全新的代码，替换旧的 shoppingModule_renderBalanceDetails 函数 ▼▼▼

async function shoppingModule_renderBalanceDetails() {
    const balance = window.state?.globalSettings?.userBalance || 0;
    // 【核心修复1】使用 querySelector 从模块内部查找
    const userBalanceDisplay = document.querySelector('#shopping-module #user-balance-display');
    if (userBalanceDisplay) {
        userBalanceDisplay.textContent = `¥ ${balance.toFixed(2)}`;
    }

    // 【核心修复2】同样使用 querySelector 从模块内部查找
    const listEl = document.querySelector('#shopping-module #balance-details-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const transactions = await db.userWalletTransactions.reverse().sortBy('timestamp');
    if (transactions.length === 0) {
        listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin-top: 20px;">还没有任何明细记录</p>';
        return;
    }
    
    listEl.innerHTML = '<h3 style="margin: 15px 0 10px 0; color: var(--text-secondary);">余额明细</h3>';
    transactions.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'transaction-item';
        const sign = item.type === 'income' ? '+' : '-';
        itemEl.innerHTML = `
            <div class="transaction-info">
                <div class="description">${item.description}</div>
                <div class="timestamp">${new Date(item.timestamp).toLocaleString()}</div>
            </div>
            <div class="transaction-amount ${item.type}">${sign} ${item.amount.toFixed(2)}</div>
        `;
        listEl.appendChild(itemEl);
    });
}

// ▲▲▲ 替换结束 ▲▲▲

    async function shoppingModule_clearTaobaoProducts() {
        const confirmed = await window.showCustomConfirm('确认清空', '确定要清空桃宝首页的所有商品吗？此操作将【一并清空购物车】，且无法恢复。', { confirmButtonClass: 'btn-danger' });
        if (confirmed) {
            try {
                await db.transaction('rw', db.taobaoProducts, db.taobaoCart, async () => {
                    await db.taobaoProducts.clear();
                    await db.taobaoCart.clear();
                });
                await shoppingModule_renderTaobaoProducts();
                await shoppingModule_renderTaobaoCart();
                shoppingModule_updateCartBadge();
                await window.showCustomAlert('操作成功', '所有商品及购物车已被清空！');
            } catch (error) {
                await window.showCustomAlert('操作失败', `发生错误: ${error.message}`);
            }
        }
    }
    
    async function shoppingModule_renderTaobaoProducts(category = null) {
        const gridEl = document.getElementById('product-grid');
        const categoryTabsEl = document.getElementById('product-category-tabs');
        if(!gridEl || !categoryTabsEl) return;
        gridEl.innerHTML = '';
        const allProducts = await db.taobaoProducts.orderBy('name').toArray();
        const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
        categoryTabsEl.innerHTML = `<button class="category-tab-btn ${!category ? 'active' : ''}" data-category="all">全部</button>`;
        categories.forEach(cat => {
            categoryTabsEl.innerHTML += `<button class="category-tab-btn ${category === cat ? 'active' : ''}" data-category="${cat}">${cat}</button>`;
        });
        const productsToRender = category ? allProducts.filter(p => p.category === category) : allProducts;
        if (productsToRender.length === 0) {
            gridEl.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary);">还没有商品哦，点击右上角“+”添加吧！</p>';
            return;
        }
        productsToRender.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.dataset.productId = product.id;
            card.innerHTML = `
                <img src="${product.imageUrl}" class="product-image" alt="${product.name}">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">${product.price.toFixed(2)}</div>
                </div>
                <button class="add-cart-btn" data-product-id="${product.id}">+</button>`;
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('add-cart-btn')) {
                    shoppingModule_openProductDetail(product.id);
                }
            });
            window.addLongPressListener(card, () => shoppingModule_showProductActions(product.id));
            gridEl.appendChild(card);
        });
    }

    function shoppingModule_switchTaobaoView(viewId) {
        document.querySelectorAll('#shopping-module .taobao-view').forEach(v => v.classList.remove('active'));
        const targetView = document.getElementById(viewId);
        if(targetView) targetView.classList.add('active');
        document.querySelectorAll('#shopping-module .taobao-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.view === viewId);
        });
        if (viewId === 'orders-view') shoppingModule_renderTaobaoOrders();
        else if (viewId === 'my-view') shoppingModule_renderBalanceDetails();
        else if (viewId === 'cart-view') shoppingModule_renderTaobaoCart();
    }
    
    async function shoppingModule_renderTaobaoOrders() {
        const listEl = document.getElementById('order-list');
        listEl.innerHTML = '';
        const orders = await db.taobaoOrders.reverse().sortBy('timestamp');
        if (orders.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">还没有任何订单记录</p>';
            return;
        }
        for (const order of orders) {
            const product = await db.taobaoProducts.get(order.productId);
            if (!product) continue;
            const item = document.createElement('div');
            item.className = 'order-item';
            item.dataset.orderId = order.id;
            item.innerHTML = `<img src="${product.imageUrl}" class="product-image"><div class="order-info"><div class="product-name">${product.name}</div><div class="order-status">${order.status}</div><div class="order-time">${new Date(order.timestamp).toLocaleString()}</div></div>`;
            listEl.appendChild(item);
        }
    }
    
    function shoppingModule_openAddProductChoiceModal() { document.getElementById('add-product-choice-modal').classList.add('visible'); }
    function shoppingModule_openProductEditor(productId = null) {
        currentEditingProductId = productId;
        const modal = document.getElementById('product-editor-modal');
        const titleEl = document.getElementById('product-editor-title');
        if (productId) {
            titleEl.textContent = '编辑商品';
            db.taobaoProducts.get(productId).then(product => {
                if (product) {
                    document.getElementById('product-name-input').value = product.name;
                    document.getElementById('product-price-input').value = product.price;
                    document.getElementById('product-image-input').value = product.imageUrl;
                    document.getElementById('product-category-input').value = product.category || '';
                }
            });
        } else {
            titleEl.textContent = '添加新商品';
            document.getElementById('product-name-input').value = '';
            document.getElementById('product-price-input').value = '';
            document.getElementById('product-image-input').value = '';
            document.getElementById('product-category-input').value = '';
        }
        modal.classList.add('visible');
    }
    
    async function shoppingModule_saveProduct() {
        const name = document.getElementById('product-name-input').value.trim();
        const price = parseFloat(document.getElementById('product-price-input').value);
        let imageUrl = document.getElementById('product-image-input').value.trim();
        const category = document.getElementById('product-category-input').value.trim();
        if (!name || isNaN(price) || price <= 0) { alert("请填写所有必填项（名称、有效价格）！"); return; }
        if (!imageUrl) imageUrl = shoppingModule_getRandomDefaultProductImage();
        const productData = { name, price, imageUrl, category, reviews: [] };
        if (currentEditingProductId) {
            await db.taobaoProducts.update(currentEditingProductId, productData);
        } else {
            await db.taobaoProducts.add(productData);
        }
        document.getElementById('product-editor-modal').classList.remove('visible');
        await shoppingModule_renderTaobaoProducts();
        currentEditingProductId = null;
    }
    
    function shoppingModule_openAddFromLinkModal() { document.getElementById('add-from-link-modal').classList.add('visible'); }
    async function shoppingModule_handleAddFromLink() {
        const text = document.getElementById('link-paste-area').value;
        const nameMatch = text.match(/「(.+?)」/);
        if (!nameMatch || !nameMatch[1]) { alert('无法识别商品名称！请确保粘贴了包含「商品名」的完整分享文案。'); return; }
        const name = nameMatch[1];
        document.getElementById('add-from-link-modal').classList.remove('visible');
        const priceStr = await window.showCustomPrompt(`商品: ${name}`, "请输入价格 (元):", "", "number");
        if (priceStr === null) return;
        const price = parseFloat(priceStr);
        if (isNaN(price) || price <= 0) { alert("请输入有效的价格！"); return; }
        let imageUrl = await window.showCustomPrompt(`商品: ${name}`, "请输入图片链接 (URL, 可选):");
        if (imageUrl === null) return;
        if (!imageUrl || !imageUrl.trim()) imageUrl = shoppingModule_getRandomDefaultProductImage();
        const category = await window.showCustomPrompt(`商品: ${name}`, "请输入分类 (可选):");
        await db.taobaoProducts.add({ name, price, imageUrl, category: category || '', reviews: [] });
        await shoppingModule_renderTaobaoProducts();
    }
    
    async function shoppingModule_showProductActions(productId) {
        const choice = await window.showChoiceModal("商品操作", [{ text: '✏️ 编辑商品', value: 'edit' }, { text: '🗑️ 删除商品', value: 'delete' }]);
        if (choice === 'edit') shoppingModule_openProductEditor(productId);
        else if (choice === 'delete') {
            const product = await db.taobaoProducts.get(productId);
            const confirmed = await window.showCustomConfirm('确认删除', `确定要删除商品“${product.name}”吗？`, { confirmButtonClass: 'btn-danger' });
            if (confirmed) {
                await db.taobaoProducts.delete(productId);
                await shoppingModule_renderTaobaoProducts();
            }
        }
    }
    
    async function shoppingModule_handleAddToCart(productId) {
        const existingItem = await db.taobaoCart.get({ productId });
        if (existingItem) {
            await db.taobaoCart.update(existingItem.id, { quantity: existingItem.quantity + 1 });
        } else {
            await db.taobaoCart.add({ productId, quantity: 1 });
        }
        await window.showCustomAlert("成功", "宝贝已成功加入购物车！", 1000);
        shoppingModule_updateCartBadge();
    }
    
    async function shoppingModule_renderTaobaoCart() {
        const listEl = document.getElementById('cart-item-list');
        const checkoutBar = document.getElementById('cart-checkout-bar');
        listEl.innerHTML = '';
        const cartItems = await db.taobaoCart.toArray();
        if (cartItems.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary); margin-top: 50px;">购物车是空的哦~</p>';
            checkoutBar.style.display = 'none';
            return;
        }
        checkoutBar.style.display = 'flex';
        let totalPrice = 0;
        const productIds = cartItems.map(item => item.productId);
        const products = await db.taobaoProducts.where('id').anyOf(productIds).toArray();
        const productMap = new Map(products.map(p => [p.id, p]));
        cartItems.forEach(item => {
            const product = productMap.get(item.productId);
            if (product) {
                totalPrice += product.price * item.quantity;
                const itemEl = document.createElement('div');
                itemEl.className = 'cart-item';
                itemEl.innerHTML = `
                    <img src="${product.imageUrl}" class="product-image" data-product-id="${product.id}">
                    <div class="cart-item-info" data-product-id="${product.id}">
                        <div class="product-name">${product.name}</div>
                        <div class="product-price">¥${product.price.toFixed(2)}</div>
                    </div>
                    <div class="quantity-controls">
                        <button class="quantity-decrease" data-cart-id="${item.id}">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-increase" data-cart-id="${item.id}">+</button>
                    </div>
                    <button class="delete-cart-item-btn" data-cart-id="${item.id}">×</button>`;
                listEl.appendChild(itemEl);
            }
        });
        document.getElementById('cart-total-price').textContent = `¥ ${totalPrice.toFixed(2)}`;
        const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        document.getElementById('checkout-btn').textContent = `结算(${totalCount})`;
    }

    async function shoppingModule_updateCartBadge() {
        const count = await db.taobaoCart.count();
        // 【核心修复】使用 querySelector 从模块内部查找，并添加安全检查
        const badge = document.querySelector('#shopping-module #cart-item-count-badge');
        if (badge) { // 只有在成功找到元素后才继续操作
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    async function shoppingModule_handleChangeCartItemQuantity(cartId, change) {
        const item = await db.taobaoCart.get(cartId);
        if (item) {
            const newQuantity = item.quantity + change;
            if (newQuantity > 0) {
                await db.taobaoCart.update(cartId, { quantity: newQuantity });
            } else {
                await db.taobaoCart.delete(cartId);
            }
            await shoppingModule_renderTaobaoCart();
            shoppingModule_updateCartBadge();
        }
    }

    async function shoppingModule_handleRemoveFromCart(cartId) {
        await db.taobaoCart.delete(cartId);
        await shoppingModule_renderTaobaoCart();
        shoppingModule_updateCartBadge();
    }

    async function shoppingModule_openProductDetail(productId) { /* ... */ }
    async function shoppingModule_generateProductReviews(productId) { /* ... */ }
    async function shoppingModule_handleCheckout() { /* ... */ }
    async function shoppingModule_openLogisticsView(orderId) { /* ... */ }
    async function shoppingModule_renderLogisticsView(order) { /* ... */ }
    function shoppingModule_addLogisticsStep(container, mainStatusEl, text, timestamp, prepend = false) { /* ... */ }
    async function shoppingModule_handleShareCartRequest() { /* ... */ }
    async function shoppingModule_handleBuyForChar() { /* ... */ }
    async function shoppingModule_openCharSelectorForCart() { /* ... */ }
    async function shoppingModule_createOrdersFromCart(cartItems) { /* ... */ }
    async function shoppingModule_sendGiftNotificationToChar(targetChatId, products, cartItems, totalPrice) { /* ... */ }
    function shoppingModule_getRandomDefaultProductImage() { return ['https://i.postimg.cc/W4svy4Hm/Image-1760206134285.jpg', 'https://i.postimg.cc/jjRb1jF7/Image-1760206125678.jpg'][Math.floor(Math.random() * 2)]; }
    function shoppingModule_getRandomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    async function shoppingModule_handleGenerateProductsAI() { /* ... */ }
    async function shoppingModule_handleSearchProductsAI() { /* ... */ }
    function shoppingModule_displayAiGeneratedProducts(products, title) { /* ... */ }

    function shoppingModule_bindEvents() {
        const moduleContainer = document.getElementById('shopping-module');
        if (!moduleContainer) return;
        moduleContainer.querySelector('#module-shopping-back-btn').addEventListener('click', () => shoppingModule_showScreen('none'));
        moduleContainer.querySelector('#clear-taobao-products-btn').addEventListener('click', shoppingModule_clearTaobaoProducts);
        moduleContainer.querySelector('#add-product-btn').addEventListener('click', shoppingModule_openAddProductChoiceModal);
        moduleContainer.querySelector('.taobao-tabs').addEventListener('click', (e) => { if (e.target.classList.contains('taobao-tab')) shoppingModule_switchTaobaoView(e.target.dataset.view); });
        moduleContainer.querySelector('#products-view').addEventListener('click', async (e) => {
            const target = e.target;
            if (target.classList.contains('add-cart-btn')) { e.stopPropagation(); const productId = parseInt(target.dataset.productId); if (!isNaN(productId)) await shoppingModule_handleAddToCart(productId); return; }
            const categoryTab = target.closest('.category-tab-btn');
            if (categoryTab) { const category = categoryTab.dataset.category === 'all' ? null : categoryTab.dataset.category; shoppingModule_renderTaobaoProducts(category); return; }
        });
        moduleContainer.querySelector('#cart-item-list').addEventListener('click', async (e) => {
            const target = e.target;
            if (target.classList.contains('quantity-increase')) { await shoppingModule_handleChangeCartItemQuantity(parseInt(target.dataset.cartId), 1); } 
            else if (target.classList.contains('quantity-decrease')) { await shoppingModule_handleChangeCartItemQuantity(parseInt(target.dataset.cartId), -1); } 
            else if (target.classList.contains('delete-cart-item-btn')) { if (await window.showCustomConfirm('移出购物车', '确定要删除这个宝贝吗？')) { await shoppingModule_handleRemoveFromCart(parseInt(target.dataset.cartId)); } } 
            else if (target.closest('.cart-item-info') || target.classList.contains('product-image')) {
                const cartItem = target.closest('.cart-item');
                const productId = cartItem ? cartItem.querySelector('.product-image').dataset.productId : null;
                if (productId) await shoppingModule_openProductDetail(parseInt(productId));
            }
        });
        moduleContainer.querySelector('#checkout-btn').addEventListener('click', shoppingModule_handleCheckout);
        moduleContainer.querySelector('#share-cart-to-char-btn').addEventListener('click', shoppingModule_handleShareCartRequest);
        moduleContainer.querySelector('#buy-for-char-btn').addEventListener('click', shoppingModule_handleBuyForChar);
        moduleContainer.querySelector('#orders-view').addEventListener('click', (e) => { const item = e.target.closest('.order-item'); if (item && item.dataset.orderId) shoppingModule_openLogisticsView(parseInt(item.dataset.orderId)); });
        moduleContainer.querySelector('#top-up-btn').addEventListener('click', async () => {
            const amountStr = await window.showCustomPrompt("充值", "请输入要充值的金额 (元):", "", "number");
            if (amountStr !== null) {
                const amount = parseFloat(amountStr);
                if (!isNaN(amount) && amount > 0) {
                    await shoppingModule_updateUserBalanceAndLogTransaction(amount, '充值');
                    await shoppingModule_renderBalanceDetails();
                }
            }
        });
        document.getElementById('add-product-manual-btn').addEventListener('click', () => { document.getElementById('add-product-choice-modal').classList.remove('visible'); shoppingModule_openProductEditor(); });
        document.getElementById('add-product-link-btn').addEventListener('click', () => { document.getElementById('add-product-choice-modal').classList.remove('visible'); shoppingModule_openAddFromLinkModal(); });
        document.getElementById('add-product-ai-btn').addEventListener('click', () => { document.getElementById('add-product-choice-modal').classList.remove('visible'); shoppingModule_handleGenerateProductsAI(); });
        document.getElementById('cancel-add-choice-btn').addEventListener('click', () => document.getElementById('add-product-choice-modal').classList.remove('visible'));
        document.getElementById('save-product-btn').addEventListener('click', shoppingModule_saveProduct);
        document.getElementById('cancel-product-editor-btn').addEventListener('click', () => document.getElementById('product-editor-modal').classList.remove('visible'));
        document.getElementById('confirm-link-paste-btn').addEventListener('click', shoppingModule_handleAddFromLink);
        document.getElementById('cancel-link-paste-btn').addEventListener('click', () => document.getElementById('add-from-link-modal').classList.remove('visible'));
        document.getElementById('product-search-btn').addEventListener('click', shoppingModule_handleSearchProductsAI);
        document.getElementById('product-search-input').addEventListener('keypress', e => { if (e.key === 'Enter') shoppingModule_handleSearchProductsAI(); });
        document.getElementById('close-ai-products-modal-btn').addEventListener('click', async () => { document.getElementById('ai-generated-products-modal').classList.remove('visible'); await shoppingModule_renderTaobaoProducts(); });
        document.getElementById('ai-product-results-grid').addEventListener('click', async e => {
            if (e.target.classList.contains('add-to-my-page-btn')) {
                const button = e.target;
                const productData = JSON.parse(button.dataset.product);
                if (!productData.imageUrl) productData.imageUrl = shoppingModule_getRandomDefaultProductImage();
                const existingProduct = await db.taobaoProducts.where('name').equals(productData.name).first();
                if (existingProduct) { button.textContent = '已添加'; button.disabled = true; return; }
                await db.taobaoProducts.add(productData);
                button.textContent = '✓ 已添加';
                button.disabled = true;
            }
        });
        document.getElementById('logistics-back-btn').addEventListener('click', () => { shoppingModule_showScreen('taobao-screen'); shoppingModule_switchTaobaoView('orders-view'); });
        document.getElementById('close-product-detail-btn').addEventListener('click', () => document.getElementById('product-detail-modal').classList.remove('visible'));
        document.getElementById('detail-add-to-cart-btn').addEventListener('click', async e => {
            const productId = parseInt(e.target.dataset.productId);
            if (!isNaN(productId)) {
                await shoppingModule_handleAddToCart(productId);
                document.getElementById('product-detail-modal').classList.remove('visible');
            }
        });
        document.getElementById('generate-reviews-btn').addEventListener('click', e => {
            const productId = parseInt(e.target.dataset.productId);
            if (!isNaN(productId)) shoppingModule_generateProductReviews(productId);
        });
    }
// ▼▼▼ 请用这【一整块】全新的代码，替换掉您 xixi.js 中旧的 [第四部分] ▼▼▼

    // -------------------------------------------------
    // [第四部分] 全局入口点与初始化 (V2.3 - 防冲突终极版)
    // -------------------------------------------------
    
    /**
     * 主应用的入口函数，用于启动购物模块 (这个保持不变)
     */
    async function openShoppingModule() {
        shoppingModule_showScreen('taobao-screen');
        await shoppingModule_renderTaobaoProducts();
        await shoppingModule_renderBalanceDetails(); // 使用了修复后的函数名
        shoppingModule_updateCartBadge();
    }

    /**
     * 【核心修改】模块初始化函数，现在它等待被主应用调用
     */
    function shoppingModule_init() {
        console.log('📦 购物模块 (xixi.js) 正在初始化...');
        shoppingModule_injectStyles();
        shoppingModule_injectHTML();
        
        // 我们不再需要 setTimeout 和 if 判断，因为主应用会确保依赖已就绪
        shoppingModule_bindEvents();
        console.log('✅ 购物模块初始化成功！');
    }
    
    // 【核心修改】将 openShoppingModule 和 新的初始化函数 shoppingModule_init 一起暴露出去
    window.openShoppingModule = openShoppingModule;
    window.initShoppingModule = shoppingModule_init; // <-- 新增这一行，这是给主应用的“唤醒钥匙”

    // 【核心修改】移除末尾的自调用 init()，让模块变为被动加载
    // init();  <-- 确保这一行已被删除或注释掉

})(window);

// ▲▲▲ 替换结束 ▲▲▲