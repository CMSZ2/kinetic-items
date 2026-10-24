// 机构 06：棘轮棘爪单向步进锁止机构 (Ratchet & Pawl) - 单向不可逆真实版
window.RatchetPawlMechanism = {
  nameZh: '棘轮棘爪间歇机构',
  nameEn: 'Ratchet and Pawl Mechanism',
  telemetryLabelsZh: { m1: '摇杆输入转速', m2: '棘轮锁止状态' },
  telemetryLabelsEn: { m1: 'Rocker Speed', m2: 'Ratchet Lock State' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events } = Matter;
    const originX = width / 2;
    const originY = height / 2;

    const teethCount = 14;
    const rOuter = 76;   // 棘齿齿顶半径
    const rInner = 60;   // 棘齿齿根半径
    const stepAngle = (Math.PI * 2) / teethCount;

    // 驱动摇杆刚体
    const rocker = Bodies.circle(originX, originY, 40, { frictionAir: 0.02, render: { visible: false } });
    const pCenter = Constraint.create({ pointA: { x: originX, y: originY }, bodyB: rocker, pointB: { x: 0, y: 0 }, stiffness: 1 });

    let isRunning = true;
    let ratchetAngle = 0; // 棘轮单向累积角度 (只能单向增加，绝不可回退)
    let prevRockerAngle = rocker.angle;
    let isLocked = true;

    // 核心物理逻辑：单向传递与自锁
    const updateRatchetPhysics = () => {
      const curA = rocker.angle;
      const delta = curA - prevRockerAngle;
      prevRockerAngle = curA;

      // 顺时针转动推动棘轮前进
      if (delta > 0) {
        ratchetAngle += delta;
        isLocked = false;
      } else {
        // 逆时针倒转：止逆爪自锁死卡，棘轮角度绝对锁死不动！
        isLocked = true;
      }
    };
    Events.on(engine, 'beforeUpdate', updateRatchetPhysics);

    const canvas = document.querySelector('#viewport canvas');
    function draw() {
      if (!isRunning) return;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();

          // 1. 绘制单向直齿锯齿棘轮 (Ratchet Wheel)
          ctx.save();
          ctx.translate(originX, originY);
          ctx.rotate(ratchetAngle);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i < teethCount; i++) {
            const a0 = i * stepAngle;
            const a1 = (i + 1) * stepAngle;
            // 陡峭推进受力面 -> 平缓滑行齿背面
            ctx.lineTo(Math.cos(a0) * rOuter, Math.sin(a0) * rOuter);
            ctx.lineTo(Math.cos(a1) * rInner, Math.sin(a1) * rInner);
          }
          ctx.closePath();
          ctx.stroke();

          // 棘轮轴心
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.strokeStyle = '#94a3b8';
          ctx.stroke();
          ctx.restore();

          // 2. 绘制摆动驱动摇杆与推动爪 (Driving Pawl)
          ctx.save();
          ctx.translate(originX, originY);
          ctx.rotate(rocker.angle);
          // 摇杆臂
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -96);
          ctx.stroke();

          // 驱动爪铰链点与爪身
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(0, -96, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(0, -96);
          ctx.lineTo(-24, -76); // 爪尖卡入齿内
          ctx.stroke();
          ctx.restore();

          // 3. 绘制固定在机架上的止逆爪 (Holding / Anti-Reverse Pawl)
          const holdPivotX = originX + rOuter + 14;
          const holdPivotY = originY - 10;
          ctx.save();
          ctx.translate(holdPivotX, holdPivotY);
          // 机架固定座
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.stroke();

          // 止逆爪爪身 (牢牢顶在右侧齿根)
          ctx.strokeStyle = isLocked ? '#f87171' : '#38bdf8'; // 锁止时微红警示
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-22, 10);
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
        Events.off(engine, 'beforeUpdate', updateRatchetPhysics);
      },
      getTelemetry() {
        const deg = (((ratchetAngle * 180 / Math.PI) % 360 + 360) % 360).toFixed(1);
        return {
          v1: `${(rocker.angularVelocity * 60).toFixed(2)} rad/s`,
          v2: `${deg}° [${isLocked ? '止逆爪闭锁中' : '驱动爪推齿前进'}]`
        };
      }
    };
  }
};
