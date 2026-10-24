// 全局调度总成：管理 9 大机构生命周期、视口自适应、遥测读数与双语系统
const { Engine, Render, Runner, Composite, Mouse, MouseConstraint, Body } = Matter;

const viewport = document.getElementById('viewport');
let width = viewport.clientWidth;
let height = viewport.clientHeight;

// 1. 初始化引擎与渲染器
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

// 2. 机构总库字典 (9 大拓扑完整注册)
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
  if (!presets[key]) {
    console.warn('Mechanism not registered:', key);
    return;
  }

  // 卸载上一机构的动画与事件
  if (activeInstance && activeInstance.destroy) {
    try {
      activeInstance.destroy();
    } catch (e) {
      console.error(e);
    }
  }

  // 清空刚体世界
  Composite.clear(engine.world, false);
  activePresetKey = key;

  // 重新绑定鼠标约束
  const mouse = Mouse.create(render.canvas);
  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { stiffness: 0.2, render: { visible: false } }
  });
  Composite.add(engine.world, mouseConstraint);
  render.mouse = mouse;

  // 初始化对应机构
  activeInstance = presets[key].init(engine, width, height);

  // 同步当前阻尼值
  const frictionSlider = document.getElementById('frictionSlider');
  if (frictionSlider && activeInstance && activeInstance.bodiesToFriction) {
    const f = parseFloat(frictionSlider.value);
    activeInstance.bodiesToFriction.forEach(b => { if (b) b.frictionAir = f; });
  }

  updateLanguage(currentLang);
}

// 3. 动力驱动与遥测主循环
let isMotorOn = true;
let targetRpm = 30;

Matter.Events.on(engine, 'beforeUpdate', () => {
  if (isMotorOn && activeInstance && activeInstance.driveBody) {
    const targetAngVel = (targetRpm * 2 * Math.PI) / (60 * 60);
    Body.setAngularVelocity(activeInstance.driveBody, targetAngVel);
  }

  if (activeInstance && activeInstance.getTelemetry) {
    const data = activeInstance.getTelemetry();
    const angEl = document.getElementById('angVel');
    const dispEl = document.getElementById('dispVal');
    if (angEl && data.v1) angEl.innerText = data.v1;
    if (dispEl && data.v2) dispEl.innerText = data.v2;
  }
});

// 4. 国际化字典
let currentLang = 'zh';
const dict = {
  zh: {
    subTitle: '机械动力学仿真沙盒',
    statusMotorOn: '状态: 动力源运行中 / 支持鼠标拖拽',
    statusMotorOff: '状态: 手动模式 / 按住构件拖动',
    sec0: '00 / 机构拓扑库',
    sec1: '01 / 驱动单元',
    motorOn: '电机状态: 已接入驱动',
    motorOff: '电机状态: 空挡 (手动拨动)',
    resetBtn: '复位',
    sec2: '02 / 运动学调节',
    rpm: '主动轮转速',
    friction: '系统阻尼 / 摩擦',
    sec3: '03 / 实时遥测数据',
    footerCore: '解算核心: 本地部署 MATTER.JS // 模块化驱动架构'
  },
  en: {
    subTitle: 'RIGID SIMULATION SUITE',
    statusMotorOn: 'SYS: EQUILIBRIUM ACTIVE / DRAG TO INTERACT',
    statusMotorOff: 'SYS: MANUAL MODE / DRAG COMPONENT',
    sec0: '00 / MECHANISM ARCHIVE',
    sec1: '01 / DRIVE UNIT',
    motorOn: 'MOTOR: ENGAGED',
    motorOff: 'MOTOR: DISENGAGED (MANUAL)',
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
    setTxt('angVelLabel', lang === 'zh' ? p.telemetryLabelsZh?.m1 : p.telemetryLabelsEn?.m1);
    setTxt('dispLabel', lang === 'zh' ? p.telemetryLabelsZh?.m2 : p.telemetryLabelsEn?.m2);
    setTxt('footerType', lang === 'zh' ? `机构形式: ${p.nameZh}` : `TYPE: ${p.nameEn}`);
  }

  const zhBtn = document.getElementById('langZh');
  const enBtn = document.getElementById('langEn');
  if (zhBtn) zhBtn.classList.toggle('active', lang === 'zh');
  if (enBtn) enBtn.classList.toggle('active', lang === 'en');
}

// 5. 事件安全绑定
const safeListen = (id, event, handler) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
};

// 下拉选单切换
safeListen('mechanismSelect', 'change', (e) => loadMechanism(e.target.value));

// 双语切换
safeListen('langZh', 'click', () => updateLanguage('zh'));
safeListen('langEn', 'click', () => updateLanguage('en'));

// 动力与复位
safeListen('motorBtn', 'click', () => {
  isMotorOn = !isMotorOn;
  const mBtn = document.getElementById('motorBtn');
  if (mBtn) mBtn.classList.toggle('active', isMotorOn);
  updateLanguage(currentLang);
});

safeListen('resetBtn', 'click', () => {
  loadMechanism(activePresetKey);
});

// 滑块
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

// 窗口 Resize
window.addEventListener('resize', () => {
  width = viewport.clientWidth;
  height = viewport.clientHeight;
  render.canvas.width = width;
  render.canvas.height = height;
  loadMechanism(activePresetKey);
});

// 默认加载
loadMechanism('crankSlider');
