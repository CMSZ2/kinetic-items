// 机构 09：周转行星齿轮系 (Planetary Gear System) - 教材第八章第四节
window.PlanetaryGearsMechanism = {
  nameZh: '周转行星齿轮系',
  nameEn: 'Epicyclic Planetary Gear Train',
  telemetryLabelsZh: { m1: '太阳轮角速度', m2: '行星架转速 (减速比 4:1)' },
  telemetryLabelsEn: { m1: 'Sun Gear Vel', m2: 'Carrier Vel (i = 4.0)' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events } = Matter;
    const originX = width / 2;
    const originY = height / 2;

    const rSun = 36;      // 太阳轮齿数 zs = 18
    const rPlanet = 36;   // 行星轮齿数 zp = 18
    const rRing = 108;    // 外齿圈齿数 zr = zs + 2*zp = 54
    const rCarrier = rSun + rPlanet; // 72

    const sunGear = Bodies.circle(originX, originY, rSun, { frictionAir: 0.02, render: { visible: false } });
    const pSun = Constraint.create({ pointA: { x: originX, y: originY }, bodyB: sunGear, pointB: { x: 0, y: 0 }, stiffness: 1 });

    let isRunning = true;
    let carrierAngle = 0;
    let planetSpinAngle = 0;

    // 转化轮系法解析：齿圈固定时，行星架减速比 i = 1 + zr / zs = 1 + 3 = 4
    const ratioCarrier = 0.25;
    const updatePlanetary = () => {
      carrierAngle = sunGear.angle * ratioCarrier;
      planetSpinAngle = -sunGear.angle * (rSun / rPlanet);
    };
    Events.on(engine, 'beforeUpdate', updatePlanetary);

    const canvas = document.querySelector('#viewport canvas');
    function draw() {
      if (!isRunning) return;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // 1. 固定外内齿圈 (Ring Gear)
          ctx.save();
          ctx.translate(originX, originY);
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, rRing, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([4, 4]);
          ctx.arc(0, 0, rRing + 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // 2. 行星架 (Carrier) - 承载 3 个互成 120° 的行星轮
          ctx.save();
          ctx.translate(originX, originY);
          ctx.rotate(carrierAngle);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          for (let i = 0; i < 3; i++) {
            const ca = (i * Math.PI * 2) / 3;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(ca) * rCarrier, Math.sin(ca) * rCarrier);
            ctx.stroke();
          }
          ctx.restore();

          // 3. 绘制 3 个行星轮 (Planets)
          for (let i = 0; i < 3; i++) {
            const pArmAngle = carrierAngle + (i * Math.PI * 2) / 3;
            const px = originX + Math.cos(pArmAngle) * rCarrier;
            const py = originY + Math.sin(pArmAngle) * rCarrier;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(planetSpinAngle);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(0, 0, rPlanet, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#38bdf8';
            ctx.fill();
            ctx.restore();
          }

          // 4. 中心太阳轮 (Sun)
          ctx.save();
          ctx.translate(originX, originY);
          ctx.rotate(sunGear.angle);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, rSun, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
          ctx.moveTo(0, -12); ctx.lineTo(0, 12);
          ctx.stroke();
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
          v2: `${wc} rad/s (减速增扭)`
        };
      }
    };
  }
};
