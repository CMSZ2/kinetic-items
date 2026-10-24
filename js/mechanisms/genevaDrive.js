// 机构 05：标准外啮合四槽日内瓦槽轮间歇机构 (Geneva Drive) - 严格 CAD 啮合几何与单向连续步进
window.GenevaDriveMechanism = {
  nameZh: '日内瓦槽轮间歇机构',
  nameEn: 'Geneva Drive Mechanism',
  telemetryLabelsZh: { m1: '主动拨盘速度', m2: '槽轮工位与累积角' },
  telemetryLabelsEn: { m1: 'Driver Speed', m2: 'Geneva Station' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events } = Matter;
    const originX = width / 2;
    const originY = height / 2;

    // 4槽日内瓦机构严格工程几何尺寸
    const centerDist = 140; // 轴间距 L
    const rPin = centerDist * Math.SQRT1_2; // 98.99px 拨销回转半径
    const rLock = 46; // 主动锁止大凸圆盘半径
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

    // 核心无冲击运动学解析解 (严格消除抽搐与复位)
    const TWO_PI = Math.PI * 2;
    const HALF_PI = Math.PI / 2;
    const QUARTER_PI = Math.PI / 4;

    const updateGeneva = () => {
      const theta = driver.angle;
      const cycle = Math.floor(theta / TWO_PI);
      
      // 归一化到单个驱动周期 [-PI, PI]，0° 代表红销正指向槽轮中心
      let beta = (theta % TWO_PI + TWO_PI) % TWO_PI;
      if (beta > Math.PI) beta -= TWO_PI;

      // 4 槽日内瓦机构严格进槽驱动区间：[-45°, +45°]
      if (beta >= -QUARTER_PI && beta <= QUARTER_PI) {
        isDrivingPhase = true;
        // 严格几何正切解析解：驱动期相对转动行程从 -45° 平滑单调变化到 +45° (净转动刚好 90°)
        const phi = Math.atan2(Math.sin(beta), Math.SQRT2 - Math.cos(beta));
        totalGenevaAngle = (cycle * HALF_PI) + (phi + QUARTER_PI);
      } else {
        isDrivingPhase = false;
        // 凸圆弧抱死自锁停顿期：严格焊死在已完成的象限工位上，绝对静止
        const step = (beta > QUARTER_PI) ? (cycle + 1) : cycle;
        totalGenevaAngle = step * HALF_PI;
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

          // -----------------------------------------------------------------
          // 1. 绘制 CAD 实心四槽日内瓦盘 (位于右侧)
          // -----------------------------------------------------------------
          ctx.save();
          ctx.translate(genevaX, originY);
          // 槽轮旋转 (加上初始 45° 偏移，确保在自锁期时凹槽严密朝左扣住主动凸盘)
          ctx.rotate(totalGenevaAngle + QUARTER_PI);

          ctx.fillStyle = '#1c222a';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.8;

          // 绘制 4 条径向直导槽 (位于 45°, 135°, 225°, 315°)
          for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 2);
            ctx.fillStyle = '#0c0d0e';
            ctx.fillRect(rGenevaOuter - slotDepth, -slotWidth / 2, slotDepth + 4, slotWidth);
            ctx.strokeRect(rGenevaOuter - slotDepth, -slotWidth / 2, slotDepth + 4, slotWidth);
            ctx.restore();
          }

          // 绘制 4 段严丝合缝的凹圆弧锁止面 (位于 0°, 90°, 180°, 270°，两槽正中间)
          // 当自锁期到来时，面朝左侧的凹槽与主动大凸盘完全相切咬合！
          for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 2 - QUARTER_PI);
            ctx.beginPath();
            ctx.strokeStyle = '#38bdf8'; // 青色高亮锁止面
            ctx.lineWidth = 2.2;
            // 凹圆心在两轴距 centerDist 处，半径严格等于主动盘锁止半径 rLock
            ctx.arc(centerDist, 0, rLock, Math.PI * 0.85, Math.PI * 1.15);
            ctx.stroke();
            ctx.restore();
          }

          // 中心精密轴套与减重沉孔
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

          // -----------------------------------------------------------------
          // 2. 绘制主动轮 (位于左侧：大凸圆锁止盘 + 驱动曲柄臂 + 红拨销)
          // -----------------------------------------------------------------
          ctx.save();
          ctx.translate(driverX, originY);
          ctx.rotate(driver.angle);

          // 大凸锁圆盘 (270° 凸圆台，在自锁期刚好卡死在右边槽轮的凹槽内)
          ctx.fillStyle = '#1e2632';
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          // 在让位侧切出 90° 缺口以供槽轮叶尖穿过
          ctx.arc(0, 0, rLock, Math.PI * 0.3, Math.PI * 1.7);
          ctx.lineTo(rPin - 12, -8);
          ctx.lineTo(rPin, 0);
          ctx.lineTo(rPin - 12, 8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 驱动曲柄臂
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(rPin, 0);
          ctx.stroke();

          // 红色圆柱拨销
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

          // -----------------------------------------------------------------
          // 3. 轴心装配基准点划线
          // -----------------------------------------------------------------
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
          v2: `${deg}° [${isDrivingPhase ? '红销推槽转位中' : '凸盘卡入凹槽锁死'}]`
        };
      }
    };
  }
};
