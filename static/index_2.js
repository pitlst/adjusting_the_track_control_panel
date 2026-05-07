const { Leafer, Line, Rect, Group, Text } = LeaferUI;

const leafer = new Leafer({
    view: window,
    width: 1920,
    height: 1080,
    fill: "#000000",
});

const bg = new Rect({
    x: 0, y: 0, width: 1920, height: 1080,
    fill: {
        type: "radial",
        stops: [
            { offset: 0, color: "#0d1424" },
            { offset: 0.6, color: "#080c18" },
            { offset: 1, color: "#000000" },
        ],
    },
});
leafer.add(bg);

const grid = new Group();
for (let x = 0; x < 1920; x += 27) {
    for (let y = 0; y < 1080; y += 27) {
        grid.add(new Rect({
            x, y, width: 2, height: 2,
            fill: "#1a2438", cornerRadius: 1,
        }));
    }
}
leafer.add(grid);

const C_RAIL_WHITE = "#ffffff";
const C_SLEEPER_BLUE = "#3498db";
const C_GREEN = "#2ecc71";
const C_BLUE = "#3498db";

const trackLayer = new Group();
const labelLayer = new Group();
const trainLayer = new Group();
leafer.add(trackLayer);
leafer.add(labelLayer);
leafer.add(trainLayer);

// ========== Track 类 (GB 1435 标准轨距上视图) ==========
class Track {
    constructor(points, gauge = 14, railColor = C_RAIL_WHITE) {
        this.points = points;
        this.gauge = gauge;
        this.railColor = railColor;
        this.activeColor = railColor;
        this.label = { text: "", color: C_BLUE, size: 16 };

        // 计算轨道方向向量和法向量
        const dx = points[2] - points[0];
        const dy = points[3] - points[1];
        const len = Math.sqrt(dx * dx + dy * dy);
        this.unitX = dx / len;
        this.unitY = dy / len;
        this.perpX = -this.unitY;
        this.perpY = this.unitX;
        this.trackLen = len;

        // 枕木参数
        this.sleeperSpacing = 22;
        this.sleeperLen = gauge + 8;
        this.sleeperWidth = 4;

        this.railGroup = new Group();
        this.sleeperGroup = new Group();
        this.jointGroup = new Group();
        this.labelObj = null;

        this._buildRailway();
    }

    _buildRailway() {
        const hg = this.gauge / 2;
        const hl = this.sleeperLen / 2;

        // ========== 枕木 (蓝色) ==========
        for (let d = 0; d <= this.trackLen; d += this.sleeperSpacing) {
            const cx = this.points[0] + this.unitX * d;
            const cy = this.points[1] + this.unitY * d;

            this.sleeperGroup.add(new Line({
                points: [
                    cx - this.perpX * hl,
                    cy - this.perpY * hl,
                    cx + this.perpX * hl,
                    cy + this.perpY * hl,
                ],
                stroke: C_SLEEPER_BLUE,
                strokeWidth: this.sleeperWidth,
                strokeLineCap: "round",
            }));
        }
        trackLayer.add(this.sleeperGroup);

        // ========== 两条铁轨 (白色) ==========
        this.railLine1 = new Line({
            points: [
                this.points[0] + this.perpX * hg,
                this.points[1] + this.perpY * hg,
                this.points[2] + this.perpX * hg,
                this.points[3] + this.perpY * hg,
            ],
            stroke: this.activeColor,
            strokeWidth: 3,
            strokeLineCap: "round",
        });
        this.railLine2 = new Line({
            points: [
                this.points[0] - this.perpX * hg,
                this.points[1] - this.perpY * hg,
                this.points[2] - this.perpX * hg,
                this.points[3] - this.perpY * hg,
            ],
            stroke: this.activeColor,
            strokeWidth: 3,
            strokeLineCap: "round",
        });
        this.railGroup.add(this.railLine1);
        this.railGroup.add(this.railLine2);
        trackLayer.add(this.railGroup);
    }

    setColor(color) {
        this.activeColor = color;
    }

    setLabel(text = "", color = C_BLUE, size = 16) {
        if (text.length > 20) text = text.substring(0, 20);
        this.label = { text, color, size };
    }

    update() {
        this.railLine1.set({ stroke: this.activeColor });
        this.railLine2.set({ stroke: this.activeColor });

        if (this.label.text) {
            if (!this.labelObj) {
                const trackX = (this.points[0] + this.points[2]) / 2;
                const trackY = this.points[1] + this.label.size + this.gauge;

                this.labelObj = new Text({
                    x: trackX,
                    y: trackY,
                    text: this.label.text,
                    fill: this.label.color,
                    fontSize: this.label.size,
                    fontWeight: "bold",
                    textAlign: "center",
                });
                labelLayer.add(this.labelObj);
            }
            this.labelObj.set({ text: this.label.text, fill: this.label.color });
        } else {
            if (this.labelObj) {
                this.labelObj.set({ text: "" });
            }
        }
    }
}

// ========== 车辆图片预加载与纹理生成 ==========
let carSourceImg = null;

function loadCarImage(url) {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => { carSourceImg = img; resolve(img); };
        img.onerror = reject;
        img.src = url;
    });
}

