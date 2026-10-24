// 全局调度总成：集成手摇曲柄把手 (Manual Crank Handle) 与 9 大机构
const { Engine, Render, Runner, Composite, Mouse, MouseConstraint, Body } = Matter;

const viewport = document.getElementById('viewport');
let width = viewport.clientWidth;
let height = viewport.clientHeight;

// 1. 初始化引擎与渲染
const engine = Engine.create();
engine.gravity.y = 0;

const render = Render.create({
  element: viewport,
  engine: engine,
  options: {
    width: width,
    height: height,
    wireframes: true,
    background: '#0c0d0e'
  }
});
Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// 2. 机构总库字典
const presets = {
  crankSlider: window.CrankSliderMechanism,
  fourBar: window.FourBarMechanism,
  cam: window.CamFollowerMechanism,
  gear: window.GearSystemMechanism,
  geneva: window.GenevaDriveMechanism,
  ratchet: window.RatchetPawlMechanism,
  quickReturn: window.QuickReturnMechanism,
  rackPinion: window.RackPinionMechanism,
  planetary: window.PlanetaryGearsMechanism
};

let activePresetKey = 'crankSlider';
let activeInstance = null;
let mouseConstraint = null;

function loadMechanism(key) {
  if (!presets[key]) return;

  if (activeInstance && activeInstance.destroy) {
    try { activeInstance.destroy(); } catch (e) { console.error(e); }
  }

  Composite.clear(engine.world, false);
  activePresetKey = key;

  const mouse = Mouse.create(render.canvas);
  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { stiffness: 0.2, render: { visible: false } }
  });
  Composite.add(engine.world, mouseConstraint);
  render.mouse = mouse;

  activeInstance = presets[key].init(engine, width, height);

  const frictionSlider = document.getElementById('frictionSlider');
  if (frictionSlider && activeInstance && activeInstance.bodiesToFriction) {
    const f = parseFloat(frictionSlider.value);
    activeInstance.bodiesToFriction.forEach(b => { if (b) b.frictionAir = f; });
  }

  updateLanguage(currentLang);
}

// 3. 动力系统：电机驱动 VS 工业手摇把手交互 (Manual Crank)
let isMotorOn = true;
let targetRpm = 30;
let isDraggingHandle = false;
let manualAngVel = 0;
let lastMouseAngle = null;
let lastMouseTime = performance.now();

// 手摇手柄鼠标事件监听
viewport.addEventListener('mousedown', (e) => {
  if (isMotorOn || !activeInstance || !activeInstance.driveBody) return;
  const rect = viewport.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const db = activeInstance.driveBody;

  // 判断是否点中驱动轮把手外圈 (把手半径 55px 处)
  const dist = Math.hypot(mx - db.position.x, my - db.position.y);
  if (dist >= 25 && dist <= 85) {
    isDraggingHandle = true;
    lastMouseAngle = Math.atan2(my - db.position.y, mx - db.position.x);
    lastMouseTime = performance.now();
  }
});

window.addEventListener('mousemove', (e) => {
  if (!isDraggingHandle || isMotorOn || !activeInstance || !activeInstance.driveBody) return;
  const rect = viewport.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const db = activeInstance.driveBody;

  const curAngle = Math.atan2(my - db.position.y, mx - db.position.x);
  const now = performance.now();
  const dt = (now - lastMouseTime) / 1000;

  if (dt > 0.005) {
    let dTheta = curAngle - lastMouseAngle;
    if (dTheta > Math.PI) dTheta -= Math.PI * 2;
    if (dTheta < -Math.PI) dTheta += Math.PI * 2;

    manualAngVel = dTheta / dt;
    Body.setAngle(db, db.angle + dTheta);
    Body.setAngularVelocity(db, manualAngVel / 60);

    lastMouseAngle = curAngle;
    lastMouseTime = now;
  }
});

window.addEventListener('mouseup', () => {
  isDraggingHandle = false;
});

// 主运动循环与遥测更新
Matter.Events.on(engine, 'beforeUpdate', () => {
  if (isMotorOn && activeInstance && activeInstance.driveBody) {
    const targetAngVel = (targetRpm * 2 * Math.PI) / (60 * 60);
    Body.setAngularVelocity(activeInstance.driveBody, targetAngVel);
  }

  // 阻尼让手摇平缓衰减
  if (!isMotorOn && !isDraggingHandle) {
    manualAngVel *= 0.92;
  }

  if (activeInstance && activeInstance.getTelemetry) {
    const data = activeInstance.getTelemetry();
    const angEl = document.getElementById('angVel');
    const dispEl = document.getElementById('dispVal');

    if (angEl) {
      if (isMotorOn) {
        angEl.innerText = data.v1;
      } else {
        const manRpm = Math.abs(manualAngVel * 60 / (2 * Math.PI)).toFixed(1);
        angEl.innerText = `${manRpm} RPM (手摇)`;
      }
    }
    if (dispEl && data.v2) dispEl.innerText = data.v2;
  }
});

