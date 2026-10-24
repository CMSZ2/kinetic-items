// 全局调度总成：管理物理视口、机构动态切换、语言系统与动力驱动
const { Engine, Render, Runner, Composite, Mouse, MouseConstraint, Body } = Matter;

const viewport = document.getElementById('viewport');
let width = viewport.clientWidth;
let height = viewport.clientHeight;

// 1. 初始化引擎与渲染
const engine = Engine.create();
engine.gravity.y = 0; // 平面机构运动

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

// 2. 机构管理系统
const presets = {
  crankSlider: window.CrankSliderMechanism,
  fourBar: window.FourBarMechanism
};

let activePresetKey = 'crankSlider';
let activeInstance = null;
let mouseConstraint = null;

function loadMechanism(key) {
  // 清理上一套机构
  Composite.clear(engine.world, false);
  activePresetKey = key;

  // 重新绑定鼠标
  const mouse = Mouse.create(render.canvas);
  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { stiffness: 0.2, render: { visible: false } }
  });
  Composite.add(engine.world, mouseConstraint);
  render.mouse = mouse;

  // 初始化对应机构
  activeInstance = presets[key].init(engine, width, height);

  // 同步刷新当前阻尼滑块值
  const f = parseFloat(document.getElementById('frictionSlider').value);
  activeInstance.bodiesToFriction.forEach(b => b.frictionAir = f);

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
    document.getElementById('angVel').innerText = data.v1;
    document.getElementById('dispVal').innerText = data.v2;
  }
});

// 4. 国际化字典
let currentLang = 'zh';
const dict = {
  zh: {
    subTitle: '机械动力学仿真沙盒',
    statusMotorOn: '状态: 动力源运行中 / 支持鼠标拖拽',
    statusMotorOff: '状态: 手动模式 / 按住构件拖动',
    sec0: '00 / 经典机构预设 (教材第七章)',
    sec1: '01 / 驱动单元',
    motorOn: '电机状态: 已接入驱动',
    motorOff: '电机状态: 空挡 (手动拨动)',
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
    sec0: '00 / MECHANISM PRESETS (CHAPTER 7)',
    sec1: '01 / DRIVE UNIT',
    motorOn: 'MOTOR: ENGAGED',
    motorOff: 'MOTOR: DISENGAGED (MANUAL)',
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

  document.getElementById('headerSub').innerText = t.subTitle;
  document.getElementById('sysStatus').innerText = isMotorOn ? t.statusMotorOn : t.statusMotorOff;
  document.getElementById('sec0Title').innerText = t.sec0;
  document.getElementById('sec1Title').innerText = t.sec1;
  document.getElementById('motorBtn').innerText = isMotorOn ? t.motorOn : t.motorOff;
  document.getElementById('sec2Title').innerText = t.sec2;
  document.getElementById('rpmLabel').innerText = t.rpm;
  document.getElementById('frictionLabel').innerText = t.friction;
  document.getElementById('sec3Title').innerText = t.sec3;
  document.getElementById('footerCore').innerText = t.footerCore;

  // 动态读取当前机构特定的术语
  document.getElementById('angVelLabel').innerText = lang === 'zh' ? p.telemetryLabelsZh.m1 : p.telemetryLabelsEn.m1;
  document.getElementById('dispLabel').innerText = lang === 'zh' ? p.telemetryLabelsZh.m2 : p.telemetryLabelsEn.m2;
  document.getElementById('footerType').innerText = lang === 'zh' ? `机构形式: ${p.nameZh}` : `TYPE: ${p.nameEn}`;

  document.getElementById('langZh').classList.toggle('active', lang === 'zh');
  document.getElementById('langEn').classList.toggle('active', lang === 'en');
}

// 5. 事件绑定
document.getElementById('btnPresetCrank').addEventListener('click', (e) => {
  document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  loadMechanism('crankSlider');
});

document.getElementById('btnPresetFourBar').addEventListener('click', (e) => {
  document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  loadMechanism('fourBar');
});

document.getElementById('langZh').addEventListener('click', () => updateLanguage('zh'));
document.getElementById('langEn').addEventListener('click', () => updateLanguage('en'));

const motorBtn = document.getElementById('motorBtn');
motorBtn.addEventListener('click', () => {
  isMotorOn = !isMotorOn;
  motorBtn.classList.toggle('active', isMotorOn);
  updateLanguage(currentLang);
});

const rpmSlider = document.getElementById('rpmSlider');
rpmSlider.addEventListener('input', (e) => {
  targetRpm = parseFloat(e.target.value);
  document.getElementById('rpmVal').innerText = `${targetRpm} RPM`;
});

const frictionSlider = document.getElementById('frictionSlider');
frictionSlider.addEventListener('input', (e) => {
  const f = parseFloat(e.target.value);
  if (activeInstance && activeInstance.bodiesToFriction) {
    activeInstance.bodiesToFriction.forEach(b => b.frictionAir = f);
  }
  document.getElementById('frictionVal').innerText = f.toFixed(3);
});

window.addEventListener('resize', () => {
  width = viewport.clientWidth;
  height = viewport.clientHeight;
  render.canvas.width = width;
  render.canvas.height = height;
  loadMechanism(activePresetKey);
});

// 初次加载默认机构
loadMechanism('crankSlider');
