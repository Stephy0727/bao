// ==========================================
// Taobao App - 独立JS整合文件 (防冲突隔离版)
// 版本: 1.1
// 使用方式:
// 1. 在HTML中引入 Dexie.js: <script src="https://unpkg.com/dexie@latest/dist/dexie.js"></script>
// 2. 在HTML中引入此文件: <script src="app.js" defer></script>
// 3. 在需要启动应用的地方调用: window.launchTaobaoApp()
// ==========================================

(function (window) {
    'use strict';

    // ----------------------------------------
    // 应用状态与配置
    // ----------------------------------------
    const ROOT_ID = 'taobao-app-container'; // 唯一的顶层容器ID
    let isInitialized = false;
    let db;
    const state = {
        userBalance: 0.00,
        currentView: 'tb-products-view',
        currentEditingProductId: null,
    };
    
    // 物流时间线模板 (delay单位是毫秒)
    const logisticsTimelineTemplate = [
        { text: '您的订单已提交', delay: 1000 * 2 },
        { text: '付款成功，等待商家打包', delay: 1000 * 10 },
        { text: '【{city}仓库】已打包，等待快递揽收', delay: 1000 * 30 },
        { text: '【{city}快递】已揽收', delay: 1000 * 60 },
        { text: '快件已到达【{city}分拨中心】', delay: 1000 * 120 },
        { text: '【{city}分拨中心】已发出，下一站【{next_city}】', delay: 1000 * 240 },
        { text: '快件已到达【{user_city}转运中心】', delay: 1000 * 360 },
        { text: '快件正在派送中，派送员：兔兔快递员，电话：123-4567-8910', delay: 1000 * 420 },
        { text: '您的快件已签收，感谢您在桃宝购物，期待再次为您服务！', delay: 1000 * 480 },
    ];
    let logisticsUpdateTimers = [];

    // ============================================
    // 第一部分: CSS样式注入
    // ============================================
    function injectTaobaoStyles() {
        const styleId = 'taobao-app-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        // 关键：所有CSS规则都用唯一的根ID进行包裹，实现样式隔离
        style.textContent = `
            #${ROOT_ID} {
                /* General App variables */
                --border-color: #e0e0e0;
                --secondary-bg: #ffffff;
                --text-secondary: #555;
            }

            #${ROOT_ID} #tb-taobao-screen, #${ROOT_ID} #tb-logistics-screen {
                display: none; /* Default to hidden */
                flex-direction: column;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 999;
                background-color: #f0f2f5;
            }

            #${ROOT_ID} .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 15px;
                background-color: var(--secondary-bg, #fff);
                border-bottom: 1px solid var(--border-color, #e0e0e0);
                flex-shrink: 0;
            }

            #${ROOT_ID} .header .back-btn {
                font-size: 24px;
                font-weight: bold;
                cursor: pointer;
                width: 30px;
            }
            
            #${ROOT_ID} .header span:nth-child(2) {
                font-size: 18px;
                font-weight: 600;
            }

            #${ROOT_ID} .header .header-actions {
                display: flex;
                gap: 15px;
                align-items: center;
                width: 60px;
                justify-content: flex-end;
            }
            
            #${ROOT_ID} .header .action-btn {
                cursor: pointer;
                font-size: 24px;
            }
            
            #${ROOT_ID} .list-container {
                flex: 1;
                overflow-y: auto;
            }

            #${ROOT_ID} .form-button {
                padding: 10px 20px;
                border-radius: 20px;
                border: none;
                font-weight: 500;
                cursor: pointer;
            }

            /* --- “桃宝”App 整体布局 --- */
            #${ROOT_ID} #tb-taobao-screen {
                background-color: #f0f2f5;
            }

            /* 顶部页签 */
            #${ROOT_ID} .taobao-tabs {
                display: flex;
                flex-shrink: 0;
                border-bottom: 1px solid var(--border-color);
                background-color: var(--secondary-bg);
            }
            #${ROOT_ID} .taobao-tab {
                flex: 1;
                padding: 12px 0;
                text-align: center;
                font-weight: 500;
                color: var(--text-secondary);
                border: none;
                background: none;
                cursor: pointer;
                position: relative;
            }
            #${ROOT_ID} .taobao-tab.active {
                color: #FF5722; /* 淘宝橙 */
            }
            #${ROOT_ID} .taobao-tab.active::after {
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

            /* 内容区域 */
            #${ROOT_ID} .taobao-content {
                flex-grow: 1;
                position: relative;
                overflow: hidden;
            }
            #${ROOT_ID} .taobao-view {
                position: absolute;
                top: 0; left: 0; width: 100%; height: 100%;
                overflow-y: auto;
                display: none;
                padding: 15px;
                box-sizing: border-box;
            }
            #${ROOT_ID} .taobao-view.active {
                display: block;
            }

            /* --- 首页/商品视图 --- */
            #${ROOT_ID} #tb-product-category-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
                overflow-x: auto;
                padding-bottom: 5px; /* for scrollbar */
                scrollbar-width: none;
                -ms-overflow-style: none;
            }
            #${ROOT_ID} #tb-product-category-tabs::-webkit-scrollbar { display: none; }

            #${ROOT_ID} #tb-product-category-tabs .category-tab-btn {
                padding: 6px 12px;
                border-radius: 15px;
                border: 1px solid var(--border-color);
                background-color: var(--secondary-bg);
                white-space: nowrap;
                cursor: pointer;
            }
            #${ROOT_ID} #tb-product-category-tabs .category-tab-btn.active {
                background-color: #FFEFE9;
                color: #FF5722;
                border-color: #FF5722;
            }

            #${ROOT_ID} .product-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
            }
            #${ROOT_ID} .product-card {
                background-color: var(--secondary-bg);
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 1px 4px rgba(0,0,0,0.08);
                cursor: pointer;
                position: relative;
            }
            #${ROOT_ID} .product-card .product-image {
                width: 100%;
                aspect-ratio: 1 / 1;
                object-fit: cover;
                background-color: #f0f2f5;
            }
            #${ROOT_ID} .product-card .product-info {
                padding: 8px;
            }
            #${ROOT_ID} .product-card .product-name {
                font-size: 14px;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                min-height: 2.8em;
            }
            #${ROOT_ID} .product-card .product-price {
                font-size: 16px;
                font-weight: bold;
                color: #FF5722;
                margin-top: 5px;
            }
            #${ROOT_ID} .product-card .product-price::before {
                content: '¥';
                font-size: 12px;
                margin-right: 2px;
            }

            /* --- 我的/余额视图 --- */
            #${ROOT_ID} #tb-user-balance-container {
                background: linear-gradient(135deg, #FF9A8B 0%, #FF6A88 100%);
                color: white;
                padding: 30px 20px;
                border-radius: 12px;
                text-align: center;
                text-shadow: 0 1px 3px rgba(0,0,0,0.2);
                margin-bottom: 20px;
            }
            #${ROOT_ID} #tb-user-balance-container h2 {
                font-size: 40px;
                margin: 10px 0 20px 0;
            }
            #${ROOT_ID} #tb-top-up-btn {
                background-color: rgba(255,255,255,0.9);
                color: #FF5722;
            }

            /* --- 订单/物流视图 --- */
            #${ROOT_ID} .order-list {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            #${ROOT_ID} .order-item {
                background-color: var(--secondary-bg);
                border-radius: 8px;
                padding: 12px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                display: flex;
                gap: 12px;
                cursor: pointer;
            }
            #${ROOT_ID} .order-item .product-image {
                width: 70px;
                height: 70px;
                border-radius: 6px;
                flex-shrink: 0;
                object-fit: cover;
            }
            #${ROOT_ID} .order-item .order-info {
                flex-grow: 1;
            }
            #${ROOT_ID} .order-item .product-name {
                font-weight: 500;
            }
            #${ROOT_ID} .order-item .order-status {
                font-size: 13px;
                color: #28a745;
                margin-top: 8px;
                font-weight: 500;
            }
            #${ROOT_ID} .order-item .order-time {
                font-size: 12px;
                color: var(--text-secondary);
                margin-top: 4px;
            }

            /* --- 搜索栏 --- */
            #${ROOT_ID} .taobao-search-bar {
                display: flex;
                gap: 10px;
                padding: 0 0 15px 0;
            }
            #${ROOT_ID} #tb-product-search-input {
                flex-grow: 1;
                border: 1px solid #FF5722;
                padding: 10px 15px;
                border-radius: 20px;
                font-size: 14px;
                outline: none;
            }
            #${ROOT_ID} #tb-product-search-btn {
                background-color: #FF5722;
                color: white;
                border: none;
                border-radius: 20px;
                padding: 0 20px;
                font-weight: 500;
                cursor: pointer;
            }

            /* --- AI生成结果弹窗 --- */
            #${ROOT_ID} #tb-ai-product-results-grid .product-card {
                padding-bottom: 40px;
                cursor: default;
            }
            #${ROOT_ID} .add-to-my-page-btn {
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
            #${ROOT_ID} .add-to-my-page-btn:hover {
                background-color: #45a049;
            }
            #${ROOT_ID} .add-to-my-page-btn:disabled {
                background-color: #cccccc;
                cursor: not-allowed;
            }

            /* --- 购物车 --- */
            #${ROOT_ID} .taobao-tab #tb-cart-item-count-badge {
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
            }
            #${ROOT_ID} .product-card .add-cart-btn {
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
            #${ROOT_ID} .product-card .add-cart-btn:active {
                transform: scale(0.9);
            }
            #${ROOT_ID} #tb-cart-item-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
                padding-bottom: 70px;
            }
            #${ROOT_ID} .cart-item {
                background-color: var(--secondary-bg);
                border-radius: 8px;
                padding: 12px;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            #${ROOT_ID} .cart-item .product-image {
                width: 80px;
                height: 80px;
                border-radius: 6px;
                flex-shrink: 0;
                cursor: pointer;
                object-fit: cover;
            }
            #${ROOT_ID} .cart-item .cart-item-info {
                flex-grow: 1;
                cursor: pointer;
            }
            #${ROOT_ID} .cart-item .product-name {
                font-weight: 500;
            }
            #${ROOT_ID} .cart-item .product-price {
                color: #FF5722;
                font-weight: bold;
                margin-top: 8px;
            }
            #${ROOT_ID} .cart-item .quantity-controls {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            #${ROOT_ID} .cart-item .quantity-controls button {
                width: 24px;
                height: 24px;
                border: 1px solid #ccc;
                background-color: #f0f0f0;
                border-radius: 50%;
                cursor: pointer;
            }
            #${ROOT_ID} .cart-item .delete-cart-item-btn {
                width: 30px;
                height: 30px;
                border: none;
                background: none;
                color: #999;
                font-size: 24px;
                cursor: pointer;
                flex-shrink: 0;
            }
            #${ROOT_ID} #tb-cart-checkout-bar {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                z-index: 10;
                padding: 10px 15px;
                background-color: var(--secondary-bg);
                border-top: 1px solid var(--border-color);
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-sizing: border-box;
            }
            #${ROOT_ID} #tb-cart-checkout-bar .total-price {
                font-weight: bold;
            }
            #${ROOT_ID} #tb-cart-checkout-bar #tb-cart-total-price {
                color: #FF5722;
                font-size: 18px;
            }
            #${ROOT_ID} #tb-cart-checkout-bar button {
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 20px;
                font-weight: 500;
                cursor: pointer;
            }
            #${ROOT_ID} #tb-checkout-btn { background-color: #FF5722; }
            #${ROOT_ID} #tb-share-cart-to-char-btn { background-color: #FF9800; }
            #${ROOT_ID} #tb-buy-for-char-btn { background-color: #4CAF50; }

            /* --- 商品详情弹窗 --- */
            #${ROOT_ID} #tb-product-detail-body {
                text-align: center;
            }
            #${ROOT_ID} #tb-product-detail-body .product-image {
                width: 80%;
                max-width: 250px;
                border-radius: 8px;
                margin-bottom: 15px;
            }
            #${ROOT_ID} #tb-product-detail-body .product-name {
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            #${ROOT_ID} #tb-product-detail-body .product-price {
                font-size: 24px;
                font-weight: bold;
                color: #FF5722;
                margin-bottom: 20px;
            }
            #${ROOT_ID} #tb-product-detail-body .product-price::before {
                content: '¥';
                font-size: 16px;
            }

            /* --- 商品评价 --- */
            #${ROOT_ID} #tb-product-reviews-section {
                padding: 0 15px 15px 15px;
                border-top: 1px solid var(--border-color);
                margin-top: 15px;
            }
            #${ROOT_ID} #tb-product-reviews-section h3 {
                font-size: 16px;
                margin: 15px 0;
            }
            #${ROOT_ID} #tb-product-reviews-list {
                display: flex;
                flex-direction: column;
                gap: 15px;
                max-height: 150px;
                overflow-y: auto;
                margin-bottom: 15px;
            }
            #${ROOT_ID} .product-review-item {
                font-size: 14px;
                line-height: 1.6;
                border-bottom: 1px solid #f0f0f0;
                padding-bottom: 10px;
            }
            #${ROOT_ID} .product-review-item .review-author {
                font-weight: 500;
                color: var(--text-secondary);
                margin-bottom: 5px;
            }
            #${ROOT_ID} #tb-generate-reviews-btn {
                width: 100%;
                margin-top: 10px;
                background-color: #fff7e6;
                color: #fa8c16;
                border: 1px solid #ffd591;
            }

            /* --- 余额明细 --- */
            #${ROOT_ID} .transaction-item {
                background-color: var(--secondary-bg);
                border-radius: 8px;
                padding: 12px 15px;
                margin-bottom: 10px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            #${ROOT_ID} .transaction-info .description {
                font-weight: 500;
            }
            #${ROOT_ID} .transaction-info .timestamp {
                font-size: 12px;
                color: var(--text-secondary);
                margin-top: 4px;
            }
            #${ROOT_ID} .transaction-amount {
                font-weight: bold;
                font-size: 16px;
            }
            #${ROOT_ID} .transaction-amount.income {
                color: #4CAF50;
            }
            #${ROOT_ID} .transaction-amount.expense {
                color: #F44336;
            }

            /* --- 物流详情 --- */
            #${ROOT_ID} #tb-logistics-content-area {
                padding: 20px;
                background-color: #f5f5f5;
            }
            #${ROOT_ID} .logistics-product-summary {
                display: flex;
                gap: 15px;
                padding: 15px;
                margin-bottom: 20px;
                background-color: var(--secondary-bg);
                border-radius: 12px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.08);
            }
            #${ROOT_ID} .logistics-product-summary .product-image {
                width: 60px;
                height: 60px;
                border-radius: 8px;
                flex-shrink: 0;
                object-fit: cover;
            }
            #${ROOT_ID} .logistics-product-summary .info .name {
                font-weight: 600;
                font-size: 15px;
            }
            #${ROOT_ID} .logistics-product-summary .info .status {
                font-size: 13px;
                color: #FF5722;
                margin-top: 5px;
                font-weight: 500;
            }
            #${ROOT_ID} .logistics-timeline {
                position: relative;
                padding: 20px 20px 20px 30px;
                background-color: var(--secondary-bg);
                border-radius: 12px;
            }
            #${ROOT_ID} .logistics-timeline::before {
                content: '';
                position: absolute;
                left: 15px;
                top: 20px;
                bottom: 20px;
                width: 2px;
                background-color: #e0e0e0;
            }
            #${ROOT_ID} .logistics-step {
                position: relative;
                margin-bottom: 25px;
            }
            #${ROOT_ID} .logistics-step:last-child {
                margin-bottom: 0;
            }
            #${ROOT_ID} .logistics-step::before {
                content: '';
                position: absolute;
                left: -22px; 
                top: 5px;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background-color: #ccc;
                border: 2px solid var(--secondary-bg);
                z-index: 1;
            }
            #${ROOT_ID} .logistics-step:first-child::before {
                background-color: #FF5722;
                transform: scale(1.3);
            }
            #${ROOT_ID} .logistics-step-content .status-text {
                font-weight: 500;
                font-size: 14px;
                margin-bottom: 5px;
                line-height: 1.5;
            }
            #${ROOT_ID} .logistics-step-content .timestamp {
                font-size: 12px;
                color: var(--text-secondary);
            }
            
            /* --- Modal Styles --- */
            #${ROOT_ID} .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4); }
            #${ROOT_ID} .modal.visible { display: flex; align-items: center; justify-content: center; }
            #${ROOT_ID} .modal-content { background-color: #fefefe; margin: auto; padding: 0; border: 1px solid #888; width: 90%; max-width: 500px; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; }
            #${ROOT_ID} .modal-header { padding: 15px; border-bottom: 1px solid #ddd; font-size: 18px; font-weight: 600; }
            #${ROOT_ID} .modal-body { padding: 20px; overflow-y: auto; }
            #${ROOT_ID} .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 15px; border-top: 1px solid #ddd; }
            #${ROOT_ID} .modal-footer button { padding: 8px 16px; border-radius: 5px; border: 1px solid transparent; cursor: pointer; }
            #${ROOT_ID} .modal-footer .cancel { background-color: #f0f0f0; }
            #${ROOT_ID} .modal-footer .save { background-color: #FF5722; color: white; }
            
            /* --- Form Group Styles --- */
            #${ROOT_ID} .form-group { margin-bottom: 15px; }
            #${ROOT_ID} .form-group label { display: block; margin-bottom: 5px; font-weight: 500; }
            #${ROOT_ID} .form-group input, #${ROOT_ID} .form-group textarea { width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; }
        `;
        document.head.appendChild(style);
        console.log('✅ 桃宝App: 样式已注入');
    }

    // ============================================
    // 第二部分: HTML结构生成
    // ============================================
    function createTaobaoAppHTML() {
        if (document.getElementById(ROOT_ID)) return;

        const container = document.createElement('div');
        container.id = ROOT_ID;
        // 关键：HTML中的所有id都添加了'tb-'前缀
        container.innerHTML = `
            <!-- ▼▼▼ “桃宝”功能主屏幕 ▼▼▼ -->
            <div id="tb-taobao-screen" class="screen">
                <div class="header">
                    <span class="back-btn" data-action="hide-app">‹</span>
                    <span>桃宝</span>
                    <div class="header-actions">
                        <span class="action-btn" id="tb-clear-taobao-products-btn" style="font-size: 16px; font-weight: 500;">清空</span>
                        <span class="action-btn" id="tb-add-product-btn" title="添加商品">+</span>
                    </div>
                </div>
                
                <div class="taobao-tabs">
                    <button class="taobao-tab active" data-view="tb-products-view">首页</button>
                    <button class="taobao-tab" data-view="tb-cart-view">
                        购物车<span id="tb-cart-item-count-badge" style="display: none;">0</span>
                    </button>
                    <button class="taobao-tab" data-view="tb-orders-view">我的订单</button>
                    <button class="taobao-tab" data-view="tb-my-view">我的</button>
                </div>

                <div class="taobao-content">
                    <div id="tb-products-view" class="taobao-view active">
                      <div class="taobao-search-bar">
                        <input type="search" id="tb-product-search-input" placeholder="搜一搜，让AI为你创造好物！">
                        <button id="tb-product-search-btn">搜索</button>
                      </div>
                        <div id="tb-product-category-tabs"></div>
                        <div id="tb-product-grid" class="product-grid"></div>
                    </div>

                    <div id="tb-cart-view" class="taobao-view">
                        <div id="tb-cart-item-list"></div>
                        <div id="tb-cart-checkout-bar" style="display: none;">
                            <div class="total-price">
                                合计: <span id="tb-cart-total-price">¥ 0.00</span>
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <button id="tb-share-cart-to-char-btn">分享给Ta代付</button>
                                <button id="tb-buy-for-char-btn">为Ta购买</button>
                                <button id="tb-checkout-btn">结算(0)</button>
                            </div>
                        </div>
                    </div>

                    <div id="tb-orders-view" class="taobao-view">
                        <div id="tb-order-list" class="order-list"></div>
                    </div>

                    <div id="tb-my-view" class="taobao-view">
                        <div id="tb-user-balance-container">
                            <p>我的余额</p>
                            <h2 id="tb-user-balance-display">¥ 0.00</h2>
                            <button id="tb-top-up-btn" class="form-button">给钱包充点钱</button>
                        </div>
                        <div id="tb-balance-details-list" class="order-list" style="padding: 0 15px;"></div>
                    </div>
                </div>
            </div>

            <!-- ▼▼▼ 物流详情页面 ▼▼▼ -->
            <div id="tb-logistics-screen" class="screen">
                <div class="header">
                    <span class="back-btn" id="tb-logistics-back-btn">‹</span>
                    <span>物流详情</span>
                    <span style="width: 30px;"></span>
                </div>
                <div id="tb-logistics-content-area" class="list-container"></div>
            </div>

            <!-- ▼▼▼ 商品详情弹窗 (Modal) ▼▼▼ -->
            <div id="tb-product-detail-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header"><span>商品详情</span></div>
                    <div class="modal-body" id="tb-product-detail-body"></div>
                    <div id="tb-product-reviews-section">
                        <h3>宝贝评价</h3>
                        <div id="tb-product-reviews-list"></div>
                        <button id="tb-generate-reviews-btn" class="form-button form-button-secondary">✨ AI生成评价</button>
                    </div>
                    <div class="modal-footer">
                        <button class="cancel" data-action="close-modal">关闭</button>
                        <button class="save" id="tb-detail-add-to-cart-btn">加入购物车</button>
                    </div>
                </div>
            </div>

            <!-- ▼▼▼ 添加商品方式选择弹窗 (Modal) ▼▼▼ -->
            <div id="tb-add-product-choice-modal" class="modal">
                <div style="width: 250px; background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <div style="font-weight: 600; text-align: center; margin-bottom: 16px;">选择添加方式</div>
                    <div style="display:flex; flex-direction:column; gap: 8px;">
                        <button id="tb-add-product-manual-btn" style="width:100%; padding:10px; border-radius: 8px; border:none; background-color: #f0f0f0;">手动添加</button>
                        <button id="tb-add-product-link-btn" style="width:100%; padding:10px; border-radius: 8px; border:none; background-color: #f0f0f0;">识别链接</button>
                        <button id="tb-add-product-ai-btn" style="width:100%; padding:10px; border-radius: 8px; border:none; background-color: #f0f0f0;">AI生成</button>
                        <button data-action="close-modal" style="margin-top: 8px; width:100%; padding:10px; border-radius: 8px; border:none; background-color: #e0e0e0;">取消</button>
                    </div>
                </div>
            </div>

            <!-- ▼▼▼ 手动添加/编辑商品弹窗 (Modal) ▼▼▼ -->
            <div id="tb-product-editor-modal" class="modal">
                <div class="modal-content" style="height: auto;">
                    <div class="modal-header"><span id="tb-product-editor-title">添加新商品</span></div>
                    <div class="modal-body">
                        <div class="form-group"><label for="tb-product-name-input">商品名称</label><input type="text" id="tb-product-name-input"></div>
                        <div class="form-group"><label for="tb-product-price-input">价格 (元)</label><input type="number" id="tb-product-price-input"></div>
                        <div class="form-group"><label for="tb-product-image-input">图片 URL</label><input type="text" id="tb-product-image-input"></div>
                        <div class="form-group"><label for="tb-product-category-input">分类 (选填)</label><input type="text" id="tb-product-category-input" placeholder="例如：衣服, 零食..."></div>
                    </div>
                    <div class="modal-footer">
                        <button class="cancel" data-action="close-modal">取消</button>
                        <button class="save" id="tb-save-product-btn">保存</button>
                    </div>
                </div>
            </div>

            <!-- ▼▼▼ 识别链接弹窗 (Modal) ▼▼▼ -->
            <div id="tb-add-from-link-modal" class="modal">
                <div class="modal-content" style="height: auto;">
                    <div class="modal-header"><span>粘贴分享文案</span></div>
                    <div class="modal-body"><textarea id="tb-link-paste-area" rows="6" placeholder="请在这里粘贴完整的淘宝或拼多多分享文案..."></textarea></div>
                    <div class="modal-footer">
                        <button class="cancel" data-action="close-modal">取消</button>
                        <button class="save" id="tb-confirm-link-paste-btn">识别</button>
                    </div>
                </div>
            </div>

            <!-- ▼▼▼ AI生成商品结果弹窗 (Modal) ▼▼▼ -->
            <div id="tb-ai-generated-products-modal" class="modal">
                <div class="modal-content" style="height: 80%;">
                    <div class="modal-header"><span id="tb-ai-products-modal-title">AI为你生成了以下宝贝</span></div>
                    <div class="modal-body" style="padding: 15px;"><div id="tb-ai-product-results-grid" class="product-grid"></div></div>
                    <div class="modal-footer"><button class="save" data-action="close-modal" style="width: 100%;">完成</button></div>
                </div>
            </div>
        `;
        document.body.appendChild(container);
        console.log('✅ 桃宝App: HTML结构已创建');
    }
    
    // ============================================
    // 第三部分: 核心JavaScript功能 (已适配tb-前缀)
    // ============================================

    // --- 数据库设置 ---
    function setupDatabase() {
        if (!window.Dexie) {
            console.error("Dexie.js is not loaded. Taobao App cannot run.");
            alert("错误：缺少Dexie.js库，应用无法运行。");
            return false;
        }
        db = new Dexie("TaobaoAppModuleDB"); // 唯一数据库名
        db.version(1).stores({
            globalSettings: 'key',
            taobaoProducts: '++id, name, category', 
            taobaoOrders: '++id, productId, timestamp',
            taobaoCart: '++id, &productId',
            userWalletTransactions: '++id, timestamp' 
        });
        console.log("✅ 桃宝App: 数据库已设置");
        return true;
    }

    // --- 工具函数 ---
    function getElement(id) { return document.getElementById(id); }
    function openModal(modalId) { getElement(modalId)?.classList.add('visible'); }
    function closeModal(modalId) { getElement(modalId)?.classList.remove('visible'); }
    function showTaobaoScreen(screenId) {
        document.querySelectorAll(`#${ROOT_ID} .screen`).forEach(s => s.style.display = 'none');
        getElement(screenId).style.display = 'flex';
    }
    function hideTaobaoApp() {
        const appContainer = getElement(ROOT_ID);
        if (appContainer) {
            appContainer.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
        }
    }
    function getRandomDefaultProductImage() {
        const defaultImages = ['https://i.postimg.cc/W4svy4Hm/Image-1760206134285.jpg', 'https://i.postimg.cc/jjRb1jF7/Image-1760206125678.jpg'];
        return defaultImages[Math.floor(Math.random() * defaultImages.length)];
    }
    function showAlert(message) { alert(message); }
    function showConfirm(message) { return confirm(message); }


    // --- UI渲染函数 ---
    
    async function renderTaobaoProducts(category = null, searchTerm = null) {
        const gridEl = getElement('tb-product-grid');
        const categoryTabsEl = getElement('tb-product-category-tabs');
        gridEl.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">加载中...</p>';

        let allProducts = await db.taobaoProducts.toArray();
        const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))].sort();

        categoryTabsEl.innerHTML = `<button class="category-tab-btn ${!category ? 'active' : ''}" data-category="all">全部</button>`;
        categories.forEach(cat => {
            categoryTabsEl.innerHTML += `<button class="category-tab-btn ${category === cat ? 'active' : ''}" data-category="${cat}">${cat}</button>`;
        });

        let productsToRender = allProducts;
        if (category) productsToRender = productsToRender.filter(p => p.category === category);
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            productsToRender = productsToRender.filter(p => p.name.toLowerCase().includes(lowerSearchTerm));
        }
        productsToRender.reverse();

        gridEl.innerHTML = '';
        if (productsToRender.length === 0) {
            gridEl.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #888;">没有找到商品哦~</p>';
            return;
        }

        productsToRender.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.dataset.productId = product.id;
            card.innerHTML = `
                <img src="${product.imageUrl || getRandomDefaultProductImage()}" class="product-image" alt="${product.name}">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">${product.price.toFixed(2)}</div>
                </div>
                <button class="add-cart-btn" data-product-id="${product.id}">+</button>
            `;
            gridEl.appendChild(card);
        });
    }
    
    async function renderTaobaoCart() {
        const listEl = getElement('tb-cart-item-list');
        const checkoutBar = getElement('tb-cart-checkout-bar');
        listEl.innerHTML = '<p>加载中...</p>';
        
        const cartItems = await db.taobaoCart.toArray();

        if (cartItems.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary, #555); padding: 50px 0;">购物车空空如也~</p>';
            checkoutBar.style.display = 'none';
            updateCartBadge();
            return;
        }
        
        listEl.innerHTML = '';
        checkoutBar.style.display = 'flex';
        let totalPrice = 0;
        let totalItems = 0;

        for (const item of cartItems) {
            const product = await db.taobaoProducts.get(item.productId);
            if (!product) { await db.taobaoCart.delete(item.id); continue; }

            totalItems += item.quantity;
            totalPrice += product.price * item.quantity;

            const itemEl = document.createElement('div');
            itemEl.className = 'cart-item';
            itemEl.dataset.productId = product.id;
            itemEl.innerHTML = `
                <img src="${product.imageUrl || getRandomDefaultProductImage()}" class="product-image">
                <div class="cart-item-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">¥${product.price.toFixed(2)}</div>
                </div>
                <div class="quantity-controls">
                    <button class="quantity-decrease" data-cart-id="${item.id}" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="quantity-increase" data-cart-id="${item.id}">+</button>
                </div>
                <button class="delete-cart-item-btn" data-cart-id="${item.id}">×</button>
            `;
            listEl.appendChild(itemEl);
        }
        
        getElement('tb-cart-total-price').textContent = `¥ ${totalPrice.toFixed(2)}`;
        getElement('tb-checkout-btn').textContent = `结算(${totalItems})`;
        updateCartBadge();
    }

    async function updateCartBadge() {
        const badge = getElement('tb-cart-item-count-badge');
        const totalCount = await db.taobaoCart.reduce((sum, item) => sum + item.quantity, 0);
        if (totalCount > 0) {
            badge.textContent = totalCount > 99 ? '99+' : totalCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    async function renderTaobaoOrders() {
        const orderListEl = getElement('tb-order-list');
        orderListEl.innerHTML = '<p>加载中...</p>';
        const orders = await db.taobaoOrders.orderBy('timestamp').reverse().toArray();

        if (orders.length === 0) {
            orderListEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary, #555); padding: 50px 0;">你还没有订单哦~</p>';
            return;
        }

        orderListEl.innerHTML = '';
        for(const order of orders) {
            const product = await db.taobaoProducts.get(order.productId);
            if (!product) continue;

            const orderEl = document.createElement('div');
            orderEl.className = 'order-item';
            orderEl.dataset.orderId = order.id;
            orderEl.innerHTML = `
                <img src="${product.imageUrl || getRandomDefaultProductImage()}" class="product-image">
                <div class="order-info">
                    <div class="product-name">${product.name} (x${order.quantity})</div>
                    <div class="order-status">${order.status || '已付款'}</div>
                    <div class="order-time">${new Date(order.timestamp).toLocaleString()}</div>
                </div>
            `;
            orderListEl.appendChild(orderEl);
        }
    }

    function updateUserBalanceDisplay() {
        getElement('tb-user-balance-display').textContent = `¥ ${state.userBalance.toFixed(2)}`;
    }
    
    async function renderBalanceDetails() {
        updateUserBalanceDisplay();
        const detailsListEl = getElement('tb-balance-details-list');
        detailsListEl.innerHTML = '<h3>收支明细</h3><p>加载中...</p>';

        const transactions = await db.userWalletTransactions.orderBy('timestamp').reverse().toArray();

        if (transactions.length === 0) {
            detailsListEl.innerHTML = '<h3>收支明细</h3><p style="text-align:center; color: #888;">暂无收支明细</p>';
            return;
        }

        detailsListEl.innerHTML = '<h3>收支明细</h3>';
        transactions.forEach(tx => {
            const isIncome = tx.amount > 0;
            const itemEl = document.createElement('div');
            itemEl.className = 'transaction-item';
            itemEl.innerHTML = `
                <div class="transaction-info">
                    <div class="description">${tx.description}</div>
                    <div class="timestamp">${new Date(tx.timestamp).toLocaleString()}</div>
                </div>
                <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                    ${isIncome ? '+' : ''}${tx.amount.toFixed(2)}
                </div>
            `;
            detailsListEl.appendChild(itemEl);
        });
    }

    // --- 数据与核心逻辑函数 ---

    async function loadInitialData() {
        const balanceSetting = await db.globalSettings.get('userBalance');
        state.userBalance = balanceSetting ? balanceSetting.value : 1000;
        updateUserBalanceDisplay();
    }
    
    function switchTaobaoView(viewId) {
        if (state.currentView === viewId) return;
        state.currentView = viewId;

        document.querySelectorAll(`#${ROOT_ID} .taobao-view`).forEach(v => v.classList.remove('active'));
        getElement(viewId).classList.add('active');

        document.querySelectorAll(`#${ROOT_ID} .taobao-tab`).forEach(t => {
            t.classList.toggle('active', t.dataset.view === viewId);
        });

        switch (viewId) {
            case 'tb-products-view': renderTaobaoProducts(); break;
            case 'tb-cart-view': renderTaobaoCart(); break;
            case 'tb-orders-view': renderTaobaoOrders(); break;
            case 'tb-my-view': renderBalanceDetails(); break;
        }
    }
    
    async function handleAddToCart(productId) {
        productId = parseInt(productId);
        const existingItem = await db.taobaoCart.get({ productId });
        if (existingItem) {
            await db.taobaoCart.update(existingItem.id, { quantity: existingItem.quantity + 1 });
        } else {
            await db.taobaoCart.add({ productId: productId, quantity: 1 });
        }
        showAlert('宝贝已加入购物车！');
        updateCartBadge();
        if (state.currentView === 'tb-cart-view') await renderTaobaoCart();
    }
    
    async function handleChangeCartItemQuantity(cartId, change) {
        cartId = parseInt(cartId);
        const item = await db.taobaoCart.get(cartId);
        if (!item) return;
        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) {
            await handleRemoveFromCart(cartId);
        } else {
            await db.taobaoCart.update(cartId, { quantity: newQuantity });
            await renderTaobaoCart();
        }
    }

    async function handleRemoveFromCart(cartId) {
        cartId = parseInt(cartId);
        if(await showConfirm('确定要删除这个宝贝吗？')){
            await db.taobaoCart.delete(cartId);
            await renderTaobaoCart();
        }
    }

    async function handleCheckout() {
        const cartItems = await db.taobaoCart.toArray();
        if (cartItems.length === 0) { showAlert("购物车是空的！"); return; }

        let totalPrice = 0;
        const productPromises = cartItems.map(item => db.taobaoProducts.get(item.productId));
        const products = await Promise.all(productPromises);
        products.forEach((p, i) => { if (p) totalPrice += p.price * cartItems[i].quantity; });

        if (state.userBalance < totalPrice) {
            showAlert(`余额不足！需要 ¥${totalPrice.toFixed(2)}`);
            return;
        }

        if (await showConfirm(`总计 ¥${totalPrice.toFixed(2)}，确认支付吗？`)) {
            await updateUserBalanceAndLogTransaction(-totalPrice, '购物消费');
            await createOrdersFromCart(cartItems, products);
            await db.taobaoCart.clear();
            showAlert('支付成功！订单已生成。');
            switchTaobaoView('tb-orders-view');
        }
    }

    async function handleBuyForChar() { showAlert("为Ta购买（送礼）功能正在开发中..."); }

    async function createOrdersFromCart(cartItems, products) {
        const timestamp = Date.now();
        const newOrders = cartItems.map((item, i) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: products[i].price,
            timestamp: timestamp,
            status: '已付款，待发货'
        }));
        await db.taobaoOrders.bulkAdd(newOrders);
    }
    
    async function updateUserBalanceAndLogTransaction(amount, description) {
        state.userBalance += amount;
        await db.globalSettings.put({ key: 'userBalance', value: state.userBalance });
        await db.userWalletTransactions.add({ amount, description, timestamp: Date.now() });
        updateUserBalanceDisplay();
    }
    
    async function openProductDetail(productId) {
        productId = parseInt(productId);
        const product = await db.taobaoProducts.get(productId);
        if (!product) return;

        getElement('tb-product-detail-body').innerHTML = `
            <img src="${product.imageUrl || getRandomDefaultProductImage()}" class="product-image" alt="${product.name}">
            <div class="product-name">${product.name}</div>
            <div class="product-price">${product.price.toFixed(2)}</div>
        `;
        getElement('tb-detail-add-to-cart-btn').dataset.productId = product.id;
        getElement('tb-product-reviews-list').innerHTML = '<p style="text-align: center; color: #888; font-size: 13px;">还没有人评价哦~</p>';
        openModal('tb-product-detail-modal');
    }

    async function clearTaobaoProducts() {
        if(await showConfirm('确认清空所有商品和购物车吗？此操作无法恢复。')){
            await db.taobaoProducts.clear();
            await db.taobaoCart.clear();
            await renderTaobaoProducts();
            updateCartBadge();
            showAlert('所有商品已清空！');
        }
    }
    
    function openProductEditor(product = null) {
        const titleEl = getElement('tb-product-editor-title');
        const nameInput = getElement('tb-product-name-input');
        const priceInput = getElement('tb-product-price-input');
        const imageInput = getElement('tb-product-image-input');
        const categoryInput = getElement('tb-product-category-input');

        if (product) {
            titleEl.textContent = '编辑商品';
            nameInput.value = product.name;
            priceInput.value = product.price;
            imageInput.value = product.imageUrl;
            categoryInput.value = product.category;
            state.currentEditingProductId = product.id;
        } else {
            titleEl.textContent = '添加新商品';
            [nameInput, priceInput, imageInput, categoryInput].forEach(el => el.value = '');
            state.currentEditingProductId = null;
        }
        openModal('tb-product-editor-modal');
    }

    async function saveProduct() {
        const name = getElement('tb-product-name-input').value.trim();
        const price = parseFloat(getElement('tb-product-price-input').value);
        const imageUrl = getElement('tb-product-image-input').value.trim();
        const category = getElement('tb-product-category-input').value.trim();

        if (!name || isNaN(price) || price <= 0) { showAlert('请输入有效的商品名称和价格！'); return; }

        const productData = { name, price, imageUrl, category };
        if (state.currentEditingProductId) {
            await db.taobaoProducts.update(state.currentEditingProductId, productData);
        } else {
            await db.taobaoProducts.add(productData);
        }
        closeModal('tb-product-editor-modal');
        await renderTaobaoProducts();
    }


    // ============================================
    // 第四部分: 事件监听器绑定
    // ============================================
    function bindEventListeners() {
        const root = getElement(ROOT_ID);
        if (!root) return;

        root.addEventListener('click', async (e) => {
            const target = e.target;
            const action = target.dataset.action || target.closest('[data-action]')?.dataset.action;

            // --- 全局操作 ---
            if (action === 'close-modal') {
                closeModal(target.closest('.modal').id);
                return;
            }
            if (action === 'hide-app') {
                hideTaobaoApp();
                return;
            }

            // --- 桃宝主屏幕 ---
            const taobaoScreen = target.closest('#tb-taobao-screen');
            if (taobaoScreen) {
                if (target.id === 'tb-clear-taobao-products-btn') { await clearTaobaoProducts(); return; }
                if (target.id === 'tb-add-product-btn') { openModal('tb-add-product-choice-modal'); return; }
                if (target.closest('.taobao-tab')) { switchTaobaoView(target.closest('.taobao-tab').dataset.view); return; }
                if (target.closest('.product-card') && !target.closest('.add-cart-btn')) { openProductDetail(target.closest('.product-card').dataset.productId); return; }
                if (target.closest('.add-cart-btn')) { await handleAddToCart(target.closest('.add-cart-btn').dataset.productId); return; }
                if (target.closest('.category-tab-btn')) { await renderTaobaoProducts(target.closest('.category-tab-btn').dataset.category === 'all' ? null : target.closest('.category-tab-btn').dataset.category); return; }
                if (target.id === 'tb-product-search-btn') { await renderTaobaoProducts(null, getElement('tb-product-search-input').value); return; }
                if (target.closest('.cart-item')) {
                    const cartItem = target.closest('.cart-item');
                    if (target.matches('.quantity-increase')) await handleChangeCartItemQuantity(target.dataset.cartId, 1);
                    else if (target.matches('.quantity-decrease')) await handleChangeCartItemQuantity(target.dataset.cartId, -1);
                    else if (target.matches('.delete-cart-item-btn')) await handleRemoveFromCart(target.dataset.cartId);
                    else openProductDetail(cartItem.dataset.productId);
                    return;
                }
                if (target.id === 'tb-checkout-btn') { await handleCheckout(); return; }
                if (target.id === 'tb-buy-for-char-btn') { await handleBuyForChar(); return; }
                if (target.id === 'tb-top-up-btn') {
                    const amountStr = prompt("请输入充值金额:", "100");
                    const amount = parseFloat(amountStr);
                    if (amountStr && !isNaN(amount) && amount > 0) {
                        await updateUserBalanceAndLogTransaction(amount, '钱包充值');
                        await renderBalanceDetails();
                    } else if (amountStr) {
                        showAlert('请输入有效的金额！');
                    }
                    return;
                }
                if (target.closest('.order-item') && target.closest('#tb-orders-view')) {
                    showAlert("物流详情功能正在开发中...");
                    // openLogisticsView(target.closest('.order-item').dataset.orderId);
                    return;
                }
            }

            // --- 其他屏幕和弹窗 ---
            if (target.id === 'tb-logistics-back-btn') { showTaobaoScreen('tb-taobao-screen'); return; }
            if (target.id === 'tb-detail-add-to-cart-btn') { await handleAddToCart(target.dataset.productId); closeModal('tb-product-detail-modal'); return; }
            if (target.closest('#tb-add-product-choice-modal')) {
                closeModal('tb-add-product-choice-modal');
                if (target.id === 'tb-add-product-manual-btn') openProductEditor();
                else if (target.id === 'tb-add-product-link-btn') openModal('tb-add-from-link-modal');
                else if (target.id === 'tb-add-product-ai-btn') showAlert("AI生成功能正在开发中...");
                return;
            }
            if (target.id === 'tb-save-product-btn') { await saveProduct(); return; }
            if (target.id === 'tb-confirm-link-paste-btn') { showAlert("链接识别功能正在开发中..."); return; }
        });

        getElement('tb-product-search-input')?.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') await renderTaobaoProducts(null, e.target.value);
        });
        
        console.log('✅ 桃宝App: 事件监听器已绑定');
    }

    // ============================================
    // 第五部分: 初始化与对外接口
    // ============================================
    
    async function initTaobaoApp() {
        if (isInitialized) return;
        console.log('🚀 初始化桃宝App (防冲突版)...');
        
        injectTaobaoStyles();
        createTaobaoAppHTML();
        if (!setupDatabase()) return; // 如果数据库设置失败则中止
        await loadInitialData();
        bindEventListeners();
        
        isInitialized = true;
        console.log('✅ 桃宝App 初始化完成');
    }

    async function launchTaobaoApp() {
        if (!isInitialized) {
            await initTaobaoApp();
        }
        showTaobaoScreen('tb-taobao-screen');
        if (state.currentView !== 'tb-products-view') {
            switchTaobaoView('tb-products-view');
        } else {
            await renderTaobaoProducts();
        }
        updateCartBadge();
        updateUserBalanceDisplay();
    }

    window.launchTaobaoApp = launchTaobaoApp;

})(window);
