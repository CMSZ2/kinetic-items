// 机构 05：标准外啮合日内瓦四槽轮机构 (Geneva Drive) - 绝对严格啮合与闭式锁止版
window.GenevaDriveMechanism = {
  nameZh: '日内瓦槽轮间歇机构',
  nameEn: 'Geneva Drive Mechanism',
  telemetryLabelsZh: { m1: '主动拨盘速度', m2: '槽轮当前累积角' },
  telemetryLabelsEn: { m1: 'Driver Speed', m2: 'Geneva Total Angle' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events } = Matter;
    const originX = width / 2;
    const originY = height / 2;

    // 4槽日内瓦严格几何参数 (满足无冲击直角切入条件)
    const centerDist = 140; // 轴心距 L
    const rPin = centerDist * Math.SQRT1_2; // 98.99px 拨销回转半径
    const rGenevaOuter = centerDist * Math.SQRT1_2; // 98.99px 槽轮外圆半径
    const rLock = 48; // 主动凸圆盘锁止半径 (严格相切)
    const slotDepth = 52;
    const slotWidth = 14;

    const driverX = originX - centerDist / 2;
    const genevaX = originX + centerDist / 2;

    const driver = Bodies.circle(driverX, originY, 40, { frictionAir: 0.02, render: { visible: false } });
    const pD = Constraint.create({ pointA: { x: driverX, y: originY }, bodyB: driver, pointB: { x: 0, y: 0 }, stiffness: 1 });

    let isRunning = true;
    let totalGenevaAngle = 0;
    let isDrivingPhase = false;

    // 严格闭式运动学：周期追踪法
    const TWO_PI = Math.PI * 2;
    const HALF_PI = Math.PI / 2;

    const updateGeneva = () => {
      const curA = driver.angle;
      
      // 计算当前处于第几个循环周期
      const cycle = Math.floor(curA / TWO_PI);
      let localA = curA % TWO_PI;
      if (localA < 0) localA += TWO_PI; // [0, 2PI]

      // 拨销进入槽道区间：以水平向右 (0°) 为中心，范围在 [-45°, +45°]
      // 对应 localA 在 [0, PI/4] 或 [7PI/4, 2PI]
      let inZone = false;
      let relA = 0;

      if (localA <= Math.PI / 4) {
        inZone = true;
        relA = localA;
      } else if (localA >= 7 * Math.PI / 4) {
        inZone = true;
        relA = localA - TWO_PI;
      }

      if (inZone) {
        isDrivingPhase = true;
        // 拨销瞬时坐标
        const pinX = driverX + rPin * Math.cos(relA);
        const pinY = originY + rPin * Math.sin(relA);
        // 槽轮中心指向拨销的向量
        const dx = pinX - genevaX;
        const dy = pinY - originY;
        // 槽轮当前槽的倾角
        const slotA = Math.atan2(dy, dx); // [-PI, -3PI/4] 连续区间
        totalGenevaAngle = - (cycle * HALF_PI) + (slotA - Math.PI);
      } else {
        isDrivingPhase = false;
        // 锁止期：凸圆盘卡入凹槽，严格自锁保持在当前已完成的整步上
        const step = (localA < Math.PI) ? cycle : (cycle + 1);
        totalGenevaAngle = - (step * HALF_PI);
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

          // 1. 绘制主动轮 (带让位切口的大凸锁圆盘 + 驱动臂 + 红销)
          ctx.save();
          ctx.translate(driverX, originY);
          ctx.rotate(driver.angle);

          // 大锁止凸圆盘 (除开拨销处的缺口，其余区域为凸弧)
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, rLock, Math.PI / 3, (5 * Math.PI) / 3);
          ctx.stroke();

          // 驱动摇臂
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(rPin, 0);
          ctx.stroke();

          // 拨动圆销 (亮红)
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(rPin, 0, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // 中心轴孔
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // 2. 绘制浑然一体的四槽槽轮 (一体成型十字外廓 + 4处相切凹圆弧)
          ctx.save();
          ctx.translate(genevaX, originY);
          ctx.rotate(totalGenevaAngle);

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;

          // 绘制整体槽轮：外径、4个导槽与4段严密锁止凹弧
          for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 2);

            // 径向十字滑槽
            ctx.strokeRect(rGenevaOuter - slotDepth, -slotWidth / 2, slotDepth, slotWidth);

            // 侧边凹圆弧锁止面 (凹弧半径严格等于主动盘锁止半径 rLock)
            // 当槽轮停顿且转到水平左侧时，这段凹弧与主动凸圆盘完全重合相切！
            ctx.strokeStyle = '#38bdf8'; // 亮青色标定锁止凹弧
            ctx.beginPath();
            ctx.arc(centerDist, 0, rLock, Math.PI * 0.82, Math.PI * 1.18);
            ctx.stroke();

            ctx.restore();
          }

          // 中心定位孔
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          ctx.restore();

          // 3. 中心距基准虚线
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
        const deg = (((-totalGenevaAngle * 180 / Math.PI) % 360 + 360) % 360).toFixed(0);
        return {
          v1: `${(driver.angularVelocity * 60).toFixed(2)} rad/s`,
          v2: `${deg}° [${isDrivingPhase ? '红销推槽转位' : '凸圆盘卡入凹槽锁死'}]`
        };
      }
    };
  }
};