// 手摇把手视觉叠加层 (在空挡模式下呈现工科把手)
const canvas = document.querySelector('#viewport canvas');
function renderManualHandle() {
  if (!isMotorOn && activeInstance && activeInstance.driveBody && canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const db = activeInstance.driveBody;
      const hRadius = 55;
      const hx = db.position.x + hRadius * Math.cos(db.angle);
      const hy = db.position.y + hRadius * Math.sin(db.angle);

      ctx.save();
      // 把手旋转引导虚线圈
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(db.position.x, db.position.y, hRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 把手金属曲柄与握把
      ctx.setLineDash([]);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(db.position.x, db.position.y);
      ctx.lineTo(hx, hy);
      ctx.stroke();

      // 旋钮握把 (Knob)
      ctx.fillStyle = isDraggingHandle ? '#ffffff' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(hx, hy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // 提示标签
      ctx.fillStyle = '#64748b';
      ctx.font = '10px ui-monospace, monospace';
      ctx.fillText('CRANK HANDLE [DRAG TO ROTATE]', db.position.x - 70, db.position.y + hRadius + 22);

      ctx.restore();
    }
  }
  requestAnimationFrame(renderManualHandle);
}
requestAnimationFrame(renderManualHandle);

// 4. 国际化与事件
let currentLang = 'zh';
const dict = {
  zh: {
    subTitle: '机械动力学仿真沙盒',
    statusMotorOn: '状态: 电机驱动中 / 可调节 RPM',
    statusMotorOff: '状态: 手动空挡 / 请抓取蓝色手柄摇动',
    sec0: '00 / 机构拓扑库',
    sec1: '01 / 驱动单元',
    motorOn: '电机状态: 已接入驱动',
    motorOff: '电机状态: 空挡 (手柄摇动)',
    resetBtn: '复位',
    sec2: '02 / 运动学调节',
    rpm: '主动轮转速',
    friction: '系统阻尼 / 摩擦',
    sec3: '03 / 实时遥测数据',
    footerCore: '解算核心: 本地部署 MATTER.JS // 模块化驱动架构'
  },
  en: {
    subTitle: 'RIGID SIMULATION SUITE',
    statusMotorOn: 'SYS: MOTOR ENGAGED / TUNE RPM',
    statusMotorOff: 'SYS: MANUAL IDLE / ROTATE BLUE HANDLE',
    sec0: '00 / MECHANISM ARCHIVE',
    sec1: '01 / DRIVE UNIT',
    motorOn: 'MOTOR: ENGAGED',
    motorOff: 'MOTOR: DISENGAGED (MANUAL CRANK)',
    resetBtn: 'RESET',
    sec2: '02 / KINEMATICS REGULATION',
    rpm: 'DRIVE SPEED',
    friction: 'SYSTEM DAMPING',
    sec3: '03 / TELEMETRY LOG',
    footerCore: 'SOLVER: MATTER.JS ENGINE // MODULAR ARCHITECTURE'
  }
};

function updateLanguage(lang) {
  currentLang = lang;
  const t = dict[lang];
  const p = presets[activePresetKey];

  const setTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.innerText = txt;
  };

  setTxt('headerSub', t.subTitle);
  setTxt('sysStatus', isMotorOn ? t.statusMotorOn : t.statusMotorOff);
  setTxt('sec0Title', t.sec0);
  setTxt('sec1Title', t.sec1);
  setTxt('motorBtn', isMotorOn ? t.motorOn : t.motorOff);
  setTxt('resetBtn', t.resetBtn);
  setTxt('sec2Title', t.sec2);
  setTxt('rpmLabel', t.rpm);
  setTxt('frictionLabel', t.friction);
  setTxt('sec3Title', t.sec3);
  setTxt('footerCore', t.footerCore);

  if (p) {
    setTxt('angVelLabel', isMotorOn ? (lang === 'zh' ? p.telemetryLabelsZh?.m1 : p.telemetryLabelsEn?.m1) : (lang === 'zh' ? '手动输入转速' : 'Manual Crank Vel'));
    setTxt('dispLabel', lang === 'zh' ? p.telemetryLabelsZh?.m2 : p.telemetryLabelsEn?.m2);
    setTxt('footerType', lang === 'zh' ? `机构形式: ${p.nameZh}` : `TYPE: ${p.nameEn}`);
  }

  const zhBtn = document.getElementById('langZh');
  const enBtn = document.getElementById('langEn');
  if (zhBtn) zhBtn.classList.toggle('active', lang === 'zh');
  if (enBtn) enBtn.classList.toggle('active', lang === 'en');
}

const safeListen = (id, event, handler) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
};

safeListen('mechanismSelect', 'change', (e) => loadMechanism(e.target.value));
safeListen('langZh', 'click', () => updateLanguage('zh'));
safeListen('langEn', 'click', () => updateLanguage('en'));

safeListen('motorBtn', 'click', () => {
  isMotorOn = !isMotorOn;
  const mBtn = document.getElementById('motorBtn');
  if (mBtn) mBtn.classList.toggle('active', isMotorOn);
  updateLanguage(currentLang);
});

safeListen('resetBtn', 'click', () => loadMechanism(activePresetKey));

safeListen('rpmSlider', 'input', (e) => {
  targetRpm = parseFloat(e.target.value);
  const rpmEl = document.getElementById('rpmVal');
  if (rpmEl) rpmEl.innerText = `${targetRpm} RPM`;
});

safeListen('frictionSlider', 'input', (e) => {
  const f = parseFloat(e.target.value);
  if (activeInstance && activeInstance.bodiesToFriction) {
    activeInstance.bodiesToFriction.forEach(b => { if (b) b.frictionAir = f; });
  }
  const fEl = document.getElementById('frictionVal');
  if (fEl) fEl.innerText = f.toFixed(3);
});

window.addEventListener('resize', () => {
  width = viewport.clientWidth;
  height = viewport.clientHeight;
  render.canvas.width = width;
  render.canvas.height = height;
  loadMechanism(activePresetKey);
});

loadMechanism('crankSlider');
