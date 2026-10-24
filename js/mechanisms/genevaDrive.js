// 机构 05：标准外啮合日内瓦四槽轮机构 (Geneva Drive) - 实体轮廓与连续步进版
window.GenevaDriveMechanism = {
  nameZh: '日内瓦槽轮间歇机构',
  nameEn: 'Geneva Drive Mechanism',
  telemetryLabelsZh: { m1: '主动拨盘速度', m2: '槽轮当前步进位' },
  telemetryLabelsEn: { m1: 'Driver Speed', m2: 'Geneva Status' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events } = Matter;
    const originX = width / 2;
    const originY = height / 2;

    const centerDist = 130; // 轴间距 L
    const rPin = centerDist * Math.SQRT1_2; // 拨销理论精确节圆半径 91.92
    const driverX = originX - centerDist / 2;
    const genevaX = originX + centerDist / 2;
    const rLockCam = 42;    // 主动凸锁圆弧半径
    const rGenevaOuter = centerDist * Math.SQRT1_2; // 槽轮最大外径

    const driver = Bodies.circle(driverX, originY, 40, { frictionAir: 0.02, render: { visible: false } });
    const pD = Constraint.create({ pointA: { x: driverX, y: originY }, bodyB: driver, pointB: { x: 0, y: 0 }, stiffness: 1 });

    let isRunning = true;
    let genevaAngle = 0;
    let isIndexing = false;

    // 核心连续步进数学方程：零截断、零回弹
    const updateGeneva = () => {
      const theta = driver.angle;
      const TWO_PI = Math.PI * 2;
      
      // 周期计数与当前周期内归一化角度 [-PI, PI]
      const cycle = Math.floor((theta + Math.PI) / TWO_PI);
      let phi = (theta + Math.PI) % TWO_PI;
      if (phi < 0) phi += TWO_PI;
      phi -= Math.PI; // -PI 到 PI，拨销在 0 时处于水平朝右的相切中点

      // 4槽机构严格进槽区间：-45° 到 +45° (-PI/4 到 PI/4)
      if (phi >= -Math.PI / 4 && phi <= Math.PI / 4) {
        isIndexing = true;
        // 严密无冲击进槽反三角函数解
        const num = Math.sin(phi);
        const den = Math.SQRT2 - Math.cos(phi);
        const deltaSlotAngle = Math.atan2(num, den);
        genevaAngle = -(cycle * Math.PI / 2) - deltaSlotAngle;
      } else {
        isIndexing = false;
        // 出槽锁止期：完全平滑保持在当前已完成的象限角度上
        const finalStep = (phi > Math.PI / 4) ? (cycle + 0.5) : (cycle - 0.5);
        genevaAngle = -(Math.round(finalStep) * Math.PI / 2);
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

          // 1. 绘制主动拨盘与锁止凸缘 (Driving Crank & Locking Crescent)
          ctx.save();
          ctx.translate(driverX, originY);
          ctx.rotate(driver.angle);

          // 主动曲柄盘底座
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, 24, 0, Math.PI * 2);
          ctx.stroke();

          // 半月凸锁盘 (Locking Disc)
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, rLockCam, Math.PI / 4, 7 * Math.PI / 4);
          ctx.stroke();

          // 驱动臂与圆销
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(rPin, 0);
          ctx.stroke();

          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(rPin, 0, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
          ctx.restore();

          // 2. 绘制标准实体日内瓦四槽盘 (一体化连续槽轮外形轮廓)
          ctx.save();
          ctx.translate(genevaX, originY);
          ctx.rotate(genevaAngle);

          // 轮廓实体路径绘制
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const rot = (i * Math.PI) / 2;
            ctx.save();
            ctx.rotate(rot);
            // 绘制当前象限的槽道外壁
            ctx.strokeRect(22, -6, 68, 12);
            ctx.restore();
          }

          // 绘制整体槽轮外边缘与4段精密锁止凹弧 (Crescent cutouts)
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.2;
          for (let i = 0; i < 4; i++) {
            const rot = (i * Math.PI) / 2 + Math.PI / 4;
            ctx.save();
            ctx.rotate(rot);
            // 外轮廓凹圆弧 (与主动凸盘精准贴合)
            ctx.beginPath();
            ctx.arc(centerDist * Math.cos(Math.PI / 4), 0, rLockCam + 1, Math.PI * 0.72, Math.PI * 1.28);
            ctx.stroke();
            ctx.restore();
          }

          // 盘体中心减重孔与主轴轴承座
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.strokeStyle = '#38bdf8';
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          ctx.restore();

          // 3. 中心距定位点划线
          ctx.setLineDash([4, 4]);
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
        const deg = (((-genevaAngle * 180 / Math.PI) % 360 + 360) % 360).toFixed(0);
        return {
          v1: `${(driver.angularVelocity * 60).toFixed(2)} rad/s`,
          v2: `${deg}° [${isIndexing ? '步进啮合中' : '凹弧锁止停顿'}]`
        };
      }
    };
  }
};