function makeCarTexture(displayW, displayH) {
    if (!carSourceImg) return "";
    const canvas = document.createElement("canvas");
    canvas.width = displayW;
    canvas.height = displayH;
    const ctx = canvas.getContext("2d");

    const imgRatio = carSourceImg.width / carSourceImg.height;
    const boxRatio = displayW / displayH;

    let drawW, drawH, drawX, drawY;
    if (imgRatio > boxRatio) {
        drawW = displayW;
        drawH = displayW / imgRatio;
        drawX = 0;
        drawY = (displayH - drawH) / 2;
    } else {
        drawH = displayH;
        drawW = displayH * imgRatio;
        drawX = (displayW - drawW) / 2;
        drawY = 0;
    }

    ctx.drawImage(carSourceImg, drawX, drawY, drawW, drawH);
    return canvas.toDataURL("image/png");
}

// ========== Car 类 (车辆，使用 PNG 图片) ==========
class Car {
    constructor(x, y, width = 108, height = 54) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.label = { text: "", color: "#ffffff", size: 14 };

        this.image = new Rect({
            x: x - width / 2,
            y: y - height / 2,
            width: width,
            height: height,
            fill: {
                type: "image",
                url: makeCarTexture(width, height),
                mode: "stretch",
            },
        });
        trainLayer.add(this.image);

        this.labelObj = null;
    }

    setPos(x, y) {
        this.x = x;
        this.y = y;
        this.image.set({
            x: x - this.width / 2,
            y: y - this.height / 2,
        });
    }

    setSize(w, h) {
        this.width = w;
        this.height = h;
        this.image.set({
            width: w,
            height: h,
            x: this.x - w / 2,
            y: this.y - h / 2,
            fill: {
                type: "image",
                url: makeCarTexture(w, h),
                mode: "stretch",
            },
        });
    }

    setLabel(text = "", color = "#ffffff", size = 14) {
        if (text.length > 20) text = text.substring(0, 20);
        this.label = { text, color, size };
    }

    update() {
        this.image.set({
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
        });

        if (this.label.text) {
            if (!this.labelObj) {
                this.labelObj = new Text({
                    x: this.x,
                    y: this.y - this.height / 2 - 20,
                    text: this.label.text,
                    fill: this.label.color,
                    fontSize: this.label.size,
                    fontWeight: "bold",
                    textAlign: "center",
                });
                labelLayer.add(this.labelObj);
            }
            this.labelObj.set({ text: this.label.text, fill: this.label.color });
        } else {
            if (this.labelObj) {
                this.labelObj.set({ text: "" });
            }
        }
    }
}

// ========== 初始化入口 ==========
async function init() {
    await loadCarImage("/static/Snipaste_2026-05-07_19-25-13_transparent.png");

    // ========== 绘制 6 条水平轨道 (水平分 16 段，整体居中，等间距) ==========
    const ROW_COUNT = 6;
    const SEG_COUNT = 16;
    const TRACK_SPACING = 162;
    const FIRST_TRACK_Y = (1080 - (ROW_COUNT - 1) * TRACK_SPACING) / 2;
    const TRACK_LEFT_X = 250;
    const TRACK_RIGHT_X = 1670;
    const SEG_LEN = (TRACK_RIGHT_X - TRACK_LEFT_X) / SEG_COUNT;

    const all_tracks = [];

    const trackNames = [
        "1号轨道", "2号轨道", "3号轨道",
        "4号轨道", "5号轨道", "6号轨道",
    ];

    for (let row = 0; row < ROW_COUNT; row++) {
        const y = FIRST_TRACK_Y + row * TRACK_SPACING;
        for (let seg = 0; seg < SEG_COUNT; seg++) {
            const x1 = TRACK_LEFT_X + seg * SEG_LEN;
            const x2 = x1 + SEG_LEN;
            const track = new Track([x1, y, x2, y], 10, C_RAIL_WHITE);
            if (seg === 0) {
                track.setLabel(trackNames[row], C_BLUE, 16);
            }
            all_tracks.push(track);
        }
    }

    const all_cars = [];

    // 演示车辆：在第 1/3/5 条轨道上各放一辆车
    const car1 = new Car(TRACK_LEFT_X + SEG_LEN * 5 + SEG_LEN / 2, FIRST_TRACK_Y + 0 * TRACK_SPACING, 108, 54);
    car1.setLabel("香港工程车-02-TC1");
    all_cars.push(car1);

    const car2 = new Car(TRACK_LEFT_X + SEG_LEN * 11 + SEG_LEN / 2, FIRST_TRACK_Y + 2 * TRACK_SPACING, 108, 54);
    car2.setLabel("检测车-TC3-005");
    all_cars.push(car2);

    const car3 = new Car(TRACK_LEFT_X + SEG_LEN * 8 + SEG_LEN / 2, FIRST_TRACK_Y + 4 * TRACK_SPACING, 108, 54);
    car3.setLabel("调车机-001");
    all_cars.push(car3);

    function loop() {
        all_tracks.forEach(t => t.update());
        all_cars.forEach(c => c.update());
        requestAnimationFrame(loop);
    }
    loop();
}

init();

