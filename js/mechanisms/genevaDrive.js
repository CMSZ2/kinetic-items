// 机构 05：日内瓦四槽轮间歇机构 (Geneva Drive) - 严格步进积分版
window.GenevaDriveMechanism = {
  nameZh: '日内瓦槽轮间歇机构',
  nameEn: 'Geneva Drive Mechanism',
  telemetryLabelsZh: { m1: '主动盘角速度', m2: '槽轮累积转角' },
  telemetryLabelsEn: { m1: 'Driver Ang Vel', m2: 'Geneva Total Angle' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events } = Matter;
    const originX = width / 2;
    const originY = height / 2;

    const centerDist = 120; // 严密中心距
    const rPin = 60;        // 拨销半径 (centerDist * sin(pi/4) = 84.85，调整为紧凑型)
    const driverX = originX - centerDist / 2;
    const genevaX = originX + centerDist / 2;

    const driver = Bodies.circle(driverX, originY, 40, { frictionAir: 0.02, render: { visible: false } });
    const pD = Constraint.create({ pointA: { x: driverX, y: originY }, bodyB: driver, pointB: { x: 0, y: 0 }, stiffness: 1 });

    let isRunning = true;
    let genevaAngle = 0; // 槽轮绝对角度
    let prevDriverAngle = driver.angle;
    let stepIndex = 0;   // 已经走过的 90 度步数

    // 核心步进解算：追踪拨销过象限
    const updateGeneva = () => {
      const curAngle = driver.angle;
      const dTheta = curAngle - prevDriverAngle;
      prevDriverAngle = curAngle;

      // 拨销瞬时坐标
      const pinX = driverX + rPin * Math.cos(curAngle);
      const pinY = originY + rPin * Math.sin(curAngle);

      // 判定拨销是否处于右侧进入槽轮有效推动区 (-45° 到 +45°)
      let localA = curAngle % (Math.PI * 2);
      if (localA < 0) localA += Math.PI * 2;
      
      const inZone = (localA >= 7 * Math.PI / 4 || localA <= Math.PI / 4);

      if (inZone) {
        // 在槽内：槽道中心线与拨销实时对准
        const dx = pinX - genevaX;
        const dy = pinY - originY;
        const currentSlotA = Math.atan2(dy, dx);
        
        // 平滑跟踪槽轮姿态
        genevaAngle = currentSlotA - (stepIndex * Math.PI / 2);
      } else {
        // 出槽锁止期：更新完成的步数
        if (localA > Math.PI / 4 && localA < Math.PI / 2 && dTheta > 0) {
          stepIndex = Math.round(curAngle / (Math.PI * 2));
        }
        genevaAngle = - (stepIndex * Math.PI / 2) + Math.PI;
      }
    };
    Events.on(engine, 'beforeUpdate', updateGeneva);

    const canvas = document.querySelector('#viewport canvas');
    function draw() {
      if (!isRunning) return;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();

          // 1. 绘制主动拨盘
          ctx.save();
          ctx.translate(driverX, originY);
          ctx.rotate(driver.angle);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(0, 0, 22, 0, Math.PI * 2);
          ctx.moveTo(0, 0); ctx.lineTo(rPin, 0);
          ctx.stroke();

          // 驱动凸缘锁止弧
          ctx.beginPath();
          ctx.strokeStyle = '#475569';
          ctx.arc(0, 0, 42, Math.PI / 4, 7 * Math.PI / 4);
          ctx.stroke();

          // 拨动圆销
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(rPin, 0, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
          ctx.restore();

          // 2. 绘制标准实体日内瓦四槽轮
          ctx.save();
          ctx.translate(genevaX, originY);
          ctx.rotate(genevaAngle);
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.2;

          for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 2);
            // 实体槽轮轮廓导槽
            ctx.strokeRect(18, -6, 52, 12);
            // 边缘四段外凹锁止圆弧
            ctx.beginPath();
            ctx.arc(60, 60, 42, 0, Math.PI * 2);
            ctx.strokeStyle = '#273344';
            ctx.stroke();
            ctx.restore();
          }

          // 中心定位孔
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.strokeStyle = '#94a3b8';
          ctx.stroke();
          ctx.restore();

          // 轴承支座参考点划线
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = '#1e293b';
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

    Composite.add(engine.world, [driver, pD]);

    return {
      driveBody: driver,
      bodiesToFriction: [driver],
      destroy() {
        isRunning = false;
        Events.off(engine, 'beforeUpdate', updateGeneva);
      },
      getTelemetry() {
        const deg = (((-genevaAngle * 180 / Math.PI) % 360 + 360) % 360).toFixed(1);
        return {
          v1: `${(driver.angularVelocity * 60).toFixed(2)} rad/s`,
          v2: `${deg}° (间歇锁止)`
        };
      }
    };
  }
};
