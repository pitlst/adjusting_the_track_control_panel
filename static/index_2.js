const { Leafer, Line, Rect, Group, Text } = LeaferUI;

const leafer = new Leafer({
    view: window,
    width: 1920,
    height: 1080,
    fill: "#002852",
});

const bg = new Rect({
    x: 0, y: 0, width: 1920, height: 1080,
    fill: "#002852",
});
leafer.add(bg);

const C_RAIL_GRAY = "#e9e9e9";
const C_RAIL_EDGE = "#00bfff";
const C_RAIL_CENTER = "#7fb3d8";
const C_SLEEPER_BLUE = "#3498db";
const C_GREEN = "#2ecc71";
const C_BLUE = "#c2dbeb";

const trackLayer = new Group();
const labelLayer = new Group();
const trainLayer = new Group();
const limitLayer = new Group();
leafer.add(trackLayer);
leafer.add(labelLayer);
leafer.add(trainLayer);
leafer.add(limitLayer);

// ========== Track 类 (GB 1435 标准轨距上视图) ==========
class Track {
    constructor(points, gauge = 14, railColor = C_RAIL_GRAY) {
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
        this.sleeperLen = gauge + 16;
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

        // ========== 两条铁轨 (蓝色边缘 + 浅灰内轨 + 浅蓝中心线) ==========
        const rx1 = this.points[0] + this.perpX * hg;
        const ry1 = this.points[1] + this.perpY * hg;
        const rx2 = this.points[2] + this.perpX * hg;
        const ry2 = this.points[3] + this.perpY * hg;
        const lx1 = this.points[0] - this.perpX * hg;
        const ly1 = this.points[1] - this.perpY * hg;
        const lx2 = this.points[2] - this.perpX * hg;
        const ly2 = this.points[3] - this.perpY * hg;

        // 蓝色边缘（底层，较宽）
        this.railEdge1 = new Line({
            points: [rx1, ry1, rx2, ry2],
            stroke: C_RAIL_EDGE,
            strokeWidth: 8,
            strokeLineCap: "round",
        });
        this.railEdge2 = new Line({
            points: [lx1, ly1, lx2, ly2],
            stroke: C_RAIL_EDGE,
            strokeWidth: 8,
            strokeLineCap: "round",
        });
        this.railGroup.add(this.railEdge1);
        this.railGroup.add(this.railEdge2);

        // 浅灰内轨（上层，较窄）
        this.railLine1 = new Line({
            points: [rx1, ry1, rx2, ry2],
            stroke: this.activeColor,
            strokeWidth: 4,
            strokeLineCap: "round",
        });
        this.railLine2 = new Line({
            points: [lx1, ly1, lx2, ly2],
            stroke: this.activeColor,
            strokeWidth: 4,
            strokeLineCap: "round",
        });
        this.railGroup.add(this.railLine1);
        this.railGroup.add(this.railLine2);

        // 中心线（浅蓝）
        this.centerLine = new Line({
            points: [this.points[0], this.points[1], this.points[2], this.points[3]],
            stroke: C_RAIL_CENTER,
            strokeWidth: 2,
            strokeLineCap: "round",
        });
        this.railGroup.add(this.centerLine);

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
    constructor(x, y, width = 216, height = 54) {
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

// ========== 禁止标记纹理生成 ==========
const C_FORBIDDEN = "#e74c3c";

function makeForbiddenTexture(size) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    const cx = size / 2;
    const cy = size / 2;
    const outerR = size / 2 - 2;

    // 白色圆形底
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // 红色圆环边框
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.strokeStyle = C_FORBIDDEN;
    ctx.lineWidth = size * 0.1;
    ctx.stroke();

    // 红色 X
    const innerR = outerR - size * 0.2;
    const diagLen = innerR * 1.2;
    ctx.strokeStyle = C_FORBIDDEN;
    ctx.lineWidth = size * 0.08;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(cx - diagLen, cy - diagLen);
    ctx.lineTo(cx + diagLen, cy + diagLen);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + diagLen, cy - diagLen);
    ctx.lineTo(cx - diagLen, cy + diagLen);
    ctx.stroke();

    return canvas.toDataURL("image/png");
}

// ========== Forbidden 类 (禁止标记，交通指示牌样式) ==========
class Forbidden {
    constructor(x, y, size = 48) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.label = { text: "", color: "#ffffff", size: 14 };

