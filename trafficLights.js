// Модуль светофора для перекрёстка
// Экспортирует:
// - Direction: { EW, NS }
// - initTrafficLightsForIntersection({ PIXI, app, layer, x, y, roadWidth, lampRadius, cycle })
// - keyForIntersection(x, y)
// - getDirectionForSegment(dx, dy)

export const Direction = { EW: 'EW', NS: 'NS' };

export function keyForIntersection (x, y) {
  return `${x},${y}`;
}

export function getDirectionForSegment (dx, dy) {
  return Math.abs(dx) >= Math.abs(dy) ? Direction.EW : Direction.NS;
}

export function initTrafficLightsForIntersection ({ PIXI, app, layer, x, y, roadWidth = 48, lampRadius = 8, cycle = { green: 4000, yellow: 1200 }, roadConnections = { north: true, south: true, east: true, west: true } }) {
  const tl = new IntersectionTrafficLight({ PIXI, app, layer, x, y, roadWidth, lampRadius, cycle, roadConnections });
  return tl;
}

class IntersectionTrafficLight {
  constructor ({ PIXI, app, layer, x, y, roadWidth, lampRadius, cycle, roadConnections }) {
    this.PIXI = PIXI;
    this.app = app;
    this.position = { x, y };
    this.roadWidth = roadWidth;
    this.lampRadius = lampRadius;
    this.cycle = { green: cycle.green, yellow: cycle.yellow };
    this.roadConnections = roadConnections;

    // Фазы: NS_GREEN -> NS_YELLOW -> EW_GREEN -> EW_YELLOW -> повтор
    this.phase = 'NS_GREEN';
    this.elapsedMs = 0;
    this.phaseDurationMs = this.cycle.green;

    this.root = new PIXI.Container();
    this.root.position.set(x, y);
    layer.addChild(this.root);

    this.heads = this.#createHeads();
    this.#updateVisuals();

    this._onTick = this._onTick.bind(this);
    this.app.ticker.add(this._onTick);
  }

  destroy () {
    this.app.ticker.remove(this._onTick);
    if (this.root && this.root.parent) this.root.parent.removeChild(this.root);
  }

  isPassAllowed (direction) {
    // Разрешено ехать при зелёном и жёлтом. Запрещено только на красный.
    if (direction === Direction.NS) return this.phase.startsWith('NS_');
    if (direction === Direction.EW) return this.phase.startsWith('EW_');
    return true;
  }

  _onTick () {
    this.elapsedMs += this.app.ticker.deltaMS;
    if (this.elapsedMs >= this.phaseDurationMs) {
      this.elapsedMs = 0;
      this.#advancePhase();
      this.#updateVisuals();
    }
  }

  #advancePhase () {
    if (this.phase === 'NS_GREEN') {
      this.phase = 'NS_YELLOW';
      this.phaseDurationMs = this.cycle.yellow;
      return;
    }
    if (this.phase === 'NS_YELLOW') {
      this.phase = 'EW_GREEN';
      this.phaseDurationMs = this.cycle.green;
      return;
    }
    if (this.phase === 'EW_GREEN') {
      this.phase = 'EW_YELLOW';
      this.phaseDurationMs = this.cycle.yellow;
      return;
    }
    // EW_YELLOW -> NS_GREEN
    this.phase = 'NS_GREEN';
    this.phaseDurationMs = this.cycle.green;
  }

  #createHeads () {
    const { PIXI } = this;
    const offset = this.roadWidth * 1.2; // увеличиваем расстояние от центра

    const makeHead = (orientation /* 'vertical' | 'horizontal' */) => {
      const c = new PIXI.Container();
      const g = new PIXI.Graphics();
      const isVertical = orientation === 'vertical';
      const bw = isVertical ? 22 : 54; // габариты корпуса
      const bh = isVertical ? 54 : 22;
      g.beginFill(0x111111).drawRoundedRect(-bw / 2, -bh / 2, bw, bh, 4).endFill();
      c.addChild(g);

      const red = new PIXI.Graphics();
      const yellow = new PIXI.Graphics();
      const green = new PIXI.Graphics();

      const r = this.lampRadius; // увеличенные фонари
      if (isVertical) {
        red.beginFill(0xff0000).drawCircle(0, -16, r).endFill();
        yellow.beginFill(0xffff00).drawCircle(0, 0, r).endFill();
        green.beginFill(0x00ff00).drawCircle(0, 16, r).endFill();
      } else {
        red.beginFill(0xff0000).drawCircle(-16, 0, r).endFill();
        yellow.beginFill(0xffff00).drawCircle(0, 0, r).endFill();
        green.beginFill(0x00ff00).drawCircle(16, 0, r).endFill();
      }
      c.addChild(red, yellow, green);
      return { container: c, red, yellow, green, orientation };
    };

    // Создаём только те головы, где есть дороги
    const heads = {};

    if (this.roadConnections.north) {
      const headN = makeHead('horizontal');
      headN.container.position.set(0, -offset);
      this.root.addChild(headN.container);
      heads.N = headN;
    }

    if (this.roadConnections.south) {
      const headS = makeHead('horizontal');
      headS.container.position.set(0, offset);
      this.root.addChild(headS.container);
      heads.S = headS;
    }

    if (this.roadConnections.west) {
      const headW = makeHead('vertical');
      headW.container.position.set(-offset, 0);
      this.root.addChild(headW.container);
      heads.W = headW;
    }

    if (this.roadConnections.east) {
      const headE = makeHead('vertical');
      headE.container.position.set(offset, 0);
      this.root.addChild(headE.container);
      heads.E = headE;
    }

    return heads;
  }

  #updateVisuals () {
    const isNS = this.phase.startsWith('NS_');
    const isEW = this.phase.startsWith('EW_');
    const isGreen = this.phase.endsWith('_GREEN');
    const isYellow = this.phase.endsWith('_YELLOW');

    const setHead = (head, state /* 'red'|'yellow'|'green' */) => {
      head.red.alpha = state === 'red' ? 1 : 0.2;
      head.yellow.alpha = state === 'yellow' ? 1 : 0.2;
      head.green.alpha = state === 'green' ? 1 : 0.2;
    };

    // NS группа (головы N,S)
    if (this.heads.N) {
      if (isNS && isGreen) {
        setHead(this.heads.N, 'green');
      } else if (isNS && isYellow) {
        setHead(this.heads.N, 'yellow');
      } else {
        setHead(this.heads.N, 'red');
      }
    }

    if (this.heads.S) {
      if (isNS && isGreen) {
        setHead(this.heads.S, 'green');
      } else if (isNS && isYellow) {
        setHead(this.heads.S, 'yellow');
      } else {
        setHead(this.heads.S, 'red');
      }
    }

    // EW группа (головы W,E)
    if (this.heads.W) {
      if (isEW && isGreen) {
        setHead(this.heads.W, 'green');
      } else if (isEW && isYellow) {
        setHead(this.heads.W, 'yellow');
      } else {
        setHead(this.heads.W, 'red');
      }
    }

    if (this.heads.E) {
      if (isEW && isGreen) {
        setHead(this.heads.E, 'green');
      } else if (isEW && isYellow) {
        setHead(this.heads.E, 'yellow');
      } else {
        setHead(this.heads.E, 'red');
      }
    }
  }
}


