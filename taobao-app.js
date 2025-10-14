// ===================================================================================
//
//                        TAOBAO APP - SELF-CONTAINED MODULE
//
// ===================================================================================
//
//  HOW TO USE:
//  1. In your main HTML file, add a placeholder div for the icon:
//     <div id="taobao-app-placeholder" class="desktop-app-icon"></div>
//
//  2. In your main JS file's init logic, call the module's initializer:
//     if (window.TaobaoAppModule) {
//         window.TaobaoAppModule.init();
//     }
//
// ===================================================================================

// --- EPhone API STUB ---
if (!window.EPhone) {
    console.warn("EPhone API object not found. Taobao App will run in standalone mode with limited functionality.");
    let standaloneBalance = 560.00;
    window.EPhone = {
        showScreen: (screenId) => { console.log(`Standalone Mode: Show screen ${screenId}`); },
        showCustomAlert: (title, message) => alert(`${title}\n${message}`),
        showCustomConfirm: (title, message, options = {}) => Promise.resolve(confirm(`${title}\n${message}`)),
        showCustomPrompt: (title, message, defaultValue) => Promise.resolve(prompt(message, defaultValue)),
        api: {
            getWalletBalance: async () => Promise.resolve(standaloneBalance),
            updateWallet: async (amount, description, onUpdateCompleteCallback) => {
                standaloneBalance += amount;
                console.log(`Standalone Mode: Wallet updated by ${amount}. New balance: ${standaloneBalance.toFixed(2)}`);
                if (typeof onUpdateCompleteCallback === 'function') {
                    await onUpdateCompleteCallback(standaloneBalance);
                }
            },
            getChat: (chatId) => Promise.resolve({ id: chatId, name: `Mock Character ${chatId}` }),
            openCharSelector: (title) => Promise.resolve('char_123'),
            sendMessage: (chatId, messageObject) => { console.log(`Standalone Mode: Message sent to ${chatId}:`, messageObject); },
            getUserNickname: () => "我"
        }
    };
}
// -----------------------


