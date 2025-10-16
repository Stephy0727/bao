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
            <div id="logistics-screen" class="screen">
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
        logisticsProcessorInterval: null // 【核心修改1】全局唯一的后台处理器定时器
    };

    // ▼▼▼ 【新增】物流时间线模板，来自你的源代码 ▼▼▼
    const logisticsTimelineTemplate = [
        { text: '您的订单已提交', delay: 1000 * 2 },
        { text: '付款成功，等待商家打包', delay: 1000 * 10 },
        { text: '【{city}仓库】已打包，等待快递揽收', delay: 1000 * 15 }, // 为演示效果缩短时间
        { text: '【{city}快递】已揽收', delay: 1000 * 25 },
        { text: '快件已到达【{city}分拨中心】', delay: 1000 * 40 },
        { text: '【{city}分拨中心】已发出，下一站【{next_city}】', delay: 1000 * 60 },
        { text: '快件已到达【{user_city}转运中心】', delay: 1000 * 80 },
        { text: '快件正在派送中，派送员：兔兔快递员，电话：123-4567-8910', delay: 1000 * 100 },
        { text: '您的快件已签收，感谢您在桃宝购物！', delay: 1000 * 120 },
    ];
    // ▲▲▲ 新增结束 ▲▲▲

    // --- 数据库设置 ---
    function setupDatabase() {
        db = new Dexie('TaobaoAppDB');
        // 版本升级到 2
        db.version(2).stores({
            taobaoProducts: '++id, name, category',
            // 新增 logisticsHistory 字段
            taobaoOrders: '++id, &orderNumber, timestamp, status, logisticsHistory', 
            taobaoCart: '++id, productId',
            userWalletTransactions: '++id, timestamp',
            globalSettings: 'id'
        }).upgrade(tx => {
            // Dexie的升级函数，用于处理旧版本数据的迁移
            // 这里我们给所有旧订单加上一个空的 logisticsHistory 数组
            return tx.table("taobaoOrders").toCollection().modify(order => {
                order.logisticsHistory = [];
            });
        });
        
        // 保留旧版本定义，以防用户浏览器中存在旧版本数据库
        db.version(1).stores({
            taobaoProducts: '++id, name, category',
            taobaoOrders: '++id, &orderNumber, timestamp',
            taobaoCart: '++id, productId',
            userWalletTransactions: '++id, timestamp',
            globalSettings: 'id'
        });

        db.open().catch(err => {
            console.error("无法打开数据库: " + err.stack || err);
        });
    }
/**
     * 植入初始数据 (仅在数据库为空时运行)
     */
