// 机构 03：偏心凸轮直动推杆机构 (Cam & Follower) - 精密接触与导向修正版
window.CamFollowerMechanism = {
  nameZh: '偏心凸轮直动推杆机构',
  nameEn: 'Eccentric Cam-Follower Mechanism',
  telemetryLabelsZh: { m1: '凸轮角速度', m2: '推杆瞬时升程' },
  telemetryLabelsEn: { m1: 'Cam Ang Vel', m2: 'Follower Lift' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events, Body } = Matter;
    const originX = width / 2;
    const originY = height / 2 + 70;

    const baseRadius = 55;   // 凸轮基圆基准
    const eccentricity = 28; // 偏心距 e
    const followerWidth = 32;
    const followerHeight = 150;

    // 1. 偏心凸轮 (圆心偏离固定旋转轴)
    const cam = Bodies.circle(originX, originY - eccentricity, baseRadius, {
      friction: 0.1,
      restitution: 0,
      frictionAir: 0.015,
      render: { strokeStyle: '#ffffff', lineWidth: 1.5 }
    });

    // 偏心回转轴心 (Pivot)
    const camPivot = Constraint.create({
      pointA: { x: originX, y: originY },
      bodyB: cam,
      pointB: { x: 0, y: eccentricity },
      stiffness: 1,
      render: { strokeStyle: '#64748b', lineWidth: 1 }
    });

    // 2. 直动推杆：底端精准贴紧凸轮接触面
    // 计算初始凸轮最高点：originY - eccentricity - baseRadius
    const initialCamTop = originY - eccentricity - baseRadius;
    const followerInitialY = initialCamTop - followerHeight / 2;

    const follower = Bodies.rectangle(originX, followerInitialY, followerWidth, followerHeight, {
      friction: 0.1,
      restitution: 0,
      frictionAir: 0.02,
      render: { strokeStyle: '#ffffff', lineWidth: 1.2 }
    });

    // 严密约束：利用物理循环严格锁定推杆仅在 X 轴中心线上垂直移动 (无摩擦导套效果)
    const lockXConstraint = () => {
      Body.setPosition(follower, { x: originX, y: follower.position.y });
      Body.setAngle(follower, 0);
      Body.setAngularVelocity(follower, 0);
    };
    Events.on(engine, 'beforeUpdate', lockXConstraint);

    // 3. 预紧回程弹簧 (将推杆轻压在凸轮上)
    const springAnchorY = originY - baseRadius - eccentricity - followerHeight - 80;
    const spring = Constraint.create({
      pointA: { x: originX, y: springAnchorY },
      bodyB: follower,
      pointB: { x: 0, y: -followerHeight / 2 },
      stiffness: 0.08,
      damping: 0.05,
      render: { strokeStyle: '#38bdf8', lineWidth: 1 }
    });

    // 4. 辅助导轨外框标线
    const leftGuide = Constraint.create({
      pointA: { x: originX - followerWidth / 2 - 4, y: originY - 60 },
      pointB: { x: originX - followerWidth / 2 - 4, y: originY - 260 },
      stiffness: 1,
      render: { strokeStyle: '#262d35', lineWidth: 1 }
    });

    const rightGuide = Constraint.create({
      pointA: { x: originX + followerWidth / 2 + 4, y: originY - 60 },
      pointB: { x: originX + followerWidth / 2 + 4, y: originY - 260 },
      stiffness: 1,
      render: { strokeStyle: '#262d35', lineWidth: 1 }
    });

    Composite.add(engine.world, [cam, camPivot, follower, spring, leftGuide, rightGuide]);

    // 基准面高度记录
    const datumLowestY = followerInitialY;

    return {
      driveBody: cam,
      bodiesToFriction: [cam, follower],
      destroy() {
        Events.off(engine, 'beforeUpdate', lockXConstraint);
      },
      getTelemetry() {
        // 计算推杆向上被顶起的升程
        const lift = (datumLowestY - follower.position.y).toFixed(1);
        return {
          v1: `${(cam.angularVelocity * 60).toFixed(2)} rad/s`,
          v2: `${Math.max(0, lift)} px`
        };
      }
    };
  }
};
