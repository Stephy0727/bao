// ===================================================================================
//
//                        TAOBAO APP - 独立全功能模块 (Full Functionality)
//                         版本: 2.2 (修复图片加载与增加容错)
//
// ===================================================================================
//
//  使用说明:
//  1. 确保 HTML 引入了 Dexie.js: <script src="https://unpkg.com/dexie/dist/dexie.js"></script>
//  2. 在 HTML 中引入此文件: <script src="taobao-app.js" defer></script>
//  3. 在宿主 JS 中初始化:
//     if (window.TaobaoAppModule) { window.TaobaoAppModule.init(); }
//
// ===================================================================================

(function(window) {
    'use strict';

    // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 模拟宿主环境 API (独立运行时使用) ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
    let _mockHostBalance = 999.00;
    if (!window.EPhone) {
        console.log("[桃宝App] 运行在独立模式，使用模拟 API。");
        window.EPhone = {
            showScreen: (screenId) => { console.log(`[Host] 切换屏幕到: ${screenId}`); },
            showCustomAlert: (title, message) => alert(`${title}\n${message}`),
            showCustomConfirm: (title, message) => Promise.resolve(confirm(`${title}\n${message}`)),
            showCustomPrompt: (title, message, defaultVal) => Promise.resolve(prompt(`${title}\n${message}`, defaultVal)),
            api: {
                getWalletBalance: async () => {
                    console.log(`[Host API] 获取余额: ${_mockHostBalance}`);
                    return _mockHostBalance;
                },
                updateWallet: async (amount, description) => {
                    _mockHostBalance = parseFloat((_mockHostBalance + parseFloat(amount)).toFixed(2));
                    console.log(`[Host API] 余额变动: ${amount}, 新余额: ${_mockHostBalance}, 原因: ${description}`);
                    return true;
                },
                openCharSelector: (title) => {
                    const id = prompt(`${title}\n请输入模拟的角色ID (例如 char_1):`, "char_1");
                    return Promise.resolve(id);
                },
                getChat: async (chatId) => {
                    return chatId ? { id: chatId, name: "模拟角色_" + chatId, avatar: "https://i.postimg.cc/4xmx7V4R/mmexport1759081128356.jpg" } : null;
                },
                sendMessage: async (chatId, message) => {
                    console.log(`[Host API] 发送消息给 ${chatId}:`, message);
                    alert(`已发送消息给 ${chatId}，请查看控制台详情`);
                    return true;
                },
                getUserNickname: async () => "我"
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
        // 【【【 核心修复 1/2 】】】: 更换了不可靠的图片链接
        defaultProducts: [
            { name: "时尚连帽卫衣", price: 199.00, category: "衣服", imageUrl: "https://i.postimg.cc/W4svy4Hm/Image-1760206134285.jpg" },
            { name: "复古运动跑鞋", price: 350.00, category: "鞋靴", imageUrl: "https://i.postimg.cc/jjRb1jF7/Image-1760206125678.jpg" },
            { name: "客制化机械键盘", price: 499.00, category: "数码", imageUrl: "https://i.postimg.cc/J0B8wMvR/keyboard.jpg" },
            { name: "环球零食大礼包", price: 88.00, category: "零食", imageUrl: "https://i.postimg.cc/W443sTjL/snacks.jpg" }
        ],

        // 内置的备用图片 (Base64编码的SVG)，无需网络请求
        fallbackImage: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiB2aWV3Qm94PSIwIDAgMTUwIDE1MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2NjYyIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+6K6i5Zu+5aSx6LSlPC90ZXh0Pjwvc3ZnPg==',

        // ===================================================================
        //  1. 初始化与数据库设置
        // ===================================================================
        init: async function() {
            if (this.isInitialized) return;
            console.log("[桃宝App] 开始初始化...");

            this.initDatabase();
            this.injectCSS();
            this.injectHTML();
            this.bindHostIcon();
            this.bindEvents();

            await this.checkAndSeedData();
            await this.renderProductList('all');

            this.isInitialized = true;
            console.log("[桃宝App] 初始化完成，数据库已就绪。");
        },

        initDatabase: function() {
            if (typeof Dexie === 'undefined') {
                alert("错误: 缺少 Dexie.js 库。桃宝App无法存储数据。请在HTML中引入 Dexie.js。");
                throw new Error("Dexie.js not found");
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
            if (count === 0) {
                console.log("[桃宝App] 数据库为空，写入默认商品数据...");
                await this.db.products.bulkAdd(this.defaultProducts);
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
                    window.EPhone.showScreen('taobao-screen');
                };
            }
        },

        open: async function() {
            this.switchTab('taobao-products-view');
            await this.updateCartCount();
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
                case 'taobao-products-view': await this.renderProductList(); break;
                case 'taobao-cart-view': await this.renderCart(); break;
                case 'taobao-orders-view': await this.renderOrders(); break;
                case 'taobao-my-view': await this.renderMyPage(); break;
            }
        },

        renderProductList: async function(category = 'all') {
            const grid = document.getElementById('taobao-product-grid');
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;">加载中...</div>';

            let products = (category === 'all' || !category)
                ? await this.db.products.toArray()
                : await this.db.products.where('category').equals(category).toArray();
            
            grid.innerHTML = '';
            if (products.length === 0) {
                grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#999;">暂无商品</div>';
                return;
            }

            products.forEach(p => {
                const card = document.createElement('div');
                card.className = 'product-card';
                // 【【【 核心修复 2/2 】】】: 增加了 onerror 事件处理器，实现优雅降级
                card.innerHTML = `
                    <img src="${p.imageUrl}" class="product-image" onerror="this.onerror=null; this.src='${this.fallbackImage}';"/>
                    <div class="product-info">
                        <div class="product-name">${p.name}</div>
                        <div class="product-price">${p.price.toFixed(2)}</div>
                    </div>
                    <button class="add-to-cart-btn" data-id="${p.id}">+</button>
                `;
                card.onclick = (e) => {
                    if(!e.target.classList.contains('add-to-cart-btn')) {
                        alert(`商品详情:\n${p.name}\n价格: ¥${p.price}`);
                    }
                };
                card.querySelector('.add-to-cart-btn').onclick = async (e) => {
                    e.stopPropagation();
                    await this.addToCart(p.id);
                };
                grid.appendChild(card);
            });

            this.renderCategoryTabs(category);
        },

        renderCategoryTabs: async function(activeCategory) {
            const container = document.getElementById('taobao-product-category-tabs');
            const allProducts = await this.db.products.toArray();
            const categories = ['all', ...new Set(allProducts.map(p => p.category).filter(Boolean))];
            container.innerHTML = categories.map(cat => {
                const displayName = cat === 'all' ? '全部' : cat;
                const isActive = (cat === activeCategory || (cat === 'all' && !activeCategory));
                return `<button class="category-tab-btn ${isActive ? 'active' : ''}" data-cat="${cat}">${displayName}</button>`;
            }).join('');
        },

        renderCart: async function() {
            const list = document.getElementById('taobao-cart-item-list');
            const footer = document.getElementById('taobao-cart-footer');
            list.innerHTML = '';

            const cartItems = await this.db.cart.toArray();
            if (cartItems.length === 0) {
                list.innerHTML = `
                    <div style="text-align:center;padding:60px 0;color:#999;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="#ddd"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>
                        <p>购物车竟然是空的</p>
                        <p style="font-size:12px;">去逛逛吧</p>
                    </div>`;
                footer.style.display = 'none';
                await this.updateCartCount();
                return;
            }

            footer.style.display = 'flex';
            let total = 0;
            let count = 0;

            const itemPromises = cartItems.map(async (item) => {
                const product = await this.db.products.get(item.productId);
                return product ? { ...item, product } : null;
            });
            const fullItems = (await Promise.all(itemPromises)).filter(Boolean);

            fullItems.forEach(item => {
                const p = item.product;
                total += p.price * item.quantity;
                count += item.quantity;
                const el = document.createElement('div');
                el.className = 'cart-item';
                el.innerHTML = `
                    <div style="width:20px;height:20px;border-radius:50%;border:1px solid #ccc;margin-right:10px;background:#FF5722;border:none;"></div>
                    <img src="${p.imageUrl}" class="thumb" onerror="this.onerror=null; this.src='${this.fallbackImage}';"/>
                    <div class="info">
                        <div class="name">${p.name}</div>
                        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:8px;">
                            <div class="price">¥${p.price.toFixed(2)}</div>
                            <div class="num-ctrl">
                                <button class="btn-dec" data-id="${item.id}">-</button>
                                <span>${item.quantity}</span>
                                <button class="btn-inc" data-id="${item.id}">+</button>
                            </div>
                        </div>
                    </div>
                `;
                list.appendChild(el);
            });

            document.getElementById('taobao-cart-total').textContent = `¥ ${total.toFixed(2)}`;
            document.getElementById('taobao-checkout-btn').textContent = `结算(${count})`;
            document.getElementById('taobao-checkout-btn').dataset.total = total;
            await this.updateCartCount();
        },

        renderOrders: async function() {
            const list = document.getElementById('taobao-order-list');
            list.innerHTML = '';
            const orders = await this.db.orders.orderBy('timestamp').reverse().toArray();
            if (orders.length === 0) {
                list.innerHTML = '<div style="text-align:center;padding:60px 0;color:#999;">您还没有相关订单</div>';
                return;
            }
            orders.forEach(order => {
                const date = new Date(order.timestamp).toLocaleString();
                const itemNames = order.items.map(i => i.name).join(', ');
                const el = document.createElement('div');
                el.className = 'my-cell';
                el.style.display = 'block';
                el.innerHTML = `
                    <div style="display:flex;justify-content:space-between;font-size:12px;color:#999;margin-bottom:8px;">
                        <span>${date}</span>
                        <span style="color:#FF5722;">卖家已发货</span>
                    </div>
                    <div style="display:flex;gap:10px;">
                        <img src="${order.items[0].imageUrl}" style="width:60px;height:60px;border-radius:4px;object-fit:cover;background:#f5f5f5;" onerror="this.onerror=null; this.src='${this.fallbackImage}';"/>
                        <div style="flex:1;">
                            <div style="font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${itemNames}</div>
                            <div style="font-size:12px;color:#999;margin-top:4px;">共${order.totalCount}件商品</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-weight:bold;">¥${order.totalPrice.toFixed(2)}</div>
                        </div>
                    </div>
                    <div style="text-align:right;margin-top:10px;border-top:1px solid #eee;padding-top:10px;">
                        <button style="padding:5px 10px;border:1px solid #ccc;background:#fff;border-radius:15px;font-size:12px;">查看物流</button>
                        <button style="padding:5px 10px;border:1px solid #FF5722;color:#FF5722;background:#fff;border-radius:15px;font-size:12px;margin-left:5px;">确认收货</button>
                    </div>
                `;
                list.appendChild(el);
            });
        },

        renderMyPage: async function() {
            console.log("💰 [桃宝App] 正在刷新'我的'页面数据...");
            const balanceEl = document.getElementById('taobao-balance-num');
            if (balanceEl) {
                try {
                    const balance = await window.EPhone.api.getWalletBalance();
                    console.log(`💰 [桃宝App] 从宿主获取余额: ${balance}`);
                    balanceEl.textContent = parseFloat(balance).toFixed(2);
                } catch (e) {
                    console.error("获取余额失败:", e);
                    balanceEl.textContent = "---";
                }
            }
            const list = document.getElementById('taobao-trans-list');
            if (list) {
                const txs = await this.db.transactions.orderBy('timestamp').reverse().toArray();
                list.innerHTML = txs.length === 0
                    ? '<div style="text-align:center;padding:20px;color:#999;font-size:13px;">暂无收支明细</div>'
                    : txs.map(tx => {
                        const isPlus = tx.amount > 0;
                        return `
                            <div class="trans-item">
                                <div>
                                    <div class="desc">${tx.description}</div>
                                    <div class="time">${new Date(tx.timestamp).toLocaleString()}</div>
                                </div>
                                <div class="amount ${isPlus ? 'plus' : 'minus'}">${isPlus ? '+' : ''}${tx.amount.toFixed(2)}</div>
                            </div>
                        `;
                    }).join('');
            }
        },

        // ===================================================================
        //  3. 业务逻辑动作 (Actions)
        // ===================================================================
        addToCart: async function(productId) {
            const existing = await this.db.cart.where('productId').equals(productId).first();
            if (existing) {
                await this.db.cart.update(existing.id, { quantity: existing.quantity + 1 });
            } else {
                await this.db.cart.add({ productId: productId, quantity: 1 });
            }
            await this.updateCartCount();
            window.EPhone.showCustomToast ? window.EPhone.showCustomToast("已加入购物车") : alert("已加入购物车");
        },

        updateCartCount: async function() {
            const items = await this.db.cart.toArray();
            const count = items.reduce((sum, item) => sum + item.quantity, 0);
            const badge = document.getElementById('taobao-cart-badge');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'block' : 'none';
            }
        },

        changeCartNum: async function(cartId, delta) {
            const item = await this.db.cart.get(cartId);
            if (!item) return;
            const newQty = item.quantity + delta;
            if (newQty <= 0) {
                if(await window.EPhone.showCustomConfirm("删除商品", "确定从购物车删除此商品吗？")) {
                    await this.db.cart.delete(cartId);
                }
            } else {
                await this.db.cart.update(cartId, { quantity: newQty });
            }
            await this.renderCart();
        },

        checkout: async function() {
            const total = parseFloat(document.getElementById('taobao-checkout-btn').dataset.total || 0);
            if (total <= 0) return alert("购物车没有商品");
            const balance = await window.EPhone.api.getWalletBalance();
            if (balance < total) {
                return window.EPhone.showCustomAlert("余额不足", `需要支付 ¥${total.toFixed(2)}，当前余额 ¥${balance.toFixed(2)}。请先充值。`);
            }
            if (await window.EPhone.showCustomConfirm("确认付款", `将扣除 ¥${total.toFixed(2)} 用于购买购物车商品。`)) {
                try {
                    await window.EPhone.api.updateWallet(-total, "桃宝购物结算");
                    await this.db.transactions.add({ amount: -total, description: "桃宝订单支付", timestamp: Date.now() });

                    const cartItems = await this.db.cart.toArray();
                    const orderItems = [];
                    let totalCount = 0;
                    for(const cItem of cartItems) {
                        const p = await this.db.products.get(cItem.productId);
                        if(p) {
                            orderItems.push({ productId: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl, quantity: cItem.quantity });
                            totalCount += cItem.quantity;
                        }
                    }
                    await this.db.orders.add({ items: orderItems, totalPrice: total, totalCount, status: 'paid', timestamp: Date.now() });
                    await this.db.cart.clear();

                    await window.EPhone.showCustomAlert("支付成功", "商家正在为您急速发货！");
                    this.switchTab('taobao-orders-view');
                    this.updateCartCount();
                } catch (e) {
                    console.error(e);
                    window.EPhone.showCustomAlert("支付遇到问题", e.message);
                }
            }
        },

        handleTopUp: async function() {
            const input = await window.EPhone.showCustomPrompt("钱包充值", "请输入充值金额:", "100");
            if (input === null) return;
            const amount = parseFloat(input);
            if (isNaN(amount) || amount <= 0) {
                return window.EPhone.showCustomAlert("无效金额", "请输入正确的充值金额。");
            }
            console.log(`[桃宝App] 开始充值: ¥${amount}`);
            try {
                await window.EPhone.api.updateWallet(amount, "余额充值");
                console.log("[桃宝App] 宿主余额更新 API 调用成功");
                await this.db.transactions.add({ amount, description: "账户余额充值", timestamp: Date.now() });
                console.log("[桃宝App] 本地交易记录写入成功");
                await window.EPhone.showCustomAlert("充值成功", `¥${amount.toFixed(2)} 已到账！`);
                await this.renderMyPage();
            } catch (e) {
                console.error("[桃宝App] 充值流程出错:", e);
                window.EPhone.showCustomAlert("充值失败", "与银行通讯中断，请稍后重试。");
            }
        },

        handleAddNewProduct: async function() {
            const name = prompt("商品名称:", "新款手机");
            if(!name) return;
            const price = parseFloat(prompt("价格:", "999"));
            const cat = prompt("分类:", "数码");
            await this.db.products.add({ name, price: price || 0, category: cat || "其他", imageUrl: "https://via.placeholder.com/150?text=New+Item" });
            if (document.getElementById('taobao-products-view').classList.contains('active')) {
                this.renderProductList();
            }
            alert("商品已添加至数据库");
        },

        // ===================================================================
        //  4. 事件绑定与 HTML/CSS 注入
        // ===================================================================
        bindEvents: function() {
            document.getElementById('taobao-screen').addEventListener('click', (e) => {
                const target = e.target;
                if (target.matches('.taobao-tab')) this.switchTab(target.dataset.view);
                if (target.matches('.category-tab-btn')) this.renderProductList(target.dataset.cat);
                if (target.matches('#taobao-btn-add-product')) this.handleAddNewProduct();
                if (target.matches('.btn-dec')) this.changeCartNum(parseInt(target.dataset.id), -1);
                if (target.matches('.btn-inc')) this.changeCartNum(parseInt(target.dataset.id), 1);
                if (target.matches('#taobao-checkout-btn')) this.checkout();
                if (target.matches('#taobao-btn-topup')) this.handleTopUp();
            });
        },

        injectCSS: function() {
            if(document.getElementById('taobao-css')) return;
            const css = `
                #taobao-screen { background: #F2F2F2; display:flex; flex-direction:column; height: 100%; }
                #taobao-screen * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif; }
                .tb-header { background: linear-gradient(90deg, #FF8D0E, #FF5000); color:white; padding: 15px; display:flex; align-items:center; height: 50px; flex-shrink:0; }
                .tb-search { flex:1; background:white; border-radius:20px; padding: 5px 15px; display:flex; align-items:center; color:#999; font-size:14px; margin: 0 10px;}
                .tb-header-btn { font-size: 20px; padding: 5px; cursor:pointer; }
                .tb-content { flex:1; overflow-y:auto; position:relative; }
                .taobao-view { display:none; height:100%; overflow-y:auto; }
                .taobao-view.active { display:block; }
                .tb-tabs { background:white; border-top:1px solid #eee; display:flex; height:50px; flex-shrink:0; }
                .taobao-tab { flex:1; border:none; background:none; color:#666; font-size:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; cursor:pointer; }
                .taobao-tab.active { color: #FF5000; font-weight:bold; }
                .taobao-tab i { font-size: 20px; margin-bottom:2px; font-style:normal; }
                #taobao-cart-badge { position:absolute; top:4px; right:calc(50% - 20px); background:#FF5000; color:white; border-radius:10px; min-width:16px; height:16px; line-height:16px; text-align:center; padding:0 4px; font-size:10px; border:1px solid white; display:none; }
                #taobao-product-category-tabs { padding: 10px; display:flex; overflow-x:auto; background:white; gap:10px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
                #taobao-product-category-tabs::-webkit-scrollbar { display: none; }
                .category-tab-btn { border:none; background:#f5f5f5; padding: 5px 12px; border-radius:15px; font-size:13px; color:#333; white-space:nowrap; flex-shrink:0; }
                .category-tab-btn.active { background: #FFF0E5; color:#FF5000; font-weight:bold; }
                #taobao-product-grid { padding: 10px; display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .product-card { background:white; border-radius:8px; overflow:hidden; position:relative; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
                .product-image { width:100%; aspect-ratio:1; object-fit:cover; background:#eee; }
                .product-info { padding: 8px; }
                .product-name { font-size:13px; color:#333; height:36px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
                .product-price { color:#FF5000; font-size:16px; font-weight:bold; margin-top:5px; }
                .product-price::before { content:'¥'; font-size:12px; margin-right:2px; }
                .add-to-cart-btn { position:absolute; bottom:8px; right:8px; width:24px; height:24px; background:#FF5000; color:white; border:none; border-radius:50%; font-size:18px; line-height:22px; cursor:pointer; }
                .cart-item { background:white; margin:10px; padding:10px; border-radius:8px; display:flex; align-items:center; }
                .cart-item .thumb { width:80px; height:80px; background:#eee; object-fit:cover; border-radius:4px; flex-shrink:0; }
                .cart-item .info { flex:1; margin-left:10px; display:flex; flex-direction:column; justify-content:space-between; height:80px; }
                .cart-item .name { font-size:13px; color:#333; max-height:36px; overflow:hidden; }
                .cart-item .price { color:#FF5000; font-weight:bold; }
                .num-ctrl { display:flex; border:1px solid #ddd; border-radius:4px; }
                .num-ctrl button { width:24px; height:24px; background:#f9f9f9; border:none; cursor:pointer; }
                .num-ctrl span { width:30px; text-align:center; line-height:24px; font-size:13px; border-left:1px solid #ddd; border-right:1px solid #ddd; }
                #taobao-cart-footer { position:sticky; bottom:0; height:50px; background:white; border-top:1px solid #eee; display:flex; align-items:center; justify-content:flex-end; padding-left:15px; }
                #taobao-checkout-btn { height:100%; background: linear-gradient(90deg, #FF8D0E, #FF5000); color:white; border:none; padding: 0 30px; font-size:16px; font-weight:bold; margin-left:15px; cursor:pointer; }
                .my-header { background: linear-gradient(135deg, #FF5000, #FF8D0E); color:white; padding: 30px 20px; border-radius: 0 0 20px 20px; }
                .balance-card { display:flex; justify-content:space-between; align-items:center; }
                #taobao-btn-topup { background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.5); color:white; padding: 6px 15px; border-radius:15px; font-size:13px; cursor:pointer; backdrop-filter:blur(5px); }
                .my-section { margin: 15px; background:white; border-radius:8px; overflow:hidden; }
                .my-cell { padding: 15px; border-bottom:1px solid #f5f5f5; display:flex; justify-content:space-between; align-items:center; font-size:14px; color:#333; }
                .trans-item { padding: 12px 15px; border-bottom:1px solid #f5f5f5; display:flex; justify-content:space-between; align-items:center; }
                .trans-item .desc { font-size:14px; color:#333; }
                .trans-item .time { font-size:12px; color:#999; margin-top:4px; }
                .trans-item .amount { font-size:16px; font-weight:bold; }
                .trans-item .amount.plus { color: #4CAF50; }
                .trans-item .amount.minus { color: #333; }
            `;
            const style = document.createElement('style');
            style.id = 'taobao-css';
            style.textContent = css;
            document.head.appendChild(style);
        },

        injectHTML: function() {
            if(document.getElementById('taobao-screen')) return;
            const html = `
                <div id="taobao-screen" class="screen" style="display:none;">
                    <div class="tb-header">
                        <span class="tb-header-btn" onclick="window.EPhone.showScreen('home-screen')">‹</span>
                        <div class="tb-search">🔍 搜一搜，发现心动好物</div>
                        <span class="tb-header-btn" id="taobao-btn-add-product" title="测试:添加商品">+</span>
                    </div>
                    <div class="tb-content">
                        <div id="taobao-products-view" class="taobao-view active">
                            <div id="taobao-product-category-tabs"></div>
                            <div id="taobao-product-grid"></div>
                        </div>
                        <div id="taobao-cart-view" class="taobao-view">
                            <div id="taobao-cart-item-list" style="padding-bottom:50px;"></div>
                            <div id="taobao-cart-footer">
                                <div style="font-size:13px;">
                                    合计: <span id="taobao-cart-total" style="color:#FF5000;font-size:16px;font-weight:bold;">¥0.00</span>
                                </div>
                                <button id="taobao-checkout-btn">结算(0)</button>
                            </div>
                        </div>
                        <div id="taobao-orders-view" class="taobao-view" style="background:#f5f5f5;">
                            <div id="taobao-order-list" style="padding:10px;"></div>
                        </div>
                        <div id="taobao-my-view" class="taobao-view" style="background:#f5f5f5; padding:0;">
                            <div class="my-header">
                                <div style="font-size:13px;opacity:0.8;">我的余额</div>
                                <div class="balance-card">
                                    <div style="font-size:36px;font-weight:bold;">¥ <span id="taobao-balance-num">0.00</span></div>
                                    <button id="taobao-btn-topup">充值</button>
                                </div>
                            </div>
                            <div class="my-section">
                                <div class="my-cell" style="font-weight:bold;border-bottom:1px solid #eee;">
                                    <span>账单明细</span>
                                </div>
                                <div id="taobao-trans-list"></div>
                            </div>
                        </div>
                    </div>
                    <div class="tb-tabs">
                        <button class="taobao-tab active" data-view="taobao-products-view"><i>🏠</i>首页</button>
                        <button class="taobao-tab" data-view="taobao-cart-view">
                            <i>🛒</i>购物车
                            <span id="taobao-cart-badge">0</span>
                        </button>
                        <button class="taobao-tab" data-view="taobao-orders-view"><i>📦</i>订单</button>
                        <button class="taobao-tab" data-view="taobao-my-view"><i>👤</i>我的</button>
                    </div>
                </div>
            `;
            const div = document.createElement('div');
            div.innerHTML = html;
            document.body.appendChild(div.firstElementChild);
        }
    };

    window.TaobaoAppModule = TaobaoApp;

    if (document.readyState === 'complete' || document.readyState !== 'loading') {
        setTimeout(() => TaobaoApp.init(), 100);
    } else {
        document.addEventListener('DOMContentLoaded', () => TaobaoApp.init());
    }

})(window);
