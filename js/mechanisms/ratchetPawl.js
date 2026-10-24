// 机构 06：经典摇杆棘轮棘爪机构 (Ratchet & Pawl) - 教材标准往复摆动与弹簧止回版
window.RatchetPawlMechanism = {
  nameZh: '棘轮棘爪间歇机构',
  nameEn: 'Ratchet and Pawl Mechanism',
  telemetryLabelsZh: { m1: '主动摆杆摆动频率', m2: '棘轮单向累积角' },
  telemetryLabelsEn: { m1: 'Rocker Frequency', m2: 'Ratchet Index Ang' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events, Body } = Matter;
    const originX = width / 2;
    const originY = height / 2 + 20;

    const teethCount = 18;
    const rOuter = 82;   // 齿顶圆半径
    const rInner = 64;   // 齿根圆半径
    const toothStep = (Math.PI * 2) / teethCount;

    // 1. 摆杆与手柄尺寸 (长摆杆，握把在最顶端)
    const rockerLength = 175; // 超长主动摆杆
    const pawlHingeDist = 100; // 主动棘爪铰接在腰部 (齿顶圆外围)

    // 物理刚体：用作摆杆交互
    const rocker = Bodies.circle(originX, originY, 40, { frictionAir: 0.02, render: { visible: false } });
    const pCenter = Constraint.create({ pointA: { x: originX, y: originY }, bodyB: rocker, pointB: { x: 0, y: 0 }, stiffness: 1 });

    let isRunning = true;
    let ratchetAngle = 0; // 棘轮单向累积旋转角度
    let prevRockerAngle = 0;
    let autoOscillatePhase = 0;
    let isPawlEngaged = false;

    // 2. 止回棘爪固定支承点 (带弹簧顶紧)
    const holdPivotX = originX + rOuter + 22;
    const holdPivotY = originY + 25;

    // 核心往复与单向推齿动力学
    const updateRatchet = () => {
      // 电机模式下：摆杆往复摆动 (类似牛头刨床摇臂或棘轮扳手自动打油)
      if (window.isMotorRunning) {
        autoOscillatePhase += 0.05;
        // 摆动范围在 -28° 到 +28° 之间往复
        const targetA = Math.sin(autoOscillatePhase) * 0.45;
        Body.setAngle(rocker, targetA);
        Body.setAngularVelocity(rocker, Math.cos(autoOscillatePhase) * 0.05);
      }

      const curA = rocker.angle;
      const delta = curA - prevRockerAngle;
      prevRockerAngle = curA;

      // 顺时针摆动：主动棘爪推齿前进
      if (delta > 0) {
        ratchetAngle += delta;
        isPawlEngaged = true;
      } else {
        // 逆时针回程：主动爪滑回，止回爪把棘轮死死卡住，棘轮角度绝对锁定！
        isPawlEngaged = false;
      }
    };
    Events.on(engine, 'beforeUpdate', updateRatchet);

    // 3. 高精度 Canvas 实体绘制
    const canvas = document.querySelector('#viewport canvas');
    function draw() {
      if (!isRunning) return;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();

          // A. 绘制金黄色单向锯齿棘轮
          ctx.save();
          ctx.translate(originX, originY);
          ctx.rotate(ratchetAngle);

          // 棘轮齿廓
          ctx.strokeStyle = '#ffffff';
          ctx.fillStyle = '#1c1f24';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i < teethCount; i++) {
            const a0 = i * toothStep;
            const a1 = (i + 1) * toothStep;
            ctx.lineTo(Math.cos(a0) * rOuter, Math.sin(a0) * rOuter); // 垂直推力工作齿面
            ctx.lineTo(Math.cos(a1) * rInner, Math.sin(a1) * rInner); // 平缓滑行齿背面
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 齿轮中心衬套与沉孔
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.strokeStyle = '#64748b';
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.restore();

          // B. 绘制带压缩弹簧的机架止回棘爪 (Anti-Reverse Pawl)
          // 算出当前与止回爪对应的齿背起伏深度
          const holdAngle = Math.atan2(holdPivotY - originY, holdPivotX - originX) - ratchetAngle;
          const phaseHold = (holdAngle % toothStep + toothStep) % toothStep;
          const liftH = (phaseHold / toothStep);
          const holdTipR = rInner + (rOuter - rInner) * liftH;
          const holdTipX = originX + holdTipR * Math.cos(ratchetAngle + holdAngle - 0.08);
          const holdTipY = originY + holdTipR * Math.sin(ratchetAngle + holdAngle - 0.08);

          ctx.save();
          // 机架固定支承座
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(holdPivotX, holdPivotY, 6, 0, Math.PI * 2);
          ctx.stroke();

          // 止回爪体 (粗壮弯钩)
          ctx.strokeStyle = isPawlEngaged ? '#38bdf8' : '#f87171'; // 锁死时微红警示
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(holdPivotX, holdPivotY);
          ctx.lineTo(holdTipX, holdTipY);
          ctx.stroke();

          // 弹性预紧弹簧绘制 (锯齿弹簧)
          ctx.save();
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          const spX = holdPivotX + 18;
          const spY = holdPivotY + 12;
          ctx.moveTo(holdPivotX, holdPivotY);
          ctx.lineTo(spX, spY);
          ctx.stroke();
          ctx.restore();

          ctx.restore();

          // C. 绘制主动长摆杆与主动棘爪 (图 1 标准结构)
          ctx.save();
          ctx.translate(originX, originY);
          ctx.rotate(rocker.angle);

          // 1. 超长金属主动摆杆 (杆身)
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -rockerLength);
          ctx.stroke();

          // 2. 摆杆顶端精密手摇旋钮握把 (位于主动爪上方，手拉把手)
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(0, -rockerLength, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // 3. 摆杆腰部铰链座
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, -pawlHingeDist, 4, 0, Math.PI * 2);
          ctx.fill();

          // 4. 主动棘爪 (从摆杆腰部下垂并钩向齿槽)
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(0, -pawlHingeDist);
          ctx.lineTo(-26, -pawlHingeDist + 22);
          ctx.stroke();

          // 抓取提示文字
          ctx.fillStyle = '#64748b';
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText('ROCKER HANDLE [PUMP BACK & FORTH]', -90, -rockerLength - 16);

          ctx.restore();

          ctx.restore();
        }
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    Composite.add(engine.world, [rocker, pCenter]);

    return {
      driveBody: rocker,
      bodiesToFriction: [rocker],
      destroy() {
        isRunning = false;
        Events.off(engine, 'beforeUpdate', updateRatchet);
      },
      getTelemetry() {
        const deg = (((ratchetAngle * 180 / Math.PI) % 360 + 360) % 360).toFixed(1);
        return {
          v1: `${(Math.abs(rocker.angularVelocity) * 60).toFixed(1)} RPM (往复)`,
          v2: `${deg}° [${isPawlEngaged ? '主动爪推齿' : '止回爪锁死'}]`
        };
      }
    };
  }
};
