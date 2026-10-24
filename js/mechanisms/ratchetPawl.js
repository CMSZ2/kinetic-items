// 机构 06：棘轮棘爪单向步进间歇机构 (Ratchet & Pawl) - 教材第七章第四节
window.RatchetPawlMechanism = {
  nameZh: '棘轮棘爪间歇机构',
  nameEn: 'Ratchet and Pawl Mechanism',
  telemetryLabelsZh: { m1: '驱动摇杆角速度', m2: '棘轮单向累积角' },
  telemetryLabelsEn: { m1: 'Rocker Ang Vel', m2: 'Ratchet Angle' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events } = Matter;
    const originX = width / 2;
    const originY = height / 2;

    const teethCount = 16;
    const rRatchet = 75;
    const rDriverRocker = 95;

    const rockerBody = Bodies.circle(originX, originY, 40, { frictionAir: 0.02, render: { visible: false } });
    const pCenter = Constraint.create({ pointA: { x: originX, y: originY }, bodyB: rockerBody, pointB: { x: 0, y: 0 }, stiffness: 1 });

    let ratchetAngle = 0;
    let isRunning = true;
    let prevRockerAngle = 0;

    // 运动学解析：摇杆在正向摆动时推动棘齿，反向摆动时滑过齿背（止逆自锁）
    const updateRatchet = () => {
      const rockerA = Math.sin(rockerBody.angle) * 0.45; // 限制在往复小摆角内
      const delta = rockerA - prevRockerAngle;
      if (delta > 0) {
        ratchetAngle += delta; // 单向推齿
      }
      prevRockerAngle = rockerA;
    };
    Events.on(engine, 'beforeUpdate', updateRatchet);

    const canvas = document.querySelector('#viewport canvas');
    function draw() {
      if (!isRunning) return;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // 1. 绘制单向锯齿棘轮
          ctx.save();
          ctx.translate(originX, originY);
          ctx.rotate(ratchetAngle);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          const step = (Math.PI * 2) / teethCount;
          for (let i = 0; i < teethCount; i++) {
            const a0 = i * step;
            const a1 = (i + 1) * step;
            ctx.lineTo(Math.cos(a0) * rRatchet, Math.sin(a0) * rRatchet);
            ctx.lineTo(Math.cos(a1) * (rRatchet - 14), Math.sin(a1) * (rRatchet - 14));
          }
          ctx.closePath();
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // 2. 绘制驱动摇杆与棘爪
          const curRockerA = prevRockerAngle;
          ctx.save();
          ctx.translate(originX, originY);
          ctx.rotate(curRockerA);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -rDriverRocker);
          ctx.stroke();
          // 推动棘爪
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(0, -rDriverRocker, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(0, -rDriverRocker);
          ctx.lineTo(-24, -rDriverRocker + 18);
          ctx.stroke();
          ctx.restore();

          // 3. 绘制固定止逆爪 (Holding Pawl)
          ctx.save();
          ctx.translate(originX + rRatchet + 15, originY);
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-26, -12);
          ctx.stroke();
          ctx.restore();
        }
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    Composite.add(engine.world, [rockerBody, pCenter]);

    return {
      driveBody: rockerBody,
      bodiesToFriction: [rockerBody],
      destroy() {
        isRunning = false;
        Events.off(engine, 'beforeUpdate', updateRatchet);
      },
      getTelemetry() {
        return {
          v1: `${(rockerBody.angularVelocity * 60).toFixed(2)} rad/s`,
          v2: `${((ratchetAngle * 180) / Math.PI).toFixed(1)}° (单向累积)`
        };
      }
    };
  }
};
