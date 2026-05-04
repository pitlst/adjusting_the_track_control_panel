const { Leafer, Line, Rect, Group, Text, Path } = LeaferUI;

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

const C_TRACK = "#d0d0d0";
const C_GREEN = "#2ecc71";
const C_BLUE = "#3498db";

const trackLayer = new Group();
const labelLayer = new Group();
const trainLayer = new Group();
leafer.add(trackLayer);
leafer.add(labelLayer);
leafer.add(trainLayer);

// ========== Track 类 ==========
class Track {
    constructor(points, strokeWidth = 8, strokeColor = C_TRACK) {
        this.points = points;
        this.strokeWidth = strokeWidth;
        this.strokeColor = strokeColor;
        this.label = { text: "", color: C_BLUE, size: 16 };

        this.line = new Line({
            points: this.points,
            stroke: this.strokeColor,
            strokeWidth: this.strokeWidth,
            strokeLineCap: "round",
            strokeLineJoin: "round",
        });
        trackLayer.add(this.line);

        this.jointCircles = [];
        this.labelObj = null;
    }

    setColor(color) {
        this.strokeColor = color;
    }

    setLabel(text = "", color = C_BLUE, size = 16) {
        if (text.length > 20) text = text.substring(0, 20);
        this.label = { text, color, size };
    }

