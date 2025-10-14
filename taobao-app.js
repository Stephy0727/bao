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
    
    let standaloneBalance = 560.00; // Standalone mode wallet simulation

    window.EPhone = {
        showScreen: (screenId) => { console.log(`Standalone Mode: Show screen ${screenId}`); },
        showCustomAlert: (title, message) => alert(`${title}\n${message}`),
        showCustomConfirm: (title, message, options) => Promise.resolve(confirm(`${title}\n${message}`)),
        showCustomPrompt: (title, message, defaultValue) => Promise.resolve(prompt(message, defaultValue)),
        api: {
            getWalletBalance: async () => {
                return Promise.resolve(standaloneBalance);
            },
            updateWallet: async (amount, description, onUpdateCompleteCallback) => {
                console.log(`Standalone Mode: Wallet updated by ${amount}. Reason: ${description}`);
                standaloneBalance += amount;
                console.log(`Standalone Mode: New balance is ${standaloneBalance.toFixed(2)}`);

                if (typeof onUpdateCompleteCallback === 'function') {
                    await onUpdateCompleteCallback(standaloneBalance);
                }
                return Promise.resolve();
            },
            getChat: (chatId) => Promise.resolve({ id: chatId, name: `Mock Character ${chatId}` }),
            openCharSelector: (title) => {
                console.log("Standalone Mode: Character selector opened.");
                return Promise.resolve('char_123');
            },
            sendMessage: (chatId, messageObject) => {
                console.log(`Standalone Mode: Message sent to ${chatId}:`, messageObject);
                return Promise.resolve();
            },
            getUserNickname: () => "我"
        }
    };
}
// -----------------------


