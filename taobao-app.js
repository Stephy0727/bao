// ==========================================
// Taobao App - 独立JS整合文件 (防冲突隔离版 - V1.2 修复版)
// 修复内容: 修复了 updateCartBadge 中 Dexie.js 的使用错误
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
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                color: #333;
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                z-index: 2000; /* 确保在最上层 */
                pointer-events: none; /* 默认不阻挡点击，内部screen显示时才阻挡 */
            }

            #${ROOT_ID} .screen {
                display: none; /* Default to hidden */
                flex-direction: column;
                position: absolute;
                top: 0; left: 0; width: 100%; height: 100%;
                background-color: #f0f2f5;
                pointer-events: auto; /* 屏幕显示时恢复点击 */
            }

            #${ROOT_ID} .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 15px;
                padding-top: calc(15px + env(safe-area-inset-top)); /* 适配刘海屏 */
                background-color: var(--secondary-bg);
                border-bottom: 1px solid var(--border-color);
                flex-shrink: 0;
                font-size: 18px;
                font-weight: 600;
            }

            #${ROOT_ID} .header .back-btn {
                font-size: 24px;
                cursor: pointer;
                width: 30px;
                display: flex; align-items: center;
            }
            
            #${ROOT_ID} .header .header-actions {
                display: flex;
                gap: 15px;
                align-items: center;
            }
            
            #${ROOT_ID} .header .action-btn {
                cursor: pointer;
                font-size: 22px;
                color: #FF5722;
            }
            
            #${ROOT_ID} .list-container {
                flex: 1;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
            }

            #${ROOT_ID} .form-button {
                width: 100%;
                padding: 12px;
                background-color: #FF5722;
                color: white;
                border: none;
                border-radius: 20px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
            }
            
            #${ROOT_ID} .form-button-secondary {
                background-color: #fff;
                color: #FF5722;
                border: 1px solid #FF5722;
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
                font-size: 14px;
                color: var(--text-secondary);
                border: none;
                background: none;
                cursor: pointer;
                position: relative;
            }
            #${ROOT_ID} .taobao-tab.active {
                color: #FF5722;
                font-weight: 600;
            }
            #${ROOT_ID} .taobao-tab.active::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 20px;
                height: 3px;
                background-color: #FF5722;
                border-radius: 2px;
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
                -webkit-overflow-scrolling: touch;
                display: none;
                flex-direction: column;
                padding: 10px;
                box-sizing: border-box;
                padding-bottom: calc(20px + env(safe-area-inset-bottom));
            }
            #${ROOT_ID} .taobao-view.active {
                display: flex;
            }

            /* --- 首页/商品视图 --- */
            #${ROOT_ID} #tb-product-category-tabs {
                display: flex;
                gap: 8px;
                margin-bottom: 10px;
                overflow-x: auto;
                padding: 5px 0;
                flex-shrink: 0;
                scrollbar-width: none;
            }
            #${ROOT_ID} #tb-product-category-tabs::-webkit-scrollbar { display: none; }

            #${ROOT_ID} .category-tab-btn {
                padding: 6px 12px;
                border-radius: 15px;
                font-size: 13px;
                background-color: #fff;
                color: #666;
                border: none;
                white-space: nowrap;
                cursor: pointer;
            }
            #${ROOT_ID} .category-tab-btn.active {
                background-color: #FFEFE9;
                color: #FF5722;
                font-weight: 600;
            }

            #${ROOT_ID} .product-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                align-content: start;
            }
            #${ROOT_ID} .product-card {
                background-color: #fff;
                border-radius: 8px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                cursor: pointer;
                position: relative;
            }
            #${ROOT_ID} .product-card .product-image {
                width: 100%;
                aspect-ratio: 1 / 1;
                object-fit: cover;
                background-color: #f5f5f5;
            }
            #${ROOT_ID} .product-card .product-info {
                padding: 8px;
                flex-grow: 1;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
            }
            #${ROOT_ID} .product-card .product-name {
                font-size: 13px;
                line-height: 1.4;
                color: #333;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                margin-bottom: 4px;
            }
            #${ROOT_ID} .product-card .product-price-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            #${ROOT_ID} .product-card .product-price {
                font-size: 16px;
                font-weight: 600;
                color: #FF5722;
            }
            #${ROOT_ID} .product-card .product-price::before {
                content: '¥'; font-size: 12px; margin-right: 1px;
            }
            #${ROOT_ID} .add-cart-btn-small {
                width: 24px; height: 24px;
                background-color: #FF5722; color: white;
                border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                font-size: 18px; line-height: 1;
                cursor: pointer;
            }

            /* --- 我的/余额视图 --- */
            #${ROOT_ID} #tb-user-balance-card {
                background: linear-gradient(135deg, #FF6B35, #FF3D00);
                color: white;
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 15px;
                box-shadow: 0 4px 10px rgba(255, 87, 34, 0.3);
            }
            #${ROOT_ID} #tb-user-balance-display {
                font-size: 32px;
                font-weight: bold;
                margin: 10px 0 15px 0;
            }
            #${ROOT_ID} #tb-top-up-btn {
                background-color: rgba(255,255,255,0.2);
                color: white;
                border: 1px solid rgba(255,255,255,0.5);
                width: auto; padding: 6px 15px; font-size: 13px;
            }

            /* --- 订单/物流/明细列表通用 --- */
            #${ROOT_ID} .common-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            #${ROOT_ID} .list-item-card {
                background-color: #fff;
                border-radius: 10px;
                padding: 12px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            #${ROOT_ID} .list-item-card img {
                width: 60px; height: 60px;
                border-radius: 6px;
                object-fit: cover; background: #f5f5f5;
            }
            #${ROOT_ID} .list-item-info { flex-grow: 1; overflow: hidden; }
            #${ROOT_ID} .list-item-title { font-size: 14px; font-weight: 500; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            #${ROOT_ID} .list-item-desc { font-size: 12px; color: #999; }
            #${ROOT_ID} .list-item-right { text-align: right; flex-shrink: 0; }
            #${ROOT_ID} .list-item-status { font-size: 13px; color: #FF5722; }
            
            /* 余额明细特定 */
            #${ROOT_ID} .transaction-amount { font-size: 16px; font-weight: 600; }
            #${ROOT_ID} .transaction-amount.income { color: #4CAF50; }
            #${ROOT_ID} .transaction-amount.expense { color: #333; }

            /* --- 搜索栏 --- */
            #${ROOT_ID} .taobao-search-bar {
                display: flex; gap: 10px; padding: 5px 0 10px 0; flex-shrink: 0;
            }
            #${ROOT_ID} #tb-product-search-input {
                flex-grow: 1;
                border: none;
                background-color: #fff;
                padding: 8px 15px;
                border-radius: 18px;
                font-size: 14px;
                outline: none;
            }
            #${ROOT_ID} #tb-product-search-btn {
                background-color: #FF5722; color: white;
                border: none; border-radius: 18px;
                padding: 0 15px; font-size: 13px;
                cursor: pointer;
            }

            /* --- 购物车 --- */
            #${ROOT_ID} #tb-cart-item-count-badge {
                position: absolute; top: 8px; right: 20%;
                background-color: #FF5722; color: white;
                font-size: 10px; padding: 1px 5px; border-radius: 10px;
                border: 1px solid #fff;
            }
            #${ROOT_ID} .cart-item {
                background-color: #fff; border-radius: 10px; padding: 10px;
                display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
            }
            #${ROOT_ID} .cart-item img { width: 70px; height: 70px; border-radius: 6px; object-fit: cover; }
            #${ROOT_ID} .cart-item-details { flex-grow: 1; }
            #${ROOT_ID} .cart-item-title { font-size: 13px; line-height: 1.3; margin-bottom: 5px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
            #${ROOT_ID} .cart-item-bottom { display: flex; justify-content: space-between; align-items: center; }
            #${ROOT_ID} .cart-item-price { color: #FF5722; font-weight: 600; }
            
            #${ROOT_ID} .quantity-control { display: flex; align-items: center; border: 1px solid #eee; border-radius: 4px; }
            #${ROOT_ID} .quantity-btn { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: #f9f9f9; font-size: 16px; color: #666; }
            #${ROOT_ID} .quantity-num { width: 30px; text-align: center; font-size: 13px; }
            
            #${ROOT_ID} #tb-cart-checkout-bar {
                position: absolute; bottom: 0; left: 0; right: 0;
                background-color: #fff; border-top: 1px solid #eee;
                padding: 10px 15px; padding-bottom: calc(10px + env(safe-area-inset-bottom));
                display: flex; justify-content: space-between; align-items: center;
            }
            #${ROOT_ID} .checkout-info { display: flex; align-items: baseline; gap: 5px; }
            #${ROOT_ID} #tb-cart-total-price { color: #FF5722; font-size: 18px; font-weight: 600; }
            #${ROOT_ID} #tb-checkout-btn {
                background: linear-gradient(to right, #FF9800, #FF5722);
                color: white; border: none; border-radius: 20px;
                padding: 8px 20px; font-size: 14px; font-weight: 600; cursor: pointer;
            }

            /* --- 通用模态框 --- */
            #${ROOT_ID} .modal { display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center; }
            #${ROOT_ID} .modal.visible { display: flex; }
            #${ROOT_ID} .modal-content { background-color: #fff; width: 85%; max-width: 400px; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; max-height: 80%; }
            #${ROOT_ID} .modal-header { padding: 15px; font-size: 16px; font-weight: 600; text-align: center; border-bottom: 1px solid #eee; }
            #${ROOT_ID} .modal-body { padding: 20px; overflow-y: auto; }
            #${ROOT_ID} .modal-footer { padding: 10px 15px; border-top: 1px solid #eee; display: flex; gap: 10px; }
            #${ROOT_ID} .modal-btn { flex: 1; padding: 10px; border-radius: 20px; border: none; font-size: 14px; cursor: pointer; text-align: center; }
            #${ROOT_ID} .modal-btn.primary { background: linear-gradient(to right, #FF9800, #FF5722); color: white; }
            #${ROOT_ID} .modal-btn.secondary { background: #f5f5f5; color: #666; }

            /* --- 表单样式 --- */
            #${ROOT_ID} .form-group { margin-bottom: 15px; }
            #${ROOT_ID} .form-label { display: block; margin-bottom: 5px; font-size: 13px; color: #666; }
            #${ROOT_ID} .form-input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; font-size: 14px; }
            
            /* --- 商品详情弹窗特有 --- */
            #${ROOT_ID} #tb-detail-img { width: 100%; aspect-ratio: 1/1; object-fit: cover; }
            #${ROOT_ID} #tb-detail-info { padding: 15px; }
            #${ROOT_ID} #tb-detail-price { color: #FF5722; font-size: 24px; font-weight: 600; }
            #${ROOT_ID} #tb-detail-price::before { content: '¥'; font-size: 16px; }
            #${ROOT_ID} #tb-detail-name { font-size: 15px; line-height: 1.4; margin-top: 5px; color: #333; font-weight: 500; }

            /* --- 快捷操作菜单 --- */
            #${ROOT_ID} .action-sheet { position: absolute; bottom: 0; left: 0; width: 100%; background: #fff; border-radius: 12px 12px 0 0; padding: 20px; padding-bottom: calc(20px + env(safe-area-inset-bottom)); transform: translateY(100%); transition: transform 0.3s; z-index: 101; box-sizing: border-box; }
            #${ROOT_ID} .modal.visible .action-sheet { transform: translateY(0); }
            #${ROOT_ID} .sheet-btn { display: block; width: 100%; padding: 12px; text-align: center; font-size: 16px; border-bottom: 1px solid #eee; cursor: pointer; }
            #${ROOT_ID} .sheet-btn:last-child { border-bottom: none; border-top: 5px solid #f5f5f5; color: #666; margin-top: 5px; }
        `;
        document.head.appendChild(style);
    }

    // ============================================
    // 第二部分: HTML结构生成
    // ============================================
    function createTaobaoAppHTML() {
        if (document.getElementById(ROOT_ID)) return;

        const container = document.createElement('div');
        container.id = ROOT_ID;
        container.innerHTML = `
            <!-- 主屏幕 -->
            <div id="tb-main-screen" class="screen">
                <div class="header">
                    <span class="back-btn" data-action="hide-app">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
                    </span>
                    <span>桃宝</span>
                    <div class="header-actions">
                        <span class="action-btn" data-action="open-menu">⋮</span>
                    </div>
                </div>
                
                <div class="taobao-content">
                    <!-- 1. 首页/商品视图 -->
                    <div id="tb-products-view" class="taobao-view active">
                        <div class="taobao-search-bar">
                            <input type="search" id="tb-product-search-input" placeholder="宝贝搜索...">
                        </div>
                        <div id="tb-product-category-tabs"></div>
                        <div id="tb-product-grid" class="product-grid"></div>
                    </div>

                    <!-- 2. 购物车视图 -->
                    <div id="tb-cart-view" class="taobao-view">
                        <div id="tb-cart-list" class="common-list" style="padding-bottom: 60px;"></div>
                        <div id="tb-cart-checkout-bar">
                            <div class="checkout-info">
                                <span style="font-size: 12px;">合计:</span>
                                <span id="tb-cart-total-price">¥0.00</span>
                            </div>
                            <button id="tb-checkout-btn">结算(0)</button>
                        </div>
                    </div>

                    <!-- 3. 订单视图 -->
                    <div id="tb-orders-view" class="taobao-view">
                        <div id="tb-order-list" class="common-list"></div>
                    </div>

                    <!-- 4. 我的视图 -->
                    <div id="tb-my-view" class="taobao-view">
                        <div id="tb-user-balance-card">
                            <div style="font-size: 13px; opacity: 0.9;">我的余额</div>
                            <div id="tb-user-balance-display">¥ 0.00</div>
                            <button id="tb-top-up-btn">充值</button>
                        </div>
                        <h3 style="font-size: 15px; margin: 15px 0 10px 5px;">收支明细</h3>
                        <div id="tb-transaction-list" class="common-list"></div>
                    </div>
                </div>

                <div class="taobao-tabs">
                    <div class="taobao-tab active" data-view="tb-products-view">首页</div>
                    <div class="taobao-tab" data-view="tb-cart-view">
                        购物车<span id="tb-cart-item-count-badge" style="display: none;">0</span>
                    </div>
                    <div class="taobao-tab" data-view="tb-orders-view">订单</div>
                    <div class="taobao-tab" data-view="tb-my-view">我的</div>
                </div>
            </div>

            <!-- 商品详情弹窗 -->
            <div id="tb-product-detail-modal" class="modal">
                <div class="modal-content" style="background: #f5f5f5; padding-bottom: 0;">
                    <div style="position: relative;">
                        <img id="tb-detail-img" src="">
                        <div style="position: absolute; top: 10px; left: 10px; width: 30px; height: 30px; background: rgba(0,0,0,0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; cursor: pointer;" data-action="close-modal">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
                        </div>
                    </div>
                    <div id="tb-detail-info" style="background: #fff; border-radius: 12px 12px 0 0; margin-top: -10px; position: relative; flex-grow: 1;">
                        <div id="tb-detail-price"></div>
                        <div id="tb-detail-name"></div>
                    </div>
                    <div style="padding: 10px; background: #fff; border-top: 1px solid #eee;">
                        <button id="tb-detail-add-cart-btn" class="modal-btn primary" style="width: 100%;">加入购物车</button>
                    </div>
                </div>
            </div>

            <!-- 商品编辑/添加弹窗 -->
            <div id="tb-product-editor-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header"><span id="tb-editor-title">添加商品</span></div>
                    <div class="modal-body">
                        <div class="form-group"><label class="form-label">商品名称</label><input type="text" id="tb-edit-name" class="form-input"></div>
                        <div class="form-group"><label class="form-label">价格</label><input type="number" id="tb-edit-price" class="form-input"></div>
                        <div class="form-group"><label class="form-label">图片URL</label><input type="text" id="tb-edit-image" class="form-input" placeholder="http://..."></div>
                        <div class="form-group"><label class="form-label">分类</label><input type="text" id="tb-edit-category" class="form-input" placeholder="例如: 服装, 数码..."></div>
                    </div>
                    <div class="modal-footer">
                        <div class="modal-btn secondary" data-action="close-modal">取消</div>
                        <div class="modal-btn primary" id="tb-save-product-btn">保存</div>
                    </div>
                </div>
            </div>

            <!-- 底部操作菜单 -->
            <div id="tb-action-sheet-modal" class="modal" style="align-items: flex-end; background-color: rgba(0,0,0,0.3);">
                <div class="action-sheet">
                    <div class="sheet-btn" id="tb-menu-add-product">手动添加商品</div>
                    <div class="sheet-btn" id="tb-menu-clear-data" style="color: #FF3D00;">清空所有数据</div>
                    <div class="sheet-btn" data-action="close-modal">取消</div>
                </div>
            </div>
        `;
        document.body.appendChild(container);
    }
    
    // ============================================
    // 第三部分: 核心JavaScript功能
    // ============================================

    // --- 数据库设置 ---
    function setupDatabase() {
        if (!window.Dexie) {
            alert("错误：缺少Dexie.js库，应用无法运行。");
            return false;
        }
        db = new Dexie("TaobaoAppDB_V2"); // 使用新数据库名以防冲突
        db.version(1).stores({
            settings: 'key', // 存储余额等
            products: '++id, name, category, createdAt', 
            cart: '++id, productId',
            orders: '++id, timestamp',
            transactions: '++id, timestamp' 
        });
        return true;
    }

    // --- 工具函数 ---
    const $ = (selector) => document.querySelector(`#${ROOT_ID} ${selector}`);
    const $$ = (selector) => document.querySelectorAll(`#${ROOT_ID} ${selector}`);
    const formatPrice = (price) => `¥${Number(price).toFixed(2)}`;
    const getRandomImage = () => ['https://img.alicdn.com/bao/uploaded/i4/2200724510033/O1CN01Example1.jpg', 'https://img.alicdn.com/bao/uploaded/i2/292666/O1CN01Example2.jpg'][Math.floor(Math.random() * 2)];

    // --- UI渲染函数 ---
    
    // 1. 渲染商品列表
    async function renderProducts(category = null, searchTerm = null) {
        const grid = $('#tb-product-grid');
        const tabs = $('#tb-product-category-tabs');
        grid.innerHTML = '';

        let products = await db.products.orderBy('createdAt').reverse().toArray();
        
        // 渲染分类
        const categories = ['全部', ...new Set(products.map(p => p.category).filter(Boolean))];
        tabs.innerHTML = categories.map(cat => 
            `<button class="category-tab-btn ${cat === (category || '全部') ? 'active' : ''}" data-cat="${cat}">${cat}</button>`
        ).join('');

        // 筛选
        if (category && category !== '全部') products = products.filter(p => p.category === category);
        if (searchTerm) products = products.filter(p => p.name.includes(searchTerm));

        if (products.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#999;padding:50px 0;">没有找到商品<br>点击右上角菜单添加</div>`;
            return;
        }

        // 渲染卡片
        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${p.image || getRandomImage()}" class="product-image" loading="lazy">
                <div class="product-info">
                    <div class="product-name">${p.name}</div>
                    <div class="product-price-row">
                        <div class="product-price">${p.price.toFixed(2)}</div>
                        <div class="add-cart-btn-small" data-id="${p.id}">+</div>
                    </div>
                </div>
            `;
            // 点击卡片看详情
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('add-cart-btn-small')) openProductDetail(p);
            });
            // 长按编辑
            let timer;
            card.addEventListener('touchstart', () => timer = setTimeout(() => openProductEditor(p), 800));
            card.addEventListener('touchend', () => clearTimeout(timer));
            card.addEventListener('touchmove', () => clearTimeout(timer));
            
            grid.appendChild(card);
        });
    }
    
    // 2. 渲染购物车
    async function renderCart() {
        const list = $('#tb-cart-list');
        list.innerHTML = '';
        
        const cartItems = await db.cart.toArray();
        let total = 0;
        let count = 0;
        const productMap = new Map();

        // 聚合商品
        for (const item of cartItems) {
            if(productMap.has(item.productId)) {
                productMap.get(item.productId).quantity++;
                productMap.get(item.productId).cartIds.push(item.id);
            } else {
                const product = await db.products.get(item.productId);
                if(product) {
                    productMap.set(item.productId, { product, quantity: 1, cartIds: [item.id] });
                } else {
                    db.cart.delete(item.id); // 清理无效项
                }
            }
        }

        if (productMap.size === 0) {
            list.innerHTML = `<div style="text-align:center;color:#999;padding:80px 0;"><svg width="60" height="60" fill="#ddd" viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg><br><br>购物车空空如也</div>`;
            updateCartBar(0, 0);
            return;
        }

        productMap.forEach(({product, quantity, cartIds}) => {
            total += product.price * quantity;
            count += quantity;
            const item = document.createElement('div');
            item.className = 'cart-item';
            item.innerHTML = `
                <img src="${product.image || getRandomImage()}">
                <div class="cart-item-details">
                    <div class="cart-item-title">${product.name}</div>
                    <div class="cart-item-bottom">
                        <div class="cart-item-price">${formatPrice(product.price)}</div>
                        <div class="quantity-control">
                            <div class="quantity-btn minus" data-ids='${JSON.stringify(cartIds)}'>-</div>
                            <div class="quantity-num">${quantity}</div>
                            <div class="quantity-btn plus" data-pid="${product.id}">+</div>
                        </div>
                    </div>
                </div>
            `;
            list.appendChild(item);
        });
        updateCartBar(total, count);
    }

    function updateCartBar(total, count) {
        $('#tb-cart-total-price').textContent = formatPrice(total);
        $('#tb-checkout-btn').textContent = `结算(${count})`;
        const badge = $('#tb-cart-item-count-badge');
        if(count > 0) {
            badge.textContent = count; badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }

    // 3. 渲染通用列表 (订单/明细)
    async function renderList(viewType) {
        const list = viewType === 'orders' ? $('#tb-order-list') : $('#tb-transaction-list');
        list.innerHTML = '';
        const table = viewType === 'orders' ? db.orders : db.transactions;
        const items = await table.orderBy('timestamp').reverse().toArray();

        if (items.length === 0) {
            list.innerHTML = `<div style="text-align:center;color:#999;padding:50px 0;">暂无记录</div>`;
            return;
        }

        for(const item of items) {
            const el = document.createElement('div');
            el.className = 'list-item-card';
            
            if (viewType === 'orders') {
                const p = await db.products.get(item.productId);
                if(!p) continue;
                el.innerHTML = `
                    <img src="${p.image || getRandomImage()}">
                    <div class="list-item-info">
                        <div class="list-item-title">${p.name} x${item.quantity}</div>
                        <div class="list-item-desc">${new Date(item.timestamp).toLocaleString()}</div>
                    </div>
                    <div class="list-item-right">
                        <div class="list-item-status">已签收</div>
                    </div>
                `;
            } else { // transactions
                el.innerHTML = `
                    <div class="list-item-info">
                        <div class="list-item-title">${item.desc}</div>
                        <div class="list-item-desc">${new Date(item.timestamp).toLocaleString()}</div>
                    </div>
                    <div class="list-item-right">
                        <div class="transaction-amount ${item.amount > 0 ? 'income' : 'expense'}">${item.amount > 0 ? '+' : ''}${item.amount.toFixed(2)}</div>
                    </div>
                `;
            }
            list.appendChild(el);
        }
    }

    // --- 核心逻辑 ---
    
    async function getBalance() {
        const rec = await db.settings.get('balance');
        return rec ? rec.value : 0;
    }
    
    async function updateBalance(amount, desc) {
        const current = await getBalance();
        const newBal = current + amount;
        if (newBal < 0) return false;
        
        await db.transaction('rw', db.settings, db.transactions, async () => {
            await db.settings.put({ key: 'balance', value: newBal });
            await db.transactions.add({ amount, desc, timestamp: Date.now() });
        });
        $('#tb-user-balance-display').textContent = formatPrice(newBal);
        if(state.currentView === 'tb-my-view') renderList('transactions');
        return true;
    }

    async function addToCart(productId) {
        await db.cart.add({ productId });
        renderCart(); // 刷新角标
        // 显示一个小提示
        const toast = document.createElement('div');
        toast.textContent = '已加入购物车';
        toast.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.7);color:#fff;padding:10px 20px;border-radius:5px;z-index:3000;font-size:14px;';
        $(`#${ROOT_ID}`).appendChild(toast);
        setTimeout(() => toast.remove(), 1500);
    }

    async function checkout() {
        const cartItems = await db.cart.toArray();
        if (cartItems.length === 0) return;
        
        let total = 0;
        const orders = [];
        const productMap = new Map();

        for(const item of cartItems) {
            if (!productMap.has(item.productId)) {
                const p = await db.products.get(item.productId);
                if(p) productMap.set(item.productId, { price: p.price, count: 0 });
            }
            if(productMap.has(item.productId)) {
                productMap.get(item.productId).count++;
                total += productMap.get(item.productId).price;
            }
        }

        if(confirm(`合计 ${formatPrice(total)}，确认付款？`)) {
            const success = await updateBalance(-total, '淘宝购物');
            if(success) {
                const now = Date.now();
                productMap.forEach((val, pid) => {
                    orders.push({ productId: pid, quantity: val.count, timestamp: now });
                });
                
                await db.transaction('rw', db.cart, db.orders, async () => {
                    await db.orders.bulkAdd(orders);
                    await db.cart.clear();
                });
                
                switchView('tb-orders-view');
                renderCart(); // 更新角标
            } else {
                alert('余额不足，请充值。');
                switchView('tb-my-view');
            }
        }
    }

    // --- 弹窗操作 ---
    function openProductDetail(p) {
        $('#tb-detail-img').src = p.image || getRandomImage();
        $('#tb-detail-price').textContent = p.price.toFixed(2);
        $('#tb-detail-name').textContent = p.name;
        $('#tb-detail-add-cart-btn').onclick = () => {
            addToCart(p.id);
            $('#tb-product-detail-modal').classList.remove('visible');
        };
        $('#tb-product-detail-modal').classList.add('visible');
    }

    function openProductEditor(p = null) {
        state.currentEditingProductId = p ? p.id : null;
        $('#tb-editor-title').textContent = p ? '编辑商品' : '添加商品';
        $('#tb-edit-name').value = p ? p.name : '';
        $('#tb-edit-price').value = p ? p.price : '';
        $('#tb-edit-image').value = p ? p.image : '';
        $('#tb-edit-category').value = p ? p.category : '';
        
        // 如果是编辑模式，添加删除按钮
        const footer = $('#tb-product-editor-modal .modal-footer');
        const existingDelBtn = footer.querySelector('.btn-delete');
        if(existingDelBtn) existingDelBtn.remove();
        
        if(p) {
            const delBtn = document.createElement('div');
            delBtn.className = 'modal-btn secondary btn-delete';
            delBtn.style.color = 'red';
            delBtn.textContent = '删除';
            delBtn.onclick = async () => {
                if(confirm('确定删除？')) {
                    await db.products.delete(p.id);
                    $('#tb-product-editor-modal').classList.remove('visible');
                    renderProducts();
                }
            };
            footer.insertBefore(delBtn, footer.firstChild);
        }

        $('#tb-product-editor-modal').classList.add('visible');
        $('#tb-action-sheet-modal').classList.remove('visible');
    }

    async function saveProduct() {
        const name = $('#tb-edit-name').value.trim();
        const price = parseFloat($('#tb-edit-price').value);
        const image = $('#tb-edit-image').value.trim();
        const category = $('#tb-edit-category').value.trim() || '其他';

        if(!name || isNaN(price)) return alert('请输入名称和价格');

        const data = { name, price, image, category, createdAt: Date.now() };
        
        if(state.currentEditingProductId) {
            await db.products.update(state.currentEditingProductId, data);
        } else {
            await db.products.add(data);
        }
        
        $('#tb-product-editor-modal').classList.remove('visible');
        if(state.currentView === 'tb-products-view') renderProducts();
    }

    // --- 视图切换 ---
    function switchView(viewId) {
        state.currentView = viewId;
        $$('.taobao-view').forEach(el => el.classList.remove('active'));
        $(`#${viewId}`).classList.add('active');
        $$('.taobao-tab').forEach(el => el.classList.toggle('active', el.dataset.view === viewId));

        // 加载数据
        if(viewId === 'tb-products-view') renderProducts();
        if(viewId === 'tb-cart-view') renderCart();
        if(viewId === 'tb-orders-view') renderList('orders');
        if(viewId === 'tb-my-view') {
            getBalance().then(b => $('#tb-user-balance-display').textContent = formatPrice(b));
            renderList('transactions');
        }
    }

    // ============================================
    // 第四部分: 事件监听器绑定
    // ============================================
    function bindEventListeners() {
        const root = $(`#${ROOT_ID}`);
        
        root.addEventListener('click', async (e) => {
            const target = e.target;
            
            // 关闭模态框
            if (target.dataset.action === 'close-modal' || target.closest('[data-action="close-modal"]')) {
                target.closest('.modal').classList.remove('visible');
                return;
            }
            
            // 隐藏App
            if (target.dataset.action === 'hide-app') {
                $('#tb-main-screen').style.display = 'none'; return;
            }
            
            // 底部标签切换
            if (target.classList.contains('taobao-tab')) {
                switchView(target.dataset.view); return;
            }
            
            // 首页：分类切换
            if (target.classList.contains('category-tab-btn')) {
                renderProducts(target.dataset.cat, $('#tb-product-search-input').value); return;
            }
            
            // 首页：加入购物车(小按钮)
            if (target.classList.contains('add-cart-btn-small')) {
                addToCart(parseInt(target.dataset.id)); 
                e.stopPropagation(); // 防止触发卡片点击
                return;
            }

            // 首页：搜索
            if (target.id === 'tb-product-search-btn') {
                renderProducts($('.category-tab-btn.active')?.dataset.cat, $('#tb-product-search-input').value); return;
            }
            
            // 购物车：加减数量
            if (target.classList.contains('quantity-btn')) {
                if (target.classList.contains('plus')) {
                    await db.cart.add({ productId: parseInt(target.dataset.pid) });
                } else {
                    const ids = JSON.parse(target.dataset.ids);
                    if(ids.length > 0) await db.cart.delete(ids[0]); // 删除一个
                }
                renderCart(); return;
            }
            
            // 购物车：结算
            if (target.id === 'tb-checkout-btn') { checkout(); return; }
            
            // 我的：充值
            if (target.id === 'tb-top-up-btn') {
                const amt = prompt('输入充值金额', '1000');
                if(amt && !isNaN(amt)) updateBalance(parseFloat(amt), '余额充值');
                return;
            }
            
            // 头部：打开菜单
            if (target.dataset.action === 'open-menu') {
                $('#tb-action-sheet-modal').classList.add('visible'); return;
            }
            
            // 菜单：操作
            if (target.id === 'tb-menu-add-product') {
                openProductEditor(); return;
            }
            if (target.id === 'tb-menu-clear-data') {
                if(confirm('确定清空所有商品、订单和记录？余额将保留。')) {
                    await Promise.all([db.products.clear(), db.cart.clear(), db.orders.clear(), db.transactions.clear()]);
                    alert('数据已清空');
                    $('#tb-action-sheet-modal').classList.remove('visible');
                    switchView(state.currentView); // 刷新当前视图
                    renderCart(); // 刷新角标
                }
                return;
            }
            
            // 编辑器：保存
            if (target.id === 'tb-save-product-btn') { saveProduct(); return; }
        });

        // 搜索框回车
        $('#tb-product-search-input').addEventListener('keyup', (e) => {
            if(e.key === 'Enter') $('#tb-product-search-btn').click();
        });
    }

    // ============================================
    // 第五部分: 初始化与对外接口
    // ============================================
    async function init() {
        if (isInitialized) return;
        injectTaobaoStyles();
        createTaobaoAppHTML();
        if (!setupDatabase()) return;
        bindEventListeners();
        
        // 预加载初始余额
        const bal = await db.settings.get('balance');
        if(!bal) await db.settings.put({key: 'balance', value: 2000}); // 默认送2000
        
        // 初始化加载一次购物车角标
        renderCart();

        isInitialized = true;
    }

    window.launchTaobaoApp = async function() {
        await init();
        $('#tb-main-screen').style.display = 'flex';
        switchView('tb-products-view'); // 默认打开首页
    }

})(window);