        this.image = new Rect({
            x: x - size / 2,
            y: y - size / 2,
            width: size,
            height: size,
            fill: {
                type: "image",
                url: makeForbiddenTexture(size),
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
            x: x - this.size / 2,
            y: y - this.size / 2,
        });
    }

    setSize(s) {
        this.size = s;
        this.image.set({
            width: s,
            height: s,
            x: this.x - s / 2,
            y: this.y - s / 2,
            fill: {
                type: "image",
                url: makeForbiddenTexture(s),
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
            x: this.x - this.size / 2,
            y: this.y - this.size / 2,
        });

        if (this.label.text) {
            if (!this.labelObj) {
                this.labelObj = new Text({
                    x: this.x,
                    y: this.y + this.size / 2 + 18,
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

// ========== 高台纹理生成 ==========
const C_GAOTAI = "#e67e22";

function makeGaotaiTexture(size) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    const m = size * 0.1;

    // 底面（橙色填充）
    ctx.fillStyle = C_GAOTAI;
    ctx.fillRect(m, size * 0.35, size - 2 * m, size * 0.55);

    // 顶面横条（浅色）
    ctx.fillStyle = "#f0a04b";
    ctx.fillRect(m, m, size - 2 * m, size * 0.28);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(m + 2, m + 2, size - 2 * m - 4, size * 0.28 - 4);

    // 底面边框
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(m, size * 0.35, size - 2 * m, size * 0.55);

    return canvas.toDataURL("image/png");
}

// ========== Gaotai 类 (高台标记) ==========
class Gaotai {
    constructor(x, y, size = 48) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.label = { text: "", color: "#ffffff", size: 14 };

        this.image = new Rect({
            x: x - size / 2,
            y: y - size / 2,
            width: size,
            height: size,
            fill: { type: "image", url: makeGaotaiTexture(size), mode: "stretch" },
        });
        trainLayer.add(this.image);
        this.labelObj = null;
    }

    setPos(x, y) {
        this.x = x;
        this.y = y;
        this.image.set({ x: x - this.size / 2, y: y - this.size / 2 });
    }

    setLabel(text = "", color = "#ffffff", size = 14) {
        if (text.length > 20) text = text.substring(0, 20);
        this.label = { text, color, size };
    }

    update() {
        this.image.set({ x: this.x - this.size / 2, y: this.y - this.size / 2 });
        if (this.label.text) {
            if (!this.labelObj) {
                this.labelObj = new Text({
                    x: this.x, y: this.y + this.size / 2 + 18,
                    text: this.label.text, fill: this.label.color,
                    fontSize: this.label.size, fontWeight: "bold", textAlign: "center",
                });
                labelLayer.add(this.labelObj);
            }
            this.labelObj.set({ text: this.label.text, fill: this.label.color });
        } else {
            if (this.labelObj) this.labelObj.set({ text: "" });
        }
    }
}

// ========== 地沟纹理生成 ==========
const C_DIGOU = "#2c3e50";

function makeDigouTexture(size) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // 深色底面
    ctx.fillStyle = C_DIGOU;
    ctx.fillRect(0, 0, size, size);

    // 斜线纹理
    ctx.strokeStyle = "#4a6274";
    ctx.lineWidth = 2;
    const gap = size * 0.18;
    for (let i = -size; i < size * 2; i += gap) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + size, size);
        ctx.stroke();
    }

    // 外边框
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);

    return canvas.toDataURL("image/png");
}

// ========== Digou 类 (地沟标记) ==========
class Digou {
    constructor(x, y, size = 48) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.label = { text: "", color: "#ffffff", size: 14 };

        this.image = new Rect({
            x: x - size / 2,
            y: y - size / 2,
            width: size,
            height: size,
            fill: { type: "image", url: makeDigouTexture(size), mode: "stretch" },
        });
        trainLayer.add(this.image);
        this.labelObj = null;
    }

