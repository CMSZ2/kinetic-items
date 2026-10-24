// 机构 05：标准外啮合日内瓦四槽轮间歇机构 (Geneva Drive) - 经典工程实体版
window.GenevaDriveMechanism = {
  nameZh: '日内瓦槽轮间歇机构',
  nameEn: 'Geneva Drive Mechanism',
  telemetryLabelsZh: { m1: '主动拨盘角速度', m2: '槽轮瞬时步进角' },
  telemetryLabelsEn: { m1: 'Driver Ang Vel', m2: 'Geneva Index Ang' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events } = Matter;
    const originX = width / 2;
    const originY = height / 2;

    const centerDist = 130; // 严格中心距
    const rDriver = centerDist * Math.sin(Math.PI / 4); // 91.92
    const rPin = 62;        // 拨销回转半径
    const rGeneva = Math.sqrt(centerDist * centerDist - rPin * rPin); // 114.2 槽轮外径
    const driverX = originX - centerDist / 2;
    const genevaX = originX + centerDist / 2;

    // 承载鼠标交互的刚体
    const driver = Bodies.circle(driverX, originY, 40, { frictionAir: 0.02, render: { visible: false } });
    const geneva = Bodies.circle(genevaX, originY, 50, { frictionAir: 0.02, render: { visible: false } });

    const pD = Constraint.create({ pointA: { x: driverX, y: originY }, bodyB: driver, pointB: { x: 0, y: 0 }, stiffness: 1 });
    const pG = Constraint.create({ pointA: { x: genevaX, y: originY }, bodyB: geneva, pointB: { x: 0, y: 0 }, stiffness: 1 });

    let isRunning = true;
    let genevaAngle = 0;
    let lockedStep = 0;

    // 严密日内瓦运动学：拨销进槽与出槽锁定
    const updateGeneva = () => {
      // 归一化主动盘角度 (-PI 到 PI)
      let theta = driver.angle % (Math.PI * 2);
      if (theta < -Math.PI) theta += Math.PI * 2;
      if (theta > Math.PI) theta -= Math.PI * 2;

      const enterA = -Math.PI / 4;
      const exitA = Math.PI / 4;

      if (theta >= enterA && theta <= exitA) {
        // 拨销进入槽内推动转动
        const pinX = driverX + rPin * Math.cos(theta);
        const pinY = originY + rPin * Math.sin(theta);
        const dx = pinX - genevaX;
        const dy = pinY - originY;
        genevaAngle = Math.atan2(dy, dx) - (lockedStep * Math.PI / 2);
      } else {
        // 锁止期：凹弧紧贴自锁
        if (theta > exitA) {
          lockedStep = Math.floor((driver.angle + Math.PI / 4) / (Math.PI * 2));
        }
        genevaAngle = - (lockedStep * Math.PI / 2);
      }
    };
    Events.on(engine, 'beforeUpdate', updateGeneva);

    // 绘制标准日内瓦实体工程图纸
    const canvas = document.querySelector('#viewport canvas');
    function draw() {
      if (!isRunning) return;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();

          // 1. 绘制主动轮与半月锁止凸台
          ctx.save();
          ctx.translate(driverX, originY);
          ctx.rotate(driver.angle);
          // 主动臂
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 20, 0, Math.PI * 2);
          ctx.moveTo(0, 0); ctx.lineTo(rPin, 0);
          ctx.stroke();

          // 锁止凸缘 (Crescent Cam)
          ctx.beginPath();
          ctx.strokeStyle = '#64748b';
          ctx.arc(0, 0, 48, Math.PI / 4, 7 * Math.PI / 4);
          ctx.stroke();

          // 拨动圆销 (Drive Pin)
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(rPin, 0, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
          ctx.restore();

          // 2. 绘制标准四槽日内瓦槽轮外形 (十字槽 + 4处锁止凹圆弧)
          ctx.save();
          ctx.translate(genevaX, originY);
          ctx.rotate(genevaAngle);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const rot = (i * Math.PI) / 2;
            ctx.save();
            ctx.rotate(rot);
            // 径向十字滑槽
            ctx.strokeRect(26, -5, 60, 10);
            // 边缘四条定规锁止凹弧 (Crescent cutouts)
            ctx.beginPath();
            ctx.arc(68, 68, 48, 0, Math.PI * 2);
            ctx.strokeStyle = '#334155';
            ctx.stroke();
            ctx.restore();
          }

          // 中心定位孔
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.strokeStyle = '#94a3b8';
          ctx.stroke();
          ctx.restore();

          // 3. 中心轴承座与中心距辅助点划线
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#1e293b';
          ctx.beginPath();
          ctx.moveTo(driverX, originY);
          ctx.lineTo(genevaX, originY);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.restore();
        }
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    Composite.add(engine.world, [driver, geneva, pD, pG]);

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
          v2: `${((((genevaAngle * 180) / Math.PI) % 360 + 360) % 360).toFixed(1)}° (步进角)`
        };
      }
    };
  }
};
