// 机构 03：偏心凸轮直动推杆机构 (Cam & Follower) - 完美贴合稳定版
window.CamFollowerMechanism = {
  nameZh: '偏心凸轮直动推杆机构',
  nameEn: 'Eccentric Cam-Follower Mechanism',
  telemetryLabelsZh: { m1: '凸轮角速度', m2: '推杆瞬时升程' },
  telemetryLabelsEn: { m1: 'Cam Ang Vel', m2: 'Follower Lift' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Events, Body } = Matter;
    const originX = width / 2;
    const originY = height / 2 + 60; // 偏心轴旋转中心

    const baseRadius = 55;   // 凸轮半径 R
    const eccentricity = 28; // 偏心距 e
    const stemWidth = 14;    // 推杆杆身宽度
    const stemHeight = 150;  // 推杆杆身长度
    const footWidth = 60;    // 平底推头宽度 (确保无论怎么转都稳稳托住)
    const footHeight = 8;    // 平底推头厚度

    // 1. 偏心凸轮刚体 (圆心在 originX, originY，回转轴也在 originX, originY)
    const cam = Bodies.circle(originX, originY, baseRadius, {
      frictionAir: 0.02,
      collisionFilter: { group: -1 },
      render: { strokeStyle: '#ffffff', lineWidth: 1.5 }
    });

    // 偏心固定轴心：通过偏置约束将回转中心定在偏心位置
    const camPivot = Constraint.create({
      pointA: { x: originX, y: originY },
      bodyB: cam,
      pointB: { x: 0, y: eccentricity }, // 铰接在离圆心 eccentricity 处
      stiffness: 1,
      render: { strokeStyle: '#64748b', lineWidth: 1 }
    });

    // 2. T型平底推杆刚体 (避免单根细杆穿模，工科标准的平底从动件)
    const followerFoot = Bodies.rectangle(originX, originY, footWidth, footHeight, {
      collisionFilter: { group: -1 }
    });
    const followerStem = Bodies.rectangle(originX, originY - stemHeight / 2, stemWidth, stemHeight, {
      collisionFilter: { group: -1 }
    });
    const follower = Body.create({
      parts: [followerFoot, followerStem],
      collisionFilter: { group: -1 },
      frictionAir: 0.02,
      render: { strokeStyle: '#ffffff', lineWidth: 1.2 }
    });

    // 3. 辅助导向套筒与机架支座线框
    const guideL = Constraint.create({
      pointA: { x: originX - stemWidth / 2 - 4, y: originY - 60 },
      pointB: { x: originX - stemWidth / 2 - 4, y: originY - 260 },
      stiffness: 1,
      render: { strokeStyle: '#262d35', lineWidth: 1 }
    });
    const guideR = Constraint.create({
      pointA: { x: originX + stemWidth / 2 + 4, y: originY - 60 },
      pointB: { x: originX + stemWidth / 2 + 4, y: originY - 260 },
      stiffness: 1,
      render: { strokeStyle: '#262d35', lineWidth: 1 }
    });

    // 4. 核心几何联动循环：每一帧强制平底推头切在凸轮的瞬时上表面
    const syncFollower = () => {
      // 凸轮质心(圆心)的实时世界坐标
      const camCenterX = cam.position.x;
      const camCenterY = cam.position.y;

      // 平底推件切于凸轮最高顶点：凸轮圆心高度减去半径 R
      const camTopSurfaceY = camCenterY - baseRadius;

      // 推杆平底底面必须贴在 camTopSurfaceY
      // 推杆整体质心高度 = 底面高度 - 半高
      const targetFollowerY = camTopSurfaceY - (stemHeight / 2);

      Body.setPosition(follower, { x: originX, y: targetFollowerY });
      Body.setAngle(follower, 0);
      Body.setVelocity(follower, { x: 0, y: 0 });
      Body.setAngularVelocity(follower, 0);
    };

    Events.on(engine, 'beforeUpdate', syncFollower);

    Composite.add(engine.world, [cam, camPivot, follower, guideL, guideR]);

    // 最低位置基准 (当凸轮圆心转到最低点时)
    const lowestY = originY - (baseRadius - eccentricity) - (stemHeight / 2);

    return {
      driveBody: cam,
      bodiesToFriction: [cam],
      destroy() {
        Events.off(engine, 'beforeUpdate', syncFollower);
      },
      getTelemetry() {
        const lift = (lowestY - follower.position.y).toFixed(1);
        return {
          v1: `${(cam.angularVelocity * 60).toFixed(2)} rad/s`,
          v2: `${Math.max(0, lift)} px (升程)`
        };
      }
    };
  }
};