    update() {
        this.line.set({ stroke: this.strokeColor });

        this.jointCircles.forEach(c => {
            c.set({ fill: this.strokeColor });
        });

        if (this.label.text) {
            if (!this.labelObj) {
                const trackX = (this.points[0] + this.points[2]) / 2;
                const trackY = this.points[1] + this.label.size;

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

    addJoints() {
        this.jointCircles.forEach(c => c.remove());
        this.jointCircles = [];

        for (let i = 0; i < this.points.length; i += 2) {
            const x = this.points[i];
            const y = this.points[i + 1];
            const circle = new Rect({
                x: x - this.strokeWidth / 2,
                y: y - this.strokeWidth / 2,
                width: this.strokeWidth,
                height: this.strokeWidth,
                fill: this.strokeColor,
                cornerRadius: this.strokeWidth / 2,
            });
            trackLayer.add(circle);
            this.jointCircles.push(circle);
        }
    }
}

// ========== Arrow 类 ==========
class Arrow {
    constructor(x, y, size, facingRight = true) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.facingRight = facingRight;

        this.updateShape();
    }

    updateShape() {
        const s = this.size;
        const halfS = s / 2;

        if (this.shape) {
            this.shape.remove();
        }
        if (this.borderShape) {
            this.borderShape.remove();
        }

        let x1, y1, x2, y2, x3, y3;
        if (this.facingRight) {
            x1 = this.x - halfS;
            y1 = this.y - halfS;
            x2 = this.x + halfS;
            y2 = this.y;
            x3 = this.x - halfS;
            y3 = this.y + halfS;
        } else {
            x1 = this.x + halfS;
            y1 = this.y - halfS;
            x2 = this.x - halfS;
            y2 = this.y;
            x3 = this.x + halfS;
            y3 = this.y + halfS;
        }

        this.borderShape = new Line({
            points: [x1, y1, x2, y2, x3, y3],
            stroke: "#000000",
            strokeWidth: 7,
            strokeLineCap: "round",
            strokeLineJoin: "round",
            closed: true,
        });
        trackLayer.add(this.borderShape);

        this.shape = new Line({
            points: [x1, y1, x2, y2, x3, y3],
            stroke: C_TRACK,
            strokeWidth: 3,
            strokeLineCap: "round",
            strokeLineJoin: "round",
            fill: "#000000",
            closed: true,
        });
        trackLayer.add(this.shape);
    }
}

// ========== Train 类 ==========
class Train {
    constructor(x, y, size, color = "#800080") {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;
        this.label = { text: "", size: 14 };

        this.parts = [];
        this.labelObj = null;
        this.updateShape();
    }

    setColor(color) {
        this.color = color;
        this.updateShape();
    }

    setLabel(text = "", size = 14) {
        if (text.length > 20) text = text.substring(0, 20);
        this.label = { text, size };
    }

    updateShape() {
        this.parts.forEach(p => p.remove());
        this.parts = [];

        const squareSize = this.size;
        const gap = squareSize / 4;
        const totalWidth = 5 * squareSize + 4 * gap;
        const startX = this.x;

        for (let i = 0; i < 5; i++) {
            const sqX = startX + i * (squareSize + gap);
            const sqY = this.y - squareSize / 2;

            if (i === 0 || i === 4) {
                const borderRect = new Rect({
                    x: sqX - 2,
                    y: sqY - 2,
                    width: squareSize + 4,
                    height: squareSize + 4,
                    stroke: "#000000",
                    strokeWidth: 4,
                    fill: C_TRACK,
                    cornerRadius: 3,
                });
                trainLayer.add(borderRect);
                this.parts.push(borderRect);

                const innerRect = new Rect({
                    x: sqX,
                    y: sqY,
                    width: squareSize,
                    height: squareSize,
                    stroke: C_TRACK,
                    strokeWidth: 3,
                    fill: "#000000",
                    cornerRadius: 2,
                });
                trainLayer.add(innerRect);
                this.parts.push(innerRect);
            } else {
                const rect = new Rect({
                    x: sqX,
                    y: sqY,
                    width: squareSize,
                    height: squareSize,
                    fill: this.color,
                    cornerRadius: 2,
                });
                trainLayer.add(rect);
                this.parts.push(rect);
            }
        }

        if (this.label.text) {
            if (!this.labelObj) {
                this.labelObj = new Text({
                    x: startX + totalWidth / 2,
                    y: this.y - squareSize / 2 - this.label.size - 5,
                    text: this.label.text,
                    fill: "#ffffff",
                    fontSize: this.label.size,
                    fontWeight: "bold",
                    textAlign: "center",
                });
                labelLayer.add(this.labelObj);
            }
            this.labelObj.set({ text: this.label.text });
        } else {
            if (this.labelObj) {
                this.labelObj.set({ text: "" });
            }
        }
    }
}

// ========== 轨道布局 ==========
const space_len = 54;
const all_tracks = [];
const all_arrows = [];
const arrow_configs = [];
const track_configs = [
    [[2, 16], [4, 16]],
    [[4, 16], [5, 15]],
    [[5, 15], [5, 3]],

    [[5, 15], [6, 14]],
    [[5, 14], [6, 13]],
    [[5, 13], [6, 12]],
    [[5, 12], [6, 11]],
    [[5, 11], [6, 10]],
    [[5, 10], [6, 9]],
    [[5, 9], [6, 8]],
    [[5, 8], [6, 7]],
    [[5, 7], [6, 6]],
    [[5, 6], [6, 5]],
    [[5, 5], [6, 4]],
    [[5, 4], [6, 3]],
    [[5, 3], [6, 2]],

    [[6, 14], [10, 14]],
    [[6, 13], [10, 13]],
    [[6, 12], [10, 12]],
    [[6, 11], [10, 11]],
    [[6, 10], [10, 10]],
    [[6, 9], [10, 9]],
    [[6, 8], [10, 8]],
    [[6, 7], [10, 7]],
    [[6, 6], [10, 6]],
    [[6, 5], [10, 5]],
    [[6, 4], [10, 4]],
    [[6, 3], [10, 3]],
    [[6, 2], [10, 2]],

    [[4, 16], [6, 16]],
    [[4, 16], [8, 16]],
    [[8, 16], [12, 16]],

    [[5, 16], [6, 17]],
    [[6, 17], [8, 17]],
    [[8, 17], [12, 17]],

    [[7, 17], [8, 18]],
    [[8, 18], [12, 18]],
];

const _ped = 3;
for (const _index of [18, 17, 16]) {
    let last_location = 12;
    for (let index = 0; index < 6; index++) {
        track_configs.push([[last_location, _index], [last_location + _ped, _index]]);
        arrow_configs.push([last_location, _index]);
        last_location += _ped;
    }
}
for (const _index of [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) {
    let last_location = 10;
    for (let index = 0; index < 6; index++) {
        track_configs.push([[last_location, _index], [last_location + _ped, _index]]);
        arrow_configs.push([last_location, _index]);
        last_location += _ped;
    }
}


for (const element of track_configs) {
    const track = new Track([
        space_len * element[0][0], space_len * element[0][1],
        space_len * element[1][0], space_len * element[1][1]
    ], 6, C_TRACK);
    track.addJoints();
    all_tracks.push(track);
}
for (const element of arrow_configs) {
    const arrow = new Arrow(space_len * element[0], space_len * element[1], 15, false);
    all_arrows.push(arrow);
}

all_tracks[0].setLabel("进车位", C_BLUE, 12);
all_tracks[28].setLabel("13号轨道", C_BLUE, 12);
all_tracks[27].setLabel("12号轨道", C_BLUE, 12);
all_tracks[26].setLabel("11号轨道", C_BLUE, 12);
all_tracks[25].setLabel("10号轨道", C_BLUE, 12);
all_tracks[24].setLabel("9号轨道", C_BLUE, 12);
all_tracks[23].setLabel("8号轨道", C_BLUE, 12);
all_tracks[22].setLabel("*1轨道", C_BLUE, 12);
all_tracks[21].setLabel("*2轨道", C_BLUE, 12);
all_tracks[20].setLabel("齿轨轨道", C_BLUE, 12);
all_tracks[19].setLabel("5号轨道", C_BLUE, 12);
all_tracks[18].setLabel("4号轨道", C_BLUE, 12);
all_tracks[17].setLabel("3号轨道", C_BLUE, 12);
all_tracks[16].setLabel("2号轨道", C_BLUE, 12);

all_tracks[31].setLabel("1号轨道", C_BLUE, 12);
all_tracks[34].setLabel("水阻1号轨道", C_BLUE, 12);
all_tracks[36].setLabel("水阻2号轨道", C_BLUE, 12);

for (let _index = 0; _index < 16; _index++) {
    for (let __index = 0; __index < 6; __index++) {
        all_tracks[36 + _index * 6 + __index + 1].setLabel(`${__index + 8}号位`, C_GREEN, 12);
    }
}

const Train_0 = new Train(space_len * 12.75, space_len * 18, 15)
Train_0.setLabel("香港工程车-02-TC1")

// ========== 动画循环 ==========
let tick = 0;

function loop() {
    tick++;
    if (tick % 60 === 0) {
        all_tracks[0].setColor("#ff0000");
    } else if (tick % 60 === 30) {
        all_tracks[0].setColor(C_TRACK);
    }
    if (tick % 60 === 0) {
        all_tracks[37].setColor("#00ff00");
    } else if (tick % 60 === 30) {
        all_tracks[37].setColor(C_TRACK);
    }

    all_tracks.forEach((t) => t.update());
    all_arrows.forEach((t) => t.updateShape());
    Train_0.updateShape();
    requestAnimationFrame(loop);
}
loop();