    setPos(x, y) {
        this.x = x;
        this.y = y;
        this.image.set({ x: x - this.size / 2, y: y - this.size / 2 });
    }

    setLabel(text = "", color = "#ffffff", size = 14) {
        if (text.length > 20) text = text.substring(0, 20);
        this.label = { text, color, size };
    }

    update() {
        this.image.set({ x: this.x - this.size / 2, y: this.y - this.size / 2 });
        if (this.label.text) {
            if (!this.labelObj) {
                this.labelObj = new Text({
                    x: this.x, y: this.y + this.size / 2 + 18,
                    text: this.label.text, fill: this.label.color,
                    fontSize: this.label.size, fontWeight: "bold", textAlign: "center",
                });
                labelLayer.add(this.labelObj);
            }
            this.labelObj.set({ text: this.label.text, fill: this.label.color });
        } else {
            if (this.labelObj) this.labelObj.set({ text: "" });
        }
    }
}

// ========== 称上纹理生成 ==========
const C_CHENGSHANG = "#7f8c8d";

function makeChengshangTexture(size) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // 灰色底面平台
    ctx.fillStyle = C_CHENGSHANG;
    ctx.fillRect(0, size * 0.2, size, size * 0.6);

    // 平台横线（刻度感）
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    for (let i = size * 0.3; i < size * 0.75; i += size * 0.12) {
        ctx.beginPath();
        ctx.moveTo(size * 0.2, i);
        ctx.lineTo(size * 0.8, i);
        ctx.stroke();
    }

    // 外边
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, size * 0.2, size - 2, size * 0.6);

    return canvas.toDataURL("image/png");
}

class Chengshang {
    constructor(x, y, size = 48) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.label = { text: "", color: "#ffffff", size: 14 };
        this.image = new Rect({
            x: x - size / 2, y: y - size / 2, width: size, height: size,
            fill: { type: "image", url: makeChengshangTexture(size), mode: "stretch" },
        });
        trainLayer.add(this.image);
        this.labelObj = null;
    }
    setPos(x, y) { this.x = x; this.y = y; this.image.set({ x: x - this.size / 2, y: y - this.size / 2 }); }
    setLabel(text = "", color = "#ffffff", size = 14) { if (text.length > 20) text = text.substring(0, 20); this.label = { text, color, size }; }
    update() {
        this.image.set({ x: this.x - this.size / 2, y: this.y - this.size / 2 });
        if (this.label.text) {
            if (!this.labelObj) {
                this.labelObj = new Text({ x: this.x, y: this.y + this.size / 2 + 18, text: this.label.text, fill: this.label.color, fontSize: this.label.size, fontWeight: "bold", textAlign: "center" });
                labelLayer.add(this.labelObj);
            }
            this.labelObj.set({ text: this.label.text, fill: this.label.color });
        } else { if (this.labelObj) this.labelObj.set({ text: "" }); }
    }
}

// ========== 曲线试验台纹理生成 ==========
const C_QUXIAN = "#8e44ad";

function makeQuxianTexture(size) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    const cx = size / 2;
    const cy = size / 2;

    // 紫底
    ctx.fillStyle = C_QUXIAN;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // S 形曲线
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.75);
    ctx.bezierCurveTo(size * 0.5, size * 0.55, size * 0.3, size * 0.25, size * 0.8, size * 0.2);
    ctx.stroke();

    // 外边
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.4, 0, Math.PI * 2);
    ctx.stroke();

    return canvas.toDataURL("image/png");
}

class Quxianshiyantai {
    constructor(x, y, size = 48) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.label = { text: "", color: "#ffffff", size: 14 };
        this.image = new Rect({
            x: x - size / 2, y: y - size / 2, width: size, height: size,
            fill: { type: "image", url: makeQuxianTexture(size), mode: "stretch" },
        });
        trainLayer.add(this.image);
        this.labelObj = null;
    }
    setPos(x, y) { this.x = x; this.y = y; this.image.set({ x: x - this.size / 2, y: y - this.size / 2 }); }
    setLabel(text = "", color = "#ffffff", size = 14) { if (text.length > 20) text = text.substring(0, 20); this.label = { text, color, size }; }
    update() {
        this.image.set({ x: this.x - this.size / 2, y: this.y - this.size / 2 });
        if (this.label.text) {
            if (!this.labelObj) {
                this.labelObj = new Text({ x: this.x, y: this.y + this.size / 2 + 18, text: this.label.text, fill: this.label.color, fontSize: this.label.size, fontWeight: "bold", textAlign: "center" });
                labelLayer.add(this.labelObj);
            }
            this.labelObj.set({ text: this.label.text, fill: this.label.color });
        } else { if (this.labelObj) this.labelObj.set({ text: "" }); }
    }
}

