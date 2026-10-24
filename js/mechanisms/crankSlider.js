// 机构 01：平面曲柄滑块机构 (Crank-Slider) - 教材第七章第二节
window.CrankSliderMechanism = {
  nameZh: '平面曲柄滑块机构',
  nameEn: 'Planar Crank-Slider Mechanism',
  telemetryLabelsZh: { m1: '主动角速度', m2: '滑块位移' },
  telemetryLabelsEn: { m1: 'Drive Angular Vel', m2: 'Slider Stroke' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint } = Matter;
    const originX = width / 2 - 120;
    const originY = height / 2;
    const crankRadius = 60;
    const rodLength = 220;

    const crank = Bodies.circle(originX, originY, crankRadius, {
      collisionFilter: { group: -1 },
      frictionAir: 0.02
    });

    const crankPivot = Constraint.create({
      pointA: { x: originX, y: originY },
      bodyB: crank,
      pointB: { x: 0, y: 0 },
      stiffness: 1,
      render: { strokeStyle: '#ffffff', lineWidth: 1 }
    });

    const slider = Bodies.rectangle(originX + rodLength, originY, 70, 36, {
      collisionFilter: { group: -1 },
      frictionAir: 0.02
    });

    const sliderTrack = Constraint.create({
      pointA: { x: originX + rodLength, y: originY },
      bodyB: slider,
      pointB: { x: 0, y: 0 },
      stiffness: 0.05,
      length: 0,
      render: { strokeStyle: '#262d35', lineWidth: 1 }
    });

    const rod = Constraint.create({
      bodyA: crank,
      pointA: { x: crankRadius - 10, y: 0 },
      bodyB: slider,
      pointB: { x: -30, y: 0 },
      stiffness: 1,
      length: rodLength,
      render: { strokeStyle: '#ffffff', lineWidth: 1.5 }
    });

    Composite.add(engine.world, [crank, crankPivot, slider, sliderTrack, rod]);

    return {
      driveBody: crank,
      bodiesToFriction: [crank, slider],
      getTelemetry() {
        return {
          v1: `${(crank.angularVelocity * 60).toFixed(2)} rad/s`,
          v2: `${(slider.position.x - originX).toFixed(1)} px`
        };
      }
    };
  }
};
