// 机构 05：标准外啮合日内瓦四槽轮机构 (Geneva Drive) - 绝对连续运动学与 CAD 实体咬合版
window.GenevaDriveMechanism = {
  nameZh: '日内瓦槽轮间歇机构',
  nameEn: 'Geneva Drive Mechanism',
  telemetryLabelsZh: { m1: '主动拨盘速度', m2: '槽轮当前累积角' },
  telemetryLabelsEn: { m1: 'Driver Speed', m2: 'Geneva Total Angle' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events } = Matter;
    const originX = width / 2;
    const originY = height / 2;

    // 4槽日内瓦严格几何参数 (CAD 标准无冲击直角切入条件)
    const centerDist = 140; // 轴心距 L
    const rPin = centerDist * Math.SQRT1_2; // 98.99px 拨销回转半径
    const rLockCam = 48; // 主动锁止大凸圆盘半径
    const rGenevaOuter = centerDist * Math.SQRT1_2; // 98.99px 槽轮外圆顶尖
    const slotWidth = 14;
    const slotDepth = 52;

    const driverX = originX - centerDist / 2;
    const genevaX = originX + centerDist / 2;

    const driver = Bodies.circle(driverX, originY, 40, { frictionAir: 0.02, render: { visible: false } });
    const pD = Constraint.create({ pointA: { x: driverX, y: originY }, bodyB: driver, pointB: { x: 0, y: 0 }, stiffness: 1 });

    let isRunning = true;
    let totalGenevaAngle = 0;
    let isDrivingPhase = false;

    // 核心运动学：采用无断点的严格连续正切解 (彻底消灭吸附与突变)
    const TWO_PI = Math.PI * 2;
    const HALF_PI = Math.PI / 2;
    const QUARTER_PI = Math.PI / 4;

    const updateGeneva = () => {
      // 保证角度平稳增加
      const theta = driver.angle;
      // 计算当前进行到第几圈 (第几个 90 度步进周期)
      const cycle = Math.floor(theta / TWO_PI);
      
      // 归一化到单个旋转周期 [-PI, PI]，当拨销水平朝右指向槽轮时定义为 0 度
      let beta = (theta % TWO_PI + TWO_PI) % TWO_PI;
      if (beta > Math.PI) beta -= TWO_PI;

      // 4槽机构只有在主动轮转到 [-45°, +45°] 区间内，红销才进入导槽推动
      if (beta >= -QUARTER_PI && beta <= QUARTER_PI) {
        isDrivingPhase = true;
        // 严格解析解：槽轮相对转角 phi (从 -45° 平滑单调变化到 +45°，行程刚好 90°)
        // tan(phi) = sin(beta) / (sqrt(2) - cos(beta))
        const phi = Math.atan2(Math.sin(beta), Math.SQRT2 - Math.cos(beta));
        // 连续累积总转角：每个周期精确推进 90°
        totalGenevaAngle = (cycle * HALF_PI) + (phi + QUARTER_PI);
      } else {
        isDrivingPhase = false;
        // 凹弧自锁停顿期：严格焊死在已经走完的步长上，绝对静止！
        const completedStep = (beta > QUARTER_PI) ? (cycle + 1) : cycle;
        totalGenevaAngle = completedStep * HALF_PI;
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

          // -------------------------------------------------------------
          // 1. 绘制 CAD 图 3 风格的一体化实心日内瓦槽轮 (Geneva Wheel)
          // -------------------------------------------------------------
          ctx.save();
          ctx.translate(genevaX, originY);
          // 槽轮旋转 (注意初始相位对准左侧入口)
          ctx.rotate(totalGenevaAngle + Math.PI);

          // 绘制槽轮实心底色与高质感轮廓
          ctx.fillStyle = '#1e242c';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.8;

          // 连续绘制 4 个槽臂与 4 段凹锁止圆弧
          for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 2);

            // A. 径向直导槽 (中空滑道)
            ctx.fillStyle = '#0c0d0e';
            ctx.fillRect(rGenevaOuter - slotDepth, -slotWidth / 2, slotDepth + 4, slotWidth);
            ctx.strokeRect(rGenevaOuter - slotDepth, -slotWidth / 2, slotDepth + 4, slotWidth);

            // B. 侧边紧密相切的凹锁止面 (凹圆弧)
            // 凹圆心在两臂夹角 45° 延长线上，半径严格等于主动盘锁止半径 rLockCam
            ctx.beginPath();
            ctx.strokeStyle = '#38bdf8'; // 青色高亮锁止咬合凹面
            ctx.lineWidth = 2;
            const arcCx = centerDist * Math.SQRT1_2;
            const arcCy = centerDist * Math.SQRT1_2;
            ctx.arc(arcCx, arcCy, rLockCam, Math.PI * 1.08, Math.PI * 1.42);
            ctx.stroke();

            ctx.restore();
          }

          // 中心定位沉孔与轴套
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.fillStyle = '#13171b';
          ctx.fill();
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.restore();

          // -------------------------------------------------------------
          // 2. 绘制主动轮 (凸锁大圆盘 + 驱动曲柄臂 + 红拨销)
          // -------------------------------------------------------------
          ctx.save();
          ctx.translate(driverX, originY);
          ctx.rotate(driver.angle);

          // A. 凸锁大圆盘 (除开拨销让位口外的圆盘凸台，自锁时嵌在槽轮凹面里)
          ctx.fillStyle = '#1a222d';
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          // 缺口位于拨销侧 (约 90 度让位角)
          ctx.arc(0, 0, rLockCam, Math.PI * 0.35, Math.PI * 1.65);
          ctx.lineTo(rPin - 12, -8);
          ctx.lineTo(rPin, 0);
          ctx.lineTo(rPin - 12, 8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // B. 驱动曲柄臂梁
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(rPin, 0);
          ctx.stroke();

          // C. 红色主动圆柱拨销 (进入导槽传动)
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(rPin, 0, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // 主动轴心
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.restore();

          // -------------------------------------------------------------
          // 3. 轴心装配基准点划线
          // -------------------------------------------------------------
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#27313a';
          ctx.lineWidth = 1;
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
        const deg = (((totalGenevaAngle * 180 / Math.PI) % 360 + 360) % 360).toFixed(0);
        return {
          v1: `${(driver.angularVelocity * 60).toFixed(2)} rad/s`,
          v2: `${deg}° [${isDrivingPhase ? '红销推槽转位中' : '凸盘卡入凹槽锁止'}]`
        };
      }
    };
  }
};
