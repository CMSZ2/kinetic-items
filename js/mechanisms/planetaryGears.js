// 机构 09：周转行星齿轮系 (Planetary Gear System) - 精密轮齿与差速咬合版
window.PlanetaryGearsMechanism = {
  nameZh: '周转行星齿轮系',
  nameEn: 'Epicyclic Planetary Gear Train',
  telemetryLabelsZh: { m1: '太阳轮自转速度', m2: '行星架输出速度 (4:1减速)' },
  telemetryLabelsEn: { m1: 'Sun Gear Vel', m2: 'Carrier Vel (i=4.0)' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events } = Matter;
    const originX = width / 2;
    const originY = height / 2;

    // 齿轮参数：模数 m = 4
    const zs = 16;  // 太阳轮齿数
    const zp = 16;  // 行星轮齿数
    const zr = 48;  // 内齿圈齿数 (zr = zs + 2*zp = 48)
    const rs = 38;  // 太阳轮节圆半径
    const rp = 38;  // 行星轮节圆半径
    const rCarrier = rs + rp; // 76
    const rr = rs + 2 * rp;   // 114

    const sunGear = Bodies.circle(originX, originY, rs, { frictionAir: 0.02, render: { visible: false } });
    const pSun = Constraint.create({ pointA: { x: originX, y: originY }, bodyB: sunGear, pointB: { x: 0, y: 0 }, stiffness: 1 });

    let isRunning = true;
    let carrierAngle = 0;
    let planetSelfSpin = 0;

    // 转化轮系法：固定内齿圈，减速比 i = 1 + zr / zs = 1 + 48/16 = 4.0
    const ratioCarrier = 0.25;
    const updatePlanetary = () => {
      carrierAngle = sunGear.angle * ratioCarrier;
      // 行星轮相对自身的绝对转角
      planetSelfSpin = -sunGear.angle * (zs / zp);
    };
    Events.on(engine, 'beforeUpdate', updatePlanetary);

    // 精密齿廓绘制函数
    const drawGearTeeth = (ctx, x, y, radius, teeth, angle, color) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const step = (Math.PI * 2) / teeth;
      for (let i = 0; i < teeth; i++) {
        const a0 = i * step;
        const a1 = a0 + step * 0.28;
        const a2 = a0 + step * 0.52;
        const a3 = a0 + step * 0.76;
        const a4 = (i + 1) * step;
        ctx.lineTo(Math.cos(a0) * (radius - 5), Math.sin(a0) * (radius - 5));
        ctx.lineTo(Math.cos(a1) * (radius + 5), Math.sin(a1) * (radius + 5));
        ctx.lineTo(Math.cos(a2) * (radius + 5), Math.sin(a2) * (radius + 5));
        ctx.lineTo(Math.cos(a3) * (radius - 5), Math.sin(a3) * (radius - 5));
        ctx.lineTo(Math.cos(a4) * (radius - 5), Math.sin(a4) * (radius - 5));
      }
      ctx.closePath();
      ctx.stroke();

      // 轴心基准
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    const canvas = document.querySelector('#viewport canvas');
    function draw() {
      if (!isRunning) return;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();

          // 1. 绘制固定外内齿圈 (向内凸齿)
          ctx.save();
          ctx.translate(originX, originY);
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(0, 0, rr + 12, 0, Math.PI * 2);
          ctx.stroke();
          // 内齿廓示意
          const ringTeeth = zr;
          const rstep = (Math.PI * 2) / ringTeeth;
          ctx.beginPath();
          for (let i = 0; i < ringTeeth; i++) {
            const a0 = i * rstep;
            const a1 = a0 + rstep * 0.5;
            ctx.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
            ctx.lineTo(Math.cos(a1) * (rr - 5), Math.sin(a1) * (rr - 5));
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();

          // 2. 绘制星形三臂行星架 (Carrier)
          ctx.save();
          ctx.translate(originX, originY);
          ctx.rotate(carrierAngle);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          for (let i = 0; i < 3; i++) {
            const armA = (i * Math.PI * 2) / 3;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(armA) * rCarrier, Math.sin(armA) * rCarrier);
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // 3. 绘制 3 个行星轮 (均带精密齿)
          for (let i = 0; i < 3; i++) {
            const armA = carrierAngle + (i * Math.PI * 2) / 3;
            const px = originX + Math.cos(armA) * rCarrier;
            const py = originY + Math.sin(armA) * rCarrier;
            drawGearTeeth(ctx, px, py, rp, zp, planetSelfSpin + armA, '#ffffff');
          }

          // 4. 绘制中心太阳轮 (Sun Gear)
          drawGearTeeth(ctx, originX, originY, rs, zs, sunGear.angle, '#f8fafc');

          ctx.restore();
        }
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    Composite.add(engine.world, [sunGear, pSun]);

    return {
      driveBody: sunGear,
      bodiesToFriction: [sunGear],
      destroy() {
        isRunning = false;
        Events.off(engine, 'beforeUpdate', updatePlanetary);
      },
      getTelemetry() {
        const ws = (sunGear.angularVelocity * 60).toFixed(2);
        const wc = (sunGear.angularVelocity * 60 * ratioCarrier).toFixed(2);
        return {
          v1: `${ws} rad/s`,
          v2: `${wc} rad/s (i = 4.0)`
        };
      }
    };
  }
};
