// 机构 05：标准日内瓦槽轮间歇机构 (Geneva Drive) - CAD 精密凸凹锁止咬合版
window.GenevaDriveMechanism = {
  nameZh: '日内瓦槽轮间歇机构',
  nameEn: 'Geneva Drive Mechanism',
  telemetryLabelsZh: { m1: '主动拨盘转速', m2: '槽轮当前步进角' },
  telemetryLabelsEn: { m1: 'Driver Speed', m2: 'Geneva Angle' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events } = Matter;
    const originX = width / 2;
    const originY = height / 2;

    // 4槽日内瓦机构严格标准几何
    const centerDist = 135; // 中心距 L
    const rPin = centerDist * Math.SQRT1_2; // 95.46 拨销回转半径
    const rLockCam = 54;    // 主动大锁止凸圆盘半径
    const driverX = originX - centerDist / 2;
    const genevaX = originX + centerDist / 2;

    const driver = Bodies.circle(driverX, originY, 40, { frictionAir: 0.02, render: { visible: false } });
    const pD = Constraint.create({ pointA: { x: driverX, y: originY }, bodyB: driver, pointB: { x: 0, y: 0 }, stiffness: 1 });

    let isRunning = true;
    let genevaAngle = 0;
    let isDriving = false;

    // 核心平滑周期运动学解算方程
    const updateGeneva = () => {
      const theta = driver.angle;
      const TWO_PI = Math.PI * 2;
      
      const cycle = Math.floor((theta + Math.PI / 4) / TWO_PI);
      let phi = (theta + Math.PI / 4) % TWO_PI;
      if (phi < 0) phi += TWO_PI;
      phi -= Math.PI / 4; // 相对右侧中心线夹角 [-PI/4, 7PI/4]

      // 拨销进入槽道驱动区：[-PI/4, PI/4]
      if (phi >= -Math.PI / 4 && phi <= Math.PI / 4) {
        isDriving = true;
        const pinX = driverX + rPin * Math.cos(theta);
        const pinY = originY + rPin * Math.sin(theta);
        const dx = pinX - genevaX;
        const dy = pinY - originY;
        const currentSlotA = Math.atan2(dy, dx);
        genevaAngle = currentSlotA - (cycle * Math.PI / 2) - Math.PI;
      } else {
        isDriving = false;
        // 凸圆弧抱死自锁期：完全静止保持在当前象限
        genevaAngle = - (cycle * Math.PI / 2);
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

          // 1. 绘制主动轮 (带让位缺口的大凸锁圆盘 + 驱动臂 + 拨销)
          ctx.save();
          ctx.translate(driverX, originY);
          ctx.rotate(driver.angle);

          // 驱动凸锁大圆盘 (除开拨销让位口外的 270 度大凸圆弧，CAD 图 3 蓝色盘)
          ctx.strokeStyle = '#ffffff';
          ctx.fillStyle = '#1c2128';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, rLockCam, Math.PI / 3, (5 * Math.PI) / 3); // 凸圆弧
          ctx.lineTo(rPin - 10, -8);
          ctx.lineTo(rPin, 0);
          ctx.lineTo(rPin - 10, 8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 驱动臂梁
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(rPin, 0);
          ctx.stroke();

          // 拨动圆销 (CAD 图 3 红色圆销)
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(rPin, 0, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // 轴承孔
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.restore();

          // 2. 绘制 CAD 图 3 标准一体化四槽槽轮 (绿色零件)
          ctx.save();
          ctx.translate(genevaX, originY);
          ctx.rotate(genevaAngle);

          // 连续整体轮廓：4 条径向导槽与 4 段相切凹圆弧紧密相连
          ctx.strokeStyle = '#ffffff';
          ctx.fillStyle = '#1e242c';
          ctx.lineWidth = 1.5;
          ctx.beginPath();

          const slotWidth = 14;
          const slotLength = 54;
          const rOuterTip = rPin; // 槽轮叶尖外径刚好与销切线对齐

          for (let i = 0; i < 4; i++) {
            const baseA = (i * Math.PI) / 2;
            ctx.save();
            ctx.rotate(baseA);

            // 槽道两壁
            ctx.strokeRect(rOuterTip - slotLength, -slotWidth / 2, slotLength, slotWidth);

            // 凹圆弧锁止面 (凹槽)：半径严格等于主动大凸盘半径 rLockCam
            // 当处于停顿期时，主动盘凸面正好严丝合缝卡在这一段凹弧里！
            ctx.beginPath();
            ctx.strokeStyle = '#38bdf8'; // 高亮显示凹锁面，直观展示咬合
            ctx.arc(centerDist * Math.cos(Math.PI / 4), centerDist * Math.sin(Math.PI / 4), rLockCam, Math.PI * 1.05, Math.PI * 1.45);
            ctx.stroke();

            ctx.restore();
          }

          // 中心轴套与定位孔
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          ctx.restore();

          // 3. 轴心中心距装配基准点划线
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#273344';
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
          v2: `${deg}° [${isDriving ? '拨销驱动转位' : '凸盘卡入凹槽锁死'}]`
        };
      }
    };
  }
};