// ========== 加油位纹理生成 ==========
const C_JIAYOU = "#e74c3c";

function makeJiayouTexture(size) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // 红底
    ctx.fillStyle = C_JIAYOU;
    ctx.fillRect(0, 0, size, size);

    // 油滴形状（用圆表示）
    const cx = size / 2;
    const cy = size * 0.42;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // 油滴下方三角
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.14, cy + size * 0.02);
    ctx.lineTo(cx + size * 0.14, cy + size * 0.02);
    ctx.lineTo(cx, cy + size * 0.28);
    ctx.closePath();
    ctx.fill();

    // 白边
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);

    return canvas.toDataURL("image/png");
}

class Jiayouwei {
    constructor(x, y, size = 48) {
        this.x = x; this.y = y; this.size = size;
        this.label = { text: "", color: "#ffffff", size: 14 };
        this.image = new Rect({
            x: x - size / 2, y: y - size / 2, width: size, height: size,
            fill: { type: "image", url: makeJiayouTexture(size), mode: "stretch" },
        });
        trainLayer.add(this.image);
        this.labelObj = null;
    }
    setPos(x, y) { this.x = x; this.y = y; this.image.set({ x: x - this.size / 2, y: y - this.size / 2 }); }
    setLabel(text = "", color = "#ffffff", size = 14) { if (text.length > 20) text = text.substring(0, 20); this.label = { text, color, size }; }
    update() {
        this.image.set({ x: this.x - this.size / 2, y: this.y - this.size / 2 });
        if (this.label.text) {
            if (!this.labelObj) {
                this.labelObj = new Text({ x: this.x, y: this.y + this.size / 2 + 18, text: this.label.text, fill: this.label.color, fontSize: this.label.size, fontWeight: "bold", textAlign: "center" });
                labelLayer.add(this.labelObj);
            }
            this.labelObj.set({ text: this.label.text, fill: this.label.color });
        } else { if (this.labelObj) this.labelObj.set({ text: "" }); }
    }
}

// ========== 充电机纹理生成 ==========
const C_CHONGDIAN = "#27ae60";

function makeChongdianTexture(size) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // 绿底
    ctx.fillStyle = C_CHONGDIAN;
    ctx.fillRect(0, 0, size, size);

    // 闪电符号
    const cx = size / 2;
    const cy = size / 2;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.05, cy - size * 0.35);
    ctx.lineTo(cx - size * 0.2, cy + size * 0.02);
    ctx.lineTo(cx - size * 0.02, cy - size * 0.02);
    ctx.lineTo(cx + size * 0.05, cy + size * 0.35);
    ctx.lineTo(cx + size * 0.2, cy - size * 0.02);
    ctx.lineTo(cx + size * 0.02, cy + size * 0.02);
    ctx.closePath();
    ctx.fill();

    // 白边
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);

    return canvas.toDataURL("image/png");
}

class Chongdianji {
    constructor(x, y, size = 48) {
        this.x = x; this.y = y; this.size = size;
        this.label = { text: "", color: "#ffffff", size: 14 };
        this.image = new Rect({
            x: x - size / 2, y: y - size / 2, width: size, height: size,
            fill: { type: "image", url: makeChongdianTexture(size), mode: "stretch" },
        });
        trainLayer.add(this.image);
        this.labelObj = null;
    }
    setPos(x, y) { this.x = x; this.y = y; this.image.set({ x: x - this.size / 2, y: y - this.size / 2 }); }
    setLabel(text = "", color = "#ffffff", size = 14) { if (text.length > 20) text = text.substring(0, 20); this.label = { text, color, size }; }
    update() {
        this.image.set({ x: this.x - this.size / 2, y: this.y - this.size / 2 });
        if (this.label.text) {
            if (!this.labelObj) {
                this.labelObj = new Text({ x: this.x, y: this.y + this.size / 2 + 18, text: this.label.text, fill: this.label.color, fontSize: this.label.size, fontWeight: "bold", textAlign: "center" });
                labelLayer.add(this.labelObj);
            }
            this.labelObj.set({ text: this.label.text, fill: this.label.color });
        } else { if (this.labelObj) this.labelObj.set({ text: "" }); }
    }
}

