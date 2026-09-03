/* ========== 保护逻辑核心代码（未混淆版本 - 用于参考和生成混淆代码） ========== */
/* 版本: 1.0.0 */
/* 作者: Claude Opus 4.8 */
/* 用途: 轻量级防篡改 + 电子指纹系统 */

(function() {
  'use strict';

  // ============ 配置常量 ============
  const CONFIG = {
    STORAGE_KEY: 'fnb_fingerprint_v1',
    AUTH_MASK_ID: 'fnb-auth-mask',
    FINGERPRINT_FOOTER_ID: 'fnb-fingerprint-footer',
    TAMPER_ALERT_ID: 'fnb-tamper-alert',
    CORE_CONTENT_SELECTOR: '.content, .page, .module',
    HASH_CHECK_INTERVAL: 10000,
    MUTATION_DEBOUNCE: 500
  };

  // ============ 工具函数 ============
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  function getBrowserFingerprint() {
    const ua = navigator.userAgent;
    const lang = navigator.language;
    const platform = navigator.platform;
    const screen = `${screen.width}x${screen.height}`;
    return simpleHash(ua + lang + platform + screen).substring(0, 8);
  }

  function formatDate(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  // ============ 存储管理 ============
  function saveFingerprint(data) {
    try {
      const encrypted = btoa(encodeURIComponent(JSON.stringify(data)));
      localStorage.setItem(CONFIG.STORAGE_KEY, encrypted);
      sessionStorage.setItem(CONFIG.STORAGE_KEY, encrypted);
    } catch(e) {}
  }

  function getFingerprint() {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEY) || sessionStorage.getItem(CONFIG.STORAGE_KEY);
      if (stored) return JSON.parse(decodeURIComponent(atob(stored)));
    } catch(e) {}
    return null;
  }

  // ============ IP获取 ============
  function getPublicIP() {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 3000);
      try {
        fetch('https://api.ipify.org?format=json', { mode: 'cors' })
          .then(r => r.json())
          .then(d => { clearTimeout(timeout); resolve(d.ip); })
          .catch(() => { clearTimeout(timeout); resolve(null); });
      } catch(e) { clearTimeout(timeout); resolve(null); }
    });
  }

  // ============ 身份验证系统 ============
  let isAuthenticated = false;
  let fingerprintData = getFingerprint();

  function createAuthMask() {
    const mask = document.createElement('div');
    mask.id = CONFIG.AUTH_MASK_ID;
    mask.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(255,248,220,0.98);display:flex;align-items:center;justify-content:center;z-index:9999;font-family:'Georgia','宋体',serif;">
        <div style="background:#fff;padding:40px 50px;border-radius:8px;border:2px solid #d4c9b8;box-shadow:0 8px 32px rgba(44,26,13,0.15);text-align:center;max-width:90%;">
          <h2 style="margin:0 0 20px;color:#2c1a0d;font-weight:700;font-size:24px;">身份验证</h2>
          <p style="margin:0 0 25px;color:#4a3220;font-size:15px;line-height:1.6;">请输入您的姓名完成身份验证<br>身份信息仅用于学习溯源，不会上传至任何服务器</p>
          <input type="text" id="fnb-auth-input" placeholder="请输入姓名（2-20字符）" style="width:280px;padding:12px 16px;font-size:16px;border:2px solid #d4c9b8;border-radius:6px;font-family:inherit;outline:none;">
          <button id="fnb-auth-btn" style="margin-top:20px;padding:12px 40px;font-size:16px;background:#3d5a80;color:#fff;border:none;border-radius:6px;cursor:pointer;font-family:'Georgia','宋体',serif;font-weight:600;">确认</button>
          <p id="fnb-auth-msg" style="margin-top:15px;color:#c0392b;font-size:14px;height:20px;"></p>
        </div>
      </div>
    `;
    document.body.appendChild(mask);

    const input = document.getElementById('fnb-auth-input');
    const btn = document.getElementById('fnb-auth-btn');
    const msg = document.getElementById('fnb-auth-msg');

    btn.onclick = () => {
      const name = input.value.trim();
      if (!name || name.length < 2 || name.length > 20) {
        msg.textContent = '请输入2-20字符的有效姓名';
        return;
      }
      completeAuth(name);
    };

    input.onkeydown = (e) => { if (e.key === 'Enter') btn.click(); };
    input.focus();
  }

  async function completeAuth(name) {
    const ip = await getPublicIP();
    fingerprintData = {
      name,
      firstVisit: fingerprintData?.firstVisit || Date.now(),
      lastVisit: Date.now(),
      browserFingerprint: getBrowserFingerprint(),
      ip
    };
    saveFingerprint(fingerprintData);

    const mask = document.getElementById(CONFIG.AUTH_MASK_ID);
    if (mask) mask.remove();

    showContent();
    showFingerprintFooter();
    isAuthenticated = true;

    document.body.appendChild(document.createComment('Identity: ' + name + ' | Fingerprint: ' + fingerprintData.browserFingerprint));
  }

  function showContent() {
    document.querySelectorAll(CONFIG.CORE_CONTENT_SELECTOR).forEach(el => {
      el.style.display = '';
    });
  }

  function hideContent() {
    document.querySelectorAll(CONFIG.CORE_CONTENT_SELECTOR).forEach(el => {
      el.style.display = 'none';
    });
  }

  function showFingerprintFooter() {
    const footer = document.querySelector('.disclaimer');
    if (!footer || !fingerprintData) return;

    const fpDiv = document.createElement('div');
    fpDiv.id = CONFIG.FINGERPRINT_FOOTER_ID;
    fpDiv.style.cssText = 'text-align:right;padding:5px 10px;font-size:10px;color:rgba(200,190,170,0.7);cursor:pointer;';
    fpDiv.textContent = `用户: ${fingerprintData.name} | ${formatDate(fingerprintData.firstVisit)}`;
    fpDiv.onclick = () => {
      if (confirm('是否要修改身份信息？')) {
        localStorage.removeItem(CONFIG.STORAGE_KEY);
        sessionStorage.removeItem(CONFIG.STORAGE_KEY);
        location.reload();
      }
    };
    footer.appendChild(fpDiv);
  }

  // ============ 防篡改系统 ============
  let initialHash = '';
  let observer = null;
  let tamperAlertShown = false;

  function calculateContentHash() {
    const content = document.querySelector(CONFIG.CORE_CONTENT_SELECTOR.split(',')[0]);
    if (!content) return '';
    return simpleHash(content.textContent.substring(0, 1000));
  }

  function showTamperAlert() {
    if (tamperAlertShown) return;
    tamperAlertShown = true;

    const alert = document.createElement('div');
    alert.id = CONFIG.TAMPER_ALERT_ID;
    alert.innerHTML = `
      <div style="position:fixed;top:20px;right:20px;background:#fff5f5;border:2px solid #e74c3c;border-radius:8px;padding:16px 20px;box-shadow:0 8px 32px rgba(231,76,60,0.3);z-index:9998;font-family:'Georgia','宋体',serif;max-width:320px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <span style="font-size:20px;">⚠️</span>
          <strong style="color:#c0392b;font-size:15px;">篡改警告</strong>
        </div>
        <p style="margin:0;font-size:13px;color:#4a3220;line-height:1.5;">本教材内容已被篡改，可能影响学习效果，请使用官方原版文件</p>
      </div>
    `;
    document.body.appendChild(alert);
  }

  function setupMutationObserver() {
    observer = new MutationObserver((mutations) => {
      const contentChanges = mutations.filter(m => {
        const target = m.target;
        if (target.classList?.contains('fnb-protected')) return false;
        const hasContentSelector = CONFIG.CORE_CONTENT_SELECTOR.split(',').some(s => {
          try { return target.closest?.(s.trim()); } catch(e) { return false; }
        });
        return hasContentSelector;
      });

      if (contentChanges.length > 0) {
        showTamperAlert();
      }
    });

    document.querySelectorAll(CONFIG.CORE_CONTENT_SELECTOR).forEach(el => {
      el.classList.add('fnb-protected');
      observer.observe(el, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: false
      });
    });

    initialHash = calculateContentHash();
  }

  function checkContentIntegrity() {
    if (!isAuthenticated) return;
    const currentHash = calculateContentHash();
    if (currentHash && initialHash && currentHash !== initialHash) {
      showTamperAlert();
    }
  }

  // ============ 防操作限制 ============
  function setupSecurityMeasures() {
    // 禁用右键菜单
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest('input') || e.target.closest('textarea')) return;
      e.preventDefault();
    });

    // 屏蔽开发者工具快捷键
    const blockedKeys = ['F12', 'Control+Shift+I', 'Control+Shift+J', 'Control+U', 'Control+S'];
    document.addEventListener('keydown', (e) => {
      const keyCombo = [];
      if (e.ctrlKey) keyCombo.push('Control');
      if (e.shiftKey) keyCombo.push('Shift');
      keyCombo.push(e.key === 'F12' ? 'F12' : e.key.toUpperCase());
      if (blockedKeys.includes(keyCombo.join('+'))) {
        e.preventDefault();
      }
    });

    // 检测开发者工具打开
    let devtoolsOpen = false;
    setInterval(() => {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      if (widthDiff || heightDiff) {
        if (!devtoolsOpen && isAuthenticated) {
          devtoolsOpen = true;
          document.body.style.filter = 'blur(2px)';
          setTimeout(() => {
            if (devtoolsOpen) document.body.style.filter = '';
          }, 1000);
        }
      } else {
        devtoolsOpen = false;
      }
    }, 1000);
  }

  // ============ 初始化 ============
  function init() {
    // 检查是否已验证
    if (fingerprintData) {
      showFingerprintFooter();
      isAuthenticated = true;
    } else {
      hideContent();
      createAuthMask();
    }

    // 设置安全措施
    setupSecurityMeasures();

    // 设置防篡改
    setTimeout(() => {
      if (isAuthenticated) {
        setupMutationObserver();
        setInterval(checkContentIntegrity, CONFIG.HASH_CHECK_INTERVAL);
      }
    }, 1000);

    // 监听mask删除
    const checkMask = setInterval(() => {
      if (!isAuthenticated && !document.getElementById(CONFIG.AUTH_MASK_ID)) {
        hideContent();
        createAuthMask();
      }
    }, 500);

    setTimeout(() => clearInterval(checkMask), 10000);
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
/* ========== 保护逻辑核心代码结束 ========== */