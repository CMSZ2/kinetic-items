// 机构 05：标准外啮合日内瓦四槽轮机构 (Geneva Drive) - 精密连续啮合与实体锁止版
window.GenevaDriveMechanism = {
  nameZh: '日内瓦槽轮间歇机构',
  nameEn: 'Geneva Drive Mechanism',
  telemetryLabelsZh: { m1: '主动盘转速', m2: '槽轮当前步进角' },
  telemetryLabelsEn: { m1: 'Driver Speed', m2: 'Geneva Angle' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events } = Matter;
    const originX = width / 2;
    const originY = height / 2;

    // 4槽日内瓦机构标准工程几何尺寸 (无冲击垂直切入条件)
    const centerDist = 140; // 中心距 L
    const rPin = centerDist * Math.sin(Math.PI / 4); // 98.99 拨销回转半径
    const rLock = 46; // 主动凸圆盘锁止半径
    const rGenevaOuter = centerDist * Math.cos(Math.PI / 4); // 98.99 槽轮最大外径

    const driverX = originX - centerDist / 2;
    const genevaX = originX + centerDist / 2;

    const driver = Bodies.circle(driverX, originY, 40, { frictionAir: 0.02, render: { visible: false } });
    const pD = Constraint.create({ pointA: { x: driverX, y: originY }, bodyB: driver, pointB: { x: 0, y: 0 }, stiffness: 1 });

    let isRunning = true;
    let genevaAngle = 0;
    let isDriving = false;

    // 严格闭式运动学：彻底消灭跳变与回弹
    const updateGeneva = () => {
      const theta = driver.angle;
      const TWO_PI = Math.PI * 2;
      
      // 当前完成的整圈周期
      const cycle = Math.floor(theta / TWO_PI);
      let phi = theta % TWO_PI;
      if (phi < 0) phi += TWO_PI; // [0, 2PI]

      // 拨销进入槽道区间：[0 到 PI/4] 以及 [7PI/4 到 2PI] (以朝向右侧水平线为中心)
      let inRange = false;
      let alpha = 0; // 相对于中心线的夹角 [-PI/4, PI/4]

      if (phi <= Math.PI / 4) {
        inRange = true;
        alpha = phi;
      } else if (phi >= 7 * Math.PI / 4) {
        inRange = true;
        alpha = phi - TWO_PI;
      }

      if (inRange) {
        isDriving = true;
        // 运动学解析方程：拨销在槽轮局部坐标系中的角度
        const pinX = driverX + rPin * Math.cos(alpha);
        const pinY = originY + rPin * Math.sin(alpha);
        const dx = pinX - genevaX;
        const dy = pinY - originY;
        const currentSlotA = Math.atan2(dy, dx); // [-PI, -3PI/4] 对应当前槽
        genevaAngle = currentSlotA - (cycle * Math.PI / 2);
      } else {
        isDriving = false;
        // 出槽锁止期：角度绝对锁死在当前象限，无任何速度跳变
        const step = (phi < Math.PI) ? (cycle + 1) : cycle;
        genevaAngle = - (step * Math.PI / 2) + Math.PI;
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

          // 1. 绘制主动轮 (带缺口的大锁止盘 + 驱动臂 + 销)
          ctx.save();
          ctx.translate(driverX, originY);
          ctx.rotate(driver.angle);

          // 大锁止凸圆盘 (仅在拨销一侧切出一个让位缺口)
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, rLock, Math.PI / 3, (5 * Math.PI) / 3);
          ctx.stroke();

          // 驱动臂身
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(rPin, 0);
          ctx.stroke();

          // 驱动圆销
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(rPin, 0, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
          ctx.restore();

          // 2. 绘制浑然一体的四槽日内瓦从动盘 (整体实体轮廓)
          ctx.save();
          ctx.translate(genevaX, originY);
          ctx.rotate(genevaAngle);

          // 连续绘制槽轮外廓：4条直导槽与4段相切的凹锁止圆弧连续闭合
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          const slotW = 14; // 槽宽
          const slotDepth = 55; // 槽深

          for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 2);

            // 绘制导槽两边平行壁
            ctx.strokeRect(rGenevaOuter - slotDepth, -slotW / 2, slotDepth + 4, slotW);

            // 绘制槽轮外缘的凹圆弧锁止面 (锁止时紧扣主动轮凸盘)
            ctx.strokeStyle = '#475569';
            ctx.beginPath();
            // 凹弧圆心位于相邻两槽之间的对角线外侧，半径等于 rLock
            const arcDist = centerDist;
            const cos45 = Math.SQRT1_2;
            ctx.arc(arcDist * cos45, arcDist * cos45, rLock, Math.PI * 1.05, Math.PI * 1.45);
            ctx.stroke();

            ctx.restore();
          }

          // 中心精密轴套孔
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          ctx.restore();

          // 3. 轴心定位与中心距参考线
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
          v2: `${deg}° [${isDriving ? '拨销推动转位' : '凹弧锁止停顿'}]`
        };
      }
    };
  }
};
