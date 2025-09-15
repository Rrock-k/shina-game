// Рендерер для светофоров
// Отвечает только за визуальное представление светофоров в PIXI.js
// Получает состояние через метод updateVisuals(trafficLightState)

export class TrafficLightRenderer {
  constructor({ PIXI, app, layer, x, y, roadWidth = 48, lampRadius = 8, roadConnections = { north: true, south: true, east: true, west: true } }) {
    this.PIXI = PIXI;
    this.app = app;
    this.position = { x, y };
    this.roadWidth = roadWidth;
    this.lampRadius = lampRadius;
    this.roadConnections = roadConnections;

    this.root = new PIXI.Container();
    this.root.position.set(x, y);
    layer.addChild(this.root);

    this.heads = this.#createHeads();
  }

  destroy() {
    if (this.root && this.root.parent) {
      this.root.parent.removeChild(this.root);
    }
  }

  updateVisuals(trafficLightState) {
    const setHead = (head, state /* 'red'|'yellow'|'green' */) => {
      head.red.alpha = state === 'red' ? 1 : 0.2;
      head.yellow.alpha = state === 'yellow' ? 1 : 0.2;
      head.green.alpha = state === 'green' ? 1 : 0.2;
    };

    // Во время задержки все светофоры показывают красный
    if (trafficLightState.isDelayActive) {
      if (this.heads.N) setHead(this.heads.N, 'red');
      if (this.heads.S) setHead(this.heads.S, 'red');
      if (this.heads.W) setHead(this.heads.W, 'red');
      if (this.heads.E) setHead(this.heads.E, 'red');
      return;
    }

    const isNS = trafficLightState.phase.startsWith('NS_');
    const isEW = trafficLightState.phase.startsWith('EW_');
    const isGreen = trafficLightState.phase.endsWith('_GREEN');
    const isYellow = trafficLightState.phase.endsWith('_YELLOW');

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

  #createHeads() {
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
}
