// 机构 07：摆动导杆急回机构 (Oscillating Quick-Return) - 教材第七章第二节
window.QuickReturnMechanism = {
  nameZh: '摆动导杆急回机构',
  nameEn: 'Quick-Return Mechanism',
  telemetryLabelsZh: { m1: '曲柄角速度', m2: '导杆摆角 (急回比 K=1.4)' },
  telemetryLabelsEn: { m1: 'Crank Ang Vel', m2: 'Lever Oscillation' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events } = Matter;
    const originX = width / 2;
    const originY = height / 2;

    const crankPivotY = originY + 30; // 曲柄固定中心
    const leverPivotY = originY + 130; // 导杆回转支座（在曲柄下方）
    const rCrank = 48; // 曲柄长度
    const lLever = 250; // 摆动导杆长度

    const crank = Bodies.circle(originX, crankPivotY, rCrank, { frictionAir: 0.02, render: { visible: false } });
    const pCrank = Constraint.create({ pointA: { x: originX, y: crankPivotY }, bodyB: crank, pointB: { x: 0, y: 0 }, stiffness: 1 });

    let isRunning = true;
    let leverAngle = 0;

    // 运动学解析：滑块在导杆槽内滑动，产生急回特性
    const updateQuickReturn = () => {
      const pinX = originX + rCrank * Math.cos(crank.angle);
      const pinY = crankPivotY + rCrank * Math.sin(crank.angle);
      leverAngle = Math.atan2(pinX - originX, leverPivotY - pinY);
    };
    Events.on(engine, 'beforeUpdate', updateQuickReturn);

    const canvas = document.querySelector('#viewport canvas');
    function draw() {
      if (!isRunning) return;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // 1. 曲柄与滑块圆销
          const pinX = originX + rCrank * Math.cos(crank.angle);
          const pinY = crankPivotY + rCrank * Math.sin(crank.angle);

          ctx.save();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(originX, crankPivotY, rCrank, 0, Math.PI * 2);
          ctx.stroke();

          // 曲柄臂
          ctx.beginPath();
          ctx.moveTo(originX, crankPivotY);
          ctx.lineTo(pinX, pinY);
          ctx.stroke();

          // 滑块块体
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(pinX - 7, pinY - 7, 14, 14);
          ctx.restore();

          // 2. 长导杆（带导槽）
          ctx.save();
          ctx.translate(originX, leverPivotY);
          ctx.rotate(-leverAngle);
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -lLever);
          ctx.stroke();
          // 导杆下端支座
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // 3. 机架固定轴线参考
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = '#334155';
          ctx.beginPath();
          ctx.moveTo(originX, crankPivotY);
          ctx.lineTo(originX, leverPivotY);
          ctx.stroke();
          ctx.restore();
        }
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    Composite.add(engine.world, [crank, pCrank]);

    return {
      driveBody: crank,
      bodiesToFriction: [crank],
      destroy() {
        isRunning = false;
        Events.off(engine, 'beforeUpdate', updateQuickReturn);
      },
      getTelemetry() {
        return {
          v1: `${(crank.angularVelocity * 60).toFixed(2)} rad/s`,
          v2: `${((leverAngle * 180) / Math.PI).toFixed(1)}° (急速返回区)`
        };
      }
    };
  }
};
