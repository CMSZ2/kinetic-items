// 机构 02：铰链四连杆曲柄摇杆机构 (Four-Bar Linkage) - 教材第七章第二节
window.FourBarMechanism = {
  nameZh: '铰链四连杆曲柄摇杆机构',
  nameEn: 'Four-Bar Crank-Rocker Mechanism',
  telemetryLabelsZh: { m1: '曲柄角速度', m2: '摇杆摆角估测' },
  telemetryLabelsEn: { m1: 'Crank Ang Vel', m2: 'Rocker Oscillation' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint } = Matter;
    const originX = width / 2 - 130;
    const originY = height / 2 + 30;
    
    // 杆件尺寸满足格拉斯霍夫准则 (曲柄最短杆)
    const rCrank = 45;       // 主动曲柄杆长
    const lCoupler = 190;     // 连杆长度
    const lRocker = 110;     // 从动摇杆长度
    const distFrame = 180;    // 机架固定支点间距

    // 1. 主动曲柄圆盘
    const crank = Bodies.circle(originX, originY, rCrank, {
      collisionFilter: { group: -1 },
      frictionAir: 0.02
    });
    const pivotA = Constraint.create({
      pointA: { x: originX, y: originY },
      bodyB: crank,
      pointB: { x: 0, y: 0 },
      stiffness: 1,
      render: { strokeStyle: '#ffffff', lineWidth: 1 }
    });

    // 2. 从动摇杆杆件
    const rockerPivotX = originX + distFrame;
    const rockerPivotY = originY;
    const rocker = Bodies.rectangle(rockerPivotX, rockerPivotY - lRocker / 2, 14, lRocker, {
      collisionFilter: { group: -1 },
      frictionAir: 0.02
    });
    const pivotD = Constraint.create({
      pointA: { x: rockerPivotX, y: rockerPivotY },
      bodyB: rocker,
      pointB: { x: 0, y: lRocker / 2 },
      stiffness: 1,
      render: { strokeStyle: '#64748b', lineWidth: 1 }
    });

    // 3. 中间连杆约束
    const coupler = Constraint.create({
      bodyA: crank,
      pointA: { x: rCrank - 5, y: 0 },
      bodyB: rocker,
      pointB: { x: 0, y: -lRocker / 2 },
      stiffness: 1,
      length: lCoupler,
      render: { strokeStyle: '#ffffff', lineWidth: 1.5 }
    });

    // 4. 机架参考底座线 (视觉参考)
    const frameBase = Constraint.create({
      pointA: { x: originX, y: originY },
      pointB: { x: rockerPivotX, y: rockerPivotY },
      stiffness: 1,
      render: { strokeStyle: '#262d35', lineWidth: 1 }
    });

    Composite.add(engine.world, [crank, pivotA, rocker, pivotD, coupler, frameBase]);

    return {
      driveBody: crank,
      bodiesToFriction: [crank, rocker],
      getTelemetry() {
        return {
          v1: `${(crank.angularVelocity * 60).toFixed(2)} rad/s`,
          v2: `${((rocker.angle * 180) / Math.PI).toFixed(1)}°`
        };
      }
    };
  }
};
