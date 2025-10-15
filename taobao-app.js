// ==========================================
// Taobao Shopping App - 独立JS整合文件
// 版本: 1.0
// 使用方式:
// 1. 在HTML中引入Dexie.js: <script src="https://unpkg.com/dexie@latest/dist/dexie.js"></script>
// 2. 在HTML中引入本文件: <script src="taobaoApp.js" defer></script>
// 3. 调用初始化: window.launchTaobaoApp()
// ==========================================

(function (window) {
    'use strict';

    // 防止重复加载和初始化
    if (window.taobaoAppInitialized) {
        return;
    }

    // ============================================
    // 第一部分: CSS样式注入
    // ============================================
    function injectTaobaoStyles() {
        const styleId = 'taobao-app-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* --- “桃宝”App 容器，确保与宿主页面隔离 --- */
            #taobao-app-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 9999;
                display: none; /* 默认隐藏 */
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }

            #taobao-app-container .screen {
                display: flex;
                flex-direction: column;
                width: 100%;
                height: 100%;
                background-color: #fff;
                overflow: hidden;
            }

            #taobao-app-container .header {
                flex-shrink: 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 15px;
                padding-top: calc(12px + env(safe-area-inset-top)); /* 适配刘海屏 */
                background-color: #FF5722;
                color: white;
                font-size: 18px;
                font-weight: bold;
            }

            #taobao-app-container .back-btn {
                font-size: 24px;
                cursor: pointer;
                width: 40px;
            }

            #taobao-app-container .header-actions {
                display: flex;
                align-items: center;
                gap: 15px;
            }

            #taobao-app-container .action-btn {
                cursor: pointer;
                font-size: 24px;
                font-weight: bold;
            }

            /* --- “桃宝”App 整体布局 (来自你的源代码) --- */
            #taobao-screen {
                background-color: #f0f2f5;
            }

            .taobao-tabs {
                display: flex;
                flex-shrink: 0;
                border-bottom: 1px solid #e0e0e0;
                background-color: #fff;
            }
            .taobao-tab {
                flex: 1;
                padding: 12px 0;
                text-align: center;
                font-weight: 500;
                color: #666;
                border: none;
                background: none;
                cursor: pointer;
                position: relative;
                font-size: 15px;
            }
            .taobao-tab.active {
                color: #FF5722; /* 淘宝橙 */
            }
            .taobao-tab.active::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 40px;
                height: 3px;
                background-color: #FF5722;
                border-radius: 1.5px;
            }

            .taobao-content {
                flex-grow: 1;
                position: relative;
                overflow: hidden;
            }
            .taobao-view {
                position: absolute;
                top: 0; left: 0; width: 100%; height: 100%;
                overflow-y: auto;
                display: none;
                padding: 15px;
                box-sizing: border-box;
            }
            .taobao-view.active {
                display: block;
            }

            /* --- 首页/商品视图 --- */
            #product-category-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
                overflow-x: auto;
                padding-bottom: 5px; /* for scrollbar */
                scrollbar-width: none;
                -ms-overflow-style: none;
            }
            #product-category-tabs::-webkit-scrollbar { display: none; }

            #product-category-tabs .category-tab-btn {
                padding: 6px 12px;
                border-radius: 15px;
                border: 1px solid #ddd;
                background-color: #fff;
                white-space: nowrap;
                cursor: pointer;
                font-size: 13px;
            }
            #product-category-tabs .category-tab-btn.active {
                background-color: #FFEFE9;
                color: #FF5722;
                border-color: #FF5722;
            }

            .product-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
            }
            .product-card {
                background-color: #fff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 1px 4px rgba(0,0,0,0.08);
                cursor: pointer;
                position: relative;
            }
            .product-card .product-image {
                width: 100%;
                aspect-ratio: 1 / 1;
                object-fit: cover;
                background-color: #f0f2f5;
            }
            .product-card .product-info {
                padding: 8px;
            }
            .product-card .product-name {
                font-size: 14px;
                color: #333;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                min-height: 2.8em;
            }
            .product-card .product-price {
                font-size: 16px;
                font-weight: bold;
                color: #FF5722;
                margin-top: 5px;
            }
            .product-card .product-price::before {
                content: '¥';
                font-size: 12px;
                margin-right: 2px;
            }

            /* --- 我的/余额视图 --- */
            #my-view {
                background-color: #fff;
            }
            #user-balance-container {
                background: linear-gradient(135deg, #FF9A8B 0%, #FF6A88 100%);
                color: white;
                padding: 30px 20px;
                border-radius: 12px;
                text-align: center;
                text-shadow: 0 1px 3px rgba(0,0,0,0.2);
                margin-bottom: 20px;
            }
            #user-balance-container h2 {
                font-size: 40px;
                margin: 10px 0 20px 0;
            }
            #top-up-btn {
                background-color: rgba(255,255,255,0.9);
                color: #FF5722;
                border: none;
                padding: 10px 20px;
                border-radius: 20px;
                font-weight: 500;
                cursor: pointer;
            }

            /* --- 订单/物流视图 --- */
            .order-list {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            .order-item {
                background-color: #fff;
                border-radius: 8px;
                padding: 12px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                display: flex;
                gap: 12px;
                cursor: pointer;
            }
            .order-item .product-image {
                width: 70px;
                height: 70px;
                border-radius: 6px;
                flex-shrink: 0;
                object-fit: cover;
            }
            .order-item .order-info {
                flex-grow: 1;
            }
            .order-item .product-name {
                font-weight: 500;
                color: #333;
            }
            .order-item .order-status {
                font-size: 13px;
                color: #28a745;
                margin-top: 8px;
                font-weight: 500;
            }
            .order-item .order-time {
                font-size: 12px;
                color: #888;
                margin-top: 4px;
            }

            /* --- 搜索栏 --- */
            .taobao-search-bar {
                display: flex;
                gap: 10px;
                padding: 0 0 15px 0;
            }
            #product-search-input {
                flex-grow: 1;
                border: 1px solid #FF5722;
                padding: 10px 15px;
                border-radius: 20px;
                font-size: 14px;
                outline: none;
                -webkit-appearance: none;
            }
            #product-search-btn {
                background-color: #FF5722;
                color: white;
                border: none;
                border-radius: 20px;
                padding: 0 20px;
                font-weight: 500;
                cursor: pointer;
                flex-shrink: 0;
            }

            /* --- AI生成结果弹窗 --- */
            #ai-product-results-grid .product-card {
                padding-bottom: 40px;
                cursor: default;
            }
            .add-to-my-page-btn {
                position: absolute;
                bottom: 8px;
                left: 8px;
                right: 8px;
                width: calc(100% - 16px);
                padding: 8px 0;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 6px;
                font-weight: 500;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            .add-to-my-page-btn:hover {
                background-color: #45a049;
            }
            .add-to-my-page-btn:disabled {
                background-color: #cccccc;
                cursor: not-allowed;
            }

            /* --- 购物车 --- */
            .taobao-tab #cart-item-count-badge {
                position: absolute;
                top: 5px;
                right: 15px;
                min-width: 18px;
                height: 18px;
                padding: 0 5px;
                background-color: #FF5722;
                color: white;
                font-size: 11px;
                border-radius: 9px;
                line-height: 18px;
                box-sizing: content-box;
            }
            .product-card .add-cart-btn {
                position: absolute;
                bottom: 5px;
                right: 5px;
                width: 28px;
                height: 28px;
                background-color: #FF5722;
                color: white;
                border: none;
                border-radius: 50%;
                font-size: 18px;
                line-height: 28px;
                text-align: center;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                transition: transform 0.2s;
            }
            .product-card .add-cart-btn:active {
                transform: scale(0.9);
            }
            #cart-item-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
                padding-bottom: 80px; /* 留出结算栏空间 */
            }
            .cart-item {
                background-color: #fff;
                border-radius: 8px;
                padding: 12px;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .cart-item .product-image {
                width: 80px;
                height: 80px;
                border-radius: 6px;
                flex-shrink: 0;
                cursor: pointer;
                object-fit: cover;
            }
            .cart-item .cart-item-info {
                flex-grow: 1;
                cursor: pointer;
            }
            .cart-item .product-name {
                font-weight: 500;
                color: #333;
            }
            .cart-item .product-price {
                color: #FF5722;
                font-weight: bold;
                margin-top: 8px;
            }
            .cart-item .quantity-controls {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .cart-item .quantity-controls button {
                width: 24px;
                height: 24px;
                border: 1px solid #ccc;
                background-color: #f0f0f0;
                border-radius: 50%;
                cursor: pointer;
                font-weight: bold;
                color: #555;
            }
            .cart-item .quantity-controls button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .cart-item .quantity-display {
                min-width: 20px;
                text-align: center;
                font-weight: 500;
            }
            .cart-item .delete-cart-item-btn {
                width: 30px;
                height: 30px;
                border: none;
                background: none;
                color: #999;
                font-size: 24px;
                cursor: pointer;
                flex-shrink: 0;
            }
            #cart-checkout-bar {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                padding: 10px 15px;
                padding-bottom: calc(10px + env(safe-area-inset-bottom));
                background-color: #fff;
                border-top: 1px solid #e0e0e0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-sizing: border-box;
            }
            #cart-checkout-bar .total-price {
                font-weight: bold;
                color: #333;
            }
            #cart-checkout-bar #cart-total-price {
                color: #FF5722;
                font-size: 18px;
            }
            #cart-checkout-bar #checkout-btn, #share-cart-to-char-btn, #buy-for-char-btn {
                color: white;
                border: none;
                padding: 10px 15px;
                border-radius: 20px;
                font-weight: 500;
                cursor: pointer;
                font-size: 14px;
            }
            #checkout-btn { background-color: #FF5722; }
            #share-cart-to-char-btn { background-color: #FF9800; }
            #buy-for-char-btn { background-color: #4CAF50; }

            /* --- 通用弹窗 (Modal) 样式 --- */
            .modal {
                display: none;
                position: fixed;
                z-index: 10000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0,0,0,0.5);
                backdrop-filter: blur(4px);
            }
            .modal.visible {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .modal-content {
                background-color: #fff;
                margin: auto;
                border-radius: 12px;
                width: 90%;
                max-width: 450px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                animation: modal-anim 0.3s ease-out;
                display: flex;
                flex-direction: column;
                max-height: 90vh;
            }
            @keyframes modal-anim {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            .modal-header {
                padding: 15px;
                border-bottom: 1px solid #eee;
                font-size: 16px;
                font-weight: 600;
                text-align: center;
            }
            .modal-body {
                padding: 20px;
                overflow-y: auto;
            }
            .modal-footer {
                padding: 15px;
                border-top: 1px solid #eee;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }
            .modal-footer button {
                padding: 8px 18px;
                border-radius: 20px;
                border: 1px solid #ccc;
                cursor: pointer;
                font-weight: 500;
            }
            .modal-footer button.cancel {
                background-color: #f0f0f0;
            }
            .modal-footer button.save {
                background-color: #FF5722;
                color: white;
                border-color: #FF5722;
            }
            
            /* --- 商品详情弹窗 --- */
            #product-detail-body {
                text-align: center;
            }
            #product-detail-body .product-image {
                width: 80%;
                max-width: 250px;
                border-radius: 8px;
                margin-bottom: 15px;
            }
            #product-detail-body .product-name {
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            #product-detail-body .product-price {
                font-size: 24px;
                font-weight: bold;
                color: #FF5722;
                margin-bottom: 20px;
            }
            #product-detail-body .product-price::before {
                content: '¥';
                font-size: 16px;
            }

            /* --- 商品评价 --- */
            #product-reviews-section {
                padding: 0 15px 15px 15px;
                border-top: 1px solid #eee;
                margin-top: 15px;
            }
            #product-reviews-section h3 {
                font-size: 16px;
                margin: 15px 0;
            }
            #product-reviews-list {
                display: flex;
                flex-direction: column;
                gap: 15px;
                max-height: 150px;
                overflow-y: auto;
                margin-bottom: 15px;
            }
            .product-review-item {
                font-size: 14px;
                line-height: 1.6;
                border-bottom: 1px solid #f0f0f0;
                padding-bottom: 10px;
            }
            .product-review-item .review-author {
                font-weight: 500;
                color: #888;
                margin-bottom: 5px;
            }
            .form-button, .form-button-secondary {
                width: 100%;
                margin-top: 10px;
                padding: 10px;
                border-radius: 8px;
                font-size: 15px;
                font-weight: 500;
                cursor: pointer;
            }
            .form-button-secondary {
                background-color: #fff7e6;
                color: #fa8c16;
                border: 1px solid #ffd591;
            }

            /* --- 余额明细 --- */
            .transaction-item {
                background-color: #fff;
                border-radius: 8px;
                padding: 12px 15px;
                margin-bottom: 10px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .transaction-info .description {
                font-weight: 500;
                color: #333;
            }
            .transaction-info .timestamp {
                font-size: 12px;
                color: #888;
                margin-top: 4px;
            }
            .transaction-amount {
                font-weight: bold;
                font-size: 16px;
            }
            .transaction-amount.income {
                color: #4CAF50;
            }
            .transaction-amount.expense {
                color: #F44336;
            }

            /* --- 物流详情 --- */
            #logistics-screen .list-container {
                padding: 20px;
                background-color: #f5f5f5;
            }
            .logistics-product-summary {
                display: flex;
                gap: 15px;
                padding: 15px;
                margin-bottom: 20px;
                background-color: #fff;
                border-radius: 12px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.08);
            }
            .logistics-product-summary .product-image {
                width: 60px;
                height: 60px;
                border-radius: 8px;
                flex-shrink: 0;
                object-fit: cover;
            }
            .logistics-product-summary .info .name {
                font-weight: 600;
                font-size: 15px;
                color: #333;
            }
            .logistics-product-summary .info .status {
                font-size: 13px;
                color: #FF5722;
                margin-top: 5px;
                font-weight: 500;
            }
            .logistics-timeline {
                position: relative;
                padding: 20px 20px 20px 30px;
                background-color: #fff;
                border-radius: 12px;
            }
            .logistics-timeline::before {
                content: '';
                position: absolute;
                left: 15px;
                top: 20px;
                bottom: 20px;
                width: 2px;
                background-color: #e0e0e0;
            }
            .logistics-step {
                position: relative;
                margin-bottom: 25px;
            }
            .logistics-step:last-child {
                margin-bottom: 0;
            }
            .logistics-step::before {
                content: '';
                position: absolute;
                left: -22px; 
                top: 5px;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background-color: #ccc;
                border: 2px solid #fff;
                z-index: 1;
            }
            .logistics-step:first-child::before {
                background-color: #FF5722;
                transform: scale(1.3);
            }
            .logistics-step-content .status-text {
                font-weight: 500;
                font-size: 14px;
                color: #555;
                margin-bottom: 5px;
                line-height: 1.5;
            }
            .logistics-step-content .timestamp {
                font-size: 12px;
                color: #888;
            }

            /* --- 表单样式 --- */
            .form-group {
                margin-bottom: 15px;
            }
            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
                font-size: 14px;
                color: #555;
            }
            .form-group input, .form-group textarea {
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                box-sizing: border-box;
                font-size: 14px;
                -webkit-appearance: none;
            }
            .form-group textarea {
                resize: vertical;
            }
        `;
        document.head.appendChild(style);
        console.log('✅ Taobao App: 样式已注入');
    }

    // ============================================
    // 第二部分: HTML结构生成
    // ============================================
    function createTaobaoHTML() {
        const containerId = 'taobao-app-container';
        if (document.getElementById(containerId)) return;

        const container = document.createElement('div');
        container.id = containerId;

        // 注意：这里所有的 onclick 都已被移除，事件将通过 JS 统一处理
        container.innerHTML = `
            <!-- ▼▼▼ “桃宝”功能主屏幕 ▼▼▼ -->
            <div id="taobao-screen" class="screen">
                <div class="header">
                    <span class="back-btn" id="taobao-main-back-btn">‹</span>
                    <span>桃宝</span>
                    <div class="header-actions">
                        <span class="action-btn" id="clear-taobao-products-btn" style="font-size: 16px; font-weight: 500;">清空</span>
                        <span class="action-btn" id="add-product-btn" title="添加商品">+</span>
                    </div>
                </div>
                
                <div class="taobao-tabs">
                    <button class="taobao-tab active" data-view="products-view">首页</button>
                    <button class="taobao-tab" data-view="cart-view">
                        购物车<span id="cart-item-count-badge" style="display: none;">0</span>
                    </button>
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
                            <div class="total-price">
                                合计: <span id="cart-total-price">¥ 0.00</span>
                            </div>
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

            <!-- ▼▼▼ 物流详情页面 ▼▼▼ -->
            <div id="logistics-screen" class="screen" style="display:none;">
                <div class="header">
                    <span class="back-btn" id="logistics-back-btn">‹</span>
                    <span>物流详情</span>
                    <span style="width: 30px;"></span>
                </div>
                <div id="logistics-content-area" class="list-container"></div>
            </div>

            <!-- ▼▼▼ 商品详情弹窗 (Modal) ▼▼▼ -->
            <div id="product-detail-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header"><span>商品详情</span></div>
                    <div class="modal-body" id="product-detail-body"></div>
                    <div id="product-reviews-section">
                        <h3>宝贝评价</h3>
                        <div id="product-reviews-list"></div>
                        <button id="generate-reviews-btn" class="form-button form-button-secondary">✨ AI生成评价</button>
                    </div>
                    <div class="modal-footer">
                        <button class="cancel" id="close-product-detail-btn">关闭</button>
                        <button class="save" id="detail-add-to-cart-btn">加入购物车</button>
                    </div>
                </div>
            </div>

            <!-- ▼▼▼ 添加商品方式选择弹窗 (Modal) ▼▼▼ -->
            <div id="add-product-choice-modal" class="modal">
                <div class="modal-content" style="width: 250px; height:auto;">
                    <div class="modal-header">选择添加方式</div>
                    <div class="modal-body" style="display: flex; flex-direction: column; gap: 10px;">
                        <button id="add-product-manual-btn" class="form-button" style="margin-top:0;">手动添加</button>
                        <button id="add-product-link-btn" class="form-button">识别链接</button>
                        <button id="add-product-ai-btn" class="form-button">AI生成</button>
                    </div>
                    <div class="modal-footer">
                         <button id="cancel-add-choice-btn" class="cancel" style="width:100%;">取消</button>
                    </div>
                </div>
            </div>

            <!-- ▼▼▼ 手动添加/编辑商品弹窗 (Modal) ▼▼▼ -->
            <div id="product-editor-modal" class="modal">
                <div class="modal-content" style="height: auto;">
                    <div class="modal-header"><span id="product-editor-title">添加新商品</span></div>
                    <div class="modal-body">
                        <div class="form-group"><label for="product-name-input">商品名称</label><input type="text" id="product-name-input"></div>
                        <div class="form-group"><label for="product-price-input">价格 (元)</label><input type="number" id="product-price-input"></div>
                        <div class="form-group"><label for="product-image-input">图片 URL</label><input type="text" id="product-image-input"></div>
                        <div class="form-group"><label for="product-category-input">分类 (选填)</label><input type="text" id="product-category-input" placeholder="例如：衣服, 零食..."></div>
                    </div>
                    <div class="modal-footer">
                        <button class="cancel" id="cancel-product-editor-btn">取消</button>
                        <button class="save" id="save-product-btn">保存</button>
                    </div>
                </div>
            </div>

            <!-- ▼▼▼ 识别链接弹窗 (Modal) ▼▼▼ -->
            <div id="add-from-link-modal" class="modal">
                <div class="modal-content" style="height: auto;">
                    <div class="modal-header"><span>粘贴分享文案</span></div>
                    <div class="modal-body"><textarea id="link-paste-area" rows="6" placeholder="请在这里粘贴完整的淘宝或拼多多分享文案..."></textarea></div>
                    <div class="modal-footer">
                        <button class="cancel" id="cancel-link-paste-btn">取消</button>
                        <button class="save" id="confirm-link-paste-btn">识别</button>
                    </div>
                </div>
            </div>

            <!-- ▼▼▼ AI生成商品结果弹窗 (Modal) ▼▼▼ -->
            <div id="ai-generated-products-modal" class="modal">
                <div class="modal-content" style="height: 80%;">
                    <div class="modal-header"><span id="ai-products-modal-title">AI为你生成了以下宝贝</span></div>
                    <div class="modal-body" style="padding: 15px;"><div id="ai-product-results-grid" class="product-grid"></div></div>
                    <div class="modal-footer"><button class="save" id="close-ai-products-modal-btn" style="width: 100%;">完成</button></div>
                </div>
            </div>
        `;
        document.body.appendChild(container);
        console.log('✅ Taobao App: HTML结构已创建');
    }

    // ============================================
    // 第三部分: 核心JavaScript功能
    // ============================================

    let db;
    const state = {
        userBalance: 0.00,
        currentCategory: null,
        currentEditingProductId: null,
        logisticsUpdateTimers: []
    };

    // --- 数据库设置 ---
    function setupDatabase() {
        // 使用独立数据库名，避免与 pp.js 的 XSocialDB 冲突
        db = new Dexie('TaobaoAppDB');
        db.version(1).stores({
            taobaoProducts: '++id, name, category',
            taobaoOrders: '++id, &orderNumber, timestamp',
            taobaoCart: '++id, productId',
            userWalletTransactions: '++id, timestamp',
            globalSettings: 'id' // 用来存储余额等全局信息
        });
        db.open().catch(err => {
            console.error("无法打开数据库: " + err.stack || err);
        });
    }

    // --- 弹窗与视图管理 ---
    function showTaobaoScreen(screenId) {
        const screens = ['taobao-screen', 'logistics-screen'];
        screens.forEach(id => {
            const screen = document.getElementById(id);
            if (screen) {
                screen.style.display = (id === screenId) ? 'flex' : 'none';
            }
        });
    }
    
    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('visible');
    }

    function hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('visible');
    }

    function switchTaobaoView(viewId) {
        document.querySelectorAll('#taobao-app-container .taobao-view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');

        document.querySelectorAll('#taobao-app-container .taobao-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.view === viewId);
        });

        if (viewId === 'orders-view') renderTaobaoOrders();
        else if (viewId === 'my-view') renderBalanceDetails();
        else if (viewId === 'cart-view') renderTaobaoCart();
        else if (viewId === 'products-view') renderTaobaoProducts();
    }
    
    // --- 数据渲染与更新 ---

    /**
     * 更新用户余额显示
     */
    async function updateUserBalanceDisplay() {
        const setting = await db.globalSettings.get('userBalance');
        state.userBalance = setting ? setting.value : 0;
        document.getElementById('user-balance-display').textContent = `¥ ${state.userBalance.toFixed(2)}`;
    }

    /**
     * 更新购物车角标
     */
    async function updateCartBadge() {
        const badge = document.getElementById('cart-item-count-badge');
        const items = await db.taobaoCart.toArray();
        const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
        if (totalCount > 0) {
            badge.textContent = totalCount > 99 ? '99+' : totalCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
    
    /**
     * 渲染商品列表
     */
    async function renderTaobaoProducts(category = null) {
        state.currentCategory = category;
        const gridEl = document.getElementById('product-grid');
        const categoryTabsEl = document.getElementById('product-category-tabs');
        gridEl.innerHTML = '';

        const allProducts = await db.taobaoProducts.orderBy('id').reverse().toArray();
        const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];

        let tabsHtml = `<button class="category-tab-btn ${!category ? 'active' : ''}" data-category="all">全部</button>`;
        categories.forEach(cat => {
            tabsHtml += `<button class="category-tab-btn ${category === cat ? 'active' : ''}" data-category="${cat}">${cat}</button>`;
        });
        categoryTabsEl.innerHTML = tabsHtml;

        const productsToRender = category ? allProducts.filter(p => p.category === category) : allProducts;
        
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
                <button class="add-cart-btn" data-product-id="${product.id}">+</button>
            `;
            gridEl.appendChild(card);
        });
    }

    /**
     * 渲染购物车
     */
    async function renderTaobaoCart() {
        const listEl = document.getElementById('cart-item-list');
        const checkoutBar = document.getElementById('cart-checkout-bar');
        listEl.innerHTML = '';
        
        const cartItems = await db.taobaoCart.toArray();

        if (cartItems.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: #888; padding: 50px 0;">购物车空空如也~</p>';
            checkoutBar.style.display = 'none';
            updateCartBadge();
            return;
        }
        
        checkoutBar.style.display = 'flex';
        let totalPrice = 0;
        let totalItems = 0;

        for (const item of cartItems) {
            const product = await db.taobaoProducts.get(item.productId);
            if (!product) continue;

            totalItems += item.quantity;
            totalPrice += product.price * item.quantity;

            const itemEl = document.createElement('div');
            itemEl.className = 'cart-item';
            itemEl.dataset.cartId = item.id;
            itemEl.innerHTML = `
                <img src="${product.imageUrl}" class="product-image" data-product-id="${product.id}">
                <div class="cart-item-info" data-product-id="${product.id}">
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">¥${product.price.toFixed(2)}</div>
                </div>
                <div class="quantity-controls">
                    <button class="quantity-decrease" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="quantity-increase">+</button>
                </div>
                <button class="delete-cart-item-btn">×</button>
            `;
            listEl.appendChild(itemEl);
        }
        
        document.getElementById('cart-total-price').textContent = `¥ ${totalPrice.toFixed(2)}`;
        document.getElementById('checkout-btn').textContent = `结算(${totalItems})`;
        updateCartBadge();
    }

    /**
     * 渲染订单列表
     */
    async function renderTaobaoOrders() {
        const orderListEl = document.getElementById('order-list');
        orderListEl.innerHTML = '';
        const orders = await db.taobaoOrders.orderBy('timestamp').reverse().toArray();

        if (orders.length === 0) {
            orderListEl.innerHTML = '<p style="text-align:center; color: #888; padding: 50px 0;">你还没有任何订单哦~</p>';
            return;
        }

        for (const order of orders) {
            const product = await db.taobaoProducts.get(order.productId);
            if (!product) continue;

            const itemEl = document.createElement('div');
            itemEl.className = 'order-item';
            itemEl.dataset.orderId = order.id;
            itemEl.innerHTML = `
                <img src="${product.imageUrl}" class="product-image">
                <div class="order-info">
                    <div class="product-name">${product.name}</div>
                    <div class="order-status" id="status-${order.orderNumber}">订单已提交</div>
                    <div class="order-time">${new Date(order.timestamp).toLocaleString()}</div>
                </div>
            `;
            orderListEl.appendChild(itemEl);
        }
    }
    
    /**
     * 渲染余额明细
     */
    async function renderBalanceDetails() {
        await updateUserBalanceDisplay();
        const listEl = document.getElementById('balance-details-list');
        listEl.innerHTML = '';
        const transactions = await db.userWalletTransactions.orderBy('timestamp').reverse().toArray();

        if (transactions.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: #888; padding: 20px 0;">暂无收支明细</p>';
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
    }

    // --- 核心业务逻辑函数 ---

    /**
     * 更新余额并记录交易
     */
    async function updateUserBalanceAndLogTransaction(amount, description) {
        const newBalance = state.userBalance + amount;
        await db.globalSettings.put({ id: 'userBalance', value: newBalance });
        await db.userWalletTransactions.add({
            amount: amount,
            description: description,
            timestamp: Date.now()
        });
        await updateUserBalanceDisplay();
    }
    
    /**
     * 结算购物车
     */
    async function handleCheckout() {
        const cartItems = await db.taobaoCart.toArray();
        if (cartItems.length === 0) {
            alert("购物车是空的！");
            return;
        }

        let totalPrice = 0;
        for (const item of cartItems) {
            const product = await db.taobaoProducts.get(item.productId);
            if (product) {
                totalPrice += product.price * item.quantity;
            }
        }

        if (state.userBalance < totalPrice) {
            alert(`余额不足！需要 ¥${totalPrice.toFixed(2)}, 当前余额 ¥${state.userBalance.toFixed(2)}`);
            return;
        }
        
        if (confirm(`总计 ¥${totalPrice.toFixed(2)}，确认支付吗？`)) {
            await updateUserBalanceAndLogTransaction(-totalPrice, '购物消费');
            await createOrdersFromCart(cartItems);
            await db.taobaoCart.clear();
            await renderTaobaoCart();
            alert('支付成功，已生成订单！');
            switchTaobaoView('orders-view');
        }
    }
    
    /**
     * 根据购物车内容创建订单
     */
    async function createOrdersFromCart(cartItems) {
        const newOrders = [];
        const timestamp = Date.now();
        for (const item of cartItems) {
            for (let i = 0; i < item.quantity; i++) {
                newOrders.push({
                    orderNumber: `TB${timestamp}${item.productId}${i}`,
                    productId: item.productId,
                    timestamp: timestamp + i, // 稍微错开时间以保证唯一性
                    status: '订单已提交'
                });
            }
        }
        await db.taobaoOrders.bulkAdd(newOrders);
    }
    
    // --- 事件处理器 ---
    
    function handleAddToCart(productId) {
        db.transaction('rw', db.taobaoCart, async () => {
            const existingItem = await db.taobaoCart.where({ productId }).first();
            if (existingItem) {
                await db.taobaoCart.update(existingItem.id, { quantity: existingItem.quantity + 1 });
            } else {
                await db.taobaoCart.add({ productId: productId, quantity: 1 });
            }
        }).then(() => {
            // 在这里添加UI反馈
            updateCartBadge();
        }).catch(err => console.error(err));
    }
    
    async function handleChangeCartItemQuantity(cartId, change) {
        const item = await db.taobaoCart.get(cartId);
        if (!item) return;
        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) {
            await db.taobaoCart.delete(cartId);
        } else {
            await db.taobaoCart.update(cartId, { quantity: newQuantity });
        }
        await renderTaobaoCart();
    }
    
    async function handleRemoveFromCart(cartId) {
        if (confirm('确定要删除这个宝贝吗？')) {
            await db.taobaoCart.delete(cartId);
            await renderTaobaoCart();
        }
    }

    // ============================================
    // 第四部分: 初始化和事件绑定
    // ============================================

    function bindEventListeners() {
        const container = document.getElementById('taobao-app-container');
        if (!container) return;
        
        // 使用事件委托处理所有点击事件
        container.addEventListener('click', e => {
            const target = e.target;

            // 主返回按钮
            if (target.id === 'taobao-main-back-btn') {
                container.style.display = 'none';
            }
            
            // 页签切换
            const tab = target.closest('.taobao-tab');
            if (tab) {
                switchTaobaoView(tab.dataset.view);
                return;
            }

            // --- 首页 ---
            if (target.id === 'clear-taobao-products-btn') {
                // 此处应有确认弹窗
                if(confirm('确定要清空所有商品和购物车吗？')) {
                    db.taobaoProducts.clear();
                    db.taobaoCart.clear();
                    renderTaobaoProducts();
                    updateCartBadge();
                }
            }
            if (target.id === 'add-product-btn') showModal('add-product-choice-modal');
            if (target.id === 'product-search-btn') alert('搜索功能待实现');
            
            const categoryTab = target.closest('.category-tab-btn');
            if (categoryTab) {
                const category = categoryTab.dataset.category === 'all' ? null : categoryTab.dataset.category;
                renderTaobaoProducts(category);
            }
            
            const addCartBtn = target.closest('.add-cart-btn');
            if (addCartBtn) {
                const productId = parseInt(addCartBtn.dataset.productId);
                handleAddToCart(productId);
            }
            
            const productCard = target.closest('.product-card');
            if (productCard && !addCartBtn) {
                // openProductDetail(parseInt(productCard.dataset.productId));
                alert("商品详情待实现");
            }
            
            // --- 购物车 ---
            const increaseBtn = target.closest('.quantity-increase');
            if (increaseBtn) {
                const cartId = parseInt(increaseBtn.closest('.cart-item').dataset.cartId);
                handleChangeCartItemQuantity(cartId, 1);
            }
            const decreaseBtn = target.closest('.quantity-decrease');
            if (decreaseBtn) {
                const cartId = parseInt(decreaseBtn.closest('.cart-item').dataset.cartId);
                handleChangeCartItemQuantity(cartId, -1);
            }
            const deleteBtn = target.closest('.delete-cart-item-btn');
            if (deleteBtn) {
                const cartId = parseInt(deleteBtn.closest('.cart-item').dataset.cartId);
                handleRemoveFromCart(cartId);
            }
            if (target.id === 'checkout-btn') handleCheckout();
            if (target.id === 'share-cart-to-char-btn') alert('分享代付功能待实现');
            if (target.id === 'buy-for-char-btn') alert('为Ta购买功能待实现');
            
            // --- 我的 ---
            if (target.id === 'top-up-btn') {
                const amount = prompt("请输入充值金额:", "100");
                if (amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0) {
                    updateUserBalanceAndLogTransaction(parseFloat(amount), '钱包充值');
                }
            }
            
            // --- 订单 ---
            const orderItem = target.closest('.order-item');
            if (orderItem && orderItem.closest('#orders-view')) {
                alert('物流详情待实现');
                // openLogisticsView(parseInt(orderItem.dataset.orderId));
            }
            
            // --- 弹窗关闭按钮 ---
            if (target.matches('.cancel, #close-product-detail-btn, #cancel-add-choice-btn, #cancel-product-editor-btn, #cancel-link-paste-btn, #close-ai-products-modal-btn')) {
                const modal = target.closest('.modal');
                if (modal) hideModal(modal.id);
            }
            
            // --- 弹窗功能按钮 ---
            if (target.id === 'add-product-manual-btn') { hideModal('add-product-choice-modal'); showModal('product-editor-modal'); }
            if (target.id === 'add-product-link-btn') { hideModal('add-product-choice-modal'); showModal('add-from-link-modal'); }
            if (target.id === 'add-product-ai-btn') { alert('AI生成功能待实现'); }
            if (target.id === 'save-product-btn') { alert('保存商品功能待实现'); }
            if (target.id === 'confirm-link-paste-btn') { alert('识别链接功能待实现'); }

        });
        
        console.log('✅ Taobao App: 事件监听器已绑定');
    }

    /**
     * 主初始化函数
     */
    async function initTaobaoApp() {
        injectTaobaoStyles();
        createTaobaoHTML();
        setupDatabase();
        bindEventListeners();
        
        // 加载初始数据和UI
        await updateUserBalanceDisplay();
        await renderTaobaoProducts();
        await updateCartBadge();
        
        console.log('🚀 Taobao App 初始化完成');
    }

    // ▼▼▼ 【请用这整块全新的、已修复的代码】替换掉 taobaoApp.js 文件末尾的旧代码 ▼▼▼

    // 暴露一个启动器给外部的 showScreen 函数调用
    window.showTaobaoAppScreen = function() {
        const container = document.getElementById('taobao-app-container');
        if (container) {
            container.classList.add('active'); // 使用 classList.add('active') 来显示
            // 每次启动时依然可以刷新数据
            updateUserBalanceDisplay();
            renderTaobaoProducts();
            updateCartBadge();
            switchTaobaoView('products-view');
        }
    };

    /**
     * 主初始化函数 (这个函数保持不变，但我们把CSS和返回按钮的修改逻辑移到这里)
     */
    async function initTaobaoApp() {
        injectTaobaoStyles();
        createTaobaoHTML();
        
        // --- 核心修复 1: 将CSS修改逻辑移到这里 ---
        // 在 inject 和 create 都执行完毕后，我们100%确定这些元素已经存在于DOM中
        const styleTag = document.getElementById('taobao-app-styles');
        if (styleTag) {
            // 将主容器的样式规则修改为需要 .screen 和 .active 才能显示
            // 这样它就能被外部的 showScreen() 函数控制了
            styleTag.textContent = styleTag.textContent.replace(
                '#taobao-app-container {', 
                '#taobao-app-container.screen {'
            ).replace(
                'display: none;',
                '' // 移除 display: none，完全交由 active 类控制
            );
        }

        // --- 核心修复 2: 将返回按钮的事件绑定也移到这里 ---
        const mainBackButton = document.getElementById('taobao-main-back-btn');
        if(mainBackButton) {
            // 注意：这里我们假设全局存在一个 showScreen 函数
            // 点击返回按钮时，调用外部的 showScreen 来返回主屏幕
            mainBackButton.onclick = () => window.showScreen('home-screen');
        }

        // 绑定所有内部的事件监听器
        bindEventListeners();
        setupDatabase();
        
        // 加载初始数据和UI (这部分逻辑保持不变)
        await updateUserBalanceDisplay();
        await renderTaobaoProducts();
        await updateCartBadge();
        
        console.log('🚀 Taobao App 初始化完成 (showScreen 兼容模式)');
    }

    // ============================================
    // 第五部分: 暴露全局接口 (现在只负责触发初始化)
    // ============================================
    // 我们不再直接暴露启动函数，而是让脚本自动初始化
    
    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTaobaoApp);
    } else {
        initTaobaoApp();
    }

    window.taobaoAppInitialized = true;
    console.log('📦 Taobao App 模块已加载 (showScreen 兼容模式)');

})(window);

// ▲▲▲ 替换到这里结束 ▲▲▲