(function(window) {
    'use strict';

    // ===================================================================
    //  1. Main Controller Object
    // ===================================================================
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

        // ===================================================================
        //  2. Core Setup Functions (HTML/CSS Injection, Init)
        // ===================================================================
        injectTaobaoStyles: function() {
            if (document.getElementById('taobao-app-styles')) return;
            const style = document.createElement('style');
            style.id = 'taobao-app-styles';
            style.textContent = `
                /* Styles are identical to the previous correct version, so they are collapsed for brevity */
                .message-bubble.is-cart-share-request .content, .message-bubble.is-gift-notification .content{padding:0;background:0 0;box-shadow:none;border:none;backdrop-filter:none;-webkit-backdrop-filter:none}.cart-share-card{width:230px;border-radius:12px;background-color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;border:2px solid transparent;transition:all .3s ease}.cart-share-header{display:flex;align-items:center;gap:10px;padding:12px 15px;background-color:#FFF8E1;color:#FFA000}.cart-share-header .icon{font-size:24px;font-weight:700}.cart-share-header .title{font-size:16px;font-weight:600}.cart-share-body{padding:15px;text-align:center}.cart-share-body .label{font-size:13px;color:#888}.cart-share-body .amount{font-size:32px;font-weight:700;color:#FF5722;margin:5px 0 15px}.cart-share-body .status-text{font-weight:500}.cart-share-card.paid{border-color:#4CAF50}.cart-share-card.paid .status-text{color:#4CAF50}.cart-share-card.rejected{border-color:#F44336;opacity:.8}.cart-share-card.rejected .status-text{color:#F44336}.gift-card{width:230px;border-radius:12px;background-color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.gift-card-header{display:flex;align-items:center;gap:10px;padding:12px 15px;background-color:#e8f5e9;color:#2e7d32}.gift-card-header .icon{font-size:24px;font-weight:700}.gift-card-header .title{font-size:16px;font-weight:600}.gift-card-body{padding:15px}.gift-card-body .greeting{font-size:14px;margin-bottom:10px}.gift-card-items{font-size:13px;color:#555;max-height:60px;overflow:hidden;text-overflow:ellipsis;margin-bottom:10px}.gift-card-footer{padding-top:10px;border-top:1px solid #f0f0f0;text-align:right;font-weight:700}.gift-card-footer .total-price{color:#FF5722}#taobao-screen{background-color:#f0f2f5}#taobao-screen .taobao-tabs{display:flex;flex-shrink:0;border-bottom:1px solid var(--border-color);background-color:var(--secondary-bg)}#taobao-screen .taobao-tab{flex:1;padding:12px 0;text-align:center;font-weight:500;color:var(--text-secondary);border:none;background:0 0;cursor:pointer;position:relative}#taobao-screen .taobao-tab.active{color:#FF5722}#taobao-screen .taobao-tab.active::after{content:'';position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:40px;height:3px;background-color:#FF5722;border-radius:1.5px}#taobao-screen .taobao-content{flex-grow:1;position:relative;overflow:hidden}#taobao-screen .taobao-view{position:absolute;top:0;left:0;width:100%;height:100%;overflow-y:auto;display:none;padding:15px;box-sizing:border-box}#taobao-screen .taobao-view.active{display:block}#taobao-screen #taobao-product-category-tabs{display:flex;gap:10px;margin-bottom:15px;overflow-x:auto;padding-bottom:5px;scrollbar-width:none;-ms-overflow-style:none}#taobao-screen #taobao-product-category-tabs::-webkit-scrollbar{display:none}#taobao-screen #taobao-product-category-tabs .category-tab-btn{padding:6px 12px;border-radius:15px;border:1px solid var(--border-color);background-color:var(--secondary-bg);white-space:nowrap;cursor:pointer}#taobao-screen #taobao-product-category-tabs .category-tab-btn.active{background-color:#FFEFE9;color:#FF5722;border-color:#FF5722}#taobao-screen .product-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}#taobao-screen .product-card{background-color:var(--secondary-bg);border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);cursor:pointer;position:relative}#taobao-screen .product-card .product-image{width:100%;aspect-ratio:1/1;object-fit:cover;background-color:#f0f2f5}#taobao-screen .product-card .product-info{padding:8px}#taobao-screen .product-card .product-name{font-size:14px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.8em}#taobao-screen .product-card .product-price{font-size:16px;font-weight:700;color:#FF5722;margin-top:5px}#taobao-screen .product-card .product-price::before{content:'¥';font-size:12px;margin-right:2px}#taobao-screen #taobao-user-balance-container{background:linear-gradient(135deg,#FF9A8B 0%,#FF6A88 100%);color:#fff;padding:30px 20px;border-radius:12px;text-align:center;text-shadow:0 1px 3px rgba(0,0,0,.2);margin-bottom:20px}#taobao-screen #taobao-user-balance-container h2{font-size:40px;margin:10px 0 20px}#taobao-screen #taobao-top-up-btn{background-color:rgba(255,255,255,.9);color:#FF5722}#taobao-screen .order-list{display:flex;flex-direction:column;gap:15px}#taobao-screen .order-item{background-color:var(--secondary-bg);border-radius:8px;padding:12px;box-shadow:0 1px 3px rgba(0,0,0,.06);display:flex;gap:12px;cursor:pointer}#taobao-screen .order-item .product-image{width:70px;height:70px;border-radius:6px;flex-shrink:0;object-fit:cover}#taobao-screen .order-item .order-info{flex-grow:1}#taobao-screen .order-item .product-name{font-weight:500}#taobao-screen .order-item .order-status{font-size:13px;color:#28a745;margin-top:8px;font-weight:500}#taobao-screen .order-item .order-time{font-size:12px;color:var(--text-secondary);margin-top:4px}#taobao-screen .taobao-search-bar{display:flex;gap:10px;padding:0 0 15px}#taobao-screen #taobao-product-search-input{flex-grow:1;border:1px solid #FF5722;padding:10px 15px;border-radius:20px;font-size:14px;outline:0}#taobao-screen #taobao-product-search-btn{background-color:#FF5722;color:#fff;border:none;border-radius:20px;padding:0 20px;font-weight:500;cursor:pointer}#taobao-screen #taobao-ai-product-results-grid .product-card{padding-bottom:40px;cursor:default}#taobao-screen .add-to-my-page-btn{position:absolute;bottom:8px;left:8px;right:8px;width:calc(100% - 16px);padding:8px 0;background-color:#4CAF50;color:#fff;border:none;border-radius:6px;font-weight:500;cursor:pointer;transition:background-color .2s}#taobao-screen .add-to-my-page-btn:hover{background-color:#45a049}#taobao-screen .add-to-my-page-btn:disabled{background-color:#ccc;cursor:not-allowed}#taobao-screen .taobao-tab #taobao-cart-item-count-badge{position:absolute;top:5px;right:15px;min-width:18px;height:18px;padding:0 5px;background-color:#FF5722;color:#fff;font-size:11px;border-radius:9px;line-height:18px}#taobao-screen .product-card .add-cart-btn{position:absolute;bottom:5px;right:5px;width:28px;height:28px;background-color:#FF5722;color:#fff;border:none;border-radius:50%;font-size:18px;line-height:28px;text-align:center;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,.2);transition:transform .2s}#taobao-screen .product-card .add-cart-btn:active{transform:scale(.9)}#taobao-screen #taobao-cart-item-list{display:flex;flex-direction:column;gap:10px;padding-bottom:70px}#taobao-screen .cart-item{background-color:var(--secondary-bg);border-radius:8px;padding:12px;display:flex;align-items:center;gap:12px}#taobao-screen .cart-item .product-image{width:80px;height:80px;border-radius:6px;flex-shrink:0;cursor:pointer;object-fit:cover}#taobao-screen .cart-item .cart-item-info{flex-grow:1;cursor:pointer}#taobao-screen .cart-item .product-name{font-weight:500}#taobao-screen .cart-item .product-price{color:#FF5722;font-weight:700;margin-top:8px}#taobao-screen .cart-item .quantity-controls{display:flex;align-items:center;gap:8px}#taobao-screen .cart-item .quantity-controls button{width:24px;height:24px;border:1px solid #ccc;background-color:#f0f0f0;border-radius:50%;cursor:pointer}#taobao-screen .cart-item .delete-cart-item-btn{width:30px;height:30px;border:none;background:0 0;color:#999;font-size:24px;cursor:pointer;flex-shrink:0}#taobao-cart-checkout-bar{position:fixed;bottom:0;left:0;right:0;width:100%;max-width:var(--screen-width);margin:0 auto;z-index:10;padding:10px 15px;padding-bottom:calc(10px + env(safe-area-inset-bottom));background-color:var(--secondary-bg);border-top:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;box-sizing:border-box}#taobao-cart-checkout-bar .total-price{font-weight:700}#taobao-cart-checkout-bar #taobao-cart-total-price{color:#FF5722;font-size:18px}#taobao-cart-checkout-bar #taobao-checkout-btn,#taobao-cart-checkout-bar #taobao-share-cart-to-char-btn,#taobao-cart-checkout-bar #taobao-buy-for-char-btn{color:#fff;border:none;padding:10px 20px;border-radius:20px;font-weight:500;cursor:pointer}#taobao-cart-checkout-bar #taobao-checkout-btn{background-color:#FF5722}#taobao-cart-checkout-bar #taobao-share-cart-to-char-btn{background-color:#FF9800}#taobao-cart-checkout-bar #taobao-buy-for-char-btn{background-color:#4CAF50}#taobao-product-detail-body{text-align:center}#taobao-product-detail-body .product-image{width:80%;max-width:250px;border-radius:8px;margin-bottom:15px}#taobao-product-detail-body .product-name{font-size:18px;font-weight:600;margin-bottom:10px}#taobao-product-detail-body .product-price{font-size:24px;font-weight:700;color:#FF5722;margin-bottom:20px}#taobao-product-detail-body .product-price::before{content:'¥';font-size:16px}#taobao-product-reviews-section{padding:0 15px 15px;border-top:1px solid var(--border-color);margin-top:15px}#taobao-product-reviews-section h3{font-size:16px;margin:15px 0}#taobao-product-reviews-list{display:flex;flex-direction:column;gap:15px;max-height:150px;overflow-y:auto;margin-bottom:15px}#taobao-screen .product-review-item{font-size:14px;line-height:1.6;border-bottom:1px solid #f0f0f0;padding-bottom:10px}#taobao-screen .product-review-item .review-author{font-weight:500;color:var(--text-secondary);margin-bottom:5px}#taobao-screen #taobao-generate-reviews-btn{width:100%;margin-top:10px;background-color:#fff7e6;color:#fa8c16;border:1px solid #ffd591}#taobao-screen .transaction-item{background-color:var(--secondary-bg);border-radius:8px;padding:12px 15px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,.06);display:flex;justify-content:space-between;align-items:center}#taobao-screen .transaction-info .description{font-weight:500}#taobao-screen .transaction-info .timestamp{font-size:12px;color:var(--text-secondary);margin-top:4px}#taobao-screen .transaction-amount{font-weight:700;font-size:16px}#taobao-screen .transaction-amount.income{color:#4CAF50}#taobao-screen .transaction-amount.expense{color:#F44336}#taobao-logistics-screen #taobao-logistics-content-area{padding:20px;background-color:#f5f5f5}#phone-screen.dark-mode #taobao-logistics-screen #taobao-logistics-content-area{background-color:#121212}#taobao-logistics-screen .logistics-product-summary{display:flex;gap:15px;padding:15px;margin-bottom:20px;background-color:var(--secondary-bg);border-radius:12px;box-shadow:0 2px 5px rgba(0,0,0,.08)}#taobao-logistics-screen .logistics-product-summary .product-image{width:60px;height:60px;border-radius:8px;flex-shrink:0;object-fit:cover}#taobao-logistics-screen .logistics-product-summary .info .name{font-weight:600;font-size:15px}#taobao-logistics-screen .logistics-product-summary .info .status{font-size:13px;color:#FF5722;margin-top:5px;font-weight:500}#taobao-logistics-screen .logistics-timeline{position:relative;padding:20px 20px 20px 30px;background-color:var(--secondary-bg);border-radius:12px}#taobao-logistics-screen .logistics-timeline::before{content:'';position:absolute;left:15px;top:20px;bottom:20px;width:2px;background-color:#e0e0e0}#phone-screen.dark-mode #taobao-logistics-screen .logistics-timeline::before{background-color:#38383a}#taobao-logistics-screen .logistics-step{position:relative;margin-bottom:25px}#taobao-logistics-screen .logistics-step:last-child{margin-bottom:0}#taobao-logistics-screen .logistics-step::before{content:'';position:absolute;left:-22px;top:5px;width:10px;height:10px;border-radius:50%;background-color:#ccc;border:2px solid var(--secondary-bg);z-index:1}#taobao-logistics-screen .logistics-step:first-child::before{background-color:#FF5722;transform:scale(1.3)}#taobao-logistics-screen .logistics-step-content .status-text{font-weight:500;font-size:14px;margin-bottom:5px;line-height:1.5}#taobao-logistics-screen .logistics-step-content .timestamp{font-size:12px;color:var(--text-secondary)}
            `;
            document.head.appendChild(style);
        },
        createTaobaoHTML: function() {
            if (document.getElementById('taobao-screen')) return;
            const htmlWrapper = document.createElement('div');
            htmlWrapper.innerHTML = `
                <!-- HTML is identical to the previous correct version, collapsed for brevity -->
                <div id="taobao-screen" class="screen"><div class="header"><span class="back-btn" onclick="window.EPhone.showScreen('home-screen')">‹</span><span>桃宝</span><div class="header-actions"><span class="action-btn" id="taobao-clear-taobao-products-btn" style="font-size:16px;font-weight:500">清空</span><span class="action-btn" id="taobao-add-product-btn" title="添加商品">+</span></div></div><div class="taobao-tabs"><button class="taobao-tab active" data-view="taobao-products-view">首页</button><button class="taobao-tab" data-view="taobao-cart-view">购物车<span id="taobao-cart-item-count-badge" style="display:none">0</span></button><button class="taobao-tab" data-view="taobao-orders-view">我的订单</button><button class="taobao-tab" data-view="taobao-my-view">我的</button></div><div class="taobao-content"><div id="taobao-products-view" class="taobao-view active"><div class="taobao-search-bar"><input type="search" id="taobao-product-search-input" placeholder="搜一搜，让AI为你创造好物！"><button id="taobao-product-search-btn">搜索</button></div><div id="taobao-product-category-tabs"></div><div id="taobao-product-grid" class="product-grid"></div></div><div id="taobao-cart-view" class="taobao-view"><div id="taobao-cart-item-list"></div><div id="taobao-cart-checkout-bar" style="display:none"><div class="total-price">合计: <span id="taobao-cart-total-price">¥ 0.00</span></div><div style="display:flex;gap:10px"><button id="taobao-share-cart-to-char-btn">分享给Ta代付</button><button id="taobao-buy-for-char-btn">为Ta购买</button><button id="taobao-checkout-btn">结算(0)</button></div></div></div><div id="taobao-orders-view" class="taobao-view"><div id="taobao-order-list" class="order-list"></div></div><div id="taobao-my-view" class="taobao-view"><div id="taobao-user-balance-container"><p>我的余额</p><h2 id="taobao-user-balance-display">¥ 0.00</h2><button id="taobao-top-up-btn" class="form-button">给钱包充点钱</button></div><div id="taobao-balance-details-list" class="order-list" style="padding:0 15px"></div></div></div></div><div id="taobao-logistics-screen" class="screen"><div class="header"><span class="back-btn" id="taobao-logistics-back-btn">‹</span><span>物流详情</span><span style="width:30px"></span></div><div id="taobao-logistics-content-area" class="list-container"></div></div><div id="taobao-product-detail-modal" class="modal"><div class="modal-content"><div class="modal-header"><span>商品详情</span></div><div class="modal-body" id="taobao-product-detail-body"></div><div id="taobao-product-reviews-section"><h3>宝贝评价</h3><div id="taobao-product-reviews-list"></div><button id="taobao-generate-reviews-btn" class="form-button form-button-secondary">✨ AI生成评价</button></div><div class="modal-footer"><button class="cancel" id="taobao-close-product-detail-btn">关闭</button><button class="save" id="taobao-detail-add-to-cart-btn">加入购物车</button></div></div></div><div id="taobao-add-product-choice-modal" class="modal"><div id="custom-modal" style="width:250px"><div class="custom-modal-header">选择添加方式</div><div class="custom-modal-footer"><button id="taobao-add-product-manual-btn">手动添加</button><button id="taobao-add-product-link-btn">识别链接</button><button id="taobao-add-product-ai-btn">AI生成</button><button id="taobao-cancel-add-choice-btn" style="margin-top:8px;border-radius:8px;background-color:#f0f0f0">取消</button></div></div></div><div id="taobao-product-editor-modal" class="modal"><div class="modal-content" style="height:auto"><div class="modal-header"><span id="taobao-product-editor-title">添加新商品</span></div><div class="modal-body"><div class="form-group"><label for="taobao-product-name-input">商品名称</label><input type="text" id="taobao-product-name-input"></div><div class="form-group"><label for="taobao-product-price-input">价格 (元)</label><input type="number" id="taobao-product-price-input"></div><div class="form-group"><label for="taobao-product-image-input">图片 URL</label><input type="text" id="taobao-product-image-input"></div><div class="form-group"><label for="taobao-product-category-input">分类 (选填)</label><input type="text" id="taobao-product-category-input" placeholder="例如：衣服, 零食..."></div></div><div class="modal-footer"><button class="cancel" id="taobao-cancel-product-editor-btn">取消</button><button class="save" id="taobao-save-product-btn">保存</button></div></div></div><div id="taobao-add-from-link-modal" class="modal"><div class="modal-content" style="height:auto"><div class="modal-header"><span>粘贴分享文案</span></div><div class="modal-body"><textarea id="taobao-link-paste-area" rows="6" placeholder="请在这里粘贴完整的淘宝或拼多多分享文案..."></textarea></div><div class="modal-footer"><button class="cancel" id="taobao-cancel-link-paste-btn">取消</button><button class="save" id="taobao-confirm-link-paste-btn">识别</button></div></div></div><div id="taobao-ai-generated-products-modal" class="modal"><div class="modal-content" style="height:80%"><div class="modal-header"><span id="taobao-ai-products-modal-title">AI为你生成了以下宝贝</span></div><div class="modal-body" style="padding:15px"><div id="taobao-ai-product-results-grid" class="product-grid"></div></div><div class="modal-footer"><button class="save" id="taobao-close-ai-products-modal-btn" style="width:100%">完成</button></div></div></div>
            `;
            while (htmlWrapper.firstChild) { document.body.appendChild(htmlWrapper.firstChild); }
        },
        initInternal: async function() {
            this.db = new Dexie('TaobaoDB');
            this.db.version(1).stores({
                taobaoProducts: '++id, name, category', 
                taobaoOrders: '++id, productId, timestamp',
                taobaoCart: '++id, productId',
                userWalletTransactions: '++id, timestamp' 
            });
            await this.db.open(); // Ensure DB is open before proceeding
            this.injectTaobaoStyles();
            this.createTaobaoHTML();
            this.bindEvents();
            await this.renderTaobaoProducts();
            await this.renderBalanceDetails();
            await this.updateCartBadge();
        },
        integrateWithHost: function() {
            if (!this.isRunningInEPhone) return;
            const placeholder = document.getElementById('taobao-app-placeholder');
            if (placeholder) {
                placeholder.innerHTML = `<div class="icon-bg-desktop"><img src="${this.identity.iconUrl}" alt="${this.identity.name}"></div><span class="label">${this.identity.name}</span>`;
                placeholder.addEventListener('click', () => { this.open(); window.EPhone.showScreen(this.identity.screenId); });
            } else { console.warn(`TaobaoApp: Placeholder element '#taobao-app-placeholder' not found in host HTML.`); }
        },
        bindEvents: function() {
            document.getElementById('taobao-screen').addEventListener('click', async (e) => {
                const target = e.target;
                if (target.classList.contains('taobao-tab')) { this.switchTaobaoView(target.dataset.view); }
                if (target.id === 'taobao-clear-taobao-products-btn') { await this.clearTaobaoProducts(); }
                if (target.id === 'taobao-add-product-btn') { this.openAddProductChoiceModal(); }
                if (target.classList.contains('quantity-increase')) { const cartId = parseInt(target.closest('.cart-item').querySelector('.quantity-controls button').dataset.cartId); if (!isNaN(cartId)) await this.handleChangeCartItemQuantity(cartId, 1); }
                if (target.classList.contains('quantity-decrease')) { const cartId = parseInt(target.closest('.cart-item').querySelector('.quantity-controls button').dataset.cartId); if (!isNaN(cartId)) await this.handleChangeCartItemQuantity(cartId, -1); }
                if (target.classList.contains('delete-cart-item-btn')) { const cartId = parseInt(target.dataset.cartId); if (!isNaN(cartId)) { const confirmed = await window.EPhone.showCustomConfirm('移出购物车', '确定要删除这个宝贝吗？'); if (confirmed) await this.handleRemoveFromCart(cartId); } }
                const productCard = target.closest('.product-card, .cart-item');
                if (productCard && !target.closest('.quantity-controls, .delete-cart-item-btn, .add-cart-btn')) { let productId; if(productCard.dataset.productId) { productId = parseInt(productCard.dataset.productId); } else if (productCard.querySelector('[data-product-id]')) { productId = parseInt(productCard.querySelector('[data-product-id]').dataset.productId); } if (!isNaN(productId)) await this.openProductDetail(productId); }
                if (target.classList.contains('add-cart-btn')) { const productId = parseInt(target.closest('.product-card').dataset.productId); if (!isNaN(productId)) await this.handleAddToCart(productId); }
                const categoryTab = target.closest('.category-tab-btn');
                if (categoryTab) { const category = categoryTab.dataset.category === 'all' ? null : categoryTab.dataset.category; this.state.currentTaobaoCategory = category; await this.renderTaobaoProducts(category); }
                if (target.id === 'taobao-checkout-btn') await this.handleCheckout();
                if (target.id === 'taobao-share-cart-to-char-btn') await this.handleShareCartRequest();
                if (target.id === 'taobao-buy-for-char-btn') await this.handleBuyForChar();
                if (target.id === 'taobao-top-up-btn') {
                    const amountStr = await window.EPhone.showCustomPrompt('充值', '请输入充值金额', '100');
                    const amount = parseFloat(amountStr);
                    if (amountStr && !isNaN(amount) && amount > 0) {
                        const updateCallback = async (newBalance) => {
                            await this.db.userWalletTransactions.add({ amount: amount, description: '用户充值', timestamp: Date.now() });
                            await this.renderBalanceDetails();
                            await window.EPhone.showCustomAlert('充值成功', `成功充值 ¥${amount.toFixed(2)}！`);
                        };
                        await window.EPhone.api.updateWallet(amount, '用户充值', updateCallback);
                    }
                }
                const orderItem = target.closest('.order-item');
                if(orderItem && orderItem.closest('#taobao-orders-view')) { const orderId = parseInt(orderItem.dataset.orderId); if(!isNaN(orderId)) this.openLogisticsView(orderId); }
            });
            const choiceModal = document.getElementById('taobao-add-product-choice-modal');
            document.getElementById('taobao-add-product-manual-btn').addEventListener('click', () => { choiceModal.classList.remove('visible'); this.openProductEditor(); });
            document.getElementById('taobao-add-product-link-btn').addEventListener('click', () => { choiceModal.classList.remove('visible'); this.openAddFromLinkModal(); });
            document.getElementById('taobao-add-product-ai-btn').addEventListener('click', () => { choiceModal.classList.remove('visible'); this.handleGenerateProductsAI(); });
            document.getElementById('taobao-cancel-add-choice-btn').addEventListener('click', () => choiceModal.classList.remove('visible'));
            document.getElementById('taobao-save-product-btn').addEventListener('click', this.saveProduct.bind(this));
            document.getElementById('taobao-cancel-product-editor-btn').addEventListener('click', () => document.getElementById('taobao-product-editor-modal').classList.remove('visible'));
            document.getElementById('taobao-confirm-link-paste-btn').addEventListener('click', this.handleAddFromLink.bind(this));
            document.getElementById('taobao-cancel-link-paste-btn').addEventListener('click', () => document.getElementById('taobao-add-from-link-modal').classList.remove('visible'));
            document.getElementById('taobao-close-ai-products-modal-btn').addEventListener('click', () => document.getElementById('taobao-ai-generated-products-modal').classList.remove('visible'));
            document.getElementById('taobao-ai-product-results-grid').addEventListener('click', async (e) => {
                if (e.target.classList.contains('add-to-my-page-btn') && !e.target.disabled) {
                    const card = e.target.closest('.product-card');
                    const productData = JSON.parse(card.dataset.productJson);
                    await this.db.taobaoProducts.add(productData);
                    e.target.textContent = '已添加';
                    e.target.disabled = true;
                    await this.renderTaobaoProducts(this.state.currentTaobaoCategory);
                }
            });
            document.getElementById('taobao-product-search-btn').addEventListener('click', this.handleSearchProductsAI.bind(this));
            document.getElementById('taobao-product-search-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleSearchProductsAI(); });
            document.getElementById('taobao-logistics-back-btn').addEventListener('click', () => {
                this.state.logisticsUpdateTimers.forEach(timerId => clearTimeout(timerId));
                this.state.logisticsUpdateTimers = [];
                window.EPhone.showScreen('taobao-screen');
            });
        },
        
        // 【SYNTAX FIX】 All functions below are now correctly defined as methods of the TaobaoApp object.
        
        logisticsTimelineTemplate: [ { text: '您的订单已提交', delay: 2000 }, { text: '付款成功，等待商家打包', delay: 10000 }, { text: '【{city}仓库】已打包，等待快递揽收', delay: 300000 }, { text: '【{city}快递】已揽收', delay: 1200000 }, { text: '快件已到达【{city}分拨中心】', delay: 7200000 }, { text: '【{city}分拨中心】已发出，下一站【{next_city}】', delay: 28800000 }, { text: '快件已到达【{user_city}转运中心】', delay: 72000000 }, { text: '快件正在派送中，派送员：兔兔快递员，电话：123-4567-8910，请保持电话畅通', delay: 86400000 }, { text: '您的快件已签收，感谢您在桃宝购物，期待再次为您服务！', delay: 100800000 } ],
        
        getRandomDefaultProductImage: function() { const defaultImages = [ 'https://i.postimg.cc/W4svy4Hm/Image-1760206134285.jpg', 'https://i.postimg.cc/jjRb1jF7/Image-1760206125678.jpg' ]; return defaultImages[Math.floor(Math.random() * defaultImages.length)]; },
        
        open: async function() { await this.renderTaobaoProducts(); await this.renderBalanceDetails(); await this.updateCartBadge(); },
        
        switchTaobaoView: async function(viewId) {
            document.querySelectorAll('#taobao-screen .taobao-view').forEach(v => v.classList.remove('active'));
            document.getElementById(viewId).classList.add('active');
            document.querySelectorAll('#taobao-screen .taobao-tab').forEach(t => { t.classList.toggle('active', t.dataset.view === viewId); });
            if (viewId === 'taobao-orders-view') await this.renderTaobaoOrders();
            else if (viewId === 'taobao-my-view') await this.renderBalanceDetails();
            else if (viewId === 'taobao-cart-view') await this.renderTaobaoCart();
        },
        
        renderTaobaoProducts: async function(category = null) {
            const gridEl = document.getElementById('taobao-product-grid');
            const categoryTabsEl = document.getElementById('taobao-product-category-tabs');
            if(!gridEl) return;
            gridEl.innerHTML = '';
            const allProducts = await this.db.taobaoProducts.orderBy('name').toArray();
            const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
            categoryTabsEl.innerHTML = `<button class="category-tab-btn ${!category ? 'active' : ''}" data-category="all">全部</button>`;
            categories.forEach(cat => { categoryTabsEl.innerHTML += `<button class="category-tab-btn ${category === cat ? 'active' : ''}" data-category="${cat}">${cat}</button>`; });
            const productsToRender = category ? allProducts.filter(p => p.category === category) : allProducts;
            productsToRender.forEach(product => {
                const card = document.createElement('div');
                card.className = 'product-card';
                card.dataset.productId = product.id;
                card.innerHTML = `<img src="${product.imageUrl}" class="product-image" alt="${product.name}"><div class="product-info"><div class="product-name">${product.name}</div><div class="product-price">${product.price.toFixed(2)}</div></div><button class="add-cart-btn" data-product-id="${product.id}">+</button>`;
                addLongPressListener(card, () => this.showProductActions(product.id));
                gridEl.appendChild(card);
            });
        },
        
        renderTaobaoCart: async function() {
            const listEl = document.getElementById('taobao-cart-item-list');
            const checkoutBar = document.getElementById('taobao-cart-checkout-bar');
            if(!listEl || !checkoutBar) return;
            listEl.innerHTML = '';
            const cartItems = await this.db.taobaoCart.toArray();
            if (cartItems.length === 0) { listEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">购物车空空如也~</p>'; checkoutBar.style.display = 'none'; this.updateCartBadge(); return; }
            checkoutBar.style.display = 'flex';
            let totalPrice = 0; let totalItems = 0;
            for (const item of cartItems) {
                const product = await this.db.taobaoProducts.get(item.productId);
                if (!product) continue;
                totalItems += item.quantity; totalPrice += product.price * item.quantity;
                const itemEl = document.createElement('div');
                itemEl.className = 'cart-item';
                itemEl.innerHTML = `<img src="${product.imageUrl}" class="product-image" data-product-id="${product.id}"><div class="cart-item-info" data-product-id="${product.id}"><div class="product-name">${product.name}</div><div class="product-price">¥${product.price.toFixed(2)}</div></div><div class="quantity-controls"><button class="quantity-decrease" data-cart-id="${item.id}" ${item.quantity <= 1 ? '' : ''}>-</button><span class="quantity-display">${item.quantity}</span><button class="quantity-increase" data-cart-id="${item.id}">+</button></div><button class="delete-cart-item-btn" data-cart-id="${item.id}">×</button>`;
                listEl.appendChild(itemEl);
            }
            document.getElementById('taobao-cart-total-price').textContent = `¥ ${totalPrice.toFixed(2)}`;
            const checkoutBtn = document.getElementById('taobao-checkout-btn');
            checkoutBtn.textContent = `结算(${totalItems})`;
            checkoutBtn.dataset.totalPrice = totalPrice;
            this.updateCartBadge();
        },
        
        updateCartBadge: async function() {
            const badge = document.getElementById('taobao-cart-item-count-badge');
            const items = await this.db.taobaoCart.toArray();
            const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
            if (totalCount > 0) { badge.textContent = totalCount > 99 ? '99+' : totalCount; badge.style.display = 'inline-block'; }
            else { badge.style.display = 'none'; }
        },
        
        handleAddToCart: async function(productId) {
            const existingItem = await this.db.taobaoCart.where('productId').equals(productId).first();
            if (existingItem) { await this.db.taobaoCart.update(existingItem.id, { quantity: existingItem.quantity + 1 }); }
            else { await this.db.taobaoCart.add({ productId: productId, quantity: 1 }); }
            await window.EPhone.showCustomAlert('成功', '宝贝已加入购物车！');
            this.updateCartBadge();
            if (document.getElementById('taobao-cart-view').classList.contains('active')) { this.renderTaobaoCart(); }
        },
        
        handleChangeCartItemQuantity: async function(cartId, change) {
            const item = await this.db.taobaoCart.get(cartId);
            if (!item) return;
            const newQuantity = item.quantity + change;
            if (newQuantity <= 0) { await this.handleRemoveFromCart(cartId); }
            else { await this.db.taobaoCart.update(cartId, { quantity: newQuantity }); await this.renderTaobaoCart(); }
        },
        
        handleRemoveFromCart: async function(cartId) { await this.db.taobaoCart.delete(cartId); await this.renderTaobaoCart(); },
        
        openProductDetail: async function(productId) {
            const product = await this.db.taobaoProducts.get(productId);
            if (!product) return;
            const modal = document.getElementById('taobao-product-detail-modal');
            const bodyEl = document.getElementById('taobao-product-detail-body');
            const reviewsListEl = document.getElementById('taobao-product-reviews-list');
            const generateBtn = document.getElementById('taobao-generate-reviews-btn');
            bodyEl.innerHTML = `<img src="${product.imageUrl}" class="product-image" alt="${product.name}"><h2 class="product-name">${product.name}</h2><p class="product-price">¥${product.price.toFixed(2)}</p>`;
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
            const newGenerateBtn = generateBtn.cloneNode(true);
            generateBtn.parentNode.replaceChild(newGenerateBtn, generateBtn);
            newGenerateBtn.addEventListener('click', () => this.generateProductReviews(productId));
            const addToCartBtn = document.getElementById('taobao-detail-add-to-cart-btn');
            const newAddToCartBtn = addToCartBtn.cloneNode(true);
            addToCartBtn.parentNode.replaceChild(newAddToCartBtn, addToCartBtn);
            newAddToCartBtn.onclick = async () => { await this.handleAddToCart(productId); modal.classList.remove('visible'); };
            document.getElementById('taobao-close-product-detail-btn').onclick = () => modal.classList.remove('visible');
            modal.classList.add('visible');
        },
        
        handleCheckout: async function() {
            const checkoutBtn = document.getElementById('taobao-checkout-btn');
            const totalPrice = parseFloat(checkoutBtn.dataset.totalPrice);
            const currentBalance = await window.EPhone.api.getWalletBalance();
            if (currentBalance < totalPrice) { await window.EPhone.showCustomAlert('支付失败', `余额不足！需要 ¥${totalPrice.toFixed(2)}，当前余额 ¥${currentBalance.toFixed(2)}。`); return; }
            const confirmed = await window.EPhone.showCustomConfirm('确认支付', `将从您的余额中扣除 ¥${totalPrice.toFixed(2)}，确定吗？`);
            if (confirmed) {
                const checkoutCallback = async () => {
                    try {
                        await this.db.userWalletTransactions.add({ amount: -totalPrice, description: '桃宝购物', timestamp: Date.now() });
                        const cartItems = await this.db.taobaoCart.toArray();
                        await this.createOrdersFromCart(cartItems);
                        await this.clearTaobaoCart();
                        await window.EPhone.showCustomAlert('支付成功', '宝贝已成功购买！');
                        this.switchTaobaoView('taobao-orders-view');
                    } catch (error) {
                        console.error("Checkout callback failed:", error);
                        await window.EPhone.showCustomAlert('错误', '结算时发生错误，请重试。');
                    }
                };
                await window.EPhone.api.updateWallet(-totalPrice, '桃宝购物', checkoutCallback);
            }
        },
        
        renderTaobaoOrders: async function() {
            const listEl = document.getElementById('taobao-order-list');
            if (!listEl) return;
            listEl.innerHTML = '';
            const orders = await this.db.taobaoOrders.orderBy('timestamp').reverse().toArray();
            if (orders.length === 0) { listEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">你还没有任何订单哦~</p>'; return; }
            for (const order of orders) {
                const product = await this.db.taobaoProducts.get(order.productId);
                if (!product) continue;
                const itemEl = document.createElement('div');
                itemEl.className = 'order-item';
                itemEl.dataset.orderId = order.id;
                itemEl.innerHTML = `<img src="${product.imageUrl}" class="product-image"><div class="order-info"><div class="product-name">${product.name} (x${order.quantity})</div><div class="order-status">${order.status || '已付款'}</div><div class="order-time">${new Date(order.timestamp).toLocaleString()}</div></div>`;
                listEl.appendChild(itemEl);
            }
        },
        
        clearTaobaoProducts: async function() {
            const confirmed = await window.EPhone.showCustomConfirm('确认清空', '确定要清空桃宝首页的所有商品吗？此操作将【一并清空购物车】，且无法恢复。', { confirmButtonClass: 'btn-danger' });
            if (confirmed) {
                try {
                    await this.db.transaction('rw', this.db.taobaoProducts, this.db.taobaoCart, async () => {
                        await this.db.taobaoProducts.clear();
                        await this.db.taobaoCart.clear();
                    });
                    await this.renderTaobaoProducts();
                    await this.renderTaobaoCart();
                    this.updateCartBadge();
                    await window.EPhone.showCustomAlert('操作成功', '所有商品及购物车已被清空！');
                } catch (error) {
                    console.error("清空桃宝商品时出错:", error);
                    await window.EPhone.showCustomAlert('操作失败', `发生错误: ${error.message}`);
                }
            }
        },
        
        handleShareCartRequest: async function() {
            const cartItems = await this.db.taobaoCart.toArray();
            if (cartItems.length === 0) return;
            const targetChatId = await window.EPhone.api.openCharSelector('选择代付人');
            if (!targetChatId) return;
            const char = await window.EPhone.api.getChat(targetChatId);
            if (!char) return;
            const totalPrice = parseFloat(document.getElementById('taobao-checkout-btn').dataset.totalPrice);
            const message = { type: 'cart_share_request', content: { totalPrice: totalPrice, items: cartItems.map(item => ({ productId: item.productId, quantity: item.quantity })) } };
            await window.EPhone.api.sendMessage(targetChatId, message);
            await this.clearTaobaoCart();
            await window.EPhone.showCustomAlert('分享成功', `已向“${char.name}”发送代付请求！`);
            window.EPhone.showScreen('chat-list-screen');
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
                    window.EPhone.showScreen('chat-list-screen');
                };
                await window.EPhone.api.updateWallet(-totalPrice, `为 ${char.name} 购买礼物`, buyCallback);
            }
        },
        
        sendGiftNotificationToChar: async function(targetChatId, products, cartItems, totalPrice) {
            const userNickname = await window.EPhone.api.getUserNickname();
            const itemsSummary = products.map((p, i) => `${p.name} x${cartItems.find(item => item.productId === p.id)?.quantity || '?'}`).join('、');
            const visibleMessage = { type: 'gift_notification', payload: { senderName: userNickname || '我', itemSummary: itemsSummary, totalPrice: totalPrice, itemCount: cartItems.length, } };
            const hiddenMessage = { content: `[系统指令：用户刚刚为你购买了${cartItems.length}件商品作为礼物，总价值为${totalPrice.toFixed(2)}元。商品包括：${itemsSummary}。请根据你的人设对此表示感谢或作出其他反应。]`, isHidden: true };
            await window.EPhone.api.sendMessage(targetChatId, visibleMessage);
            await window.EPhone.api.sendMessage(targetChatId, hiddenMessage);
        },
        
        clearTaobaoCart: async function() { await this.db.taobaoCart.clear(); await this.renderTaobaoCart(); await this.updateCartBadge(); },
        
        createOrdersFromCart: async function(cartItems) {
            const orders = cartItems.map(item => ({ productId: item.productId, quantity: item.quantity, timestamp: Date.now(), status: '已付款' }));
            await this.db.taobaoOrders.bulkAdd(orders);
        },
        
        openAddProductChoiceModal: function() { document.getElementById('taobao-add-product-choice-modal').classList.add('visible'); },
        
        openAddFromLinkModal: function() { document.getElementById('taobao-link-paste-area').value = ''; document.getElementById('taobao-add-from-link-modal').classList.add('visible'); },
        
        openProductEditor: async function(productId = null) {
            this.state.currentEditingProductId = productId;
            const modal = document.getElementById('taobao-product-editor-modal');
            const titleEl = document.getElementById('taobao-product-editor-title');
            const nameInput = document.getElementById('taobao-product-name-input');
            const priceInput = document.getElementById('taobao-product-price-input');
            const imageInput = document.getElementById('taobao-product-image-input');
            const categoryInput = document.getElementById('taobao-product-category-input');
            if (productId) {
                titleEl.textContent = '编辑商品';
                const product = await this.db.taobaoProducts.get(productId);
                nameInput.value = product.name; priceInput.value = product.price; imageInput.value = product.imageUrl; categoryInput.value = product.category || '';
            } else {
                titleEl.textContent = '添加新商品';
                nameInput.value = ''; priceInput.value = ''; imageInput.value = ''; categoryInput.value = '';
            }
            modal.classList.add('visible');
        },
        
        saveProduct: async function() {
            const name = document.getElementById('taobao-product-name-input').value.trim();
            const price = parseFloat(document.getElementById('taobao-product-price-input').value);
            let imageUrl = document.getElementById('taobao-product-image-input').value.trim();
            const category = document.getElementById('taobao-product-category-input').value.trim();
            if (!name || isNaN(price)) { alert('商品名称和价格不能为空！'); return; }
            if (!imageUrl) { imageUrl = this.getRandomDefaultProductImage(); }
            const productData = { name, price, imageUrl, category, reviews: [] };
            if (this.state.currentEditingProductId) { await this.db.taobaoProducts.update(this.state.currentEditingProductId, productData); }
            else { await this.db.taobaoProducts.add(productData); }
            document.getElementById('taobao-product-editor-modal').classList.remove('visible');
            await this.renderTaobaoProducts(this.state.currentTaobaoCategory);
        },

        // 【FIX 1】 Complete and correct implementation of renderBalanceDetails
        renderBalanceDetails: async function() {
            const balanceDisplay = document.getElementById('taobao-user-balance-display');
            if (!balanceDisplay) return;

            // Step 1: Render Balance
            const currentBalance = await window.EPhone.api.getWalletBalance();
            balanceDisplay.textContent = `¥ ${currentBalance.toFixed(2)}`;

            // Step 2: Render Transaction List
            const listEl = document.getElementById('taobao-balance-details-list');
            if (!listEl) return;
            
            const transactions = await this.db.userWalletTransactions.orderBy('timestamp').reverse().toArray();
            listEl.innerHTML = ''; // Clear previous list
            
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
                        ${isIncome ? '+' : ''} ¥${tx.amount.toFixed(2)}
                    </div>
                `;
                listEl.appendChild(itemEl);
            });
        },
        
        // 【FIX 2】 Placeholder functions for unimplemented features
        generateProductReviews: async function(productId) {
            await window.EPhone.showCustomAlert('AI功能', '该功能正在开发中...');
        },
        handleSearchProductsAI: async function() {
            await window.EPhone.showCustomAlert('AI功能', '该功能正在开发中...');
        },
        handleAddFromLink: async function() {
            await window.EPhone.showCustomAlert('AI功能', '该功能正在开发中...');
        },
        handleGenerateProductsAI: async function() {
            await window.EPhone.showCustomAlert('AI功能', '该功能正在开发中...');
        },
        showProductActions: async function(productId) {
            await window.EPhone.showCustomAlert('提示', '长按操作正在开发中...');
        },
        openLogisticsView: async function(orderId) {
             await window.EPhone.showCustomAlert('提示', '物流详情正在开发中...');
        },

    }; // End of TaobaoApp Object

    // ===================================================================
    //  Helper Functions
    // ===================================================================
    function addLongPressListener(element, callback) {
        let pressTimer;
        const startPress = (e) => { e.preventDefault(); pressTimer = window.setTimeout(() => callback(e), 500); };
        const cancelPress = () => clearTimeout(pressTimer);
        element.addEventListener('mousedown', startPress);
        element.addEventListener('mouseup', cancelPress);
        element.addEventListener('mouseleave', cancelPress);
        element.addEventListener('touchstart', startPress, { passive: false }); // Use passive: false for preventDefault
        element.addEventListener('touchend', cancelPress);
        element.addEventListener('touchmove', cancelPress);
    }
    function checkEnvironment() {
        if (typeof window.EPhone !== 'undefined' && typeof window.EPhone.showScreen === 'function') {
            TaobaoApp.isRunningInEPhone = true;
        } else {
            TaobaoApp.isRunningInEPhone = false;
        }
    }
    
    // ===================================================================
    //  Public API & Initialization
    // ===================================================================
    window.TaobaoAppModule = {
        init: function() {
            if (TaobaoApp.isInitialized) return;
            // Use async/await to ensure initialization completes
            (async () => {
                await TaobaoApp.initInternal();
                TaobaoApp.integrateWithHost();
                TaobaoApp.isInitialized = true;
                console.log("Taobao App Module Initialized.");
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
