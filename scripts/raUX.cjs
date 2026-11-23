// Rà UX toàn app bằng máy (Playwright) — chạy khi đã bật emulator + vite (xem BOI_CANH "Rà UX toàn app").
// node scripts/raUX.cjs <thư mục lưu ảnh>
// Rà UX toàn app: mọi vai trò × mọi tab × các mục/khung mở × 3 khổ màn.
const { chromium } = require('playwright'); const S = process.argv[2];
const VAI = {
  'admin@dpk.vn': [['Tổng quan'], ['Điều phối'], ['Kho', ['Xuất kho', 'Tồn kho', 'Phiếu nhập', '+ Nhập hàng']], ['Kế toán', ['Tiền mặt', 'Chuyển khoản', 'Công nợ', 'Soát giảm giá', 'Tài khoản nhận CK']], ['Báo cáo', ['Doanh thu', 'Tồn kho & vỏ']], ['Đơn hàng', ['Hôm nay', '+ Tạo đơn']], ['Danh mục', ['#Khách hàng', '#Sản phẩm', '#Xe', '#Nhân viên', '#Nhà cung cấp']]],
  'tx1@dpk.vn': [['Chuyến của tôi', ['@Giao', '+ Thu nợ', '+ Đơn tại chỗ']]],
  'sales@dpk.vn': [['Tổng quan'], ['Đơn hàng', ['Hôm nay']]],
  'kho@dpk.vn': [['Tổng quan'], ['Báo cáo']],
  'kt@dpk.vn': [['Tổng quan']],
};
const do_ = () => {
  const W = innerWidth, kq = { tran: document.documentElement.scrollWidth - W, nho: [], ra: [], cat: [], tuongPhan: [] };
  const nhin = (e) => { const b = e.getBoundingClientRect(); const st = getComputedStyle(e); return b.width > 0 && b.height > 0 && st.visibility !== 'hidden'; };
  const cuon = (e) => { for (let p = e.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll') return true; } return false; };
  for (const e of document.querySelectorAll('button, a, summary, input:not([type=checkbox]), select, textarea, label.o-tick')) {
    if (!nhin(e)) continue; const b = e.getBoundingClientRect();
    if (b.height < 43.5) kq.nho.push(((e.textContent || e.getAttribute('aria-label') || e.placeholder || e.tagName).trim().slice(0, 18)) + ':' + Math.round(b.height));
  }
  for (const e of document.querySelectorAll('main *, header *, nav *')) {
    if (!nhin(e) || cuon(e)) continue; const b = e.getBoundingClientRect();
    if (b.right > W + 1 || b.left < -1) kq.ra.push((e.className?.baseVal ?? e.className) || e.tagName);
    const st = getComputedStyle(e);
    if (e.children.length === 0 && e.textContent.trim() && st.overflow !== 'visible' && (e.scrollWidth > e.clientWidth + 1)) kq.cat.push(e.textContent.trim().slice(0, 20));
  }
  // Tương phản chữ nhỏ (< 14px) trên nền trắng/nhạt: ước theo màu chữ vs nền gần nhất.
  const lum = (c) => { const m = c.match(/\d+(\.\d+)?/g).map(Number); const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
  const nen = (e) => { for (let p = e; p; p = p.parentElement) { const c = getComputedStyle(p).backgroundColor; if (c && !c.endsWith(', 0)') && c !== 'transparent') return c; } return 'rgb(255,255,255)'; };
  for (const e of document.querySelectorAll('main *')) {
    if (!nhin(e) || !e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const st = getComputedStyle(e); if (parseFloat(st.fontSize) >= 14 && parseInt(st.fontWeight) < 700 && parseFloat(st.fontSize) < 18.6) { /* thường */ }
    const a = lum(st.color), b = lum(nen(e)); const r = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    const nguong = parseFloat(st.fontSize) >= 18.6 || (parseFloat(st.fontSize) >= 14 && parseInt(st.fontWeight) >= 700) ? 3 : 4.5;
    if (r < nguong) kq.tuongPhan.push(e.textContent.trim().slice(0, 16) + ':' + r.toFixed(1));
  }
  for (const k of ['nho', 'ra', 'cat', 'tuongPhan']) kq[k] = [...new Set(kq[k])].slice(0, 8);
  return kq;
};
(async () => {
  const b = await chromium.launch(); const loi = []; const tom = {};
  for (const [w, h] of [[375, 812], [768, 1024], [1280, 900]]) {
    for (const [email, tabs] of Object.entries(VAI)) {
      const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
      p.on('pageerror', e => loi.push(e.message)); p.on('dialog', d => d.dismiss());
      await p.goto('http://localhost:5173'); await p.waitForSelector('form');
      if (email === 'admin@dpk.vn' && w === 375) { const r = await p.evaluate(do_); if (JSON.stringify(r) !== '{"tran":0,"nho":[],"ra":[],"cat":[],"tuongPhan":[]}') tom[`${w} đăng nhập`] = r; }
      await p.fill('#dn-ten', email); await p.fill('#dn-mk', 'matkhau123'); await p.click('button[type=submit]'); await p.waitForSelector('.app-header');
      for (const [tab, mucs] of tabs) {
        if (await p.locator('.tabbar').count()) await p.locator('.tabbar button', { hasText: tab }).first().click(); await p.waitForTimeout(900);
        const chay = async (ten) => { const r = await p.evaluate(do_); const co = r.tran || r.nho.length || r.ra.length || r.cat.length || r.tuongPhan.length; if (co) tom[`${w} ${email.split('@')[0]} ${ten}`] = r; if (w === 375) await p.screenshot({ path: `${S}/ux-${email.split('@')[0]}-${ten.replace(/[^a-z0-9]/gi, '_')}.png`, fullPage: true }); };
        await chay(tab);
        for (let m of mucs ?? []) {
          if (m.startsWith('#')) { await p.locator('.tabbar button', { hasText: tab }).first().click(); await p.waitForTimeout(400); m = m.slice(1) }
          const nut = m.startsWith('@') ? p.locator('button', { hasText: m.slice(1) }).first() : p.locator('main button, main summary', { hasText: m }).first();
          if (!(await nut.count())) { tom[`${w} ${tab}>${m}`] = 'KHÔNG THẤY NÚT'; continue; }
          await nut.click(); await p.waitForTimeout(900); await chay(`${tab}>${m}`);
          if (m.startsWith('+') || m.startsWith('@')) { const huy = p.locator('main button', { hasText: /^Huỷ$/ }).first(); if (await huy.count()) await huy.click(); await p.waitForTimeout(300); }
        }
      }
      await p.context().close();
    }
  }
  for (const [k, v] of Object.entries(tom)) console.log(k, JSON.stringify(v));
  console.log('errors:', [...new Set(loi)]); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