// ========== 淋雨台纹理生成 ==========
const C_LINYU = "#3498db";

function makeLinyuTexture(size) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // 蓝底
    ctx.fillStyle = C_LINYU;
    ctx.fillRect(0, 0, size, size);

    // 雨滴（竖向短线）
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    const cols = [size * 0.25, size * 0.5, size * 0.75];
    for (const cx of cols) {
        for (let y = size * 0.15; y < size * 0.85; y += size * 0.16) {
            ctx.beginPath();
            ctx.moveTo(cx, y);
            ctx.lineTo(cx, y + size * 0.1);
            ctx.stroke();
        }
    }

    // 白边
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);

    return canvas.toDataURL("image/png");
}

class Linyutai {
    constructor(x, y, size = 48) {
        this.x = x; this.y = y; this.size = size;
        this.label = { text: "", color: "#ffffff", size: 14 };
        this.image = new Rect({
            x: x - size / 2, y: y - size / 2, width: size, height: size,
            fill: { type: "image", url: makeLinyuTexture(size), mode: "stretch" },
        });
        trainLayer.add(this.image);
        this.labelObj = null;
    }
    setPos(x, y) { this.x = x; this.y = y; this.image.set({ x: x - this.size / 2, y: y - this.size / 2 }); }
    setLabel(text = "", color = "#ffffff", size = 14) { if (text.length > 20) text = text.substring(0, 20); this.label = { text, color, size }; }
    update() {
        this.image.set({ x: this.x - this.size / 2, y: this.y - this.size / 2 });
        if (this.label.text) {
            if (!this.labelObj) {
                this.labelObj = new Text({ x: this.x, y: this.y + this.size / 2 + 18, text: this.label.text, fill: this.label.color, fontSize: this.label.size, fontWeight: "bold", textAlign: "center" });
                labelLayer.add(this.labelObj);
            }
            this.labelObj.set({ text: this.label.text, fill: this.label.color });
        } else { if (this.labelObj) this.labelObj.set({ text: "" }); }
    }
}

// ========== 总成内纹理生成 ==========
const C_ZONGCHENG = "#16a085";

function makeZongchengTexture(size) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // 青绿底
    ctx.fillStyle = C_ZONGCHENG;
    ctx.fillRect(0, 0, size, size);

    // 厂房形状（矩形 + 屋顶三角）
    const m = size * 0.15;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(m, size * 0.35, size - 2 * m, size * 0.5);
    ctx.beginPath();
    ctx.moveTo(m, size * 0.35);
    ctx.lineTo(size / 2, size * 0.15);
    ctx.lineTo(size - m, size * 0.35);
    ctx.closePath();
    ctx.fill();

    // 白边
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);

    return canvas.toDataURL("image/png");
}

class Zongchengnei {
    constructor(x, y, size = 48) {
        this.x = x; this.y = y; this.size = size;
        this.label = { text: "", color: "#ffffff", size: 14 };
        this.image = new Rect({
            x: x - size / 2, y: y - size / 2, width: size, height: size,
            fill: { type: "image", url: makeZongchengTexture(size), mode: "stretch" },
        });
        trainLayer.add(this.image);
        this.labelObj = null;
    }
    setPos(x, y) { this.x = x; this.y = y; this.image.set({ x: x - this.size / 2, y: y - this.size / 2 }); }
    setLabel(text = "", color = "#ffffff", size = 14) { if (text.length > 20) text = text.substring(0, 20); this.label = { text, color, size }; }
    update() {
        this.image.set({ x: this.x - this.size / 2, y: this.y - this.size / 2 });
        if (this.label.text) {
            if (!this.labelObj) {
                this.labelObj = new Text({ x: this.x, y: this.y + this.size / 2 + 18, text: this.label.text, fill: this.label.color, fontSize: this.label.size, fontWeight: "bold", textAlign: "center" });
                labelLayer.add(this.labelObj);
            }
            this.labelObj.set({ text: this.label.text, fill: this.label.color });
        } else { if (this.labelObj) this.labelObj.set({ text: "" }); }
    }
}