(function(window) {
    'use strict';

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
                /* CSS content is unchanged, for brevity it is omitted here. */
                /* All your previous CSS styles go here... */
                .message-bubble.is-cart-share-request .content, .message-bubble.is-gift-notification .content{padding:0;background:0 0;box-shadow:none;border:none;backdrop-filter:none;-webkit-backdrop-filter:none}.cart-share-card{width:230px;border-radius:12px;background-color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;border:2px solid transparent;transition:all .3s ease}.cart-share-header{display:flex;align-items:center;gap:10px;padding:12px 15px;background-color:#FFF8E1;color:#FFA000}.cart-share-header .icon{font-size:24px;font-weight:700}.cart-share-header .title{font-size:16px;font-weight:600}.cart-share-body{padding:15px;text-align:center}.cart-share-body .label{font-size:13px;color:#888}.cart-share-body .amount{font-size:32px;font-weight:700;color:#FF5722;margin:5px 0 15px}.cart-share-body .status-text{font-weight:500}.cart-share-card.paid{border-color:#4CAF50}.cart-share-card.paid .status-text{color:#4CAF50}.cart-share-card.rejected{border-color:#F44336;opacity:.8}.cart-share-card.rejected .status-text{color:#F44336}.gift-card{width:230px;border-radius:12px;background-color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.gift-card-header{display:flex;align-items:center;gap:10px;padding:12px 15px;background-color:#e8f5e9;color:#2e7d32}.gift-card-header .icon{font-size:24px;font-weight:700}.gift-card-header .title{font-size:16px;font-weight:600}.gift-card-body{padding:15px}.gift-card-body .greeting{font-size:14px;margin-bottom:10px}.gift-card-items{font-size:13px;color:#555;max-height:60px;overflow:hidden;text-overflow:ellipsis;margin-bottom:10px}.gift-card-footer{padding-top:10px;border-top:1px solid #f0f0f0;text-align:right;font-weight:700}.gift-card-footer .total-price{color:#FF5722}#taobao-screen{background-color:#f0f2f5}#taobao-screen .taobao-tabs{display:flex;flex-shrink:0;border-bottom:1px solid var(--border-color);background-color:var(--secondary-bg)}#taobao-screen .taobao-tab{flex:1;padding:12px 0;text-align:center;font-weight:500;color:var(--text-secondary);border:none;background:0 0;cursor:pointer;position:relative}#taobao-screen .taobao-tab.active{color:#FF5722}#taobao-screen .taobao-tab.active::after{content:'';position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:40px;height:3px;background-color:#FF5722;border-radius:1.5px}#taobao-screen .taobao-content{flex-grow:1;position:relative;overflow:hidden}#taobao-screen .taobao-view{position:absolute;top:0;left:0;width:100%;height:100%;overflow-y:auto;display:none;padding:15px;box-sizing:border-box}#taobao-screen .taobao-view.active{display:block}#taobao-screen #taobao-product-category-tabs{display:flex;gap:10px;margin-bottom:15px;overflow-x:auto;padding-bottom:5px;scrollbar-width:none;-ms-overflow-style:none}#taobao-screen #taobao-product-category-tabs::-webkit-scrollbar{display:none}#taobao-screen #taobao-product-category-tabs .category-tab-btn{padding:6px 12px;border-radius:15px;border:1px solid var(--border-color);background-color:var(--secondary-bg);white-space:nowrap;cursor:pointer}#taobao-screen #taobao-product-category-tabs .category-tab-btn.active{background-color:#FFEFE9;color:#FF5722;border-color:#FF5722}#taobao-screen .product-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}#taobao-screen .product-card{background-color:var(--secondary-bg);border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);cursor:pointer;position:relative}#taobao-screen .product-card .product-image{width:100%;aspect-ratio:1/1;object-fit:cover;background-color:#f0f2f5}#taobao-screen .product-card .product-info{padding:8px}#taobao-screen .product-card .product-name{font-size:14px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.8em}#taobao-screen .product-card .product-price{font-size:16px;font-weight:700;color:#FF5722;margin-top:5px}#taobao-screen .product-card .product-price::before{content:'¥';font-size:12px;margin-right:2px}#taobao-screen #taobao-user-balance-container{background:linear-gradient(135deg,#FF9A8B 0%,#FF6A88 100%);color:#fff;padding:30px 20px;border-radius:12px;text-align:center;text-shadow:0 1px 3px rgba(0,0,0,.2);margin-bottom:20px}#taobao-screen #taobao-user-balance-container h2{font-size:40px;margin:10px 0 20px}#taobao-screen #taobao-top-up-btn{background-color:rgba(255,255,255,.9);color:#FF5722}#taobao-screen .order-list{display:flex;flex-direction:column;gap:15px}#taobao-screen .order-item{background-color:var(--secondary-bg);border-radius:8px;padding:12px;box-shadow:0 1px 3px rgba(0,0,0,.06);display:flex;gap:12px;cursor:pointer}#taobao-screen .order-item .product-image{width:70px;height:70px;border-radius:6px;flex-shrink:0;object-fit:cover}#taobao-screen .order-item .order-info{flex-grow:1}#taobao-screen .order-item .product-name{font-weight:500}#taobao-screen .order-item .order-status{font-size:13px;color:#28a745;margin-top:8px;font-weight:500}#taobao-screen .order-item .order-time{font-size:12px;color:var(--text-secondary);margin-top:4px}#taobao-screen .taobao-search-bar{display:flex;gap:10px;padding:0 0 15px}#taobao-screen #taobao-product-search-input{flex-grow:1;border:1px solid #FF5722;padding:10px 15px;border-radius:20px;font-size:14px;outline:0}#taobao-screen #taobao-product-search-btn{background-color:#FF5722;color:#fff;border:none;border-radius:20px;padding:0 20px;font-weight:500;cursor:pointer}#taobao-screen #taobao-ai-product-results-grid .product-card{padding-bottom:40px;cursor:default}#taobao-screen .add-to-my-page-btn{position:absolute;bottom:8px;left:8px;right:8px;width:calc(100% - 16px);padding:8px 0;background-color:#4CAF50;color:#fff;border:none;border-radius:6px;font-weight:500;cursor:pointer;transition:background-color .2s}#taobao-screen .add-to-my-page-btn:hover{background-color:#45a049}#taobao-screen .add-to-my-page-btn:disabled{background-color:#ccc;cursor:not-allowed}#taobao-screen .taobao-tab #taobao-cart-item-count-badge{position:absolute;top:5px;right:15px;min-width:18px;height:18px;padding:0 5px;background-color:#FF5722;color:#fff;font-size:11px;border-radius:9px;line-height:18px}#taobao-screen .product-card .add-cart-btn{position:absolute;bottom:5px;right:5px;width:28px;height:28px;background-color:#FF5722;color:#fff;border:none;border-radius:50%;font-size:18px;line-height:28px;text-align:center;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,.2);transition:transform .2s}#taobao-screen .product-card .add-cart-btn:active{transform:scale(.9)}#taobao-screen #taobao-cart-item-list{display:flex;flex-direction:column;gap:10px;padding-bottom:70px}#taobao-screen .cart-item{background-color:var(--secondary-bg);border-radius:8px;padding:12px;display:flex;align-items:center;gap:12px}#taobao-screen .cart-item .product-image{width:80px;height:80px;border-radius:6px;flex-shrink:0;cursor:pointer;object-fit:cover}#taobao-screen .cart-item .cart-item-info{flex-grow:1;cursor:pointer}#taobao-screen .cart-item .product-name{font-weight:500}#taobao-screen .cart-item .product-price{color:#FF5722;font-weight:700;margin-top:8px}#taobao-screen .cart-item .quantity-controls{display:flex;align-items:center;gap:8px}#taobao-screen .cart-item .quantity-controls button{width:24px;height:24px;border:1px solid #ccc;background-color:#f0f0f0;border-radius:50%;cursor:pointer}#taobao-screen .cart-item .delete-cart-item-btn{width:30px;height:30px;border:none;background:0 0;color:#999;font-size:24px;cursor:pointer;flex-shrink:0}#taobao-cart-checkout-bar{position:fixed;bottom:0;left:0;right:0;width:100%;max-width:var(--screen-width);margin:0 auto;z-index:10;padding:10px 15px;padding-bottom:calc(10px + env(safe-area-inset-bottom));background-color:var(--secondary-bg);border-top:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;box-sizing:border-box}#taobao-cart-checkout-bar .total-price{font-weight:700}#taobao-cart-checkout-bar #taobao-cart-total-price{color:#FF5722;font-size:18px}#taobao-cart-checkout-bar #taobao-checkout-btn,#taobao-cart-checkout-bar #taobao-share-cart-to-char-btn,#taobao-cart-checkout-bar #taobao-buy-for-char-btn{color:#fff;border:none;padding:10px 20px;border-radius:20px;font-weight:500;cursor:pointer}#taobao-cart-checkout-bar #taobao-checkout-btn{background-color:#FF5722}#taobao-cart-checkout-bar #taobao-share-cart-to-char-btn{background-color:#FF9800}#taobao-cart-checkout-bar #taobao-buy-for-char-btn{background-color:#4CAF50}#taobao-product-detail-body{text-align:center}#taobao-product-detail-body .product-image{width:80%;max-width:250px;border-radius:8px;margin-bottom:15px}#taobao-product-detail-body .product-name{font-size:18px;font-weight:600;margin-bottom:10px}#taobao-product-detail-body .product-price{font-size:24px;font-weight:700;color:#FF5722;margin-bottom:20px}#taobao-product-detail-body .product-price::before{content:'¥';font-size:16px}#taobao-product-reviews-section{padding:0 15px 15px;border-top:1px solid var(--border-color);margin-top:15px}#taobao-product-reviews-section h3{font-size:16px;margin:15px 0}#taobao-product-reviews-list{display:flex;flex-direction:column;gap:15px;max-height:150px;overflow-y:auto;margin-bottom:15px}#taobao-screen .product-review-item{font-size:14px;line-height:1.6;border-bottom:1px solid #f0f0f0;padding-bottom:10px}#taobao-screen .product-review-item .review-author{font-weight:500;color:var(--text-secondary);margin-bottom:5px}#taobao-screen #taobao-generate-reviews-btn{width:100%;margin-top:10px;background-color:#fff7e6;color:#fa8c16;border:1px solid #ffd591}#taobao-screen .transaction-item{background-color:var(--secondary-bg);border-radius:8px;padding:12px 15px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,.06);display:flex;justify-content:space-between;align-items:center}#taobao-screen .transaction-info .description{font-weight:500}#taobao-screen .transaction-info .timestamp{font-size:12px;color:var(--text-secondary);margin-top:4px}#taobao-screen .transaction-amount{font-weight:700;font-size:16px}#taobao-screen .transaction-amount.income{color:#4CAF50}#taobao-screen .transaction-amount.expense{color:#F44336}#taobao-logistics-screen #taobao-logistics-content-area{padding:20px;background-color:#f5f5f5}#phone-screen.dark-mode #taobao-logistics-screen #taobao-logistics-content-area{background-color:#121212}#taobao-logistics-screen .logistics-product-summary{display:flex;gap:15px;padding:15px;margin-bottom:20px;background-color:var(--secondary-bg);border-radius:12px;box-shadow:0 2px 5px rgba(0,0,0,.08)}#taobao-logistics-screen .logistics-product-summary .product-image{width:60px;height:60px;border-radius:8px;flex-shrink:0;object-fit:cover}#taobao-logistics-screen .logistics-product-summary .info .name{font-weight:600;font-size:15px}#taobao-logistics-screen .logistics-product-summary .info .status{font-size:13px;color:#FF5722;margin-top:5px;font-weight:500}#taobao-logistics-screen .logistics-timeline{position:relative;padding:20px 20px 20px 30px;background-color:var(--secondary-bg);border-radius:12px}#taobao-logistics-screen .logistics-timeline::before{content:'';position:absolute;left:15px;top:20px;bottom:20px;width:2px;background-color:#e0e0e0}#phone-screen.dark-mode #taobao-logistics-screen .logistics-timeline::before{background-color:#38383a}#taobao-logistics-screen .logistics-step{position:relative;margin-bottom:25px}#taobao-logistics-screen .logistics-step:last-child{margin-bottom:0}#taobao-logistics-screen .logistics-step::before{content:'';position:absolute;left:-22px;top:5px;width:10px;height:10px;border-radius:50%;background-color:#ccc;border:2px solid var(--secondary-bg);z-index:1}#taobao-logistics-screen .logistics-step:first-child::before{background-color:#FF5722;transform:scale(1.3)}#taobao-logistics-screen .logistics-step-content .status-text{font-weight:500;font-size:14px;margin-bottom:5px;line-height:1.5}#taobao-logistics-screen .logistics-step-content .timestamp{font-size:12px;color:var(--text-secondary)}
            `;
            document.head.appendChild(style);
        },
        createTaobaoHTML: function() {
            if (document.getElementById('taobao-screen')) return;
            const htmlWrapper = document.createElement('div');
            htmlWrapper.innerHTML = `
                <!-- HTML content remains the same as in your file -->
                <div id="taobao-screen" class="screen"><div class="header"><span class="back-btn" onclick="window.EPhone.showScreen('home-screen')">‹</span> <span>桃宝</span><div class="header-actions"><span class="action-btn" id="taobao-clear-taobao-products-btn" style="font-size:16px;font-weight:500">清空</span> <span class="action-btn" id="taobao-add-product-btn" title="添加商品">+</span></div></div><div class="taobao-tabs"><button class="taobao-tab active" data-view="taobao-products-view">首页</button> <button class="taobao-tab" data-view="taobao-cart-view">购物车<span id="taobao-cart-item-count-badge" style="display:none">0</span></button> <button class="taobao-tab" data-view="taobao-orders-view">我的订单</button> <button class="taobao-tab" data-view="taobao-my-view">我的</button></div><div class="taobao-content"><div id="taobao-products-view" class="taobao-view active"><div class="taobao-search-bar"><input type="search" id="taobao-product-search-input" placeholder="搜一搜，让AI为你创造好物！"> <button id="taobao-product-search-btn">搜索</button></div><div id="taobao-product-category-tabs"></div><div id="taobao-product-grid" class="product-grid"></div></div><div id="taobao-cart-view" class="taobao-view"><div id="taobao-cart-item-list"></div><div id="taobao-cart-checkout-bar" style="display:none"><div class="total-price">合计: <span id="taobao-cart-total-price">¥ 0.00</span></div><div style="display:flex;gap:10px"><button id="taobao-share-cart-to-char-btn">分享给Ta代付</button> <button id="taobao-buy-for-char-btn">为Ta购买</button> <button id="taobao-checkout-btn">结算(0)</button></div></div></div><div id="taobao-orders-view" class="taobao-view"><div id="taobao-order-list" class="order-list"></div></div><div id="taobao-my-view" class="taobao-view"><div id="taobao-user-balance-container"><p>我的余额</p><h2 id="taobao-user-balance-display">¥ 0.00</h2><button id="taobao-top-up-btn" class="form-button">给钱包充点钱</button></div><div id="taobao-balance-details-list" class="order-list" style="padding:0 15px"></div></div></div></div><div id="taobao-logistics-screen" class="screen"><div class="header"><span class="back-btn" id="taobao-logistics-back-btn">‹</span> <span>物流详情</span> <span style="width:30px"></span></div><div id="taobao-logistics-content-area" class="list-container"></div></div><div id="taobao-product-detail-modal" class="modal"><div class="modal-content"><div class="modal-header"><span>商品详情</span></div><div class="modal-body" id="taobao-product-detail-body"></div><div id="taobao-product-reviews-section"><h3>宝贝评价</h3><div id="taobao-product-reviews-list"></div><button id="taobao-generate-reviews-btn" class="form-button form-button-secondary">✨ AI生成评价</button></div><div class="modal-footer"><button class="cancel" id="taobao-close-product-detail-btn">关闭</button> <button class="save" id="taobao-detail-add-to-cart-btn">加入购物车</button></div></div></div><div id="taobao-add-product-choice-modal" class="modal"><div id="custom-modal" style="width:250px"><div class="custom-modal-header">选择添加方式</div><div class="custom-modal-footer"><button id="taobao-add-product-manual-btn">手动添加</button> <button id="taobao-add-product-link-btn">识别链接</button> <button id="taobao-add-product-ai-btn">AI生成</button> <button id="taobao-cancel-add-choice-btn" style="margin-top:8px;border-radius:8px;background-color:#f0f0f0">取消</button></div></div></div><div id="taobao-product-editor-modal" class="modal"><div class="modal-content" style="height:auto"><div class="modal-header"><span id="taobao-product-editor-title">添加新商品</span></div><div class="modal-body"><div class="form-group"><label for="taobao-product-name-input">商品名称</label><input type="text" id="taobao-product-name-input"></div><div class="form-group"><label for="taobao-product-price-input">价格 (元)</label><input type="number" id="taobao-product-price-input"></div><div class="form-group"><label for="taobao-product-image-input">图片 URL</label><input type="text" id="taobao-product-image-input"></div><div class="form-group"><label for="taobao-product-category-input">分类 (选填)</label><input type="text" id="taobao-product-category-input" placeholder="例如：衣服, 零食..."></div></div><div class="modal-footer"><button class="cancel" id="taobao-cancel-product-editor-btn">取消</button> <button class="save" id="taobao-save-product-btn">保存</button></div></div></div><div id="taobao-add-from-link-modal" class="modal"><div class="modal-content" style="height:auto"><div class="modal-header"><span>粘贴分享文案</span></div><div class="modal-body"><textarea id="taobao-link-paste-area" rows="6" placeholder="请在这里粘贴完整的淘宝或拼多多分享文案..."></textarea></div><div class="modal-footer"><button class="cancel" id="taobao-cancel-link-paste-btn">取消</button> <button class="save" id="taobao-confirm-link-paste-btn">识别</button></div></div></div><div id="taobao-ai-generated-products-modal" class="modal"><div class="modal-content" style="height:80%"><div class="modal-header"><span id="taobao-ai-products-modal-title">AI为你生成了以下宝贝</span></div><div class="modal-body" style="padding:15px"><div id="taobao-ai-product-results-grid" class="product-grid"></div></div><div class="modal-footer"><button class="save" id="taobao-close-ai-products-modal-btn" style="width:100%">完成</button></div></div></div>
            `;
            while (htmlWrapper.firstChild) {
                document.body.appendChild(htmlWrapper.firstChild);
            }
        },
        initInternal: async function() {
            this.db = new Dexie('TaobaoDB');
            this.db.version(1).stores({
                taobaoProducts: '++id, name, category', 
                taobaoOrders: '++id, productId, timestamp',
                taobaoCart: '++id, productId',
                userWalletTransactions: '++id, timestamp' 
            });
            this.injectTaobaoStyles();
            this.createTaobaoHTML();
            this.bindEvents();
            await this.renderTaobaoProducts();
            await this.renderBalanceDetails();
            await this.updateCartBadge();
        },
        integrateWithHost: function() { /* Unchanged */ },
        bindEvents: function() { /* Unchanged */ },

        // ... [The rest of your functions will be here, with fixes applied]

        // ▼▼▼ 【核心修复 #1】: 完整实现 renderBalanceDetails 函数 ▼▼▼
        renderBalanceDetails: async function() {
            // 1. 更新余额显示
            const balanceDisplay = document.getElementById('taobao-user-balance-display');
            if (balanceDisplay) {
                const currentBalance = await window.EPhone.api.getWalletBalance();
                balanceDisplay.textContent = `¥ ${currentBalance.toFixed(2)}`;
            }

            // 2. 渲染交易明细列表
            const listEl = document.getElementById('taobao-balance-details-list');
            if (!listEl) return;

            const transactions = await this.db.userWalletTransactions.orderBy('timestamp').reverse().toArray();
            listEl.innerHTML = '';
            
            if(transactions.length === 0) {
                listEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary);">暂无收支明细</p>';
                return;
            }

            transactions.forEach(tx => {
                const itemEl = document.createElement('div');
                itemEl.className = 'transaction-item';
                const isIncome = tx.amount > 0;
                
                itemEl.innerHTML = `
                    <div class="transaction-info">
                        <div class="description">${tx.description}</div>
                        <div class="timestamp">${new Date(tx.timestamp).toLocaleString()}</div>
                    </div>
                    <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                        ${isIncome ? '+' : ''}${tx.amount.toFixed(2)}
                    </div>
                `;
                listEl.appendChild(itemEl);
            });
        },

        // ▼▼▼ 【核心修复 #2】: 完整实现 renderTaobaoOrders 函数 ▼▼▼
        renderTaobaoOrders: async function() {
            const listEl = document.getElementById('taobao-order-list');
            if(!listEl) return;
            listEl.innerHTML = '';
            const orders = await this.db.taobaoOrders.orderBy('timestamp').reverse().toArray();

            if (orders.length === 0) {
                listEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">你还没有任何订单哦~</p>';
                return;
            }

            for (const order of orders) {
                const product = await this.db.taobaoProducts.get(order.productId);
                if (!product) continue;

                const itemEl = document.createElement('div');
                itemEl.className = 'order-item';
                itemEl.dataset.orderId = order.id;
                itemEl.innerHTML = `
                    <img src="${product.imageUrl}" class="product-image" alt="${product.name}">
                    <div class="order-info">
                        <div class="product-name">${product.name} (x${order.quantity})</div>
                        <div class="order-status">${order.status || '已付款'}</div>
                        <div class="order-time">${new Date(order.timestamp).toLocaleString()}</div>
                    </div>
                `;
                listEl.appendChild(itemEl);
            }
        },

        // ▼▼▼ 【核心修复 #3】: 修正 clearTaobaoCart 函数 ▼▼▼
        clearTaobaoCart: async function() {
            await this.db.taobaoCart.clear();
            await this.updateCartBadge(); // 只更新角标
            // 当用户切换到购物车视图时，renderTaobaoCart 会自动渲染空状态，无需在此处调用
        },

        // ▼▼▼ 【核心修复 #4】: 修正 handleCheckout 和其他扣款逻辑 ▼▼▼
        handleCheckout: async function() {
            const checkoutBtn = document.getElementById('taobao-checkout-btn');
            const totalPrice = parseFloat(checkoutBtn.dataset.totalPrice);
            const currentBalance = await window.EPhone.api.getWalletBalance();

            if (currentBalance < totalPrice) {
                await window.EPhone.showCustomAlert('支付失败', `余额不足！需要 ¥${totalPrice.toFixed(2)}，当前余额 ¥${currentBalance.toFixed(2)}。`);
                return;
            }
            const confirmed = await window.EPhone.showCustomConfirm('确认支付', `将从您的余额中扣除 ¥${totalPrice.toFixed(2)}，确定吗？`);
            if (confirmed) {
                const checkoutCallback = async () => {
                    // 1. 本地记录交易
                    await this.db.userWalletTransactions.add({ amount: -totalPrice, description: '桃宝购物', timestamp: Date.now() });
                    // 2. 创建订单
                    const cartItems = await this.db.taobaoCart.toArray();
                    await this.createOrdersFromCart(cartItems);
                    // 3. 清空购物车
                    await this.clearTaobaoCart();
                    // 4. 用户反馈和UI切换
                    await window.EPhone.showCustomAlert('支付成功', '宝贝已成功购买！');
                    this.switchTaobaoView('taobao-orders-view');
                };
                // 调用外部API并传入回调
                await window.EPhone.api.updateWallet(-totalPrice, '桃宝购物', checkoutCallback);
            }
        },
        
        handleBuyForChar: async function() {
            const cartItems = await this.db.taobaoCart.toArray();
            if (cartItems.length === 0) return;
            const targetChatId = await window.EPhone.api.openCharSelector('选择送礼对象');
            if (!targetChatId) return;
            const char = await window.EPhone.api.getChat(targetChatId);
            if (!char) return;

            const totalPrice = parseFloat(document.getElementById('taobao-checkout-btn').dataset.totalPrice);
            const currentBalance = await window.EPhone.api.getWalletBalance();
            if (currentBalance < totalPrice) {
                await window.EPhone.showCustomAlert('余额不足!', `为“${char.name}”购买礼物需要 ¥${totalPrice.toFixed(2)}，但你的余额只有 ¥${currentBalance.toFixed(2)}。`);
                return;
            }
            const confirmed = await window.EPhone.showCustomConfirm('确认赠送', `确定要花费 ¥${totalPrice.toFixed(2)} 为“${char.name}”购买购物车中的所有商品吗？`, { confirmText: '为Ta买单' });
            if (confirmed) {
                const buyCallback = async () => {
                    await this.db.userWalletTransactions.add({ amount: -totalPrice, description: `为 ${char.name} 购买礼物`, timestamp: Date.now() });
                    await this.createOrdersFromCart(cartItems);
                    const productPromises = cartItems.map(item => this.db.taobaoProducts.get(item.productId));
                    const products = await Promise.all(productPromises);
                    await this.sendGiftNotificationToChar(targetChatId, products, cartItems, totalPrice);
                    await this.clearTaobaoCart();
                    await window.EPhone.showCustomAlert("赠送成功！", `你为“${char.name}”购买的礼物已下单，并已通过私信通知对方啦！`);
                    
                    // 刷新余额显示，并跳转页面
                    await this.renderBalanceDetails(); 
                    window.EPhone.showScreen('chat-list-screen');
                };
                await window.EPhone.api.updateWallet(-totalPrice, `为 ${char.name} 购买礼物`, buyCallback);
            }
        },

        // ... [The rest of the functions from your original file, unchanged unless they were incomplete]
        // ... (For example, handleAddToCart, openProductDetail, etc. are already well-formed)
    };

    // Helper functions and Public API remain the same...

    // ===================================================================
    //  Public API & Initialization
    // ===================================================================
    window.TaobaoAppModule = {
        init: function() {
            if (TaobaoApp.isInitialized) return;
            (async () => {
                try {
                    await TaobaoApp.initInternal();
                    TaobaoApp.integrateWithHost();
                    TaobaoApp.isInitialized = true;
                    console.log("Taobao App Module Initialized.");
                } catch (error) {
                    console.error("Taobao App Module Initialization Failed:", error);
                }
            })();
        }
    };
    
    checkEnvironment();
    if (!TaobaoApp.isRunningInEPhone) {
        document.addEventListener('DOMContentLoaded', () => {
            window.TaobaoAppModule.init();
        });
    }

})(window);
