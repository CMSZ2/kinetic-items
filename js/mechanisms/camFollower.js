// 机构 03：偏心凸轮直动推杆机构 (Cam & Follower) - 教材第七章第三节
window.CamFollowerMechanism = {
  nameZh: '偏心凸轮直动推杆机构',
  nameEn: 'Eccentric Cam-Follower Mechanism',
  telemetryLabelsZh: { m1: '凸轮角速度', m2: '推杆瞬时升程' },
  telemetryLabelsEn: { m1: 'Cam Ang Vel', m2: 'Follower Lift' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint } = Matter;
    const originX = width / 2;
    const originY = height / 2 + 50;

    const baseRadius = 55;   // 凸轮基圆基准
    const eccentricity = 28; // 偏心距 e
    const followerWidth = 36;
    const followerHeight = 140;

    // 1. 偏心凸轮 (圆心偏离固定旋转轴)
    const cam = Bodies.circle(originX, originY - eccentricity, baseRadius, {
      friction: 0.05,
      restitution: 0,
      frictionAir: 0.015,
      render: { strokeStyle: '#ffffff', lineWidth: 1.2 }
    });

    // 凸轮固定回转中心 (Pivot)
    const camPivot = Constraint.create({
      pointA: { x: originX, y: originY },
      bodyB: cam,
      pointB: { x: 0, y: eccentricity }, // 铰接点偏离质心即形成偏心轮
      stiffness: 1,
      render: { strokeStyle: '#64748b', lineWidth: 1 }
    });

    // 2. 竖直直动推杆 (Follower)
    const followerInitialY = originY - baseRadius - eccentricity - followerHeight / 2 - 2;
    const follower = Bodies.rectangle(originX, followerInitialY, followerWidth, followerHeight, {
      friction: 0.05,
      restitution: 0,
      frictionAir: 0.02,
      render: { strokeStyle: '#ffffff', lineWidth: 1 }
    });

    // 推杆垂直移动导向副约束 (限制其仅在 Y 轴滑动)
    const guideConstraint = Constraint.create({
      pointA: { x: originX, y: originY - 180 },
      bodyB: follower,
      pointB: { x: 0, y: 0 },
      stiffness: 0.08,
      length: 0,
      render: { strokeStyle: '#1f262e', lineWidth: 1 }
    });

    // 回程弹簧 (保证推杆与凸轮轮廓贴合)
    const spring = Constraint.create({
      pointA: { x: originX, y: originY - 260 },
      bodyB: follower,
      pointB: { x: 0, y: -followerHeight / 2 },
      stiffness: 0.03,
      damping: 0.02,
      render: { strokeStyle: '#38bdf8', lineWidth: 1 }
    });

    // 3. 辅助参考几何 (基圆轮廓与导轨滑道线)
    const leftGuide = Constraint.create({
      pointA: { x: originX - followerWidth / 2 - 4, y: originY - 80 },
      pointB: { x: originX - followerWidth / 2 - 4, y: originY - 240 },
      stiffness: 1,
      render: { strokeStyle: '#262d35', lineWidth: 1 }
    });

    const rightGuide = Constraint.create({
      pointA: { x: originX + followerWidth / 2 + 4, y: originY - 80 },
      pointB: { x: originX + followerWidth / 2 + 4, y: originY - 240 },
      stiffness: 1,
      render: { strokeStyle: '#262d35', lineWidth: 1 }
    });

    Composite.add(engine.world, [cam, camPivot, follower, guideConstraint, spring, leftGuide, rightGuide]);

    // 记录初始基准高度用于计算相对升程
    const datumY = follower.position.y;

    return {
      driveBody: cam,
      bodiesToFriction: [cam, follower],
      getTelemetry() {
        const lift = (datumY - follower.position.y).toFixed(1);
        return {
          v1: `${(cam.angularVelocity * 60).toFixed(2)} rad/s`,
          v2: `${Math.max(0, lift)} px`
        };
      }
    };
  }
};
