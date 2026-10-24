// 机构 05：日内瓦槽轮间歇机构 (Geneva Drive) - 教材第七章第四节
window.GenevaDriveMechanism = {
  nameZh: '日内瓦槽轮间歇机构',
  nameEn: 'Geneva Drive Mechanism',
  telemetryLabelsZh: { m1: '主动拨盘角速度', m2: '槽轮当前步进角' },
  telemetryLabelsEn: { m1: 'Driver Ang Vel', m2: 'Geneva Index Ang' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events } = Matter;
    const originX = width / 2;
    const originY = height / 2;

    const dist = 110; // 两轴心中心距
    const driverX = originX - dist / 2;
    const genevaX = originX + dist / 2;
    const driverRadius = 60;
    const pinOffset = 45; // 拨销回转半径
    const genevaRadius = 75;

    // 1. 物理刚体用于响应鼠标和阻尼
    const driver = Bodies.circle(driverX, originY, driverRadius, { frictionAir: 0.02, render: { visible: false } });
    const geneva = Bodies.circle(genevaX, originY, genevaRadius, { frictionAir: 0.02, render: { visible: false } });

    const pDriver = Constraint.create({ pointA: { x: driverX, y: originY }, bodyB: driver, pointB: { x: 0, y: 0 }, stiffness: 1 });
    const pGeneva = Constraint.create({ pointA: { x: genevaX, y: originY }, bodyB: geneva, pointB: { x: 0, y: 0 }, stiffness: 1 });

    // 2. 运动学槽轮联动循环 (4 槽日内瓦机构数学解析)
    let genevaAngle = 0;
    let isRunning = true;

    const updateGeneva = () => {
      const theta = (driver.angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      // 拨销位置
      const pinX = driverX + pinOffset * Math.cos(theta);
      const pinY = originY + pinOffset * Math.sin(theta);

      // 进入槽的相位判定（4槽机构每次步进 90 度）
      const enterAngle = -Math.PI / 4;
      const exitAngle = Math.PI / 4;
      let rel = theta;
      if (rel > Math.PI) rel -= Math.PI * 2;

      if (rel >= enterAngle && rel <= exitAngle) {
        // 拨销进入槽道时驱动槽轮
        const dx = pinX - genevaX;
        const dy = pinY - originY;
        const slotAngle = Math.atan2(dy, dx);
        genevaAngle = slotAngle;
      }
    };
    Events.on(engine, 'beforeUpdate', updateGeneva);

    // 3. 极简工业线框渲染
    const canvas = document.querySelector('#viewport canvas');
    function draw() {
      if (!isRunning) return;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          // 绘制主动拨盘
          ctx.translate(driverX, originY);
          ctx.rotate(driver.angle);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(0, 0, 36, 0, Math.PI * 2);
          ctx.stroke();
          // 驱动臂与圆销
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(pinOffset, 0);
          ctx.stroke();
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(pinOffset, 0, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // 绘制四槽槽轮
          ctx.save();
          ctx.translate(genevaX, originY);
          ctx.rotate(genevaAngle);
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.2;
          for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 2);
            // 4个辐射导槽
            ctx.strokeRect(15, -4, 55, 8);
            // 槽间圆弧凹轮廓
            ctx.beginPath();
            ctx.arc(52, 52, 28, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
          // 槽轮轴承孔
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // 中心距机架基线
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = '#334155';
          ctx.beginPath();
          ctx.moveTo(driverX, originY);
          ctx.lineTo(genevaX, originY);
          ctx.stroke();
          ctx.restore();
        }
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    Composite.add(engine.world, [driver, geneva, pDriver, pGeneva]);

    return {
      driveBody: driver,
      bodiesToFriction: [driver],
      destroy() {
        isRunning = false;
        Events.off(engine, 'beforeUpdate', updateGeneva);
      },
      getTelemetry() {
        return {
          v1: `${(driver.angularVelocity * 60).toFixed(2)} rad/s`,
          v2: `${(((genevaAngle * 180) / Math.PI) % 360).toFixed(1)}° (步进)`
        };
      }
    };
  }
};
