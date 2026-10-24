// 机构 07：牛头刨床摆动导杆急回机构 (Quick-Return Shaper) - 工业实体版
window.QuickReturnMechanism = {
  nameZh: '摆动导杆急回机构',
  nameEn: 'Quick-Return Mechanism',
  telemetryLabelsZh: { m1: '曲柄转速', m2: '冲头位移 (急回比 K=1.4)' },
  telemetryLabelsEn: { m1: 'Crank Speed', m2: 'Ram Position' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events } = Matter;
    const originX = width / 2;
    const originY = height / 2;

    const crankPivotY = originY + 20; // 曲柄回转中心
    const leverPivotY = originY + 120; // 导杆底座支承点
    const rCrank = 48;                 // 曲柄回转半径
    const lLever = 260;                // 导杆有效工作长度
    const ramGuideY = leverPivotY - lLever - 25; // 顶部刨头水平滑轨高度
    const connectRodL = 70;            // 顶端连接连杆长度

    const crank = Bodies.circle(originX, crankPivotY, rCrank, { frictionAir: 0.02, render: { visible: false } });
    const pCrank = Constraint.create({ pointA: { x: originX, y: crankPivotY }, bodyB: crank, pointB: { x: 0, y: 0 }, stiffness: 1 });

    let isRunning = true;
    let leverAngle = 0;
    let ramX = originX;

    const updateKinematics = () => {
      // 1. 曲柄销块瞬时坐标
      const pinX = originX + rCrank * Math.cos(crank.angle);
      const pinY = crankPivotY + rCrank * Math.sin(crank.angle);

      // 2. 导杆随滑块摆动的瞬时倾角
      leverAngle = Math.atan2(pinX - originX, leverPivotY - pinY);

      // 3. 导杆顶端铰点坐标
      const topX = originX + lLever * Math.sin(leverAngle);
      const topY = leverPivotY - lLever * Math.cos(leverAngle);

      // 4. 水平刨刀冲头 (Ram) 几何约束解算
      const dy = ramGuideY - topY;
      const dx = Math.sqrt(Math.max(0, connectRodL * connectRodL - dy * dy));
      ramX = topX + dx;
    };
    Events.on(engine, 'beforeUpdate', updateKinematics);

    const canvas = document.querySelector('#viewport canvas');
    function draw() {
      if (!isRunning) return;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();

          const pinX = originX + rCrank * Math.cos(crank.angle);
          const pinY = crankPivotY + rCrank * Math.sin(crank.angle);
          const topX = originX + lLever * Math.sin(leverAngle);
          const topY = leverPivotY - lLever * Math.cos(leverAngle);

          // 1. 机架机床立柱导轨基准
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#27313a';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(originX - 180, ramGuideY);
          ctx.lineTo(originX + 180, ramGuideY); // 顶部滑轨线
          ctx.moveTo(originX, crankPivotY);
          ctx.lineTo(originX, leverPivotY);   // 竖直轴承支柱
          ctx.stroke();
          ctx.setLineDash([]);

          // 2. 旋转曲柄盘
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(originX, crankPivotY, rCrank, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.strokeStyle = '#ffffff';
          ctx.moveTo(originX, crankPivotY);
          ctx.lineTo(pinX, pinY);
          ctx.stroke();

          // 3. 实体中空摆动导杆 (Slotted Lever)
          ctx.save();
          ctx.translate(originX, leverPivotY);
          ctx.rotate(leverAngle);
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.5;
          // 导槽外框 (双边导轨)
          ctx.strokeRect(-10, -lLever, 20, lLever);
          // 内部镂空导槽
          ctx.strokeStyle = '#334155';
          ctx.strokeRect(-5, -lLever + 15, 10, lLever - 30);
          // 底部支点铰座
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.strokeStyle = '#94a3b8';
          ctx.stroke();
          ctx.restore();

          // 4. 导槽滑块 (Slider Block 嵌在槽内)
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(pinX - 7, pinY - 7, 14, 14);
          ctx.strokeStyle = '#ffffff';
          ctx.strokeRect(pinX - 7, pinY - 7, 14, 14);

          // 5. 顶端推杆与水平刨刀冲头 (Shaper Ram)
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(topX, topY);
          ctx.lineTo(ramX, ramGuideY);
          ctx.stroke();

          // 刨刀滑块冲头
          ctx.fillStyle = '#1e2631';
          ctx.strokeStyle = '#38bdf8';
          ctx.fillRect(ramX - 25, ramGuideY - 12, 50, 24);
          ctx.strokeRect(ramX - 25, ramGuideY - 12, 50, 24);

          // 刨刀刀尖 (Tool Bit)
          ctx.strokeStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(ramX + 25, ramGuideY + 6);
          ctx.lineTo(ramX + 35, ramGuideY + 16);
          ctx.lineTo(ramX + 25, ramGuideY + 16);
          ctx.stroke();

          ctx.restore();
        }
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    Composite.add(engine.world, [crank, pCrank]);

    return {
      driveBody: crank,
      bodiesToFriction: [crank],
      destroy() {
        isRunning = false;
        Events.off(engine, 'beforeUpdate', updateKinematics);
      },
      getTelemetry() {
        const strokeDisp = (ramX - originX).toFixed(1);
        return {
          v1: `${(crank.angularVelocity * 60).toFixed(2)} rad/s`,
          v2: `${strokeDisp} px (冲头行程)`
        };
      }
    };
  }
};
