// 机构 05：日内瓦槽轮间歇机构 (Geneva Drive) - 连续周期闭式解
window.GenevaDriveMechanism = {
  nameZh: '日内瓦槽轮间歇机构',
  nameEn: 'Geneva Drive Mechanism',
  telemetryLabelsZh: { m1: '主动盘转速', m2: '槽轮状态与角度' },
  telemetryLabelsEn: { m1: 'Driver Speed', m2: 'Geneva Angle' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events } = Matter;
    const originX = width / 2;
    const originY = height / 2;

    const centerDist = 120; // 轴间距 L
    const rPin = centerDist * Math.sin(Math.PI / 4); // 84.85px (标准4槽最佳无冲击几何)
    const driverX = originX - centerDist / 2;
    const genevaX = originX + centerDist / 2;

    const driver = Bodies.circle(driverX, originY, 40, { frictionAir: 0.02, render: { visible: false } });
    const pD = Constraint.create({ pointA: { x: driverX, y: originY }, bodyB: driver, pointB: { x: 0, y: 0 }, stiffness: 1 });

    let isRunning = true;
    let genevaAngle = 0;
    let isDrivingPhase = false;

    // 全新思路：闭式周期映射算法
    const updateGeneva = () => {
      const theta = driver.angle;
      const TWO_PI = Math.PI * 2;
      
      // 算当前完成了多少个完整周期
      const cycleCount = Math.floor((theta + Math.PI / 4) / TWO_PI);
      
      // 当前周期内的相对角度 (-PI/4 到 7PI/4)
      let localTheta = (theta + Math.PI / 4) % TWO_PI;
      if (localTheta < 0) localTheta += TWO_PI;
      localTheta -= Math.PI / 4;

      // 判定是否在驱动阶段：-PI/4 到 +PI/4 (总计 90 度的进槽驱动区)
      if (localTheta >= -Math.PI / 4 && localTheta <= Math.PI / 4) {
        isDrivingPhase = true;
        // 严格几何解：槽道随拨销转角
        const pinX = driverX + rPin * Math.cos(theta);
        const pinY = originY + rPin * Math.sin(theta);
        const dx = pinX - genevaX;
        const dy = pinY - originY;
        const slotA = Math.atan2(dy, dx);
        genevaAngle = - (cycleCount * Math.PI / 2) + (slotA - Math.PI);
      } else {
        isDrivingPhase = false;
        // 锁止停顿阶段：完全锁死在当前完成的步进角上
        genevaAngle = - (cycleCount * Math.PI / 2);
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

          // 1. 绘制主动轮与半月锁止弧
          ctx.save();
          ctx.translate(driverX, originY);
          ctx.rotate(driver.angle);

          // 驱动曲柄臂
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 20, 0, Math.PI * 2);
          ctx.moveTo(0, 0); ctx.lineTo(rPin, 0);
          ctx.stroke();

          // 锁止圆弧凸台 (与槽轮凹槽配合自锁)
          ctx.beginPath();
          ctx.strokeStyle = '#64748b';
          ctx.arc(0, 0, 40, Math.PI / 4, 7 * Math.PI / 4);
          ctx.stroke();

          // 驱动圆销
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(rPin, 0, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
          ctx.restore();

          // 2. 绘制标准四槽槽轮实体外轮廓
          ctx.save();
          ctx.translate(genevaX, originY);
          ctx.rotate(genevaAngle);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;

          // 绘制四槽轮廓与四段凹弧锁止面
          for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 2);
            // 径向滑槽
            ctx.strokeRect(20, -5, 55, 10);
            // 边缘四段外凹锁止圆弧
            ctx.beginPath();
            ctx.arc(60, 60, 40, 0, Math.PI * 2);
            ctx.strokeStyle = '#334155';
            ctx.stroke();
            ctx.restore();
          }

          // 中心轴承孔
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.strokeStyle = '#94a3b8';
          ctx.stroke();
          ctx.restore();

          // 机架中心距基准线
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
          v2: `${deg}° [${isDrivingPhase ? '驱动转位中' : '凹弧锁止停顿'}]`
        };
      }
    };
  }
};
