// 机构 08：直齿轮齿条传动机构 (Rack and Pinion) - 教材第八章第三节
window.RackPinionMechanism = {
  nameZh: '齿轮齿条传动机构',
  nameEn: 'Rack and Pinion Mechanism',
  telemetryLabelsZh: { m1: '齿轮角速度', m2: '齿条线性位移' },
  telemetryLabelsEn: { m1: 'Pinion Ang Vel', m2: 'Rack Displacement' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events } = Matter;
    const originX = width / 2;
    const originY = height / 2;

    const rPinion = 50; // 分度圆半径
    const pinionX = originX;
    const pinionY = originY - 40;
    const rackY = pinionY + rPinion; // 齿条节线严格相切

    const pinion = Bodies.circle(pinionX, pinionY, rPinion, { frictionAir: 0.02, render: { visible: false } });
    const pPinion = Constraint.create({ pointA: { x: pinionX, y: pinionY }, bodyB: pinion, pointB: { x: 0, y: 0 }, stiffness: 1 });

    let isRunning = true;
    let rackDispX = 0;

    // 运动学解析：纯滚动无滑移 x = r * theta
    const updateRack = () => {
      rackDispX = -(pinion.angle * rPinion);
    };
    Events.on(engine, 'beforeUpdate', updateRack);

    const canvas = document.querySelector('#viewport canvas');
    function draw() {
      if (!isRunning) return;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // 1. 绘制小齿轮
          ctx.save();
          ctx.translate(pinionX, pinionY);
          ctx.rotate(pinion.angle);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          const teeth = 18;
          const step = (Math.PI * 2) / teeth;
          for (let i = 0; i < teeth; i++) {
            const a0 = i * step;
            const a1 = a0 + step * 0.3;
            const a2 = a0 + step * 0.5;
            const a3 = a0 + step * 0.8;
            const a4 = (i + 1) * step;
            ctx.lineTo(Math.cos(a0) * 44, Math.sin(a0) * 44);
            ctx.lineTo(Math.cos(a1) * 55, Math.sin(a1) * 55);
            ctx.lineTo(Math.cos(a2) * 55, Math.sin(a2) * 55);
            ctx.lineTo(Math.cos(a3) * 44, Math.sin(a3) * 44);
            ctx.lineTo(Math.cos(a4) * 44, Math.sin(a4) * 44);
          }
          ctx.closePath();
          ctx.stroke();
          // 分度圆与中心十字
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = '#475569';
          ctx.beginPath();
          ctx.arc(0, 0, rPinion, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // 2. 绘制移动齿条
          ctx.save();
          const rx = originX + (rackDispX % 300); // 视觉平移
          ctx.translate(rx, rackY);
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          const rackWidth = 400;
          const pitch = (Math.PI * 2 * rPinion) / teeth; // 齿距
          ctx.moveTo(-rackWidth / 2, 20);
          ctx.lineTo(rackWidth / 2, 20);
          ctx.lineTo(rackWidth / 2, 0);
          for (let x = rackWidth / 2; x >= -rackWidth / 2; x -= pitch) {
            ctx.lineTo(x, 0);
            ctx.lineTo(x - pitch * 0.25, -11);
            ctx.lineTo(x - pitch * 0.55, -11);
            ctx.lineTo(x - pitch * 0.8, 0);
          }
          ctx.lineTo(-rackWidth / 2, 20);
          ctx.stroke();

          // 齿条水平滑动导轨标线
          ctx.strokeStyle = '#1e2631';
          ctx.strokeRect(-rackWidth / 2 - 20, 24, rackWidth + 40, 4);
          ctx.restore();
        }
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    Composite.add(engine.world, [pinion, pPinion]);

    return {
      driveBody: pinion,
      bodiesToFriction: [pinion],
      destroy() {
        isRunning = false;
        Events.off(engine, 'beforeUpdate', updateRack);
      },
      getTelemetry() {
        return {
          v1: `${(pinion.angularVelocity * 60).toFixed(2)} rad/s`,
          v2: `${rackDispX.toFixed(1)} px`
        };
      }
    };
  }
};
