// 机构 03：偏心凸轮直动推杆机构 (Cam & Follower) - 高副点接触纯物理仿真版
window.CamFollowerMechanism = {
  nameZh: '偏心凸轮直动推杆机构',
  nameEn: 'Eccentric Cam-Follower Mechanism',
  telemetryLabelsZh: { m1: '凸轮角速度', m2: '推杆瞬时升程' },
  telemetryLabelsEn: { m1: 'Cam Ang Vel', m2: 'Follower Lift' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events, Body } = Matter;
    const originX = width / 2;
    const originY = height / 2 + 80;

    const baseRadius = 55;   // 凸轮基圆半径
    const eccentricity = 28; // 偏心距 e
    const rodWidth = 14;
    const rodHeight = 160;
    const footWidth = 60;   // 平底推头宽度
    const footHeight = 8;

    // 1. 偏心凸轮刚体
    const cam = Bodies.circle(originX, originY - eccentricity, baseRadius, {
      collisionFilter: { group: 1 },
      friction: 0.1,
      restitution: 0,
      frictionAir: 0.015,
      render: { strokeStyle: '#ffffff', lineWidth: 1.5 }
    });

    // 偏心固定铰链 (Pivot)
    const camPivot = Constraint.create({
      pointA: { x: originX, y: originY },
      bodyB: cam,
      pointB: { x: 0, y: eccentricity },
      stiffness: 1,
      render: { strokeStyle: '#64748b', lineWidth: 1 }
    });

    // 2. T 型平底直动从动件 (Follower) - 贴合在凸轮最高点
    const camTopY = originY - eccentricity - baseRadius;
    const followerFoot = Bodies.rectangle(originX, camTopY - footHeight / 2, footWidth, footHeight, {
      collisionFilter: { group: 1 },
      friction: 0.1,
      restitution: 0
    });
    const followerStem = Bodies.rectangle(originX, camTopY - footHeight - rodHeight / 2, rodWidth, rodHeight, {
      collisionFilter: { group: 1 },
      friction: 0.1,
      restitution: 0
    });

    // 将平底推头和竖直立柱复合成一个完整推杆刚体
    const follower = Body.create({
      parts: [followerFoot, followerStem],
      frictionAir: 0.03,
      render: { strokeStyle: '#ffffff', lineWidth: 1.2 }
    });

    // 严格限位导向：每一帧校正 X 坐标与垂直姿态（模拟精密导向套筒）
    const keepVertical = () => {
      Body.setPosition(follower, { x: originX, y: follower.position.y });
      Body.setAngle(follower, 0);
      Body.setAngularVelocity(follower, 0);
    };
    Events.on(engine, 'beforeUpdate', keepVertical);

    // 3. 回程预紧弹簧：给推杆向下的弹力，确保时刻压紧在凸轮接触面上
    const springAnchorY = camTopY - footHeight - rodHeight - 60;
    const spring = Constraint.create({
      pointA: { x: originX, y: springAnchorY },
      bodyB: follower,
      pointB: { x: 0, y: -rodHeight / 2 - footHeight },
      stiffness: 0.08,
      damping: 0.05,
      length: 50,
      render: { strokeStyle: '#38bdf8', lineWidth: 1 }
    });

    // 4. 辅助导轨线框 (机架导向套)
    const guideLeft = Constraint.create({
      pointA: { x: originX - rodWidth / 2 - 4, y: camTopY - 30 },
      pointB: { x: originX - rodWidth / 2 - 4, y: camTopY - rodHeight - 40 },
      stiffness: 1,
      render: { strokeStyle: '#262d35', lineWidth: 1 }
    });
    const guideRight = Constraint.create({
      pointA: { x: originX + rodWidth / 2 + 4, y: camTopY - 30 },
      pointB: { x: originX + rodWidth / 2 + 4, y: camTopY - rodHeight - 40 },
      stiffness: 1,
      render: { strokeStyle: '#262d35', lineWidth: 1 }
    });

    Composite.add(engine.world, [cam, camPivot, follower, spring, guideLeft, guideRight]);

    const initialY = follower.position.y;

    return {
      driveBody: cam,
      bodiesToFriction: [cam, follower],
      destroy() {
        Events.off(engine, 'beforeUpdate', keepVertical);
      },
      getTelemetry() {
        const lift = (initialY - follower.position.y).toFixed(1);
        return {
          v1: `${(cam.angularVelocity * 60).toFixed(2)} rad/s`,
          v2: `${Math.max(0, lift)} px`
        };
      }
    };
  }
};
