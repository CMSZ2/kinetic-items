// 机构 03：偏心凸轮直动推杆机构 (Cam & Follower) - 精密运动学接触版
window.CamFollowerMechanism = {
  nameZh: '偏心凸轮直动推杆机构',
  nameEn: 'Eccentric Cam-Follower Mechanism',
  telemetryLabelsZh: { m1: '凸轮角速度', m2: '推杆瞬时升程' },
  telemetryLabelsEn: { m1: 'Cam Ang Vel', m2: 'Follower Lift' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events, Body } = Matter;
    const originX = width / 2;
    const originY = height / 2 + 60;

    const baseRadius = 55;   // 凸轮基圆半径 R
    const eccentricity = 28; // 偏心距 e
    const rodWidth = 28;
    const rodHeight = 140;

    // 1. 偏心凸轮刚体
    const cam = Bodies.circle(originX, originY - eccentricity, baseRadius, {
      frictionAir: 0.02,
      collisionFilter: { group: -1 },
      render: { strokeStyle: '#ffffff', lineWidth: 1.5 }
    });

    // 固定偏心旋转轴心 (Pivot)
    const camPivot = Constraint.create({
      pointA: { x: originX, y: originY },
      bodyB: cam,
      pointB: { x: 0, y: eccentricity },
      stiffness: 1,
      render: { strokeStyle: '#64748b', lineWidth: 1 }
    });

    // 2. 直动从动推杆
    const follower = Bodies.rectangle(originX, originY - baseRadius - rodHeight / 2, rodWidth, rodHeight, {
      collisionFilter: { group: -1 },
      frictionAir: 0.02,
      render: { strokeStyle: '#ffffff', lineWidth: 1.2 }
    });

    // 3. 动态弹簧动画表现
    const springAnchorY = originY - baseRadius - eccentricity - rodHeight - 50;
    const spring = Constraint.create({
      pointA: { x: originX, y: springAnchorY },
      bodyB: follower,
      pointB: { x: 0, y: -rodHeight / 2 },
      stiffness: 0.05,
      render: { strokeStyle: '#38bdf8', lineWidth: 1.2 }
    });

    // 4. 辅助导向套筒线框
    const guideL = Constraint.create({
      pointA: { x: originX - rodWidth / 2 - 4, y: originY - 40 },
      pointB: { x: originX - rodWidth / 2 - 4, y: originY - 240 },
      stiffness: 1,
      render: { strokeStyle: '#262d35', lineWidth: 1 }
    });
    const guideR = Constraint.create({
      pointA: { x: originX + rodWidth / 2 + 4, y: originY - 40 },
      pointB: { x: originX + rodWidth / 2 + 4, y: originY - 240 },
      stiffness: 1,
      render: { strokeStyle: '#262d35', lineWidth: 1 }
    });

    // 5. 运动学轮廓解析：每一帧强制推杆底面贴紧凸轮接触面
    const updateCamFollower = () => {
      // 偏心圆心在世界坐标系下的实时位置
      const theta = cam.angle;
      const camCenterX = originX - eccentricity * Math.sin(theta);
      const camCenterY = originY - eccentricity * Math.cos(theta);

      // 计算偏心圆与竖直推杆中心线 (X = originX) 相交的最高点 Y
      const dx = originX - camCenterX;
      const dy = Math.sqrt(Math.max(0, baseRadius * baseRadius - dx * dx));
      const contactY = camCenterY - dy;

      // 推杆质心位置 Y = 接触面高度 - 推杆半高
      const targetFollowerY = contactY - rodHeight / 2;

      Body.setPosition(follower, { x: originX, y: targetFollowerY });
      Body.setAngle(follower, 0);
      Body.setVelocity(follower, { x: 0, y: 0 });
      Body.setAngularVelocity(follower, 0);
    };

    Events.on(engine, 'beforeUpdate', updateCamFollower);

    Composite.add(engine.world, [cam, camPivot, follower, spring, guideL, guideR]);

    // 推杆最低点基准
    const lowestDatumY = originY - (baseRadius - eccentricity) - rodHeight / 2;

    return {
      driveBody: cam,
      bodiesToFriction: [cam],
      destroy() {
        Events.off(engine, 'beforeUpdate', updateCamFollower);
      },
      getTelemetry() {
        const lift = (lowestDatumY - follower.position.y).toFixed(1);
        return {
          v1: `${(cam.angularVelocity * 60).toFixed(2)} rad/s`,
          v2: `${Math.max(0, lift)} px (升程)`
        };
      }
    };
  }
};
