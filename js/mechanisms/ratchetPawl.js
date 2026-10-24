// 机构 06：棘轮棘爪单向步进机构 (Ratchet & Pawl) - 单杆手摇一体化版
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
    const rOuter = 80;   // 齿顶圆
    const rInner = 62;   // 齿根圆
    const toothStep = (Math.PI * 2) / teethCount;

    // 摇杆刚体：作为手摇输入构件
    const rocker = Bodies.circle(originX, originY, 55, { frictionAir: 0.02, render: { visible: false } });
    const pCenter = Constraint.create({ pointA: { x: originX, y: originY }, bodyB: rocker, pointB: { x: 0, y: 0 }, stiffness: 1 });

    let isRunning = true;
    let ratchetAngle = 0;
    let prevRockerAngle = rocker.angle;
    let isReversingLocked = false;

    // 机架固定止逆爪铰支点
    const holdPivotX = originX + rOuter + 20;
    const holdPivotY = originY - 14;

    const updateRatchet = () => {
      const curA = rocker.angle;
      const delta = curA - prevRockerAngle;
      prevRockerAngle = curA;

      if (delta > 0) {
        ratchetAngle += delta;
        isReversingLocked = false;
      } else if (delta < -0.0001) {
        // 逆向倒转瞬间锁死
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

          // 1. 绘制单向锯齿棘轮
          ctx.save();
          ctx.translate(originX, originY);
          ctx.rotate(ratchetAngle);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i < teethCount; i++) {
            const a0 = i * toothStep;
            const a1 = (i + 1) * toothStep;
            ctx.lineTo(Math.cos(a0) * rOuter, Math.sin(a0) * rOuter);
            ctx.lineTo(Math.cos(a1) * rInner, Math.sin(a1) * rInner);
          }
          ctx.closePath();
          ctx.stroke();

          // 轴承孔
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.strokeStyle = '#64748b';
          ctx.stroke();
          ctx.restore();

          // 2. 机架止逆限位爪
          const pawlRelAngle = Math.atan2(holdPivotY - originY, holdPivotX - originX) - ratchetAngle;
          let normA = (pawlRelAngle % toothStep + toothStep) % toothStep;
          const tipRadius = rInner + (rOuter - rInner) * (normA / toothStep);
          const contactA = ratchetAngle + pawlRelAngle - (normA * 0.12);
          const tipX = originX + tipRadius * Math.cos(contactA);
          const tipY = originY + tipRadius * Math.sin(contactA);

          ctx.save();
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(holdPivotX, holdPivotY, 5, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = isReversingLocked ? '#f87171' : '#38bdf8';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(holdPivotX, holdPivotY);
          ctx.lineTo(tipX, tipY);
          ctx.stroke();
          ctx.restore();

          // 3. 唯一的驱动长摇臂 (手柄与推爪合二为一，消除双杆重叠)
          ctx.save();
          ctx.translate(originX, originY);
          ctx.rotate(rocker.angle);

          // 摇臂主体
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -95);
          ctx.stroke();

          // 摇臂顶端推爪 (Driving Pawl)
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -95);
          ctx.lineTo(-24, -75);
          ctx.stroke();

          // 摇臂末端操作握把 (直接作为手摇抓取点)
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(0, -95, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
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
