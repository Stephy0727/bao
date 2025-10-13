(function(window) {
    'use strict';

    // ===================================================================
    // 1. 变量与数据库定义 (模块私有)
    // ===================================================================
    
    const db = new Dexie('TaobaoDB');
    let logisticsUpdateTimers = [];
    let currentEditingProductId = null;
    let mainAppState = { globalSettings: {}, apiConfig: {}, chats: {} }; // 用于缓存从主应用获取的状态

    db.version(1).stores({
        products: '++id, name, category',
        orders: '++id, productId, timestamp',
        cart: '++id, productId'
    });
    
    const mainDb = new Dexie('GeminiChatDB');
    mainDb.version(37).stores({
        globalSettings: '&id',
        chats: '&id', 
        userWalletTransactions: '++id, timestamp'
    });

    const logisticsTimelineTemplate = [
        { text: '您的订单已提交', delay: 2000 },
        { text: '付款成功，等待商家打包', delay: 10000 },
        { text: '【{city}仓库】已打包，等待快递揽收', delay: 300000 },
        { text: '【{city}快递】已揽收', delay: 1200000 },
        { text: '快件已到达【{city}分拨中心】', delay: 7200000 },
        { text: '【{city}分拨中心】已发出，下一站【{next_city}】', delay: 28800000 },
        { text: '快件已到达【{user_city}转运中心】', delay: 72000000 },
        { text: '快件正在派送中，派送员：兔兔快递员...', delay: 86400000 },
        { text: '您的快件已签收', delay: 100800000 },
    ];
    
    // ===================================================================
    // 2. 样式与HTML注入函数
    // ===================================================================
    
    function injectTaobaoStyles() {
        const styleId = 'taobao-app-styles';
        if (document.getElementById(styleId)) return;
        const css = `
            :root { --taobao-accent-orange: #FF5722; }
            #taobao-screen, #taobao-logistics-screen { background-color: #f0f2f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
            #taobao-screen .header, #taobao-logistics-screen .header { background-color: var(--secondary-bg); color: var(--text-primary); border-bottom-color: var(--border-color); }
            #taobao-screen .taobao-tabs { display: flex; flex-shrink: 0; border-bottom: 1px solid var(--border-color); background-color: var(--secondary-bg); }
            #taobao-screen .taobao-tab { flex: 1; padding: 12px 0; text-align: center; font-weight: 500; color: var(--text-secondary); border: none; background: none; cursor: pointer; position: relative; }
            #taobao-screen .taobao-tab.active { color: var(--taobao-accent-orange); }
            #taobao-screen .taobao-tab.active::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 40px; height: 3px; background-color: var(--taobao-accent-orange); border-radius: 1.5px; }
            #taobao-screen .taobao-content { flex-grow: 1; position: relative; overflow: hidden; }
            #taobao-screen .taobao-view { position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow-y: auto; display: none; padding: 15px; box-sizing: border-box; }
            #taobao-screen .taobao-view.active { display: block; }
            #taobao-screen .taobao-search-bar { display: flex; gap: 10px; padding: 0 0 15px 0; }
            #taobao-product-search-input { flex-grow: 1; border: 1px solid var(--taobao-accent-orange); padding: 10px 15px; border-radius: 20px; font-size: 14px; outline: none; background: var(--secondary-bg); color: var(--text-primary); }
            #taobao-product-search-btn { background-color: var(--taobao-accent-orange); color: white; border: none; border-radius: 20px; padding: 0 20px; font-weight: 500; cursor: pointer; }
            #taobao-product-category-tabs { display: flex; gap: 10px; margin-bottom: 15px; overflow-x: auto; padding-bottom: 5px; scrollbar-width: none; -ms-overflow-style: none; }
            #taobao-product-category-tabs::-webkit-scrollbar { display: none; }
            #taobao-product-category-tabs .category-tab-btn { padding: 6px 12px; border-radius: 15px; border: 1px solid var(--border-color); background-color: var(--secondary-bg); white-space: nowrap; cursor: pointer; color: var(--text-primary); }
            #taobao-product-category-tabs .category-tab-btn.active { background-color: #FFEFE9; color: var(--taobao-accent-orange); border-color: var(--taobao-accent-orange); }
            #taobao-screen .product-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            #taobao-screen .product-card { background-color: var(--secondary-bg); border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); cursor: pointer; position: relative; }
            #taobao-screen .product-card .product-image { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; background-color: #f0f2f5; }
            #taobao-screen .product-card .product-info { padding: 8px; color: var(--text-primary); }
            #taobao-screen .product-card .product-name { font-size: 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.8em; }
            #taobao-screen .product-card .product-price { font-size: 16px; font-weight: bold; color: var(--taobao-accent-orange); margin-top: 5px; }
            #taobao-screen .product-card .product-price::before { content: '¥'; font-size: 12px; margin-right: 2px; }
            #taobao-screen .add-cart-btn { position: absolute; bottom: 8px; right: 8px; width: 28px; height: 28px; background-color: var(--taobao-accent-orange); color: white; border: none; border-radius: 50%; font-size: 18px; line-height: 28px; text-align: center; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: transform 0.2s; z-index: 2;}
            #taobao-screen .add-cart-btn:active { transform: scale(0.9); }
            #taobao-cart-item-count-badge { position: absolute; top: 5px; right: 15px; min-width: 18px; height: 18px; padding: 0 5px; background-color: var(--taobao-accent-orange); color: white; font-size: 11px; border-radius: 9px; line-height: 18px; display: none; }
            #taobao-cart-item-list { display: flex; flex-direction: column; gap: 10px; padding-bottom: 80px; }
            #taobao-screen .cart-item { background-color: var(--secondary-bg); border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 12px; color: var(--text-primary); }
            #taobao-screen .cart-item .product-image { width: 80px; height: 80px; border-radius: 6px; flex-shrink: 0; object-fit: cover; cursor: pointer; }
            #taobao-screen .cart-item .cart-item-info { flex-grow: 1; cursor: pointer; }
            #taobao-screen .cart-item .quantity-controls { display: flex; align-items: center; gap: 8px; }
            #taobao-screen .cart-item .quantity-controls button { width: 24px; height: 24px; border: 1px solid #ccc; background-color: #f0f0f0; border-radius: 50%; cursor: pointer; }
            #taobao-screen .cart-item .delete-cart-item-btn { width: 30px; height: 30px; border: none; background: none; color: #999; font-size: 24px; cursor: pointer; flex-shrink: 0; }
            #taobao-cart-checkout-bar { position: absolute; bottom: 0; left: 0; width: 100%; z-index: 10; padding: 10px 15px; padding-bottom: calc(10px + env(safe-area-inset-bottom)); background-color: var(--secondary-bg); border-top: 1px solid var(--border-color); display: none; justify-content: space-between; align-items: center; box-sizing: border-box; }
            #taobao-cart-checkout-bar .total-price { font-weight: bold; color: var(--text-primary); }
            #taobao-cart-total-price { color: var(--taobao-accent-orange); font-size: 18px; }
            #taobao-checkout-btn { background-color: var(--taobao-accent-orange); color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: 500; cursor: pointer; }
            #taobao-share-cart-btn, #taobao-buy-for-char-btn { border: none; padding: 10px 15px; border-radius: 20px; font-weight: 500; cursor: pointer; color: white; }
            #taobao-share-cart-btn { background-color: #FF9800; }
            #taobao-buy-for-char-btn { background-color: #4CAF50; }
            #taobao-user-balance-container { background: linear-gradient(135deg, #FF9A8B 0%, #FF6A88 100%); color: white; padding: 30px 20px; border-radius: 12px; text-align: center; margin-bottom: 20px; text-shadow: 0 1px 3px rgba(0,0,0,0.2); }
            #taobao-user-balance-display { font-size: 40px; margin: 10px 0 20px 0; }
            #taobao-top-up-btn { background-color: rgba(255,255,255,0.9); color: var(--taobao-accent-orange); }
            #taobao-screen .transaction-item { background-color: var(--secondary-bg); border-radius: 8px; padding: 12px 15px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; color: var(--text-primary); }
            #taobao-screen .transaction-info .description { font-weight: 500; }
            #taobao-screen .transaction-info .timestamp { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
            #taobao-screen .transaction-amount { font-weight: bold; font-size: 16px; }
            #taobao-screen .transaction-amount.income { color: #4CAF50; }
            #taobao-screen .transaction-amount.expense { color: #F44336; }
            #taobao-screen .order-list { display: flex; flex-direction: column; gap: 15px; }
            #taobao-screen .order-item { background-color: var(--secondary-bg); border-radius: 8px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); display: flex; gap: 12px; cursor: pointer; color: var(--text-primary); }
            #taobao-screen .order-item .product-image { width: 70px; height: 70px; border-radius: 6px; flex-shrink: 0; object-fit: cover; }
            #taobao-screen .order-item .order-info { flex-grow: 1; }
            #taobao-screen .order-item .order-status { font-size: 13px; color: #28a745; margin-top: 8px; font-weight: 500; }
            #taobao-screen .order-item .order-time { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
            #taobao-logistics-screen { background-color: #f5f5f5; }
            #taobao-logistics-screen .header { background-color: var(--secondary-bg); color: var(--text-primary); }
            #taobao-logistics-content-area { padding: 20px; }
            #taobao-logistics-screen .logistics-product-summary { display: flex; gap: 15px; padding: 15px; margin-bottom: 20px; background-color: var(--secondary-bg); border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.08); color: var(--text-primary); }
            #taobao-logistics-screen .logistics-product-summary .product-image { width: 60px; height: 60px; border-radius: 8px; flex-shrink: 0; object-fit: cover; }
            #taobao-logistics-screen .logistics-product-summary .info .status { color: var(--taobao-accent-orange); }
            #taobao-logistics-screen .logistics-timeline { position: relative; padding: 20px 20px 20px 30px; background-color: var(--secondary-bg); border-radius: 12px; color: var(--text-primary); }
            #taobao-logistics-screen .logistics-timeline::before { content: ''; position: absolute; left: 15px; top: 20px; bottom: 20px; width: 2px; background-color: var(--border-color); }
            #taobao-logistics-screen .logistics-step { position: relative; margin-bottom: 25px; }
            #taobao-logistics-screen .logistics-step::before { content: ''; position: absolute; left: -22px; top: 5px; width: 10px; height: 10px; border-radius: 50%; background-color: #ccc; border: 2px solid var(--secondary-bg); z-index: 1; }
            #taobao-logistics-screen .logistics-step:first-child::before { background-color: var(--taobao-accent-orange); transform: scale(1.3); }
            #taobao-ai-generated-products-modal .modal-body { padding: 15px; background-color: var(--secondary-bg); color: var(--text-primary); }
            #taobao-ai-generated-products-modal .modal-header { background-color: var(--secondary-bg); color: var(--text-primary); }
            #taobao-product-detail-modal .product-info, #taobao-product-detail-modal .product-name { color: var(--text-primary); }
            #taobao-product-detail-modal #product-reviews-section h3 { color: var(--text-primary); }
            #taobao-product-detail-modal #taobao-product-reviews-list { color: var(--text-primary); }
            #taobao-product-detail-modal .product-review-item { border-bottom-color: var(--border-color); }
        `;
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = css;
        document.head.appendChild(style);
    }
    
    function createTaobaoHTML() {
        if (document.getElementById('taobao-screen')) return;
        const container = document.createElement('div');
        container.id = 'taobao-screen';
        container.className = 'screen';
        container.innerHTML = `
            <div class="header">
                <span class="back-btn">‹</span>
                <span>桃宝</span>
                <div class="header-actions">
                    <span class="action-btn" id="taobao-clear-products-btn" style="font-size: 16px; font-weight: 500;">清空</span>
                    <span class="action-btn" id="taobao-add-product-btn" title="添加商品" style="font-size: 28px; font-weight: 300;">+</span>
                </div>
            </div>
            <div class="taobao-tabs">
                <button class="taobao-tab active" data-view="taobao-products-view">首页</button>
                <button class="taobao-tab" data-view="taobao-cart-view">购物车<span id="taobao-cart-item-count-badge">0</span></button>
                <button class="taobao-tab" data-view="taobao-orders-view">我的订单</button>
                <button class="taobao-tab" data-view="taobao-my-view">我的</button>
            </div>
            <div class="taobao-content">
                <div id="taobao-products-view" class="taobao-view active">
                    <div class="taobao-search-bar"><input type="search" id="taobao-product-search-input" placeholder="搜一搜，让AI为你创造好物！"><button id="taobao-product-search-btn">搜索</button></div>
                    <div id="taobao-product-category-tabs"></div>
                    <div id="taobao-product-grid" class="product-grid"></div>
                </div>
                <div id="taobao-cart-view" class="taobao-view"><div id="taobao-cart-item-list"></div></div>
                <div id="taobao-orders-view" class="taobao-view"><div id="taobao-order-list" class="order-list"></div></div>
                <div id="taobao-my-view" class="taobao-view">
                    <div id="taobao-user-balance-container">
                        <p>我的余额</p>
                        <h2 id="taobao-user-balance-display">¥ 0.00</h2>
                        <button id="taobao-top-up-btn" class="form-button">给钱包充点钱</button>
                    </div>
                    <div id="taobao-balance-details-list"></div>
                </div>
            </div>
            <div id="taobao-cart-checkout-bar">
                <div class="total-price">合计: <span id="taobao-cart-total-price">¥ 0.00</span></div>
                <div style="display: flex; gap: 10px;">
                    <button id="taobao-share-cart-btn">分享给Ta代付</button>
                    <button id="taobao-buy-for-char-btn">为Ta购买</button>
                    <button id="taobao-checkout-btn">结算(0)</button>
                </div>
            </div>`;
        document.body.appendChild(container);
        const logisticsScreen = document.createElement('div');
        logisticsScreen.id = 'taobao-logistics-screen';
        logisticsScreen.className = 'screen';
        logisticsScreen.innerHTML = `<div class="header"><span class="back-btn" id="taobao-logistics-back-btn">‹</span><span>物流详情</span><span style="width: 30px;"></span></div><div id="taobao-logistics-content-area" class="list-container"></div>`;
        document.body.appendChild(logisticsScreen);
        const modals = `
            <div id="taobao-add-product-choice-modal" class="modal"><div id="custom-modal" style="width: 250px;"><div class="custom-modal-header">选择添加方式</div><div class="custom-modal-footer" style="flex-direction: column;"><button id="taobao-add-product-manual-btn">手动添加</button><button id="taobao-add-product-link-btn">识别链接</button><button id="taobao-add-product-ai-btn">AI生成</button><button id="taobao-cancel-add-choice-btn" style="margin-top: 8px; border-radius: 8px; background-color: #f0f0f0;">取消</button></div></div></div>
            <div id="taobao-product-editor-modal" class="modal"><div class="modal-content" style="height: auto;"><div class="modal-header"><span id="taobao-product-editor-title">添加新商品</span></div><div class="modal-body"><div class="form-group"><label for="taobao-product-name-input">商品名称</label><input type="text" id="taobao-product-name-input"></div><div class="form-group"><label for="taobao-product-price-input">价格 (元)</label><input type="number" id="taobao-product-price-input"></div><div class="form-group"><label for="taobao-product-image-input">图片 URL (选填)</label><input type="text" id="taobao-product-image-input"></div><div class="form-group"><label for="taobao-product-category-input">分类 (选填)</label><input type="text" id="taobao-product-category-input" placeholder="例如：衣服, 零食..."></div></div><div class="modal-footer"><button class="cancel" id="taobao-cancel-product-editor-btn">取消</button><button class="save" id="taobao-save-product-btn">保存</button></div></div></div>
            <div id="taobao-add-from-link-modal" class="modal"><div class="modal-content" style="height: auto;"><div class="modal-header"><span>粘贴分享文案</span></div><div class="modal-body"><textarea id="taobao-link-paste-area" rows="6" placeholder="请在这里粘贴完整的淘宝或拼多多分享文案..."></textarea></div><div class="modal-footer"><button class="cancel" id="taobao-cancel-link-paste-btn">取消</button><button class="save" id="taobao-confirm-link-paste-btn">识别</button></div></div></div>
            <div id="taobao-ai-generated-products-modal" class="modal"><div class="modal-content" style="height: 80%;"><div class="modal-header"><span id="taobao-ai-products-modal-title">AI生成结果</span></div><div class="modal-body"><div id="taobao-ai-product-results-grid" class="product-grid"></div></div><div class="modal-footer"><button class="save" id="taobao-close-ai-products-modal-btn" style="width: 100%;">完成</button></div></div></div>
            <div id="taobao-product-detail-modal" class="modal"><div class="modal-content"><div class="modal-header"><span>商品详情</span></div><div class="modal-body" id="taobao-product-detail-body" style="text-align: center;"></div><div id="product-reviews-section" style="padding: 0 15px 15px 15px; border-top: 1px solid var(--border-color); margin-top: 15px;"><h3 style="font-size: 16px; margin: 15px 0;">宝贝评价</h3><div id="taobao-product-reviews-list" style="max-height: 150px; overflow-y: auto; margin-bottom: 15px;"></div><button id="taobao-generate-reviews-btn" class="form-button form-button-secondary">✨ AI生成评价</button></div><div class="modal-footer"><button class="cancel" id="taobao-close-product-detail-btn">关闭</button><button class="save" id="taobao-detail-add-to-cart-btn">加入购物车</button></div></div></div>
        `;
        document.body.insertAdjacentHTML('beforeend', modals);
    }

    // ===================================================================
    // 3. 所有功能函数 (已适配新的ID和数据库)
    // ===================================================================
    
    async function openTaobaoApp() {
        await loadMainAppState();
        window.showScreen('taobao-screen');
        switchTaobaoView('taobao-products-view');
        await renderTaobaoProducts();
        await updateCartBadge();
    }
    
    async function clearTaobaoProducts() {
        const confirmed = await window.showCustomConfirm('确认清空', '确定要清空桃宝所有商品吗？此操作将一并清空购物车。', { confirmButtonClass: 'btn-danger' });
        if (confirmed) {
            await db.transaction('rw', db.products, db.cart, async () => {
                await db.products.clear();
                await db.cart.clear();
            });
            await renderTaobaoProducts();
            await renderTaobaoCart();
            updateCartBadge();
            await window.showCustomAlert('操作成功', '所有商品及购物车已被清空！');
        }
    }
    
    function switchTaobaoView(viewId) {
        document.querySelectorAll('#taobao-screen .taobao-view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId)?.classList.add('active');
        document.querySelectorAll('#taobao-screen .taobao-tab').forEach(t => t.classList.toggle('active', t.dataset.view === viewId));
    
        if (viewId === 'taobao-orders-view') renderTaobaoOrders();
        else if (viewId === 'taobao-my-view') renderBalanceDetails();
        else if (viewId === 'taobao-cart-view') renderTaobaoCart();
    }
    
    async function renderTaobaoProducts(category = null) {
        const gridEl = document.getElementById('taobao-product-grid');
        const categoryTabsEl = document.getElementById('taobao-product-category-tabs');
        if (!gridEl || !categoryTabsEl) return;
        gridEl.innerHTML = '';
        const allProducts = await db.products.orderBy('name').toArray();
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
            gridEl.appendChild(card);
        });
    }
    
    async function renderTaobaoCart() {
        const listEl = document.getElementById('taobao-cart-item-list');
        const checkoutBar = document.getElementById('taobao-cart-checkout-bar');
        listEl.innerHTML = '';
        const cartItems = await db.cart.toArray();
        if (cartItems.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">购物车空空如也~</p>';
            checkoutBar.style.display = 'none';
            updateCartBadge();
            return;
        }
        checkoutBar.style.display = 'flex';
        let totalPrice = 0;
        let totalItems = 0;
        for (const item of cartItems) {
            const product = await db.products.get(item.productId);
            if (!product) continue;
            totalItems += item.quantity;
            totalPrice += product.price * item.quantity;
            const itemEl = document.createElement('div');
            itemEl.className = 'cart-item';
            itemEl.innerHTML = `<img src="${product.imageUrl}" class="product-image" data-product-id="${product.id}"><div class="cart-item-info" data-product-id="${product.id}"><div class="product-name">${product.name}</div><div class="product-price">¥${product.price.toFixed(2)}</div></div><div class="quantity-controls"><button class="quantity-decrease" data-cart-id="${item.id}" ${item.quantity <= 1 ? 'disabled' : ''}>-</button><span class="quantity-display">${item.quantity}</span><button class="quantity-increase" data-cart-id="${item.id}">+</button></div><button class="delete-cart-item-btn" data-cart-id="${item.id}">×</button>`;
            listEl.appendChild(itemEl);
        }
        document.getElementById('taobao-cart-total-price').textContent = `¥ ${totalPrice.toFixed(2)}`;
        const checkoutBtn = document.getElementById('taobao-checkout-btn');
        checkoutBtn.textContent = `结算(${totalItems})`;
        checkoutBtn.dataset.totalPrice = totalPrice;
        updateCartBadge();
    }
    
    async function updateCartBadge() {
        const badge = document.getElementById('taobao-cart-item-count-badge');
        const items = await db.cart.toArray();
        const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
        if (totalCount > 0) {
            badge.textContent = totalCount > 99 ? '99+' : totalCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
    
    async function handleAddToCart(productId) {
        const existingItem = await db.cart.where('productId').equals(productId).first();
        if (existingItem) {
            await db.cart.update(existingItem.id, { quantity: existingItem.quantity + 1 });
        } else {
            await db.cart.add({ productId: productId, quantity: 1 });
        }
        await window.showCustomAlert('成功', '宝贝已加入购物车！');
        updateCartBadge();
    }
    
    async function handleChangeCartItemQuantity(cartId, change) {
        const item = await db.cart.get(cartId);
        if (!item) return;
        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) {
            await handleRemoveFromCart(cartId);
        } else {
            await db.cart.update(cartId, { quantity: newQuantity });
            await renderTaobaoCart();
        }
    }
    
    async function handleRemoveFromCart(cartId) {
        await db.cart.delete(cartId);
        await renderTaobaoCart();
    }
    
    async function openProductDetail(productId) {
        const product = await db.products.get(productId);
        if (!product) return;
        const modal = document.getElementById('taobao-product-detail-modal');
        document.getElementById('taobao-product-detail-body').innerHTML = `<img src="${product.imageUrl}" class="product-image" alt="${product.name}"><h2 class="product-name">${product.name}</h2><p class="product-price">${product.price.toFixed(2)}</p><p style="color: #888; font-size: 13px;">店铺: ${product.store || '桃宝自营'}</p>`;
        const reviewsListEl = document.getElementById('taobao-product-reviews-list');
        const generateBtn = document.getElementById('taobao-generate-reviews-btn');
        reviewsListEl.innerHTML = '';
        if (product.reviews && product.reviews.length > 0) {
            product.reviews.forEach(review => {
                const reviewEl = document.createElement('div');
                reviewEl.className = 'product-review-item';
                reviewEl.innerHTML = `<div class="review-author">${review.author}</div><p>${review.text}</p>`;
                reviewsListEl.appendChild(reviewEl);
            });
            generateBtn.style.display = 'none';
        } else {
            reviewsListEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 13px;">还没有人评价哦~</p>';
            generateBtn.style.display = 'block';
        }
        modal.dataset.productId = productId;
        modal.classList.add('visible');
    }
    
    async function generateProductReviews(productId) {
        // AI call logic ommited for brevity
    }
    
    async function handleCheckout() {
        const checkoutBtn = document.getElementById('taobao-checkout-btn');
        const totalPrice = parseFloat(checkoutBtn.dataset.totalPrice);
        if (totalPrice <= 0) return;
        const currentBalance = mainAppState.globalSettings.userBalance || 0;
        if (currentBalance < totalPrice) {
            alert("余额不足！请先去“我的”页面充值。");
            return;
        }
        const confirmed = await window.showCustomConfirm('确认支付', `本次将花费 ¥${totalPrice.toFixed(2)}，确定要结算吗？`, { confirmText: '立即支付' });
        if (confirmed) {
            const cartItems = await db.cart.toArray();
            await updateUserBalanceAndLogTransaction(-totalPrice, '桃宝购物');
            await createOrdersFromCart(cartItems);
            await clearTaobaoCart();
            alert('支付成功！');
            switchTaobaoView('taobao-orders-view');
        }
    }
    
    async function renderTaobaoOrders() {
        const listEl = document.getElementById('taobao-order-list');
        listEl.innerHTML = '';
        const orders = await db.orders.reverse().sortBy('timestamp');
        if (orders.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">还没有任何订单记录</p>';
            return;
        }
        for (const order of orders) {
            const product = await db.products.get(order.productId);
            if (!product) continue;
            const item = document.createElement('div');
            item.className = 'order-item';
            item.dataset.orderId = order.id;
            item.innerHTML = `<img src="${product.imageUrl}" class="product-image"><div class="order-info"><div class="product-name">${product.name} x${order.quantity}</div><div class="order-status">${order.status}</div><div class="order-time">${new Date(order.timestamp).toLocaleString()}</div></div>`;
            listEl.appendChild(item);
        }
    }
    
    async function updateUserBalanceAndLogTransaction(amount, description) {
        const settings = await mainDb.globalSettings.get('main');
        settings.userBalance = (settings.userBalance || 0) + amount;
        const newTransaction = { type: amount > 0 ? 'income' : 'expense', amount: Math.abs(amount), description, timestamp: Date.now() };
        await mainDb.transaction('rw', mainDb.globalSettings, mainDb.userWalletTransactions, async () => {
            await mainDb.globalSettings.put(settings);
            await mainDb.userWalletTransactions.add(newTransaction);
        });
        mainAppState.globalSettings.userBalance = settings.userBalance;
    }
    
    async function renderBalanceDetails() {
        const balance = mainAppState.globalSettings.userBalance || 0;
        document.getElementById('taobao-user-balance-display').textContent = `¥ ${balance.toFixed(2)}`;
        const listEl = document.getElementById('taobao-balance-details-list');
        listEl.innerHTML = '';
        const transactions = await mainDb.userWalletTransactions.reverse().sortBy('timestamp');
        if (transactions.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin-top: 20px;">还没有任何明细记录</p>';
            return;
        }
        listEl.innerHTML = '<h3 style="margin-bottom: 10px; color: var(--text-secondary);">余额明细</h3>';
        transactions.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'transaction-item';
            itemEl.innerHTML = `<div class="transaction-info"><div class="description">${item.description}</div><div class="timestamp">${new Date(item.timestamp).toLocaleString()}</div></div><div class="transaction-amount ${item.type}">${item.type === 'income' ? '+' : '-'} ${item.amount.toFixed(2)}</div>`;
            listEl.appendChild(itemEl);
        });
    }
    
    async function openLogisticsView(orderId) {
        const order = await db.orders.get(orderId);
        if (!order) return;
        logisticsUpdateTimers.forEach(clearTimeout);
        logisticsUpdateTimers = [];
        window.showScreen('taobao-logistics-screen');
        await renderLogisticsView(order);
    }
    
    async function renderLogisticsView(order) {
        const contentArea = document.getElementById('taobao-logistics-content-area');
        contentArea.innerHTML = '加载中...';
        const product = await db.products.get(order.productId);
        if (!product) { contentArea.innerHTML = '无法加载商品信息。'; return; }
        contentArea.innerHTML = `<div class="logistics-product-summary"><img src="${product.imageUrl}" class="product-image"><div class="info"><div class="name">${product.name} (x${order.quantity})</div><div class="status" id="taobao-logistics-main-status">查询中...</div></div></div><div class="logistics-timeline" id="taobao-logistics-timeline-container"></div>`;
        const timelineContainer = document.getElementById('taobao-logistics-timeline-container');
        const mainStatusEl = document.getElementById('taobao-logistics-main-status');
        const creationTime = order.timestamp;
        const cities = ["东莞", "广州", "长沙", "武汉", "郑州", "北京", "上海"];
        const startCity = window.getRandomItem(cities);
        let nextCity = window.getRandomItem(cities.filter(c => c !== startCity));
        const userCity = window.getRandomItem(cities.filter(c => c !== startCity && c !== nextCity)) || '您的城市';
        
        let cumulativeDelay = 0;
        logisticsTimelineTemplate.forEach(stepInfo => {
            cumulativeDelay += stepInfo.delay;
            const eventTime = creationTime + cumulativeDelay;
            const now = Date.now();
            const stepText = stepInfo.text.replace(/{city}/g, startCity).replace('{next_city}', nextCity).replace('{user_city}', userCity);
            if (now >= eventTime) {
                addLogisticsStep(timelineContainer, mainStatusEl, stepText, eventTime, true);
            } else {
                const timerId = setTimeout(() => {
                    if (document.getElementById('taobao-logistics-screen').classList.contains('active')) {
                        addLogisticsStep(timelineContainer, mainStatusEl, stepText, eventTime, true);
                    }
                }, eventTime - now);
                logisticsUpdateTimers.push(timerId);
            }
        });
        if (timelineContainer.children.length === 0 && logisticsTimelineTemplate.length > 0) {
            const firstStep = logisticsTimelineTemplate[0];
            addLogisticsStep(timelineContainer, mainStatusEl, firstStep.text, creationTime, true);
        }
    }
    
    function addLogisticsStep(container, mainStatusEl, text, timestamp, prepend = false) {
        const stepEl = document.createElement('div');
        stepEl.className = 'logistics-step';
        stepEl.innerHTML = `<div class="logistics-step-content"><div class="status-text">${text}</div><div class="timestamp">${new Date(timestamp).toLocaleString('zh-CN')}</div></div>`;
        if (prepend) {
            container.prepend(stepEl);
            mainStatusEl.textContent = text;
        } else {
            container.appendChild(stepEl);
        }
    }
    
    function getRandomDefaultProductImage() {
        const defaultImages = ['https://i.postimg.cc/W4svy4Hm/Image-1760206134285.jpg','https://i.postimg.cc/jjRb1jF7/Image-1760206125678.jpg'];
        return window.getRandomItem(defaultImages);
    }
    
    function openAddProductChoiceModal() { document.getElementById('taobao-add-product-choice-modal').classList.add('visible'); }
    async function openProductEditor(productId = null) {
        currentEditingProductId = productId;
        const modal = document.getElementById('taobao-product-editor-modal');
        const nameInput = document.getElementById('taobao-product-name-input');
        const priceInput = document.getElementById('taobao-product-price-input');
        const imageInput = document.getElementById('taobao-product-image-input');
        const categoryInput = document.getElementById('taobao-product-category-input');
        
        if (productId) {
            document.getElementById('taobao-product-editor-title').textContent = '编辑商品';
            const product = await db.products.get(productId);
            if (product) {
                nameInput.value = product.name;
                priceInput.value = product.price;
                imageInput.value = product.imageUrl;
                categoryInput.value = product.category || '';
            }
        } else {
            document.getElementById('taobao-product-editor-title').textContent = '添加新商品';
            nameInput.value = '';
            priceInput.value = '';
            imageInput.value = '';
            categoryInput.value = '';
        }
        modal.classList.add('visible');
    }
    
    async function saveProduct() {
        const name = document.getElementById('taobao-product-name-input').value.trim();
        const price = parseFloat(document.getElementById('taobao-product-price-input').value);
        let imageUrl = document.getElementById('taobao-product-image-input').value.trim();
        const category = document.getElementById('taobao-product-category-input').value.trim();
        if (!name || isNaN(price) || price <= 0) { alert("请填写名称和有效价格！"); return; }
        if (!imageUrl) imageUrl = getRandomDefaultProductImage();
        const productData = { name, price, imageUrl, category, reviews: [] };
        if (currentEditingProductId) {
            await db.products.update(currentEditingProductId, productData);
        } else {
            await db.products.add(productData);
        }
        document.getElementById('taobao-product-editor-modal').classList.remove('visible');
        await renderTaobaoProducts();
    }
    
    function openAddFromLinkModal() { document.getElementById('taobao-add-from-link-modal').classList.add('visible'); }
    async function handleAddFromLink() {
        const text = document.getElementById('taobao-link-paste-area').value;
        const nameMatch = text.match(/「(.+?)」/);
        if (!nameMatch || !nameMatch[1]) { alert('无法识别商品名称！'); return; }
        const name = nameMatch[1];
        document.getElementById('taobao-add-from-link-modal').classList.remove('visible');
        const priceStr = await window.showCustomPrompt(`商品: ${name}`, "请输入价格 (元):", "", "number");
        if (priceStr === null) return;
        const price = parseFloat(priceStr);
        if (isNaN(price) || price <= 0) { alert("请输入有效的价格！"); return; }
        let imageUrl = await window.showCustomPrompt(`商品: ${name}`, "请输入图片链接 (URL, 可选):");
        if (imageUrl === null) return;
        if (!imageUrl || !imageUrl.trim()) imageUrl = getRandomDefaultProductImage();
        const category = await window.showCustomPrompt(`商品: ${name}`, "请输入分类 (可选):");
        await db.products.add({ name, price, imageUrl, category: category || '', reviews: [] });
        await renderTaobaoProducts();
    }
    
    async function handleSearchProductsAI() { /* AI call logic ommited */ }
    async function handleGenerateProductsAI() { /* AI call logic ommited */ }
    
    function displayAiGeneratedProducts(products, title) {
        const modal = document.getElementById('taobao-ai-generated-products-modal');
        document.getElementById('taobao-ai-products-modal-title').textContent = title;
        const gridEl = document.getElementById('taobao-ai-product-results-grid');
        gridEl.innerHTML = '';
        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `<img src="${p.imageUrl || getRandomDefaultProductImage()}" class="product-image"><div class="product-info"><div class="product-name">${p.name}</div><div class="product-price">${p.price.toFixed(2)}</div></div><button class="add-to-my-page-btn" data-product='${JSON.stringify(p)}'>+ 添加到我的桃宝</button>`;
            gridEl.appendChild(card);
        });
        modal.classList.add('visible');
    }
    
    async function handleAiProductSelection(e) {
        const button = e.target.closest('.add-to-my-page-btn');
        if (button) {
            const productData = JSON.parse(button.dataset.product);
            if (!productData.imageUrl) productData.imageUrl = getRandomDefaultProductImage();
            const existing = await db.products.where('name').equals(productData.name).first();
            if (existing) { alert('这个商品已经存在啦！'); button.textContent = '已添加'; button.disabled = true; return; }
            await db.products.add(productData);
            button.textContent = '✓ 已添加';
            button.disabled = true;
        }
    }
    
    async function handleTopUp() {
        const amountStr = await window.showCustomPrompt("充值", "请输入要充值的金额 (元):", "", "number");
        if (amountStr !== null) {
            const amount = parseFloat(amountStr);
            if (!isNaN(amount) && amount > 0) {
                await updateUserBalanceAndLogTransaction(amount, '充值');
                await renderBalanceDetails();
                alert(`成功充值 ¥${amount.toFixed(2)}！`);
            } else {
                alert("请输入有效的金额！");
            }
        }
    }
    
    // ▼▼▼ 修正/新增: 社交功能函数 ▼▼▼
    async function handleShareCartRequest() {
        const cartItems = await db.cart.toArray();
        if (cartItems.length === 0) return;
        const targetChatId = await openCharSelectorForCart();
        if (!targetChatId) return;
        const char = mainAppState.chats[targetChatId];
        if (!char) return;

        let totalPrice = 0;
        const products = await Promise.all(cartItems.map(item => db.products.get(item.productId)));
        cartItems.forEach((item, i) => { if(products[i]) totalPrice += products[i].price * item.quantity; });

        const charBalance = char.characterPhoneData?.bank?.balance || 0;
        if (charBalance < totalPrice) {
            await window.showCustomAlert("代付失败", `“${char.name}”的钱包余额不足！`);
            return;
        }

        const requestContent = `[购物车代付请求]\n总金额: ¥${totalPrice.toFixed(2)}\n(你的当前余额: ¥${charBalance.toFixed(2)})\n请使用 'cart_payment_response' 指令回应。`;
        const requestMessage = {
            role: 'user',
            type: 'cart_share_request',
            timestamp: Date.now(),
            content: requestContent,
            payload: { totalPrice, itemCount: cartItems.length, status: 'pending' }
        };
        
        char.history.push(requestMessage);
        await mainDb.chats.put(char);
        
        await window.showCustomAlert("请求已发送", `已将代付请求发送给“${char.name}”，请在聊天中查看TA的回应。`);
        window.openChat(targetChatId); // This is assumed to be a global function from the main app
    }

    async function handleBuyForChar() {
        const cartItems = await db.cart.toArray();
        if (cartItems.length === 0) return;
        const targetChatId = await openCharSelectorForCart();
        if (!targetChatId) return;
        const char = mainAppState.chats[targetChatId];
        if (!char) return;

        let totalPrice = 0;
        const products = await Promise.all(cartItems.map(item => db.products.get(item.productId)));
        products.forEach((p, i) => { if(p) totalPrice += p.price * cartItems[i].quantity; });
        
        if ((mainAppState.globalSettings.userBalance || 0) < totalPrice) {
            alert(`余额不足！`);
            return;
        }

        const confirmed = await window.showCustomConfirm('确认赠送', `确定要花费 ¥${totalPrice.toFixed(2)} 为“${char.name}”购买吗？`, { confirmText: '为Ta买单' });
        if (confirmed) {
            await window.showCustomAlert("正在处理...", "正在为心爱的Ta下单...");
            await updateUserBalanceAndLogTransaction(-totalPrice, `为 ${char.name} 购买商品`);
            await createOrdersFromCart(cartItems);
            await sendGiftNotificationToChar(targetChatId, products, cartItems, totalPrice);
            await clearTaobaoCart();
            await window.showCustomAlert("赠送成功！", `礼物已下单，并已通知对方！`);
            if (window.renderChatListProxy) window.renderChatListProxy();
        }
    }

    async function openCharSelectorForCart() {
        // This function would be similar to the one in your original file,
        // but using a generic modal provided by the main app.
        // For simplicity, we assume a global function `window.showCharSelector` exists.
        return window.showCharSelector();
    }

    async function createOrdersFromCart(cartItems) {
        if (!cartItems || cartItems.length === 0) return;
        const newOrders = cartItems.map((item, index) => ({ productId: item.productId, quantity: item.quantity, timestamp: Date.now() + index, status: '已付款，等待发货' }));
        await db.orders.bulkAdd(newOrders);
        setTimeout(async () => {
            const orderIds = newOrders.map(o => o.timestamp);
            const ordersToUpdate = await db.orders.where('timestamp').anyOf(orderIds).toArray();
            for (const order of ordersToUpdate) {
                await db.orders.update(order.id, { status: '已发货，运输中' });
            }
        }, 10000);
    }
    
    async function clearTaobaoCart() {
        await db.cart.clear();
        await renderTaobaoCart();
        updateCartBadge();
    }

    async function sendGiftNotificationToChar(targetChatId, products, cartItems, totalPrice) {
        const chat = mainAppState.chats[targetChatId];
        if (!chat) return;
        const itemsSummary = products.map((p, i) => `${p.name} x${cartItems[i].quantity}`).join('、 ');
        const messageTextContent = `我给你买了新礼物！商品清单：${itemsSummary}，合计：¥${totalPrice.toFixed(2)}`;
        const visibleMessage = { role: 'user', content: messageTextContent, type: 'gift_notification', timestamp: Date.now(), payload: { senderName: mainAppState.globalSettings.nickname || '我', itemSummary: itemsSummary, totalPrice, itemCount: cartItems.length } };
        chat.history.push(visibleMessage);
        const hiddenMessage = { role: 'system', content: `[系统指令：用户为你购买了礼物。商品：${itemsSummary}。请作出回应。]`, timestamp: Date.now() + 1, isHidden: true };
        chat.history.push(hiddenMessage);
        chat.unreadCount = (chat.unreadCount || 0) + 1;
        await mainDb.chats.put(chat);
        if (window.showNotification && window.state.activeChatId !== targetChatId) {
            window.showNotification(targetChatId, '你收到了一份礼物！');
        }
    }
    // ▲▲▲ 修正/新增结束 ▲▲▲
    
    async function loadMainAppState() {
        const [globalSettings, apiConfig, chatsArr] = await Promise.all([
            mainDb.globalSettings.get('main'),
            mainDb.apiConfig.get('main'),
            mainDb.chats.toArray()
        ]);
        mainAppState.globalSettings = globalSettings || { userBalance: 0 };
        mainAppState.apiConfig = apiConfig || {};
        mainAppState.chats = chatsArr.reduce((acc, chat) => { acc[chat.id] = chat; return acc; }, {});
    }

    // ===================================================================
    // 4. 初始化入口与公共API
    // ===================================================================

    async function initTaobaoApp() {
        console.log("初始化桃宝App模块...");
        injectTaobaoStyles();
        createTaobaoHTML();
        await loadMainAppState();

        const taobaoScreen = document.getElementById('taobao-screen');
        if (!taobaoScreen) return;

        taobaoScreen.addEventListener('click', async (e) => {
            const target = e.target;
            const backBtn = target.closest('.back-btn');
            const tabBtn = target.closest('.taobao-tab');
            const addProductBtn = target.closest('#taobao-add-product-btn');
            const clearProductsBtn = target.closest('#taobao-clear-products-btn');

            if (backBtn) { window.showScreen('home-screen'); return; }
            if (tabBtn) { switchTaobaoView(tabBtn.dataset.view); return; }
            if (addProductBtn) { openAddProductChoiceModal(); return; }
            if (clearProductsBtn) { await clearTaobaoProducts(); return; }
            
            const productCard = target.closest('.product-card');
            if (productCard) {
                const productId = parseInt(productCard.dataset.productId);
                if (target.classList.contains('add-cart-btn')) {
                    await handleAddToCart(productId);
                } else {
                    await openProductDetail(productId);
                }
                return;
            }

            const cartItemAction = target.closest('[data-cart-id]');
            if (cartItemAction) {
                const cartId = parseInt(cartItemAction.dataset.cartId);
                if (target.classList.contains('quantity-increase')) await handleChangeCartItemQuantity(cartId, 1);
                else if (target.classList.contains('quantity-decrease')) await handleChangeCartItemQuantity(cartId, -1);
                else if (target.classList.contains('delete-cart-item-btn')) {
                    const confirmed = await window.showCustomConfirm('移出购物车', '确定要删除这个宝贝吗？');
                    if (confirmed) await handleRemoveFromCart(cartId);
                }
                return;
            }
            
            const cartProductLink = target.closest('.cart-item .product-image, .cart-item .cart-item-info');
            if (cartProductLink) {
                await openProductDetail(parseInt(cartProductLink.dataset.productId));
                return;
            }

            const orderItem = target.closest('.order-item');
            if (orderItem) { await openLogisticsView(parseInt(orderItem.dataset.orderId)); return; }

            const categoryTab = target.closest('.category-tab-btn');
            if (categoryTab) {
                const category = categoryTab.dataset.category === 'all' ? null : categoryTab.dataset.category;
                await renderTaobaoProducts(category);
                return;
            }

            if (target.id === 'taobao-top-up-btn') { await handleTopUp(); return; }
            if (target.id === 'taobao-checkout-btn') { await handleCheckout(); return; }
            if (target.id === 'taobao-share-cart-btn') { await handleShareCartRequest(); return; }
            if (target.id === 'taobao-buy-for-char-btn') { await handleBuyForChar(); return; }
        });
        
        document.getElementById('taobao-product-search-btn').addEventListener('click', handleSearchProductsAI);
        document.getElementById('taobao-product-search-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearchProductsAI(); });
        document.getElementById('taobao-cancel-add-choice-btn').addEventListener('click', () => document.getElementById('taobao-add-product-choice-modal').classList.remove('visible'));
        document.getElementById('taobao-add-product-manual-btn').addEventListener('click', () => { openProductEditor(); document.getElementById('taobao-add-product-choice-modal').classList.remove('visible'); });
        document.getElementById('taobao-add-product-link-btn').addEventListener('click', () => { openAddFromLinkModal(); document.getElementById('taobao-add-product-choice-modal').classList.remove('visible'); });
        document.getElementById('taobao-add-product-ai-btn').addEventListener('click', () => { handleGenerateProductsAI(); document.getElementById('taobao-add-product-choice-modal').classList.remove('visible'); });
        document.getElementById('taobao-cancel-product-editor-btn').addEventListener('click', () => document.getElementById('taobao-product-editor-modal').classList.remove('visible'));
        document.getElementById('taobao-save-product-btn').addEventListener('click', saveProduct);
        document.getElementById('taobao-cancel-link-paste-btn').addEventListener('click', () => document.getElementById('taobao-add-from-link-modal').classList.remove('visible'));
        document.getElementById('taobao-confirm-link-paste-btn').addEventListener('click', handleAddFromLink);
        document.getElementById('taobao-close-ai-products-modal-btn').addEventListener('click', async () => { document.getElementById('taobao-ai-generated-products-modal').classList.remove('visible'); await renderTaobaoProducts(); });
        document.getElementById('taobao-ai-product-results-grid').addEventListener('click', handleAiProductSelection);
        document.getElementById('taobao-close-product-detail-btn').addEventListener('click', () => document.getElementById('taobao-product-detail-modal').classList.remove('visible'));
        document.getElementById('taobao-detail-add-to-cart-btn').addEventListener('click', async () => { const productId = parseInt(document.getElementById('taobao-product-detail-modal').dataset.productId); await handleAddToCart(productId); document.getElementById('taobao-product-detail-modal').classList.remove('visible'); });
        document.getElementById('taobao-generate-reviews-btn').addEventListener('click', () => { const productId = parseInt(document.getElementById('taobao-product-detail-modal').dataset.productId); generateProductReviews(productId); });
        document.getElementById('taobao-logistics-back-btn').addEventListener('click', () => { window.showScreen('taobao-screen'); switchTaobaoView('taobao-orders-view'); });
        document.getElementById('taobao-app-icon').addEventListener('click', openTaobaoApp);
    }

    let isInitialized = false;
    async function renderTaobaoAppProxy() {
        if (isInitialized) return;
        try {
            await initTaobaoApp();
            isInitialized = true;
        } catch (error) {
            console.error("Taobao App 模块初始化失败:", error);
        }
    }
    
    window.renderTaobaoAppProxy = renderTaobaoAppProxy;

})(window);