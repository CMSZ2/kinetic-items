// 机构 05：六槽日内瓦间歇机构 (6-Slot Geneva Drive) - 极简线框工业线图版
window.GenevaDriveMechanism = {
  nameZh: '日内瓦槽轮间歇机构 (6槽)',
  nameEn: '6-Slot Geneva Drive Mechanism',
  telemetryLabelsZh: { m1: '主动拨盘速度', m2: '槽轮工位与锁止状态' },
  telemetryLabelsEn: { m1: 'Driver Speed', m2: 'Geneva Station' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events } = Matter;
    const originX = width / 2;
    const originY = height / 2;

    // 6槽日内瓦严格几何参数 (标准无冲击直角切入条件)
    const N = 6;
    const centerDist = 150; // 中心距 L
    const rPin = centerDist * Math.sin(Math.PI / N);    // 75px
    const rGeneva = centerDist * Math.cos(Math.PI / N); // 129.9px
    const rLock = 48; // 凸盘锁止半径
    const slotWidth = 14;

    const genevaX = originX - centerDist * 0.45;
    const driverX = genevaX + centerDist;

    const driver = Bodies.circle(driverX, originY, 40, { frictionAir: 0.02, render: { visible: false } });
    const pD = Constraint.create({ pointA: { x: driverX, y: originY }, bodyB: driver, pointB: { x: 0, y: 0 }, stiffness: 1 });

    let isRunning = true;
    let genevaAngle = 0;
    let isDriving = false;

    // 核心连续无断裂运动学解析解
    const TWO_PI = Math.PI * 2;
    const DRIVE_HALF_ANGLE = Math.PI / 3; // 60°
    const STEP_ANGLE = (Math.PI * 2) / N; // 60°

    const updateGeneva = () => {
      const theta = driver.angle;
      const cycle = Math.floor((theta + Math.PI) / TWO_PI);
      let alpha = (theta + Math.PI) % TWO_PI;
      if (alpha < 0) alpha += TWO_PI;
      alpha -= Math.PI; // 当拨销指向左侧槽轮时 alpha = 0

      if (Math.abs(alpha) <= DRIVE_HALF_ANGLE) {
        isDriving = true;
        // 6槽运动学解析解: tan(phi) = sin(alpha) / (2 - cos(alpha))
        const phi = Math.atan2(Math.sin(alpha), 2 - Math.cos(alpha));
        genevaAngle = (cycle * STEP_ANGLE) + (phi + Math.PI / 6);
      } else {
        isDriving = false;
        // 锁止停歇期：完全锁死在当前完成的整步上
        const step = (alpha > DRIVE_HALF_ANGLE) ? (cycle + 1) : cycle;
        genevaAngle = step * STEP_ANGLE;
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

          // -----------------------------------------------------------
          // 1. 绘制左侧六槽日内瓦轮 (极简工程线框)
          // -----------------------------------------------------------
          ctx.save();
          ctx.translate(genevaX, originY);
          ctx.rotate(genevaAngle);

          // 槽轮外廓线与 6 个直导槽
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let i = 0; i < N; i++) {
            ctx.save();
            ctx.rotate(i * STEP_ANGLE);
            // 导槽外框
            const bottomR = centerDist - rPin;
            ctx.strokeRect(bottomR, -slotWidth / 2, rGeneva - bottomR + 6, slotWidth);
            // 边缘锁止凹圆弧 (与主动大凸圆盘半径严格一致)
            ctx.beginPath();
            ctx.strokeStyle = '#38bdf8';
            ctx.arc(centerDist, 0, rLock, Math.PI * 0.90, Math.PI * 1.10);
            ctx.stroke();
            ctx.restore();
          }

          // 中心轴孔与装饰圆周
          ctx.strokeStyle = '#64748b';
          ctx.beginPath();
          ctx.arc(0, 0, 18, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.restore();

          // -----------------------------------------------------------
          // 2. 绘制右侧主动拨盘 (锁止大凸圆弧 + 驱动臂 + 圆柱销)
          // -----------------------------------------------------------
          ctx.save();
          ctx.translate(driverX, originY);
          ctx.rotate(driver.angle);

          // 锁止大凸圆弧 (在停顿期嵌在槽轮凹弧内自锁)
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          // 除拨销侧切口外的大圆弧
          ctx.arc(0, 0, rLock, -Math.PI * 0.65, Math.PI * 0.65, false);
          ctx.arc(-30, 0, 30, Math.PI * 0.35, -Math.PI * 0.35, true); // 让位弧
          ctx.closePath();
          ctx.stroke();

          // 驱动曲柄臂
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-rPin, 0);
          ctx.stroke();

          // 驱动圆柱销
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(-rPin, 0, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // 中心转轴
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // -----------------------------------------------------------
          // 3. 两轴装配中心距基准线
          // -----------------------------------------------------------
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#1e2632';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(genevaX, originY);
          ctx.lineTo(driverX, originY);
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
        const deg = (((genevaAngle * 180 / Math.PI) % 360 + 360) % 360).toFixed(0);
        const station = Math.floor(deg / 60) + 1;
        return {
          v1: `${(driver.angularVelocity * 60).toFixed(2)} rad/s`,
          v2: `工位 ${station}/6 (${deg}°) [${isDriving ? '转位啮合' : '凸盘卡紧锁止'}]`
        };
      }
    };
  }
};