async function seedInitialData() {
    const productCount = await db.taobaoProducts.count();
    // 只有当商品数量为0时，才添加默认商品
    if (productCount === 0) {
        console.log('数据库为空，正在植入初始商品数据...');
        await db.taobaoProducts.bulkAdd([
            { 
                name: "赛博朋克风机能冲锋衣", 
                price: 399.00, 
                imageUrl: "https://i.postimg.cc/C1jH8JzT/a.jpg", 
                category: "服饰" 
            },
            { 
                name: "猫咪太空舱双肩包", 
                price: 188.00, 
                imageUrl: "https://i.postimg.cc/pr0TgtwV/b.jpg", 
                category: "宠物用品" 
            }
        ]);
    }
}

    function showTaobaoScreen(screenId) {
        const screens = ['taobao-screen', 'logistics-screen'];
        const container = document.getElementById('taobao-app-container');
        screens.forEach(id => {
            const screen = container.querySelector('#' + id);
            if (screen) {
                // 不再使用 display, 而是用 active class 控制
                screen.classList.toggle('active', id === screenId);
            }
        });
    }
  // ▼▼▼ 【核心新增1】根据时间计算当前订单状态的函数 ▼▼▼
    /**
     * @param {object} order - 订单对象，必须包含 timestamp 字段
     * @returns {string} - 计算出的当前最新状态文本
     */
    function calculateCurrentOrderStatus(order) {
        const elapsedTime = Date.now() - order.timestamp;
        let currentStatus = order.status || '订单已提交';
        let cumulativeDelay = 0;

        for (const step of logisticsTimelineTemplate) {
            cumulativeDelay += step.delay;
            if (elapsedTime >= cumulativeDelay) {
                // 仅取主要状态文本，忽略城市等细节
                currentStatus = step.text.split('，')[0];
            } else {
                break; // 后续步骤尚未发生
            }
        }
        
        // 简单替换占位符，避免在列表页显示 {city}
        return currentStatus
            .replace(/【.*?】/g, '【处理中心】')
            .replace('，派送员...', '');
    }
    // ▲▲▲ 新增结束 ▲▲▲
  
    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('visible');
    }

    function hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('visible');
    }

    // ▼▼▼ 【核心新增2】一个专门用来停止订单更新的辅助函数 ▼▼▼
    function stopOrderUpdates() {
        if (state.orderUpdateInterval) {
            clearInterval(state.orderUpdateInterval);
            state.orderUpdateInterval = null;
            console.log('订单列表实时更新已停止。');
        }
    }
    // ▲▲▲ 新增结束 ▲▲▲
    
    // ▼▼▼ 【核心修改2】简化视图切换函数，移除所有定时器逻辑 ▼▼▼
    function switchTaobaoView(viewId) {
        document.querySelectorAll('#taobao-app-container .taobao-view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        document.querySelectorAll('#taobao-app-container .taobao-tab').forEach(t => t.classList.toggle('active', t.dataset.view === viewId));

        // 现在只负责调用一次渲染，不再管理定时器
        if (viewId === 'orders-view') {
            renderTaobaoOrders();
        } else if (viewId === 'my-view') {
            renderBalanceDetails();
        } else if (viewId === 'cart-view') {
            renderTaobaoCart();
        } else if (viewId === 'products-view') {
            renderTaobaoProducts();
        }
    }
    // ▲▲▲ 修改结束 ▲▲▲
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
    
    // ▼▼▼ 【核心修改】为商品卡片添加长按事件 ▼▼▼
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
            addLongPressListener(card, () => showProductActions(product.id)); // 新增：绑定长按
            gridEl.appendChild(card);
        });
    }
    // ▲▲▲ 修改结束 ▲▲▲

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

    // ▼▼▼ 【核心新增3】全新的后台物流处理引擎 ▼▼▼
    async function processAllOrdersLogistics() {
        if (!db) return; // 确保数据库已初始化

        const orders = await db.taobaoOrders.toArray();
        let hasUpdates = false;

        for (const order of orders) {
            // 如果订单已签收，则跳过
            if (order.status && order.status.includes('签收')) {
                continue;
            }

            const elapsedTime = Date.now() - order.timestamp;
            let cumulativeDelay = 0;
            let newHistory = order.logisticsHistory ? [...order.logisticsHistory] : [];
            let newStatus = order.status;
            
            for (let i = 0; i < logisticsTimelineTemplate.length; i++) {
                const stepTemplate = logisticsTimelineTemplate[i];
                cumulativeDelay += stepTemplate.delay;

                if (elapsedTime >= cumulativeDelay) {
                    // 这个步骤应该已经发生
                    if (!newHistory[i]) {
                        // 如果历史记录中没有这一步，说明是新发生的
                        const timestamp = order.timestamp + cumulativeDelay;
                        // 为了演示，每次都用不同的城市
                        const city = ['广州', '长沙', '武汉', '郑州', '北京', '上海'][Math.floor(Math.random() * 6)];
                        const formattedText = stepTemplate.text.replace(/\{city\}|\{next_city\}|\{user_city\}/g, city);
                        
                        newHistory[i] = { text: formattedText, timestamp: timestamp };
                        newStatus = formattedText.split('，')[0];
                        hasUpdates = true;
                    }
                } else {
                    // 后续步骤尚未发生，跳出循环
                    break;
                }
            }

            // 如果有更新，则一次性写入数据库
            if (hasUpdates) {
                await db.taobaoOrders.update(order.id, {
                    status: newStatus,
                    logisticsHistory: newHistory
                });
            }
        }

        // 如果有更新，并且用户正在看订单页，则主动刷新UI
        const ordersView = document.getElementById('orders-view');
        if (hasUpdates && ordersView && ordersView.classList.contains('active')) {
            console.log('后台检测到订单更新，正在刷新列表...');
            await renderTaobaoOrders();
        }
    }
    // ▲▲▲ 新增结束 ▲▲▲
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
            
            // 【重要】实时计算显示状态
            const displayStatus = calculateCurrentOrderStatus(order);

            const itemEl = document.createElement('div');
            itemEl.className = 'order-item';
            itemEl.dataset.orderId = order.id;
            itemEl.innerHTML = `
                <img src="${product.imageUrl}" class="product-image">
                <div class="order-info">
                    <div class="product-name">${product.name}</div>
                    <div class="order-status">${displayStatus}</div>
                    <div class="order-time">${new Date(order.timestamp).toLocaleString()}</div>
                </div>
            `;
            orderListEl.appendChild(itemEl);
        }
    }
    // ▲▲▲ 修改结束 ▲▲▲
    
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
                    timestamp: timestamp + i,
                    status: '订单已提交',
                    logisticsHistory: [] // 【重要】初始化为空数组
                });
            }
        }
        await db.taobaoOrders.bulkAdd(newOrders);
    }
