// 机构 06：棘轮棘爪单向步进机构 (Ratchet & Pawl) - 物理级防逆爪动态版
window.RatchetPawlMechanism = {
  nameZh: '棘轮棘爪间歇机构',
  nameEn: 'Ratchet and Pawl Mechanism',
  telemetryLabelsZh: { m1: '摇杆输入转速', m2: '棘轮止逆状态' },
  telemetryLabelsEn: { m1: 'Rocker Speed', m2: 'Pawl Status' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events } = Matter;
    const originX = width / 2;
    const originY = height / 2;

    const teethCount = 14;
    const rOuter = 78;   // 齿顶圆半径
    const rInner = 60;   // 齿根圆半径
    const toothStep = (Math.PI * 2) / teethCount;

    // 驱动摇杆刚体
    const rocker = Bodies.circle(originX, originY, 40, { frictionAir: 0.02, render: { visible: false } });
    const pCenter = Constraint.create({ pointA: { x: originX, y: originY }, bodyB: rocker, pointB: { x: 0, y: 0 }, stiffness: 1 });

    let isRunning = true;
    let ratchetAngle = 0; // 棘轮单向累积角
    let prevRockerAngle = rocker.angle;
    let isReversingLocked = false;

    // 止逆爪铰支座 (机架固定点)
    const holdPivotX = originX + rOuter + 22;
    const holdPivotY = originY - 12;

    // 核心物理交互与止逆运动学解算
    const updateRatchet = () => {
      const curA = rocker.angle;
      const delta = curA - prevRockerAngle;
      prevRockerAngle = curA;

      if (delta > 0) {
        // 顺时针正向推进
        ratchetAngle += delta;
        isReversingLocked = false;
      } else if (delta < -0.0001) {
        // 逆时针倒转：止逆爪锁死在当前齿槽内，棘轮绝对不动！
        isReversingLocked = true;
      }
    };
    Events.on(engine, 'beforeUpdate', updateRatchet);

    const canvas = document.querySelector('#viewport canvas');
    function draw() {
      if (!isRunning) return;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();

          // 1. 绘制单向直角锯齿棘轮
          ctx.save();
          ctx.translate(originX, originY);
          ctx.rotate(ratchetAngle);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i < teethCount; i++) {
            const a0 = i * toothStep;
            const a1 = (i + 1) * toothStep;
            ctx.lineTo(Math.cos(a0) * rOuter, Math.sin(a0) * rOuter); // 垂直推力面
            ctx.lineTo(Math.cos(a1) * rInner, Math.sin(a1) * rInner); // 平缓滑行斜面
          }
          ctx.closePath();
          ctx.stroke();

          // 轮芯轴承
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.strokeStyle = '#64748b';
          ctx.stroke();
          ctx.restore();

          // 2. 解算机架止逆爪 (Holding Pawl) 的真实接触贴齿抬起动画 (杜绝穿模)
          // 算出当前与止逆爪对齐的轮齿瞬时局部相位
          const pawlRelAngle = Math.atan2(holdPivotY - originY, holdPivotX - originX) - ratchetAngle;
          let normalizedA = (pawlRelAngle % toothStep + toothStep) % toothStep;
          // 爪尖所在半径：沿齿背斜坡线性抬起，到顶瞬间跌落
          const tipRadius = rInner + (rOuter - rInner) * (normalizedA / toothStep);
          const contactA = ratchetAngle + pawlRelAngle - (normalizedA * 0.15);
          const tipX = originX + tipRadius * Math.cos(contactA);
          const tipY = originY + tipRadius * Math.sin(contactA);

          // 绘制机架止逆爪
          ctx.save();
          // 机架固定座
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(holdPivotX, holdPivotY, 5, 0, Math.PI * 2);
          ctx.stroke();

          // 止逆爪身 (牢牢顶在齿面上，随齿背真实起伏跳动)
          ctx.strokeStyle = isReversingLocked ? '#f87171' : '#38bdf8';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(holdPivotX, holdPivotY);
          ctx.lineTo(tipX, tipY);
          ctx.stroke();

          // 爪尖倒钩
          ctx.fillStyle = isReversingLocked ? '#f87171' : '#38bdf8';
          ctx.beginPath();
          ctx.arc(tipX, tipY, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // 3. 绘制主动摇杆与驱动推爪 (Driving Arm & Pawl)
          ctx.save();
          ctx.translate(originX, originY);
          ctx.rotate(rocker.angle);
          
          // 摇杆粗壮臂身
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -96);
          ctx.stroke();

          // 摇杆末端铰链
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, -96, 4, 0, Math.PI * 2);
          ctx.fill();

          // 推动爪 (Driving Pawl) 爪身
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -96);
          ctx.lineTo(-24, -76);
          ctx.stroke();
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
          v1: `${(rocker.angularVelocity * 60).toFixed(2)} rad/s`,
          v2: `${deg}° [${isReversingLocked ? '止逆爪闭锁抵紧' : '推爪正常步进'}]`
        };
      }
    };
  }
};
