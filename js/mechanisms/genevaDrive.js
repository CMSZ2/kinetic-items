// 机构 05：标准六槽日内瓦间歇机构 (6-Slot Geneva Drive) - 严格按照实物图 1:1 几何建模
window.GenevaDriveMechanism = {
  nameZh: '日内瓦槽轮间歇机构 (6槽)',
  nameEn: '6-Slot Geneva Drive Mechanism',
  telemetryLabelsZh: { m1: '主动拨盘转速', m2: '槽轮工位与锁止状态' },
  telemetryLabelsEn: { m1: 'Driver Speed', m2: 'Geneva Station' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events } = Matter;
    const originX = width / 2;
    const originY = height / 2;

    // -------------------------------------------------------------
    // 1. 六槽日内瓦严格机械设计尺寸 (按标准无冲击切入角设计)
    // -------------------------------------------------------------
    const N = 6;                          // 槽数: 6
    const centerDist = 160;               // 轴间距 C
    const rPin = centerDist * Math.sin(Math.PI / N);      // 拨销半径 R1 = C * sin(30°) = 80px
    const rGeneva = centerDist * Math.cos(Math.PI / N);   // 槽轮外径 R2 = C * cos(30°) = 138.56px
    const rLock = 52;                     // 锁止大凸圆盘半径
    const slotWidth = 14;                 // 槽道宽度
    const slotDepth = 55;                 // 槽道工作深度

    // 槽轮在左，驱动轮在右
    const genevaX = originX - centerDist * 0.45;
    const driverX = genevaX + centerDist;

    // 刚体用于鼠标交互与动力接入
    const driver = Bodies.circle(driverX, originY, 40, { frictionAir: 0.02, render: { visible: false } });
    const pD = Constraint.create({ pointA: { x: driverX, y: originY }, bodyB: driver, pointB: { x: 0, y: 0 }, stiffness: 1 });

    let isRunning = true;
    let genevaAngle = 0;
    let isDriving = false;

    // -------------------------------------------------------------
    // 2. 连续可微解析解 (彻底消除吸附、瞬态跳变与回弹)
    // -------------------------------------------------------------
    const TWO_PI = Math.PI * 2;
    const DRIVE_HALF_ANGLE = Math.PI / 3; // 驱动区间为 [-60°, +60°] (共 120°)
    const STEP_ANGLE = (Math.PI * 2) / N; // 每次步进 60°

    const updateGeneva = () => {
      const theta = driver.angle;
      // 周期计数
      const cycle = Math.floor((theta + Math.PI) / TWO_PI);
      let alpha = (theta + Math.PI) % TWO_PI;
      if (alpha < 0) alpha += TWO_PI;
      alpha -= Math.PI; // alpha = 0 时，拨销正对槽轮中心线 (-X方向)

      if (Math.abs(alpha) <= DRIVE_HALF_ANGLE) {
        isDriving = true;
        // 6槽严格运动学方程: tan(phi) = sin(alpha) / (2 - cos(alpha))
        const phi = Math.atan2(Math.sin(alpha), 2 - Math.cos(alpha));
        genevaAngle = (cycle * STEP_ANGLE) + (phi + Math.PI / 6);
      } else {
        isDriving = false;
        // 凹弧自锁阶段：绝对锁定在当前完成的整步上
        const step = (alpha > DRIVE_HALF_ANGLE) ? (cycle + 1) : cycle;
        genevaAngle = step * STEP_ANGLE;
      }
    };
    Events.on(engine, 'beforeUpdate', updateGeneva);

    // -------------------------------------------------------------
    // 3. 实体工业质感绘制 (象牙白 PLA + 黄铜一字螺丝 + 嵌套自锁)
    // -------------------------------------------------------------
    const canvas = document.querySelector('#viewport canvas');

    // 绘制黄铜一字大螺栓 (还原实物特征)
    function drawBronzeScrew(ctx, x, y, radius, slotAngle) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(slotAngle);

      // 螺栓边缘
      ctx.fillStyle = '#b47b4a';
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#613b19';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 螺纹倒角凹槽
      ctx.fillStyle = '#945e31';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // 一字起子通槽
      ctx.fillStyle = '#381f08';
      ctx.fillRect(-radius * 0.85, -radius * 0.18, radius * 1.7, radius * 0.36);
      ctx.restore();
    }

    function draw() {
      if (!isRunning) return;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();

          // -----------------------------------------------------------
          // A. 绘制实物六槽日内瓦槽轮 (左侧工件)
          // -----------------------------------------------------------
          ctx.save();
          ctx.translate(genevaX, originY);
          ctx.rotate(genevaAngle);

          // 实体外轮廓：6 条 U 型导槽 + 6 组对称尖角 + 6 段紧密相切的凹锁止面
          ctx.fillStyle = '#f8fafc'; // 象牙白
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          for (let i = 0; i < N; i++) {
            const a0 = i * STEP_ANGLE;
            ctx.save();
            ctx.rotate(a0);

            // 槽道与尖角外廓
            const rTip = rGeneva + 4;
            const wHalf = slotWidth / 2;
            const bottomR = centerDist - rPin; // 槽底半圆位置

            // 左侧尖齿轮廓
            ctx.lineTo(rTip, -wHalf - 2);
            ctx.lineTo(rTip - 6, -wHalf);
            // U型槽内壁
            ctx.lineTo(bottomR, -wHalf);
            ctx.arc(bottomR, 0, wHalf, -Math.PI / 2, Math.PI / 2, false);
            ctx.lineTo(rTip - 6, wHalf);
            ctx.lineTo(rTip, wHalf + 2);

            // 凹锁止圆弧 (半径与主动盘 rLock 完全相同，自锁时完全吻合)
            // 弧心位于相邻两齿夹角中心线延长线上
            ctx.arc(centerDist, 0, rLock, Math.PI * 0.90, Math.PI * 1.10);
            ctx.restore();
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 绘制 6 个直通镂空导槽内壁阴影
          for (let i = 0; i < N; i++) {
            ctx.save();
            ctx.rotate(i * STEP_ANGLE);
            ctx.fillStyle = '#0c0d0e';
            const bR = centerDist - rPin;
            ctx.beginPath();
            ctx.arc(bR, 0, slotWidth / 2, -Math.PI / 2, Math.PI / 2, false);
            ctx.lineTo(rGeneva + 10, slotWidth / 2);
            ctx.lineTo(rGeneva + 10, -slotWidth / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }

          // 中心黄铜一字大螺丝
          drawBronzeScrew(ctx, 0, 0, 24, 0.45);
          ctx.restore();

          // -----------------------------------------------------------
          // B. 绘制实物主动轮 (右侧工件)
          // -----------------------------------------------------------
          ctx.save();
          ctx.translate(driverX, originY);
          ctx.rotate(driver.angle);

          // 1. 悬臂底板与拨销托架
          ctx.fillStyle = '#f8fafc';
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 36, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // 延伸拨销摇臂
          ctx.beginPath();
          ctx.moveTo(-18, 0);
          ctx.lineTo(-rPin, -12);
          ctx.arc(-rPin, 0, 14, -Math.PI / 2, Math.PI / 2, true);
          ctx.lineTo(-18, 18);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 2. 拨动圆销 (白色圆柱销，实物为垂直立柱)
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-rPin, 0, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // 3. 凸圆锁止盘 (实物右上部的大圆盘，除拨销侧开有让位缺口)
          ctx.fillStyle = '#f8fafc';
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          // 凸圆弧抱死段
          ctx.arc(0, 0, rLock, -Math.PI * 0.65, Math.PI * 0.65, false);
          // 拨销侧凹形避让缺口 (让槽轮尖齿通过)
          ctx.arc(-35, 0, 32, Math.PI * 0.35, -Math.PI * 0.35, true);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 主动轮中心黄铜一字大螺丝
          drawBronzeScrew(ctx, 0, 0, 20, 1.2);
          ctx.restore();

          // -----------------------------------------------------------
          // C. 实物底座标号 "09" (左下角工业刻字)
          // -----------------------------------------------------------
          ctx.fillStyle = '#1e242c';
          ctx.fillRect(originX - centerDist * 0.85, originY + 95, 48, 36);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.strokeRect(originX - centerDist * 0.85, originY + 95, 48, 36);

          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 22px ui-monospace, "SF Mono", monospace';
          ctx.fillText('09', originX - centerDist * 0.85 + 10, originY + 121);

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
          v2: `工位 ${station}/6 (${deg}°) [${isDriving ? '转位啮合中' : '凹弧锁死停歇'}]`
        };
      }
    };
  }
};