// ▼▼▼ 【核心新增】这里是所有新增的、功能完整的函数 ▼▼▼
    
    /**
     * 长按监听器
     */
    function addLongPressListener(element, callback) {
        let pressTimer;
        const startPress = (e) => {
            e.preventDefault();
            pressTimer = window.setTimeout(() => callback(e), 500);
        };
        const cancelPress = () => clearTimeout(pressTimer);
        element.addEventListener('mousedown', startPress);
        element.addEventListener('mouseup', cancelPress);
        element.addEventListener('mouseleave', cancelPress);
        element.addEventListener('touchstart', startPress, { passive: true });
        element.addEventListener('touchend', cancelPress);
        element.addEventListener('touchmove', cancelPress);
    }
    
    /**
     * 打开手动添加/编辑商品的弹窗
     */
    async function openProductEditor(productId = null) {
        state.currentEditingProductId = productId;
        const modal = document.getElementById('product-editor-modal');
        const titleEl = document.getElementById('product-editor-title');
        const nameInput = document.getElementById('product-name-input');
        const priceInput = document.getElementById('product-price-input');
        const imageInput = document.getElementById('product-image-input');
        const categoryInput = document.getElementById('product-category-input');

        if (productId) {
            titleEl.textContent = '编辑商品';
            const product = await db.taobaoProducts.get(productId);
            if (product) {
                nameInput.value = product.name;
                priceInput.value = product.price;
                imageInput.value = product.imageUrl;
                categoryInput.value = product.category || '';
            }
        } else {
            titleEl.textContent = '添加新商品';
            nameInput.value = '';
            priceInput.value = '';
            imageInput.value = 'https://i.postimg.cc/W4svy4Hm/Image-1760206134285.jpg'; // 默认图片
            categoryInput.value = '';
        }
        showModal('product-editor-modal');
    }

    /**
     * 保存手动添加或编辑的商品
     */
    async function saveProduct() {
        const name = document.getElementById('product-name-input').value.trim();
        const price = parseFloat(document.getElementById('product-price-input').value);
        const imageUrl = document.getElementById('product-image-input').value.trim();
        const category = document.getElementById('product-category-input').value.trim();

        if (!name || isNaN(price) || price < 0) {
            alert('请输入有效的商品名称和价格！');
            return;
        }

        const productData = { name, price, imageUrl, category };

        if (state.currentEditingProductId) {
            await db.taobaoProducts.update(state.currentEditingProductId, productData);
        } else {
            await db.taobaoProducts.add(productData);
        }

        hideModal('product-editor-modal');
        await renderTaobaoProducts(state.currentCategory);
        alert('商品已保存！');
    }

    /**
     * 删除商品
     */
    async function deleteProduct(productId) {
        const confirmed = confirm('确定要删除这个商品吗？此操作不可恢复。');
        if (confirmed) {
            await db.taobaoProducts.delete(productId);
            await db.taobaoCart.where({ productId }).delete(); // 从购物车也删除
            await renderTaobaoProducts(state.currentCategory);
            updateCartBadge();
            alert('商品已删除。');
        }
    }
    
    /**
     * 长按商品时显示操作菜单
     */
    async function showProductActions(productId) {
        const product = await db.taobaoProducts.get(productId);
        if (!product) return;

        const choice = prompt(`操作商品: ${product.name}\n\n输入 "edit" 编辑, 或 "delete" 删除。`);
        if (choice === 'edit') {
            openProductEditor(productId);
        } else if (choice === 'delete') {
            deleteProduct(productId);
        }
    }

    /**
     * 模拟AI响应
     */
    async function getAiApiResponse(prompt) {
        alert(`正在向AI请求：\n"${prompt}"\n\n（这是一个模拟，将返回预设数据）`);
        await new Promise(resolve => setTimeout(resolve, 1500)); // 模拟网络延迟
        return [
            { name: "赛博朋克风机能冲锋衣", price: 399.00, imageUrl: "https://i.postimg.cc/C1jH8JzT/a.jpg", category: "服饰" },
            { name: "猫咪太空舱双肩包", price: 188.00, imageUrl: "https://i.postimg.cc/pr0TgtwV/b.jpg", category: "宠物用品" },
            { name: "便携式手冲咖啡套装", price: 258.00, imageUrl: "https://i.postimg.cc/k47tVqfJ/c.jpg", category: "生活" },
            { name: "复古像素风蓝牙音箱", price: 129.00, imageUrl: "https://i.postimg.cc/hGv5TqJz/d.jpg", category: "数码" }
        ];
    }
    
    /**
     * 根据用户搜索触发AI生成商品
     */
    async function handleSearchProductsAI() {
        const query = document.getElementById('product-search-input').value.trim();
        if (!query) return alert('请输入搜索内容！');
        
        const products = await getAiApiResponse(`为我生成与"${query}"相关的商品`);
        displayAiGeneratedProducts(products, `AI为你找到了关于“${query}”的宝贝`);
    }

    /**
     * 触发AI随机生成商品
     */
    async function handleGenerateProductsAI() {
        const products = await getAiApiResponse('随机生成一些有趣的商品');
        displayAiGeneratedProducts(products, 'AI为你随机生成了以下宝贝');
    }
    
    /**
     * 在弹窗中显示AI生成的商品列表
     */
    function displayAiGeneratedProducts(products, title) {
        const modal = document.getElementById('ai-generated-products-modal');
        document.getElementById('ai-products-modal-title').textContent = title;
        const gridEl = document.getElementById('ai-product-results-grid');
        gridEl.innerHTML = '';
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${product.imageUrl}" class="product-image" alt="${product.name}">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">${product.price.toFixed(2)}</div>
                </div>
                <button class="add-to-my-page-btn">添加到我的商品</button>
            `;
            card.querySelector('.add-to-my-page-btn').onclick = async (e) => {
                await db.taobaoProducts.add(product);
                e.target.textContent = '已添加 ✔';
                e.target.disabled = true;
                await renderTaobaoProducts(state.currentCategory);
            };
            gridEl.appendChild(card);
        });
        showModal('ai-generated-products-modal');
    }

    /**
     * 处理粘贴的分享文案 (模拟)
     */
    async function handleAddFromLink() {
        const text = document.getElementById('link-paste-area').value;
        if (!text.trim()) return;
        
        // 模拟解析
        const nameMatch = text.match(/([【(].*?[】)])|([^，。！?]*)/);
        const priceMatch = text.match(/[¥￥](\d+(\.\d+)?)/);
        
        const name = nameMatch ? nameMatch[0].replace(/[【】()]/g, '').trim() : "解析失败的商品";
        const price = priceMatch ? parseFloat(priceMatch[1]) : 99.00;

        hideModal('add-from-link-modal');
        alert("识别成功！正在为你跳转到编辑页面...");
        
        // 延迟一下，让用户感觉更真实
        setTimeout(() => {
            openProductEditor(); // 打开空的编辑器
            // 填充解析出的数据
            document.getElementById('product-name-input').value = name;
            document.getElementById('product-price-input').value = price;
        }, 500);
    }
    
    // ▲▲▲ 新增结束 ▲▲▲    
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
// ▼▼▼ 【核心新增】这里是所有与物流功能相关的全新函数 ▼▼▼

    /**
     * 【总入口】打开物流详情页面
     */
    async function openLogisticsView(orderId) {
        // 不再需要停止任何定时器，因为后台只有一个全局的
        const order = await db.taobaoOrders.get(orderId);
        if (!order) { return alert('找不到该订单信息。'); }
        showTaobaoScreen('logistics-screen');
        await renderLogisticsView(order); // 直接渲染
    }

    async function renderLogisticsView(order) {
        const contentArea = document.getElementById('logistics-content-area');
        contentArea.innerHTML = '<p>正在加载物流信息...</p>';
        const product = await db.taobaoProducts.get(order.productId);
        if (!product) { return contentArea.innerHTML = '<p>加载商品信息失败。</p>'; }
        
        contentArea.innerHTML = `
            <div class="logistics-product-summary">
                <img src="${product.imageUrl}" class="product-image">
                <div class="info">
                    <div class="name">${product.name}</div>
                    <div class="status" id="main-logistics-status">${order.status || '计算中...'}</div>
                </div>
            </div>
            <div class="logistics-timeline"></div>
        `;

        const timelineContainer = contentArea.querySelector('.logistics-timeline');
        const mainStatusEl = document.getElementById('main-logistics-status');
        timelineContainer.innerHTML = '';
        
        // 极其简单：直接从数据库读取历史并渲染
        if (order.logisticsHistory && order.logisticsHistory.length > 0) {
            order.logisticsHistory.forEach(step => {
                addLogisticsStep(timelineContainer, mainStatusEl, step.text, new Date(step.timestamp));
            });
            // 确保顶部状态是最新的
            mainStatusEl.textContent = order.logisticsHistory[order.logisticsHistory.length - 1].text.split('，')[0];
        } else {
            timelineContainer.innerHTML = '<p>暂无物流信息。</p>'
        }
    }


    function addLogisticsStep(container, mainStatusEl, text, timestamp) {
        const stepEl = document.createElement('div');
        stepEl.className = 'logistics-step';
        const timeStr = `${String(timestamp.getHours()).padStart(2, '0')}:${String(timestamp.getMinutes()).padStart(2, '0')}`;
        const dateStr = `${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}`;
        stepEl.innerHTML = `
            <div class="logistics-step-content">
                <div class="status-text">${text}</div>
                <div class="timestamp">${dateStr} ${timeStr}</div>
            </div>`;
        container.prepend(stepEl);
        mainStatusEl.textContent = text.split('，')[0];
    }

    /**
     * 在时间轴上添加一个物流步骤 (保持不变，但现在是纯UI操作)
     */
    function addLogisticsStep(container, mainStatusEl, text, timestamp) {
        container.querySelectorAll('.logistics-step').forEach(el => el.classList.remove('active'));
        const stepEl = document.createElement('div');
        stepEl.className = 'logistics-step';
        const timeStr = `${String(timestamp.getHours()).padStart(2, '0')}:${String(timestamp.getMinutes()).padStart(2, '0')}`;
        const dateStr = `${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}`;
        stepEl.innerHTML = `
            <div class="logistics-step-content">
                <div class="status-text">${text}</div>
                <div class="timestamp">${dateStr} ${timeStr}</div>
            </div>`;
        container.prepend(stepEl);
        mainStatusEl.textContent = text.split('，')[0];
    }
    // ▲▲▲ 修改结束 ▲▲▲
    // ============================================
    // 第四部分: 初始化和事件绑定 (已更新)
    // ============================================

    function bindEventListeners() {
        const container = document.getElementById('taobao-app-container');
        if (!container) return;
        
        container.addEventListener('click', e => {
            const target = e.target;

            // ▼▼▼ 【核心新增】物流页面的返回按钮事件 ▼▼▼
            if (target.id === 'logistics-back-btn') {
                showTaobaoScreen('taobao-screen'); // 返回主应用屏幕
                // 【重要】清除所有正在运行的物流更新计时器，防止内存泄漏
                state.logisticsUpdateTimers.forEach(timerId => clearTimeout(timerId));
                state.logisticsUpdateTimers = [];
                // 返回后刷新一下订单列表，以显示最新的状态
                renderTaobaoOrders();
                return;
            }
            // ▲▲▲ 新增结束 ▲▲▲
            
            // 页签切换
            const tab = target.closest('.taobao-tab');
            if (tab) {
                switchTaobaoView(tab.dataset.view);
                return;
            }

            // --- 首页 ---
            if (target.id === 'clear-taobao-products-btn') {
                if(confirm('确定要清空所有商品和购物车吗？')) {
                    db.transaction('rw', db.taobaoProducts, db.taobaoCart, () => {
                        db.taobaoProducts.clear();
                        db.taobaoCart.clear();
                    }).then(() => {
                        renderTaobaoProducts();
                        updateCartBadge();
                    });
                }
            }
            if (target.id === 'add-product-btn') showModal('add-product-choice-modal');
            if (target.id === 'product-search-btn') handleSearchProductsAI(); // 更新
            
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
            if (productCard && !addCartBtn && !productCard.closest('#ai-product-results-grid')) {
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
            
            // --- 弹窗关闭按钮 ---
            if (target.matches('.cancel, #close-product-detail-btn, #cancel-add-choice-btn, #cancel-product-editor-btn, #cancel-link-paste-btn, #close-ai-products-modal-btn')) {
                const modal = target.closest('.modal');
                if (modal) hideModal(modal.id);
            }
            
            // --- 弹窗功能按钮 (已更新) ---
            if (target.id === 'add-product-manual-btn') { hideModal('add-product-choice-modal'); openProductEditor(); }
            if (target.id === 'add-product-link-btn') { hideModal('add-product-choice-modal'); showModal('add-from-link-modal'); }
            if (target.id === 'add-product-ai-btn') { hideModal('add-product-choice-modal'); handleGenerateProductsAI(); }
            if (target.id === 'save-product-btn') saveProduct();
            if (target.id === 'confirm-link-paste-btn') handleAddFromLink();

             // ▼▼▼ 【核心新增】订单列表的点击事件 ▼▼▼
             const orderItem = target.closest('.order-item');
             if (orderItem && orderItem.closest('#orders-view')) {
                 const orderId = parseInt(orderItem.dataset.orderId);
                 if(!isNaN(orderId)) {
                     openLogisticsView(orderId);
                 }
             }
             // ▲▲▲ 新增结束 ▲▲▲
        });
    }

 
    
    // 暴露一个启动器给外部的 showScreen 函数调用
    window.showTaobaoAppScreen = function() {
        const container = document.getElementById('taobao-app-container');
        if (container) {
            container.classList.add('active'); // 使用 classList.add('active') 来显示
            updateUserBalanceDisplay();
            renderTaobaoProducts();
            updateCartBadge();
            switchTaobaoView('products-view');
        }
    };

     // ▼▼▼ 【核心修改5】在初始化函数中，启动全局后台处理器 ▼▼▼
     async function initTaobaoApp() {
        injectTaobaoStyles();
        createTaobaoHTML();
        setupDatabase();
        bindEventListeners();
        
        const styleTag = document.getElementById('taobao-app-styles');
        if (styleTag) {
            styleTag.textContent = styleTag.textContent.replace('#taobao-app-container {', '#taobao-app-container.screen {').replace('display: none;', '');
        }

        const mainBackButton = document.getElementById('taobao-main-back-btn');
        if(mainBackButton) {
            mainBackButton.onclick = () => window.showScreen('home-screen');
        }
        
        await seedInitialData(); 
        await updateUserBalanceDisplay();
        await renderTaobaoProducts();
        await updateCartBadge();
        
        // 启动全局后台处理器，每2秒检查一次
        if (state.logisticsProcessorInterval) clearInterval(state.logisticsProcessorInterval);
        state.logisticsProcessorInterval = setInterval(processAllOrdersLogistics, 2000);

        console.log('🚀 Taobao App 初始化完成，后台物流处理器已启动。');
    }
    // ▲▲▲ 修改结束 ▲▲▲
    
    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTaobaoApp);
    } else {
        initTaobaoApp();
    }

    window.taobaoAppInitialized = true;
    console.log('📦 Taobao App 模块已加载 (showScreen 兼容模式)');

})(window);