// ========== 整备库纹理生成 ==========
const C_ZHENGBEI = "#e67e22";

function makeZhengbeiTexture(size) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // 橙底
    ctx.fillStyle = C_ZHENGBEI;
    ctx.fillRect(0, 0, size, size);

    // 仓库门形（矩形+拱顶）
    const m = size * 0.15;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(m, size * 0.35, size - 2 * m, size * 0.5);
    ctx.beginPath();
    ctx.arc(size / 2, size * 0.35, (size - 2 * m) / 2, Math.PI, 0);
    ctx.fill();

    // 白边
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);

    return canvas.toDataURL("image/png");
}

class Zhengbeiku {
    constructor(x, y, size = 48) {
        this.x = x; this.y = y; this.size = size;
        this.label = { text: "", color: "#ffffff", size: 14 };
        this.image = new Rect({
            x: x - size / 2, y: y - size / 2, width: size, height: size,
            fill: { type: "image", url: makeZhengbeiTexture(size), mode: "stretch" },
        });
        trainLayer.add(this.image);
        this.labelObj = null;
    }
    setPos(x, y) { this.x = x; this.y = y; this.image.set({ x: x - this.size / 2, y: y - this.size / 2 }); }
    setLabel(text = "", color = "#ffffff", size = 14) { if (text.length > 20) text = text.substring(0, 20); this.label = { text, color, size }; }
    update() {
        this.image.set({ x: this.x - this.size / 2, y: this.y - this.size / 2 });
        if (this.label.text) {
            if (!this.labelObj) {
                this.labelObj = new Text({ x: this.x, y: this.y + this.size / 2 + 18, text: this.label.text, fill: this.label.color, fontSize: this.label.size, fontWeight: "bold", textAlign: "center" });
                labelLayer.add(this.labelObj);
            }
            this.labelObj.set({ text: this.label.text, fill: this.label.color });
        } else { if (this.labelObj) this.labelObj.set({ text: "" }); }
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
    const TRACK_LEFT_X = 80;
    const TRACK_RIGHT_X = 1840;
    const SEG_LEN = (TRACK_RIGHT_X - TRACK_LEFT_X) / SEG_COUNT;

    const all_tracks = [];

    const trackNames = [
        "8道", "9道", "10道",
        "11道", "12道", "13道",
    ];

    for (let row = 0; row < ROW_COUNT; row++) {
        const y = FIRST_TRACK_Y + row * TRACK_SPACING;
        for (let seg = 0; seg < SEG_COUNT; seg++) {
            const x1 = TRACK_LEFT_X + seg * SEG_LEN;
            const x2 = x1 + SEG_LEN;
            const track = new Track([x1, y, x2, y], 30, C_RAIL_GRAY);
            all_tracks.push(track);

            // 段位左边界限位标记
            const limitH = 38;
            const limitBarW = 4;
            const triH = 4;
            const triHW = 3;
            const gap = 12;
            const borderOff = 1.5;
            const C_BALL = "#006f9f";

            // 上端点倒三角
            limitLayer.add(new Line({
                points: [
                    x1 - triHW, y - limitH / 2 - triH - gap,
                    x1 + triHW, y - limitH / 2 - triH - gap,
                    x1, y - limitH / 2 - gap,
                ],
                stroke: C_BALL,
                strokeWidth: 1,
                fill: C_BALL,
                closed: true,
                strokeLineCap: "round",
                strokeLineJoin: "round",
            }));
        }
    }

    // 轨道名称标签（左端下方，左对齐）
    for (let row = 0; row < ROW_COUNT; row++) {
        const ly = FIRST_TRACK_Y + row * TRACK_SPACING + 38;
        labelLayer.add(new Text({
            x: TRACK_LEFT_X,
            y: ly,
            text: trackNames[row],
            fill: C_BLUE,
            fontSize: 16,
            fontWeight: "bold",
            textAlign: "left",
        }));
    }

    const all_cars = [];
    const all_forbiddens = [];
    const all_gaotais = [];
    const all_digous = [];
    const all_chengshangs = [];
    const all_quxianshiyantais = [];
    const all_jiayouweis = [];
    const all_chongdianjis = [];
    const all_linyutais = [];
    const all_zongchengneis = [];
    const all_zhengbeikus = [];

    // 演示车辆：在第 1/3/5 条轨道上各放一辆车
    const car1 = new Car(TRACK_LEFT_X + SEG_LEN * 5 + SEG_LEN / 2, FIRST_TRACK_Y + 0 * TRACK_SPACING - 8, 108, 54);
    car1.setLabel("HXN6-1014");
    all_cars.push(car1);

    const car2 = new Car(TRACK_LEFT_X + SEG_LEN * 11 + SEG_LEN / 2, FIRST_TRACK_Y + 2 * TRACK_SPACING - 8, 108, 54);
    car2.setLabel("HXN6-1017");
    all_cars.push(car2);

    const car3 = new Car(TRACK_LEFT_X + SEG_LEN * 8 + SEG_LEN / 2, FIRST_TRACK_Y + 4 * TRACK_SPACING - 8, 108, 54);
    car3.setLabel("土1A");
    all_cars.push(car3);

    // 禁止标记：第 3 条轨道 (10号轨道) 最右 4 个段位
    const forbidRow = 2;
    for (let seg = 12; seg < 16; seg++) {
        const fx = TRACK_LEFT_X + seg * SEG_LEN + SEG_LEN / 2;
        const fy = FIRST_TRACK_Y + forbidRow * TRACK_SPACING - 8;
        const f = new Forbidden(fx, fy, 48);
        f.setLabel("禁止");
        all_forbiddens.push(f);
    }

    // 禁止标记：第 2 条轨道 (9号轨道) 最右 2 个段位 (seg=14,15)
    const forbidRow2 = 1;
    for (let seg = 14; seg < 16; seg++) {
        const fx = TRACK_LEFT_X + seg * SEG_LEN + SEG_LEN / 2;
        const fy = FIRST_TRACK_Y + forbidRow2 * TRACK_SPACING - 8;
        const f = new Forbidden(fx, fy, 48);
        f.setLabel("禁止");
        all_forbiddens.push(f);
    }

    // 高台：第 3 条轨道 (10号轨道) 第 9 号位 (seg=8)
    const gx = TRACK_LEFT_X + 8 * SEG_LEN + SEG_LEN / 2;
    const gy = FIRST_TRACK_Y + 2 * TRACK_SPACING - 8;
    const gt = new Gaotai(gx, gy, 48);
    gt.setLabel("高台");
    all_gaotais.push(gt);

    // 地沟：第 3 条轨道 (10号轨道) 第 10 号位 (seg=9)
    const dx = TRACK_LEFT_X + 9 * SEG_LEN + SEG_LEN / 2;
    const dy = FIRST_TRACK_Y + 2 * TRACK_SPACING - 8;
    const dg = new Digou(dx, dy, 48);
    dg.setLabel("地沟");
    all_digous.push(dg);

    // 称上：第 6 条轨道 (13号轨道) 第 11 号位 (seg=10)
    const csx = TRACK_LEFT_X + 10 * SEG_LEN + SEG_LEN / 2;
    const csy = FIRST_TRACK_Y + 5 * TRACK_SPACING - 8;
    const cs = new Chengshang(csx, csy, 48);
    cs.setLabel("称上");
    all_chengshangs.push(cs);

    // 曲线试验台：第 6 条轨道 (13号轨道) 第 5 号位 (seg=4)
    const qx = TRACK_LEFT_X + 4 * SEG_LEN + SEG_LEN / 2;
    const qy = FIRST_TRACK_Y + 5 * TRACK_SPACING - 8;
    const qst = new Quxianshiyantai(qx, qy, 48);
    qst.setLabel("曲线试验台");
    all_quxianshiyantais.push(qst);

    // 加油位：第 1 条轨道 (8号轨道) 第 13 号位 (seg=12)
    const jx = TRACK_LEFT_X + 12 * SEG_LEN + SEG_LEN / 2;
    const jy = FIRST_TRACK_Y + 0 * TRACK_SPACING - 8;
    const jw = new Jiayouwei(jx, jy, 48);
    jw.setLabel("加油位");
    all_jiayouweis.push(jw);

    // 充电机：第 1 条轨道 (8号轨道) 第 16 号位 (seg=15)
    const cdx = TRACK_LEFT_X + 15 * SEG_LEN + SEG_LEN / 2;
    const cdy = FIRST_TRACK_Y + 0 * TRACK_SPACING - 8;
    const cdj = new Chongdianji(cdx, cdy, 48);
    cdj.setLabel("充电机");
    all_chongdianjis.push(cdj);

    // 淋雨台：第 1 条轨道 (8号轨道) 第 15 号位 (seg=14)
    const lx = TRACK_LEFT_X + 14 * SEG_LEN + SEG_LEN / 2;
    const ly = FIRST_TRACK_Y + 0 * TRACK_SPACING - 8;
    const lt = new Linyutai(lx, ly, 48);
    lt.setLabel("淋雨台");
    all_linyutais.push(lt);


    // 总成内：第 4 条轨道 (11号轨道) 最右 5 个段位 (seg=12~15)
    for (let seg = 11; seg < 16; seg++) {
        const zx = TRACK_LEFT_X + seg * SEG_LEN + SEG_LEN / 2;
        const zy = FIRST_TRACK_Y + 3 * TRACK_SPACING - 8;
        const zc = new Zongchengnei(zx, zy, 48);
        zc.setLabel("总成内");
        all_zongchengneis.push(zc);
    }

    // 总成内：第 5 条轨道 (12号轨道) 最右 5 个段位 (seg=12~15)
    for (let seg = 11; seg < 16; seg++) {
        const zx = TRACK_LEFT_X + seg * SEG_LEN + SEG_LEN / 2;
        const zy = FIRST_TRACK_Y + 4 * TRACK_SPACING - 8;
        const zc = new Zongchengnei(zx, zy, 48);
        zc.setLabel("总成内");
        all_zongchengneis.push(zc);
    }

    // 总成内：第 6 条轨道 (13号轨道) 倒数第 5 个 (seg=11)
    const zx3 = TRACK_LEFT_X + 11 * SEG_LEN + SEG_LEN / 2;
    const zy3 = FIRST_TRACK_Y + 5 * TRACK_SPACING - 8;
    const zc3 = new Zongchengnei(zx3, zy3, 48);
    zc3.setLabel("总成内");
    all_zongchengneis.push(zc3);

    // 整备库：第 6 条轨道 (13号轨道) 从右数第 7 个 (seg=9)
    const zbx = TRACK_LEFT_X + 9 * SEG_LEN + SEG_LEN / 2;
    const zby = FIRST_TRACK_Y + 5 * TRACK_SPACING - 8;
    const zb = new Zhengbeiku(zbx, zby, 48);
    zb.setLabel("整备库");
    all_zhengbeikus.push(zb);

    let tick = 0;
    function loop() {
        tick++;
        if (tick % 60 === 0) {
            all_tracks[0].setColor(C_GREEN);
        } else if (tick % 60 === 30) {
            all_tracks[0].setColor(C_RAIL_GRAY);
        }

        all_tracks.forEach(t => t.update());
        all_cars.forEach(c => c.update());
        all_forbiddens.forEach(f => f.update());
        all_gaotais.forEach(g => g.update());
        all_digous.forEach(d => d.update());
        all_chengshangs.forEach(cs => cs.update());
        all_quxianshiyantais.forEach(q => q.update());
        all_jiayouweis.forEach(j => j.update());
        all_chongdianjis.forEach(c => c.update());
        all_linyutais.forEach(l => l.update());
        all_zongchengneis.forEach(z => z.update());
        all_zhengbeikus.forEach(zb => zb.update());
        requestAnimationFrame(loop);
    }
    loop();
}

init();

