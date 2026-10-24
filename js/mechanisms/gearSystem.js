// 机构 04：直齿圆柱齿轮啮合传动系 (Spur Gear System) - 教材第八章第三节
window.GearSystemMechanism = {
  nameZh: '圆柱齿轮传动系',
  nameEn: 'Cylindrical Gear Train',
  telemetryLabelsZh: { m1: '主动轮角速度', m2: '从动轮转速与速比' },
  telemetryLabelsEn: { m1: 'Driver Ang Vel', m2: 'Driven Vel & Ratio' },

  init(engine, width, height) {
    const { Bodies, Composite, Constraint, Body, Events } = Matter;
    const originX = width / 2;
    const originY = height / 2;

    // 齿轮工程参数：模数 m = 4.5
    const module = 4.5;
    const z1 = 18; // 主动齿轮齿数 (小齿轮)
    const z2 = 36; // 从动齿轮齿数 (大齿轮，传动比 i = 2)

    // 分度圆半径 (Pitch Radius) r = m * z / 2
    const r1 = (module * z1) / 2; // 40.5
    const r2 = (module * z2) / 2; // 81.0
    const centerDistance = r1 + r2; // 严密相切中心距 121.5

    const gear1X = originX - centerDistance / 3;
    const gear1Y = originY;
    const gear2X = gear1X + centerDistance;
    const gear2Y = originY;

    // 1. 创建两个物理刚体 (用于承载物理角度与鼠标交互)
    const gear1 = Bodies.circle(gear1X, gear1Y, r1, {
      frictionAir: 0.02,
      render: { visible: false } // 使用底层自定义高精度齿廓绘制
    });

    const gear2 = Bodies.circle(gear2X, gear2Y, r2, {
      frictionAir: 0.02,
      render: { visible: false }
    });

    // 2. 固定两齿轮旋转轴心 (Revolute Joints)
    const pivot1 = Constraint.create({
      pointA: { x: gear1X, y: gear1Y },
      bodyB: gear1,
      pointB: { x: 0, y: 0 },
      stiffness: 1,
      render: { strokeStyle: '#ffffff', lineWidth: 1 }
    });

    const pivot2 = Constraint.create({
      pointA: { x: gear2X, y: gear2Y },
      bodyB: gear2,
      pointB: { x: 0, y: 0 },
      stiffness: 1,
      render: { strokeStyle: '#ffffff', lineWidth: 1 }
    });

    // 3. 传动比刚性运动学约束方程：omega2 = -omega1 * (z1 / z2)
    const ratio = z1 / z2; // 0.5
    const updateGearConstraint = () => {
      // 从动齿轮角度严格反向锁死在速比相位上
      Body.setAngle(gear2, -gear1.angle * ratio);
      Body.setAngularVelocity(gear2, -gear1.angularVelocity * ratio);
    };

    Events.on(engine, 'beforeUpdate', updateGearConstraint);

    // 4. 精密工程齿廓与分度圆绘制器
    const renderCustomGears = (event) => {
      const ctx = event.source.context;
      if (!ctx) return;

      const drawGear = (x, y, radius, teeth, angle, isDriver) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // 绘制齿顶圆与齿廓折线
        ctx.strokeStyle = isDriver ? '#ffffff' : '#cbd5e1';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        const step = (Math.PI * 2) / teeth;
        const dedendum = radius - module * 1.25; // 齿根圆
        const addendum = radius + module * 1.0;  // 齿顶圆

        for (let i = 0; i < teeth; i++) {
          const a0 = i * step;
          const a1 = a0 + step * 0.25;
          const a2 = a0 + step * 0.5;
          const a3 = a0 + step * 0.75;
          const a4 = (i + 1) * step;

          // 齿根 -> 渐开线齿面过渡 -> 齿顶 -> 齿槽
          ctx.lineTo(Math.cos(a0) * dedendum, Math.sin(a0) * dedendum);
          ctx.lineTo(Math.cos(a1) * addendum, Math.sin(a1) * addendum);
          ctx.lineTo(Math.cos(a2) * addendum, Math.sin(a2) * addendum);
          ctx.lineTo(Math.cos(a3) * dedendum, Math.sin(a3) * dedendum);
          ctx.lineTo(Math.cos(a4) * dedendum, Math.sin(a4) * dedendum);
        }
        ctx.closePath();
        ctx.stroke();

        // 绘制工程基准：点划线分度圆 (Pitch Circle)
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 0.8;
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();

        // 轴心轴承孔与定位销标记
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.strokeStyle = '#94a3b8';
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.moveTo(-14, 0); ctx.lineTo(14, 0);
        ctx.moveTo(0, -14); ctx.lineTo(0, 14);
        ctx.stroke();

        ctx.restore();
      };

      drawGear(gear1.position.x, gear1.position.y, r1, z1, gear1.angle, true);
      drawGear(gear2.position.x, gear2.position.y, r2, z2, gear2.angle, false);
    };

    Events.on(engine.render, 'afterRender', renderCustomGears);

    Composite.add(engine.world, [gear1, pivot1, gear2, pivot2]);

    return {
      driveBody: gear1,
      bodiesToFriction: [gear1, gear2],
      destroy() {
        Events.off(engine, 'beforeUpdate', updateGearConstraint);
        Events.off(engine.render, 'afterRender', renderCustomGears);
      },
      getTelemetry() {
        const w1 = (gear1.angularVelocity * 60).toFixed(2);
        const w2 = (gear2.angularVelocity * 60).toFixed(2);
        return {
          v1: `${w1} rad/s`,
          v2: `${w2} rad/s (i = 2.0)`
        };
      }
    };
  }
};
