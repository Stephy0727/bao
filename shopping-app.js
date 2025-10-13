// shopping-app.js
(function(window) {
    'use strict';

    // -------------------------------------------------------------------
    // [1] 模块私有变量 (Private Module Variables)
    // -------------------------------------------------------------------
    let isInitialized = false;
    let shoppingCart = [];
    let editingProductId = null;
    let isProductManagementMode = false;

    // -------------------------------------------------------------------
    // [2] 动态注入 CSS 样式 (Dynamic CSS Injection)
    // -------------------------------------------------------------------
    function injectShoppingStyles() {
        const styleId = 'shopping-app-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* ================================================= */
            /*          SHOPPING APP STYLES - START              */
            /* ================================================= */

            /* --- 购物主页面布局 --- */
            #shopping-screen .header .header-actions { display: flex; gap: 15px; }
            #shopping-screen .header .header-actions .action-btn { position: relative; }
            #shopping-screen #cart-count { 
                position: absolute; top: -5px; right: -8px; background-color: #ff4757;
                color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 12px;
                display: flex; align-items: center; justify-content: center; font-weight: bold;
            }
            #product-grid {
                flex-grow: 1; overflow-y: auto; display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px; padding: 15px; padding-bottom: 80px;
                align-items: start;
            }

            /* --- 商品卡片样式 --- */
            .product-item {
                background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.04);
                display: flex; flex-direction: column; cursor: pointer; position: relative;
            }
            .product-image {
                width: 100%; aspect-ratio: 1 / 1; object-fit: cover;
                border-radius: 8px 8px 0 0;
            }
            .product-info { padding: 12px 10px; flex-grow: 1; display: flex; flex-direction: column; }
            .product-name { font-size: 13px; color: #333; line-height: 1.4; min-height: 36px; }
            .product-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
            .product-price { font-size: 16px; font-weight: 700; color: #ff5722; }
            .product-price::before { content: '¥'; font-size: 12px; }
            .add-to-cart-btn {
                padding: 6px 12px; border: none; border-radius: 15px;
                background: linear-gradient(90deg, #ff9800, #ff5722);
                color: white; font-size: 12px; font-weight: 500; cursor: pointer;
            }

            /* --- 商品管理模式样式 --- */
            .product-management-overlay {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background-color: rgba(0,0,0,0.5); display: none;
                flex-direction: column; justify-content: center; align-items: center; gap: 15px;
                z-index: 5; border-radius: 8px;
            }
            #shopping-screen.management-mode .product-management-overlay { display: flex; }
            .product-management-overlay button {
                padding: 8px 20px; border: 1px solid white;
                background-color: rgba(255,255,255,0.2); color: white; border-radius: 15px; cursor: pointer;
            }
            .product-management-overlay .delete-product-btn { border-color: #ff8a80; color: #ff8a80; }
            #shopping-screen.management-mode .product-footer { display: none; }

            /* --- 购物车页面样式 --- */
            #cart-screen .header #cart-title { position: static; transform: none; }
            #cart-items-list { flex-grow: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 10px; }
            .cart-item {
                display: flex; align-items: flex-start; gap: 12px; background-color: white;
                padding: 12px; border-radius: 12px;
            }
            .cart-item-checkbox { margin-top: 28px; width: 20px; height: 20px; flex-shrink: 0; }
            .cart-item-image { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
            .cart-item-info { flex-grow: 1; display: flex; flex-direction: column; }
            .cart-item-name { font-weight: 500; font-size: 14px; line-height: 1.4; }
            .cart-item-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px;}
            .cart-item-price { color: #ff5722; font-weight: bold; font-size: 16px; }
            .quantity-control { display: flex; align-items: center; gap: 4px; }
            .quantity-btn {
                width: 26px; height: 26px; border: none; background-color: #f7f8fa;
                border-radius: 4px; font-weight: 500; cursor: pointer; color: #666;
            }
            .quantity-display { font-weight: 500; min-width: 30px; text-align: center; }
            #cart-footer {
                flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;
                padding: 10px 15px; padding-bottom: calc(10px + env(safe-area-inset-bottom));
                background-color: white; border-top: 1px solid var(--border-color);
            }
            #cart-footer .select-all-label { display: flex; align-items: center; gap: 5px; }
            #cart-footer .cart-summary { text-align: right; }
            #cart-footer .cart-subtext { font-size: 11px; color: #999; }
            #checkout-btn {
                padding: 10px 25px; border: none; border-radius: 20px;
                background: linear-gradient(90deg, #ff9800, #ff5722);
                color: white; font-size: 15px; font-weight: 500; cursor: pointer;
            }
            
            /* --- 聊天中的礼物卡片样式 --- */
            .message-bubble.is-gift .content { padding: 0; background: transparent; }
            .gift-card {
                width: 220px; box-sizing: border-box; border-radius: 12px; background-color: #fff;
                border: 1px solid #eee; padding: 12px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.07);
            }
            .gift-header { display: flex; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; }
            .gift-header-icon { width: 20px; height: 20px; color: #ff9800; }
            .gift-header-text { font-size: 15px; font-weight: 600; color: var(--text-primary); }
            .gift-items-preview { padding: 12px 0; display: flex; flex-direction: column; gap: 8px; }
            .gift-preview-item { display: flex; align-items: center; gap: 8px; }
            .gift-preview-img { width: 32px; height: 32px; object-fit: cover; border-radius: 4px; flex-shrink: 0; }
            .gift-preview-name { flex-grow: 1; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .gift-preview-quantity { font-size: 12px; color: var(--text-secondary); }
            .gift-footer { font-size: 12px; color: var(--text-secondary); text-align: right; }

            /* --- 购物小票弹窗样式 --- */
            #gift-receipt-modal .modal-content { max-height: 80vh; }
            #gift-receipt-body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 15px; background-color: #f7f8fa; }
            .receipt-header { text-align: center; padding-bottom: 15px; border-bottom: 1px solid #ddd; }
            .receipt-header h3 { margin: 0 0 5px 0; font-size: 20px; }
            .receipt-header p { margin: 0; font-size: 12px; color: #888; }
            .receipt-items-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .receipt-items-table th, .receipt-items-table td { padding: 10px 5px; font-size: 13px; }
            .receipt-items-table thead th { border-bottom: 1px solid #333; text-align: left; }
            .receipt-items-table .item-name { width: 50%; }
            .receipt-items-table .item-qty { text-align: center; }
            .receipt-items-table .item-price, .receipt-items-table .item-subtotal { text-align: right; }
            .receipt-total { padding-top: 15px; border-top: 1px solid #333; text-align: right; font-size: 16px; font-weight: bold; }
            .receipt-footer { text-align: center; margin-top: 25px; font-size: 12px; color: #888; }
            
            /* --- 礼物接收人选择弹窗 --- */
            #gift-recipient-list .contact-picker-item {
                display: flex; align-items: center; padding: 10px 15px; cursor: pointer;
                border-bottom: 1px solid var(--border-color);
            }
            #gift-recipient-list .contact-picker-item:last-child { border-bottom: none; }
            #gift-recipient-list .contact-picker-item .checkbox {
                width: 20px; height: 20px; border: 2px solid #ccc; border-radius: 50%; margin-right: 15px;
            }
            #gift-recipient-list .contact-picker-item.selected .checkbox {
                background-color: var(--accent-color); border-color: var(--accent-color);
            }
            #gift-recipient-list .contact-picker-item .avatar {
                width: 40px; height: 40px; border-radius: 50%; margin-right: 12px;
            }
            #gift-recipient-list .contact-picker-item .name { font-weight: 500; }
            
            /* ================================================= */
            /*           SHOPPING APP STYLES - END               */
            /* ================================================= */
        `;
        document.head.appendChild(style);
    }

    // -------------------------------------------------------------------
    // [3] 动态注入 HTML 结构 (Dynamic HTML Injection)
    // -------------------------------------------------------------------
    function createShoppingHTML() {
        if (document.getElementById('shopping-screen')) return;

        const container = document.createElement('div');
        container.innerHTML = `
            <!-- 购物中心主屏幕 -->
            <div id="shopping-screen" class="screen">
                <div class="header">
                    <span class="back-btn" id="shopping-back-btn">‹</span>
                    <span>购物中心</span>
                    <div class="header-actions">
                        <span class="action-btn" id="manage-products-btn" title="管理商品">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                        </span>
                        <span class="action-btn" id="add-new-product-btn" title="添加新商品">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        </span>
                        <span class="action-btn" id="go-to-cart-btn" title="查看购物车">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                            <span id="cart-count">0</span>
                        </span>
                    </div>
                </div>
                <div id="product-grid" class="list-container"></div>
            </div>

            <!-- 购物车屏幕 -->
            <div id="cart-screen" class="screen">
                <div class="header">
                    <span class="back-btn" id="cart-back-btn">‹</span>
                    <span id="cart-title">购物车(0)</span>
                    <span class="action-btn" id="clear-cart-btn">清空</span>
                </div>
                <div id="cart-items-list"></div>
                <div id="cart-footer">
                    <label class="select-all-label"><input type="checkbox" id="select-all-cart-items"> 全选</label>
                    <div class="cart-summary">
                        <div id="cart-total">合计: ¥0.00</div>
                        <span class="cart-subtext">不含运费</span>
                    </div>
                    <button id="checkout-btn">结算(0)</button>
                </div>
            </div>

            <!-- 商品编辑器弹窗 -->
            <div id="product-editor-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header"><span id="product-editor-title">添加商品</span></div>
                    <div class="modal-body">
                        <div class="form-group"><label>商品图片</label><div class="avatar-upload"><img id="product-image-preview" src="https://s3plus.meituan.net/opapisdk/op_ticket_885190757_1756206115802_qdqqd_0c99bh.jpeg"><button>上传图片</button><input type="file" id="product-image-input" accept="image/*" hidden></div></div>
                        <div class="form-group"><label for="product-name-input">商品名称</label><input type="text" id="product-name-input"></div>
                        <div class="form-group"><label for="product-price-input">价格 (元)</label><input type="number" id="product-price-input" min="0" step="0.01"></div>
                        <div class="form-group"><label for="product-description-input">商品描述</label><textarea id="product-description-input" rows="4" placeholder="详细介绍一下这个商品..."></textarea></div>
                    </div>
                    <div class="modal-footer"><button class="cancel" id="cancel-product-editor-btn">取消</button><button class="save" id="save-product-btn">保存</button></div>
                </div>
            </div>

            <!-- 购物小票/订单详情弹窗 -->
            <div id="gift-receipt-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header"><span>购物小票</span></div>
                    <div class="modal-body" id="gift-receipt-body"></div>
                    <div class="modal-footer"><button class="save" id="close-receipt-btn" style="width:100%;">关闭</button></div>
                </div>
            </div>
            
            <!-- 礼物接收人选择弹窗 -->
            <div id="gift-recipient-modal" class="modal">
                <div class="modal-content" style="height: 70%;">
                    <div class="modal-header">
                        <span>选择收礼人</span>
                        <label style="font-size: 14px; font-weight: normal; display: flex; align-items: center; gap: 5px;"><input type="checkbox" id="select-all-recipients"> 全选 </label>
                    </div>
                    <div class="modal-body" id="gift-recipient-list" style="padding: 0;"></div>
                    <div class="modal-footer">
                        <button class="cancel" id="cancel-gift-recipient-btn">取消</button>
                        <button class="save" id="confirm-gift-recipient-btn">确认送出</button>
                    </div>
                </div>
            </div>
        `;
        while (container.firstChild) {
            document.body.appendChild(container.firstChild);
        }
    }
    
    // -------------------------------------------------------------------
    // [4] 功能逻辑函数 (Feature Logic Functions)
    // -------------------------------------------------------------------
    
    // 打开购物页面 (主入口)
    async function openShoppingScreen() {
        if (!isInitialized) {
            initShoppingApp();
        }
        await renderShoppingProducts();
        // 这是您主文件中的全局函数，我们直接调用
        window.showScreen('shopping-screen'); 
    }

    // 渲染商品列表
    async function renderShoppingProducts() {
        const gridEl = document.getElementById('product-grid');
        const shoppingScreen = document.getElementById('shopping-screen');
        gridEl.innerHTML = '';
        
        // 确保能访问到全局的 db 实例
        const products = await window.db.shoppingProducts.toArray();

        shoppingScreen.classList.toggle('management-mode', isProductManagementMode);

        if (products.length === 0 && !isProductManagementMode) {
            gridEl.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary); margin-top: 50px;">商店空空如也，让AI去上点货吧！</p>`;
        } else if (products.length === 0 && isProductManagementMode) {
            gridEl.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary); margin-top: 50px;">点击右上角“+”添加第一个商品吧！</p>`;
        } else {
            products.forEach(product => {
                const item = document.createElement('div');
                item.className = 'product-item';
                item.dataset.id = product.id;
                
                const managementControls = isProductManagementMode ? `
                    <div class="product-management-overlay">
                        <button class="edit-product-btn">编辑</button>
                        <button class="delete-product-btn">删除</button>
                    </div>` : '';

                item.innerHTML = `
                    ${managementControls}
                    <img src="${product.imageUrl}" class="product-image">
                    <div class="product-info">
                        <div class="product-name">${product.name}</div>
                        <div class="product-footer">
                            <div class="product-price">${product.price.toFixed(2)}</div>
                            <button class="add-to-cart-btn">加入购物车</button>
                        </div>
                    </div>`;
                gridEl.appendChild(item);
            });
        }
    }

    // 将商品加入购物车
    async function addToCart(productId, quantity = 1) {
        const existingItem = shoppingCart.find(item => item.productId === productId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            const product = await window.db.shoppingProducts.get(productId);
            if (product) {
                shoppingCart.push({ productId: product.id, quantity });
            }
        }
        updateCartCount();
        // 调用您主文件的全局弹窗函数
        await window.showCustomAlert('成功', '已成功加入购物车！');
    }

    // 更新购物车图标上的数量
    function updateCartCount() {
        const totalItems = shoppingCart.reduce((sum, item) => sum + item.quantity, 0);
        document.getElementById('cart-count').textContent = totalItems;
    }

    // 打开购物车页面
    function openCartScreen() {
        renderCartItems();
        window.showScreen('cart-screen');
    }
    
    // 渲染购物车内的商品列表
    async function renderCartItems() {
        const listEl = document.getElementById('cart-items-list');
        listEl.innerHTML = '';

        if (shoppingCart.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary); margin-top: 50px;">购物车是空的哦~</p>';
        } else {
            const productIds = shoppingCart.map(item => item.productId);
            const products = await window.db.shoppingProducts.where('id').anyOf(productIds).toArray();
            const productMap = new Map(products.map(p => [p.id, p]));

            shoppingCart.forEach(item => {
                const product = productMap.get(item.productId);
                if (product) {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'cart-item';
                    itemEl.innerHTML = `
                        <input type="checkbox" class="cart-item-checkbox" data-id="${product.id}" checked>
                        <img src="${product.imageUrl}" class="cart-item-image">
                        <div class="cart-item-info">
                            <div class="cart-item-name">${product.name}</div>
                            <div class="cart-item-footer">
                                <div class="cart-item-price">¥${product.price.toFixed(2)}</div>
                                <div class="quantity-control">
                                    <button class="quantity-btn decrease-qty-btn" data-id="${product.id}">-</button>
                                    <span class="quantity-display">${item.quantity}</span>
                                    <button class="quantity-btn increase-qty-btn" data-id="${product.id}">+</button>
                                </div>
                            </div>
                        </div>`;
                    listEl.appendChild(itemEl);
                }
            });
        }
        updateCartTotal();
        const totalSelected = document.querySelectorAll('.cart-item-checkbox:checked').length;
        document.getElementById('checkout-btn').textContent = `结算(${totalSelected})`;
        document.getElementById('cart-title').textContent = `购物车(${shoppingCart.reduce((s,i)=>s+i.quantity,0)})`;
    }

    // 更新购物车总价
    async function updateCartTotal() {
        let total = 0;
        let totalCount = 0;
        const selectedCheckboxes = document.querySelectorAll('.cart-item-checkbox:checked');
        const selectedProductIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.dataset.id));

        if (selectedProductIds.length > 0) {
            const products = await window.db.shoppingProducts.where('id').anyOf(selectedProductIds).toArray();
            const productMap = new Map(products.map(p => [p.id, p]));
            
            shoppingCart.forEach(cartItem => {
                if (selectedProductIds.includes(cartItem.productId)) {
                    const product = productMap.get(cartItem.productId);
                    if (product) {
                        total += product.price * cartItem.quantity;
                        totalCount += cartItem.quantity;
                    }
                }
            });
        }
        document.getElementById('cart-total').textContent = `合计: ¥${total.toFixed(2)}`;
        document.getElementById('checkout-btn').textContent = `结算(${totalCount})`;
    }

    // 处理结算
    async function handleCheckout() {
        const selectedItems = shoppingCart.filter(item => 
            document.querySelector(`.cart-item-checkbox[data-id="${item.productId}"]:checked`)
        );
        if (selectedItems.length === 0) {
            alert("请先在购物车中选择要结算的商品。");
            return;
        }

        const chat = window.state.chats[window.state.activeChatId];
        if (chat.isGroup) {
            await openGiftRecipientPicker();
        } else {
            const confirmed = await window.showCustomConfirm('确认送出礼物', `确定要将选中的商品作为礼物送出吗？`, { confirmText: '送出礼物' });
            if (confirmed) {
                await sendGiftMessage(selectedItems);
            }
        }
    }
    
    // 打开收礼人选择器
    async function openGiftRecipientPicker() {
        const modal = document.getElementById('gift-recipient-modal');
        const listEl = document.getElementById('gift-recipient-list');
        listEl.innerHTML = '';
        
        const chat = window.state.chats[window.state.activeChatId];
        const myNickname = chat.settings.myNickname || '我';
        const members = chat.members.filter(m => m.groupNickname !== myNickname);

        members.forEach(member => {
            const item = document.createElement('div');
            item.className = 'contact-picker-item';
            item.dataset.recipientName = member.originalName; 
            item.innerHTML = `
                <div class="checkbox"></div>
                <img src="${member.avatar || defaultGroupMemberAvatar}" class="avatar">
                <span class="name">${member.groupNickname}</span>`;
            listEl.appendChild(item);
        });
        document.getElementById('select-all-recipients').checked = false;
        modal.classList.add('visible');
    }

    // 发送礼物消息
    async function sendGiftMessage(itemsToSend, recipients = null) {
        const chat = window.state.chats[window.state.activeChatId];
        const productIds = itemsToSend.map(item => item.productId);
        const products = await window.db.shoppingProducts.where('id').anyOf(productIds).toArray();
        const productMap = new Map(products.map(p => [p.id, p]));
        
        const itemsForMessage = itemsToSend.map(cartItem => {
            const product = productMap.get(cartItem.productId);
            return { name: product.name, price: product.price, imageUrl: product.imageUrl, quantity: cartItem.quantity };
        });

        const giftMessage = {
            role: 'user', type: 'gift', timestamp: Date.now(),
            items: itemsForMessage,
            total: itemsForMessage.reduce((sum, item) => sum + item.price * item.quantity, 0),
            recipients: recipients
        };
        
        chat.history.push(giftMessage);

        if (recipients && recipients.length > 0) {
            const recipientDisplayNames = recipients.map(originalName => window.getDisplayNameInGroup(chat, originalName)).join('、');
            const hiddenMessage = {
                role: 'system',
                content: `[系统提示：用户 (${chat.settings.myNickname || '我'}) 送出了一份礼物，收礼人是：${recipientDisplayNames}。请收礼的角色表示感谢，其他角色可以自由发挥。]`,
                timestamp: Date.now() + 1,
                isHidden: true
            };
            chat.history.push(hiddenMessage);
        }
        
        await window.db.chats.put(chat);
        await window.appendMessage(giftMessage, chat);
        await window.renderChatList();
        
        shoppingCart = shoppingCart.filter(item => !itemsToSend.some(sent => sent.productId === item.productId));
        updateCartCount();
        window.showScreen('chat-interface-screen');
        await window.showCustomAlert('成功', '礼物已成功送出！');
    }
    
    // 商品管理相关函数
    async function openProductEditor(productId = null) {
        editingProductId = productId;
        const modal = document.getElementById('product-editor-modal');
        const title = document.getElementById('product-editor-title');
        const nameInput = document.getElementById('product-name-input');
        const priceInput = document.getElementById('product-price-input');
        const descInput = document.getElementById('product-description-input');
        const imagePreview = document.getElementById('product-image-preview');
        if (productId) {
            title.textContent = '编辑商品';
            const product = await window.db.shoppingProducts.get(productId);
            nameInput.value = product.name;
            priceInput.value = product.price;
            descInput.value = product.description || '';
            imagePreview.src = product.imageUrl;
        } else {
            title.textContent = '添加商品';
            nameInput.value = ''; priceInput.value = ''; descInput.value = '';
            imagePreview.src = 'https://s3plus.meituan.net/opapisdk/op_ticket_885190757_1756206115802_qdqqd_0c99bh.jpeg';
        }
        modal.classList.add('visible');
    }

    async function saveProduct() {
        const name = document.getElementById('product-name-input').value.trim();
        const price = parseFloat(document.getElementById('product-price-input').value);
        const description = document.getElementById('product-description-input').value.trim();
        const imageUrl = document.getElementById('product-image-preview').src;
        if (!name || isNaN(price) || price < 0 || imageUrl.includes('placeholder')) {
            alert('请填写完整的商品信息！'); return;
        }
        const productData = { name, price, description, imageUrl };
        if (editingProductId) {
            await window.db.shoppingProducts.update(editingProductId, productData);
        } else {
            await window.db.shoppingProducts.add(productData);
        }
        document.getElementById('product-editor-modal').classList.remove('visible');
        await renderShoppingProducts();
    }

    async function deleteProduct(productId) {
        const confirmed = await window.showCustomConfirm('删除商品', '确定要删除这个商品吗？此操作不可恢复。', { confirmButtonClass: 'btn-danger' });
        if (confirmed) {
            await window.db.shoppingProducts.delete(productId);
            await renderShoppingProducts();
        }
    }
    
    // -------------------------------------------------------------------
    // [5] 事件监听器 (Event Listeners)
    // -------------------------------------------------------------------
    function initShoppingEventListeners() {
        document.getElementById('shopping-back-btn').addEventListener('click', () => window.showScreen('chat-interface-screen'));
        document.getElementById('go-to-cart-btn').addEventListener('click', openCartScreen);
        document.getElementById('cart-back-btn').addEventListener('click', openShoppingScreen);
        document.getElementById('checkout-btn').addEventListener('click', handleCheckout);
        
        document.getElementById('manage-products-btn').addEventListener('click', () => {
            isProductManagementMode = !isProductManagementMode;
            renderShoppingProducts();
        });
        document.getElementById('add-new-product-btn').addEventListener('click', () => {
            if (isProductManagementMode) openProductEditor(null);
            else alert("请先点击扳手图标进入管理模式。");
        });

        document.getElementById('product-grid').addEventListener('click', async e => {
            const productItem = e.target.closest('.product-item');
            if (!productItem) return;
            const productId = parseInt(productItem.dataset.id);
            if (e.target.classList.contains('edit-product-btn')) openProductEditor(productId);
            else if (e.target.classList.contains('delete-product-btn')) deleteProduct(productId);
            else if (e.target.classList.contains('add-to-cart-btn')) await addToCart(productId);
        });
        
        document.getElementById('cart-items-list').addEventListener('click', e => {
            const target = e.target;
            const productId = parseInt(target.dataset.id);
            if (target.classList.contains('decrease-qty-btn')) {
                const item = shoppingCart.find(i => i.productId === productId);
                if (item) { item.quantity--; if (item.quantity <= 0) shoppingCart = shoppingCart.filter(i => i.productId !== productId); }
            }
            if (target.classList.contains('increase-qty-btn')) {
                const item = shoppingCart.find(i => i.productId === productId);
                if (item) item.quantity++;
            }
            renderCartItems();
        });
        
        document.getElementById('clear-cart-btn').addEventListener('click', async () => {
            if (shoppingCart.length === 0) return;
            const confirmed = await window.showCustomConfirm('清空购物车', '确定要清空所有商品吗？');
            if (confirmed) { shoppingCart = []; renderCartItems(); }
        });

        document.getElementById('select-all-cart-items').addEventListener('change', e => {
            document.querySelectorAll('.cart-item-checkbox').forEach(cb => cb.checked = e.target.checked);
            updateCartTotal();
        });
        
        document.getElementById('cart-items-list').addEventListener('change', e => {
            if(e.target.classList.contains('cart-item-checkbox')) updateCartTotal();
        });

        document.getElementById('cancel-product-editor-btn').addEventListener('click', () => document.getElementById('product-editor-modal').classList.remove('visible'));
        document.getElementById('save-product-btn').addEventListener('click', saveProduct);
        document.getElementById('product-editor-modal').querySelector('.avatar-upload button').addEventListener('click', () => document.getElementById('product-image-input').click());
        document.getElementById('product-image-input').addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = re => document.getElementById('product-image-preview').src = re.target.result;
                reader.readAsDataURL(file);
            }
        });
        
        // 礼物小票相关
        document.getElementById('close-receipt-btn').addEventListener('click', () => document.getElementById('gift-receipt-modal').classList.remove('visible'));
        document.getElementById('chat-messages').addEventListener('click', e => {
            const giftCard = e.target.closest('.gift-card');
            if (giftCard) {
                const bubble = giftCard.closest('.message-bubble');
                if (bubble) {
                    const msg = window.state.chats[window.state.activeChatId].history.find(m => m.timestamp === parseInt(bubble.dataset.timestamp));
                    if (msg) {
                        // 构建小票HTML... (与您主文件逻辑相同)
                        const receiptBody = document.getElementById('gift-receipt-body');
                        let itemsHtml = msg.items.map(item => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>¥${item.price.toFixed(2)}</td><td>¥${(item.price * item.quantity).toFixed(2)}</td></tr>`).join('');
                        receiptBody.innerHTML = `<div class="receipt-header"><h3>购物小票</h3><p>${new Date(msg.timestamp).toLocaleString()}</p></div><table class="receipt-items-table"><thead><tr><th>商品</th><th>数量</th><th>单价</th><th>小计</th></tr></thead><tbody>${itemsHtml}</tbody></table><div class="receipt-total">总计: ¥${msg.total.toFixed(2)}</div>`;
                        document.getElementById('gift-receipt-modal').classList.add('visible');
                    }
                }
            }
        });
        
        // 礼物接收人选择相关
        document.getElementById('cancel-gift-recipient-btn').addEventListener('click', () => document.getElementById('gift-recipient-modal').classList.remove('visible'));
        document.getElementById('confirm-gift-recipient-btn').addEventListener('click', async () => {
            const selectedRecipients = Array.from(document.querySelectorAll('#gift-recipient-list .contact-picker-item.selected')).map(item => item.dataset.recipientName);
            if (selectedRecipients.length === 0) { alert("请至少选择一位收礼人。"); return; }
            const selectedItems = shoppingCart.filter(item => document.querySelector(`.cart-item-checkbox[data-id="${item.productId}"]:checked`));
            await sendGiftMessage(selectedItems, selectedRecipients);
            document.getElementById('gift-recipient-modal').classList.remove('visible');
        });
        document.getElementById('gift-recipient-list').addEventListener('click', e => {
            const item = e.target.closest('.contact-picker-item');
            if (item) item.classList.toggle('selected');
        });
        document.getElementById('select-all-recipients').addEventListener('change', e => {
            document.querySelectorAll('#gift-recipient-list .contact-picker-item').forEach(item => item.classList.toggle('selected', e.target.checked));
        });
    }

    // -------------------------------------------------------------------
    // [6] 初始化与对外接口 (Initialization & Public API)
    // -------------------------------------------------------------------
    function initShoppingApp() {
        if (isInitialized) return;
        console.log("Initializing Shopping App Module...");
        injectShoppingStyles();
        createShoppingHTML();
        initShoppingEventListeners();
        isInitialized = true;
    }
    
    // 这是暴露给外部的唯一接口
    window.openShoppingScreen = openShoppingScreen;

})(window);