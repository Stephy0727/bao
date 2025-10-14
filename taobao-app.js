// ===================================================================================
//
//                        TAOBAO APP - 独立全功能模块 (Full Functionality)
//                         版本: 2.3 (功能增强 & 交互优化)
//
// ===================================================================================
//
//  使用说明:
//  1. 确保 HTML 引入了 Dexie.js: <script src="https://unpkg.com/dexie/dist/dexie.js"></script>
//  2. 在 HTML 中引入此文件: <script src="taobao-app.js" defer></script>
//  3. 在宿主 JS (如 pp.js) 初始化完成后，确保 TaobaoAppModule.init() 被调用。
//
// ===================================================================================

(function(window) {
    'use strict';

    // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 模拟宿主环境 API (独立运行时使用) ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
    if (!window.EPhone) {
        console.log("[桃宝App] 运行在独立模式，使用模拟 API。");
        let _mockHostBalance = 1000.00; // 初始余额设为1000，方便测试
        window.EPhone = {
            showScreen: (screenId) => { console.log(`[Host] 切换屏幕到: ${screenId}`); },
            // 【优化】使用更完善的 showCustom... 模拟函数
            showCustomAlert: (title, message) => Promise.resolve(alert(`${title}\n${message}`)),
            showCustomConfirm: (title, message) => Promise.resolve(confirm(`${title}\n${message}`)),
            showCustomPrompt: (title, message, defaultVal) => Promise.resolve(prompt(`${title}\n${message}`, defaultVal)),
            showChoiceModal: async (title, options) => {
                const choiceText = options.map((opt, i) => `${i + 1}: ${opt.text}`).join('\n');
                const choice = prompt(`${title}\n${choiceText}\n\n请输入选项编号:`);
                if (choice && options[parseInt(choice) - 1]) {
                    return options[parseInt(choice) - 1].value;
                }
                return null;
            },
            api: {
                getWalletBalance: async () => {
                    console.log(`[Host API] 获取余额: ${_mockHostBalance}`);
                    return _mockHostBalance;
                },
                updateWallet: async (amount, description) => {
                    _mockHostBalance = parseFloat((_mockHostBalance + parseFloat(amount)).toFixed(2));
                    console.log(`[Host API] 余额变动: ${amount}, 新余额: ${_mockHostBalance}, 原因: ${description}`);
                    return true;
                }
                // ... 其他模拟API保持不变
            }
        };
    }
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 模拟环境结束 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲


    // ===================================================================
    //  核心控制器对象
    // ===================================================================
    const TaobaoApp = {
        db: null,
        isInitialized: false,
        defaultProducts: [], // 保持为空，尊重用户自定义

        // ===================================================================
        //  1. 初始化与数据库设置
        // ===================================================================
        init: async function() {
            if (this.isInitialized) return;
            console.log("[桃宝App] 开始初始化...");

            try {
                this.initDatabase();
                this.injectCSS();
                this.injectHTML();
                this.bindHostIcon();
                this.bindEvents();

                await this.checkAndSeedData();
                await this.renderProductList('all');

                this.isInitialized = true;
                console.log("[桃宝App] 初始化完成，数据库已就绪。");
            } catch (error) {
                console.error("[桃宝App] 初始化失败:", error);
                alert(`桃宝App初始化失败: ${error.message}`);
            }
        },

        initDatabase: function() {
            if (typeof Dexie === 'undefined') {
                const msg = "错误: 缺少 Dexie.js 库。桃宝App无法存储数据。请在HTML中引入 Dexie.js。";
                alert(msg);
                throw new Error(msg);
            }
            this.db = new Dexie('TaobaoAppDataDB');
            this.db.version(1).stores({
                products: '++id, name, category',
                cart: '++id, productId',
                orders: '++id, timestamp',
                transactions: '++id, timestamp'
            });
        },

        checkAndSeedData: async function() {
            const count = await this.db.products.count();
            if (count === 0 && this.defaultProducts.length > 0) {
                console.log("[桃宝App] 数据库为空，写入默认商品数据...");
                await this.db.products.bulkAdd(this.defaultProducts);
            } else {
                 console.log("[桃宝App] 数据库已有数据或无默认数据，跳过写入。");
            }
        },

        bindHostIcon: function() {
            const icon = document.getElementById('taobao-app-placeholder');
            if (icon) {
                icon.innerHTML = `
                    <div class="icon-bg-desktop" style="background:#fff; display:flex;align-items:center;justify-content:center;">
                        <span style="font-size:30px;color:#FF5722;font-weight:bold;">淘</span>
                    </div>
                    <span class="label">桃宝</span>
                `;
                icon.onclick = () => {
                    this.open();
                };
            }
        },
        
        open: async function() {
            // 【优化】确保在打开前屏幕已存在
            if (!document.getElementById('taobao-screen')) {
                console.error("桃宝App屏幕未注入，无法打开。");
                return;
            }
            window.EPhone.showScreen('taobao-screen');
            this.switchTab('taobao-products-view');
            await this.updateCartCount();
            await this.renderProductList('all');
        },

        // ===================================================================
        //  2. 视图渲染逻辑 (Controller -> View)
        // ===================================================================
        switchTab: async function(viewId) {
            document.querySelectorAll('#taobao-screen .taobao-view').forEach(el => el.classList.remove('active'));
            document.getElementById(viewId).classList.add('active');
            document.querySelectorAll('#taobao-screen .taobao-tab').forEach(el => {
                el.classList.toggle('active', el.dataset.view === viewId);
            });

            switch (viewId) {
                case 'taobao-products-view': await this.renderProductList('all'); break; // 切换时强制刷新
                case 'taobao-cart-view': await this.renderCart(); break;
                case 'taobao-orders-view': await this.renderOrders(); break;
                case 'taobao-my-view': await this.renderMyPage(); break;
            }
        },

        renderProductList: async function(category = 'all') {
            const grid = document.getElementById('taobao-product-grid');
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;">加载中...</div>';

            let products = category === 'all' || !category 
                ? await this.db.products.toArray()
                : await this.db.products.where('category').equals(category).toArray();

            grid.innerHTML = '';
            if (products.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#999;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="#ddd"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        <p style="font-weight:bold;margin:10px 0 5px;">还没有商品</p>
                        <p style="font-size:13px;">点击右上角的 '+' 按钮添加你的第一个商品吧！</p>
                    </div>`;
                this.renderCategoryTabs(category);
                return;
            }

            products.forEach(p => {
                const card = document.createElement('div');
                card.className = 'product-card';
                card.dataset.productId = p.id; // 【新增】为长按操作做准备
                
                const imageHtml = p.imageUrl 
                    ? `<img src="${p.imageUrl}" class="product-image" alt="${p.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"/>
                       <div class="image-placeholder" style="display:none;"><span>图片加载失败</span></div>`
                    : `<div class="image-placeholder"><span>暂无图片</span></div>`;
                    
                card.innerHTML = `
                    ${imageHtml}
                    <div class="product-info">
                        <div class="product-name">${p.name}</div>
                        <div class="product-price">${p.price.toFixed(2)}</div>
                    </div>
                    <button class="add-to-cart-btn" data-id="${p.id}">+</button>
                `;
                
                // 【修改】将点击事件改为显示商品详情
                card.addEventListener('click', (e) => {
                    if(!e.target.classList.contains('add-to-cart-btn')) {
                        window.EPhone.showCustomAlert(`商品: ${p.name}`, `价格: ¥${p.price.toFixed(2)}\n分类: ${p.category || '无'}\n描述: ${p.description || '暂无描述'}`);
                    }
                });

                card.querySelector('.add-to-cart-btn').onclick = async (e) => {
                    e.stopPropagation();
                    await this.addToCart(p.id);
                };
                grid.appendChild(card);
            });

            this.renderCategoryTabs(category);
        },

        // 其他 render... 函数保持不变...
        renderCategoryTabs: async function(activeCategory) { /* ... */ },
        renderCart: async function() { /* ... */ },
        renderOrders: async function() { /* ... */ },
        renderMyPage: async function() { /* ... */ },

        // ===================================================================
        //  3. 业务逻辑动作 (Actions)
        // ===================================================================
        addToCart: async function(productId) {
            try {
                // 【优化】检查商品是否存在
                const product = await this.db.products.get(productId);
                if (!product) {
                    return (window.EPhone.showCustomAlert || alert)("错误", "该商品已下架或不存在。");
                }

                const existing = await this.db.cart.where({ productId }).first();
                if (existing) {
                    await this.db.cart.update(existing.id, { quantity: Dexie.inc(1) });
                } else {
                    await this.db.cart.add({ productId, quantity: 1 });
                }
                await this.updateCartCount();
                (window.EPhone.showCustomToast || alert)("已加入购物车");
            } catch (error) {
                console.error("加入购物车失败:", error);
                (window.EPhone.showCustomAlert || alert)("操作失败", "加入购物车时遇到问题。");
            }
        },

        updateCartCount: async function() { /* ... */ },
        changeCartNum: async function(cartId, delta) { /* ... */ },

        checkout: async function() {
            const checkoutBtn = document.getElementById('taobao-checkout-btn');
            const total = parseFloat(checkoutBtn.dataset.total || 0);
            if (total <= 0) return window.EPhone.showCustomAlert("提示", "购物车是空的，快去逛逛吧！");

            try {
                const balance = await window.EPhone.api.getWalletBalance();
                if (balance < total) {
                    return window.EPhone.showCustomAlert("余额不足", `需要支付 ¥${total.toFixed(2)}，当前余额 ¥${balance.toFixed(2)}。请先充值。`);
                }

                // 【优化】增加最终确认
                const confirmed = await window.EPhone.showCustomConfirm("确认付款", `总计 ${total.toFixed(2)} 元。\n\n您确定要支付吗？`);
                if (!confirmed) return;

                await window.EPhone.api.updateWallet(-total, "桃宝购物结算");
                await this.db.transactions.add({ amount: -total, description: "桃宝订单支付", timestamp: Date.now() });
                
                const cartItems = await this.db.cart.toArray();
                const itemPromises = cartItems.map(async c => ({ ...(await this.db.products.get(c.productId)), quantity: c.quantity }));
                const orderItems = (await Promise.all(itemPromises)).filter(p => p.id);
                
                await this.db.orders.add({
                    items: orderItems.map(p => ({ productId: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl, quantity: p.quantity })),
                    totalPrice: total,
                    totalCount: orderItems.reduce((sum, i) => sum + i.quantity, 0),
                    status: 'paid',
                    timestamp: Date.now()
                });
                
                await this.db.cart.clear();
                // 【优化】清空 dataset
                checkoutBtn.dataset.total = 0;
                await window.EPhone.showCustomAlert("支付成功", "商家正在为您急速发货！");
                this.switchTab('taobao-orders-view');
            } catch (e) {
                console.error("结算失败:", e);
                window.EPhone.showCustomAlert("支付遇到问题", e.message);
            }
        },

        handleTopUp: async function() { /* ... */ },

        // 【【【核心修改：用 EPhone API 替换原生 prompt/alert】】】
        handleAddNewProduct: async function() {
            try {
                const name = await window.EPhone.showCustomPrompt("添加商品", "商品名称:", "新款T恤");
                if (!name) return;
                const priceStr = await window.EPhone.showCustomPrompt("添加商品", "价格:", "89");
                const price = parseFloat(priceStr);
                if (isNaN(price)) return window.EPhone.showCustomAlert("错误", "价格无效");
                const cat = await window.EPhone.showCustomPrompt("添加商品", "分类:", "衣服");
                const desc = await window.EPhone.showCustomPrompt("添加商品", "商品描述(可选):", "");
                const imageUrl = await window.EPhone.showCustomPrompt("添加商品", "图片链接(可选):", "");
                
                await this.db.products.add({ name, price, category: cat || "其他", description: desc, imageUrl });
                
                // 如果当前在首页，则刷新
                if (document.getElementById('taobao-products-view').classList.contains('active')) {
                    await this.renderProductList('all');
                }
                await window.EPhone.showCustomAlert("成功", "商品已成功添加！");
            } catch (error) {
                console.error("添加商品失败:", error);
                window.EPhone.showCustomAlert("操作失败", "添加商品时出错。");
            }
        },

        // 【【【核心新增：编辑和删除商品的功能】】】
        handleEditProduct: async function(productId) {
            try {
                const product = await this.db.products.get(productId);
                if (!product) return window.EPhone.showCustomAlert("错误", "找不到该商品。");

                const name = await window.EPhone.showCustomPrompt("编辑商品", "商品名称:", product.name);
                if (!name) return;
                const priceStr = await window.EPhone.showCustomPrompt("编辑商品", "价格:", product.price);
                const price = parseFloat(priceStr);
                if (isNaN(price)) return window.EPhone.showCustomAlert("错误", "价格无效");
                const cat = await window.EPhone.showCustomPrompt("编辑商品", "分类:", product.category);
                const desc = await window.EPhone.showCustomPrompt("编辑商品", "商品描述(可选):", product.description || "");
                const imageUrl = await window.EPhone.showCustomPrompt("编辑商品", "图片链接(可选):", product.imageUrl || "");

                await this.db.products.update(productId, { name, price, category: cat || "其他", description: desc, imageUrl });
                
                await this.renderProductList(); // 刷新当前视图
                await window.EPhone.showCustomAlert("成功", "商品信息已更新！");
            } catch (error) {
                 console.error("编辑商品失败:", error);
                window.EPhone.showCustomAlert("操作失败", "编辑商品时出错。");
            }
        },

        handleDeleteProduct: async function(productId) {
            const product = await this.db.products.get(productId);
            if (!product) return;

            const confirmed = await window.EPhone.showCustomConfirm(
                "删除商品", 
                `确定要永久删除商品 “${product.name}” 吗？\n此操作不可恢复。`,
                { confirmButtonClass: 'btn-danger' }
            );
            
            if (confirmed) {
                await this.db.products.delete(productId);
                // 同时从所有用户的购物车中移除此商品
                await this.db.cart.where('productId').equals(productId).delete();
                
                await this.renderProductList();
                await this.updateCartCount(); // 更新购物车角标
                await window.EPhone.showCustomAlert("成功", "商品已删除。");
            }
        },

        // ===================================================================
        //  4. 事件绑定与 HTML/CSS 注入
        // ===================================================================
        bindEvents: function() {
            const screen = document.getElementById('taobao-screen');
            
            // 单击事件委托
            screen.addEventListener('click', (e) => {
                const target = e.target;
                const classList = target.classList;

                if (classList.contains('taobao-tab')) this.switchTab(target.dataset.view);
                else if (classList.contains('category-tab-btn')) this.renderProductList(target.dataset.cat);
                else if (target.id === 'taobao-btn-add-product') this.handleAddNewProduct();
                else if (classList.contains('btn-dec')) this.changeCartNum(parseInt(target.dataset.id), -1);
                else if (classList.contains('btn-inc')) this.changeCartNum(parseInt(target.dataset.id), 1);
                else if (target.id === 'taobao-checkout-btn') this.checkout();
                else if (target.id === 'taobao-btn-topup') this.handleTopUp();
            });

            // 【新增】长按事件处理
            let pressTimer = null;
            const grid = document.getElementById('taobao-product-grid');

            const startPress = (e) => {
                const card = e.target.closest('.product-card');
                if (!card) return;
                
                pressTimer = setTimeout(async () => {
                    const productId = parseInt(card.dataset.productId);
                    if (isNaN(productId)) return;
                    
                    const choice = await window.EPhone.showChoiceModal('管理商品', [
                        { text: '✏️ 编辑商品信息', value: 'edit' },
                        { text: '❌ 删除此商品', value: 'delete' }
                    ]);

                    if (choice === 'edit') {
                        this.handleEditProduct(productId);
                    } else if (choice === 'delete') {
                        this.handleDeleteProduct(productId);
                    }
                }, 800); // 长按800毫秒触发
            };

            const cancelPress = () => {
                clearTimeout(pressTimer);
            };

            grid.addEventListener('mousedown', startPress);
            grid.addEventListener('mouseup', cancelPress);
            grid.addEventListener('mouseleave', cancelPress);
            grid.addEventListener('touchstart', startPress, { passive: true });
            grid.addEventListener('touchend', cancelPress);
            grid.addEventListener('touchmove', cancelPress);
        },

        // injectCSS 和 injectHTML 函数保持不变...
        injectCSS: function() { /* ... */ },
        injectHTML: function() { /* ... */ }
    };

    window.TaobaoAppModule = TaobaoApp;
    
    // 【优化】更简洁标准的启动方式
    document.addEventListener('DOMContentLoaded', () => {
        // 延迟一点以确保宿主环境完全加载
        setTimeout(() => {
            if (window.TaobaoAppModule) {
                window.TaobaoAppModule.init();
            }
        }, 200);
    });

})(window);

// 【注意】为了在你的 pp.js 中能正常启动，请确保 pp.js 的 init 函数执行完成后，
// 调用了 TaobaoAppModule.init()。或者，保持现在的 defer 加载方式也可以。
// 这份代码已经改为使用 DOMContentLoaded，它会在 pp.js 执行后安全地初始化。
